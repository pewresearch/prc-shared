<?php
/**
 * One post meta key as a state machine over a backed enum.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

use BackedEnum;
use InvalidArgumentException;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- update_post_meta() with a previous value is not a compare-and-swap, and the meta cache must not hide another node's write.

/**
 * Compare-and-swap transitions on one post meta row, along an explicit edge table.
 *
 * Row: one `{$wpdb->postmeta}` row per post for the key, meta_value is the case
 * value as a string. Every write to the key must go through this class.
 * update_post_meta( $id, $key, $to, $from ) is unconditional when $from is ''
 * or '0', adds a row when none exists, and matches values without regard to
 * case or trailing spaces.
 *
 * Keys and values match byte for byte. Writes skip the meta API, so no core
 * meta filters or actions run, and nothing that listens to them (such as
 * search sync) sees a state change. Each write deletes the post's meta cache
 * and moves the posts last_changed, as core does on updated_post_meta, so
 * cached meta queries do not return the old state.
 *
 * A write that changes the row fires one action, and only the winner fires it:
 * do_action( 'prc_meta_state_transitioned', $post_id, $meta_key, $from, $to ).
 * $from and $to are the enum cases. $from is null for init().
 */
final class Meta_State {

	/**
	 * Length of wp_postmeta.meta_key.
	 */
	private const MAX_META_KEY_LENGTH = 255;

	/**
	 * Tries init() makes when MySQL picks its insert as a deadlock victim.
	 */
	private const MAX_INIT_TRIES = 3;

	/**
	 * Action fired once after a write changed the row.
	 */
	public const TRANSITIONED_ACTION = 'prc_meta_state_transitioned';

	/**
	 * Allowed target values, keyed by source value.
	 *
	 * @var array<int|string, array<int|string, true>>
	 */
	private array $edges = array();

	private bool $guarded = false;

	/**
	 * Construct.
	 *
	 * @param string                                     $meta_key Post meta key that holds the state.
	 * @param class-string<BackedEnum>                   $enum     State enum.
	 * @param array<array{0: BackedEnum, 1: BackedEnum}> $edges    Allowed [ from, to ] pairs.
	 * @throws InvalidArgumentException When the key, the enum, or an edge is unusable.
	 */
	public function __construct(
		private readonly string $meta_key,
		private readonly string $enum,
		array $edges,
	) {
		if ( '' === $meta_key || strlen( $meta_key ) > self::MAX_META_KEY_LENGTH ) {
			// Without strict SQL mode MySQL truncates a longer key on insert, and
			// reads by the full key never find the row.
			throw new InvalidArgumentException(
				sprintf( 'Meta_State key must be 1 to %d characters: %s', self::MAX_META_KEY_LENGTH, $meta_key ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
			);
		}

		if ( ! is_a( $enum, BackedEnum::class, true ) ) {
			throw new InvalidArgumentException(
				sprintf( 'Meta_State needs a backed enum, got %s.', $enum ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
			);
		}

		foreach ( $enum::cases() as $case ) {
			$value = (string) $case->value;
			// Core reads '' and '0' as "no previous value", and get_post_meta()
			// unserializes a value that looks serialized.
			if ( '' === $value || '0' === $value || is_serialized( $value ) ) {
				throw new InvalidArgumentException(
					sprintf( '%s::%s cannot be stored as post meta state: "%s".', $enum, $case->name, $value ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
				);
			}
		}

		foreach ( $edges as $edge ) {
			if ( ! is_array( $edge ) || ! array_is_list( $edge ) || 2 !== count( $edge ) ) {
				throw new InvalidArgumentException(
					sprintf( 'Each Meta_State edge is a [ from, to ] pair of %s cases.', $enum ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
				);
			}
			[ $from, $to ] = $edge;
			$this->assert_case( $from );
			$this->assert_case( $to );
			if ( $from === $to ) {
				// Writing the same bytes changes 0 rows, so the edge could never succeed.
				throw new InvalidArgumentException(
					sprintf( 'Meta_State edge %s -> %s is a self-loop.', $from->value, $to->value ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
				);
			}
			$this->edges[ $from->value ][ $to->value ] = true;
		}
	}

	/**
	 * Refuse core and REST writes of the key.
	 *
	 * Opt in once, early (plugins_loaded or init). It adds `add_post_metadata`,
	 * `update_post_metadata`, and `delete_post_metadata` filters that return
	 * false for the key, so add_post_meta(), update_post_meta(),
	 * delete_post_meta(), and a REST `meta` write fail and leave the row.
	 * REST reports a meta error. This class writes with its own SQL, so it
	 * is not refused. wp_delete_post() still removes the row: core deletes meta
	 * by meta_id, which does not run these filters. Calling it again changes nothing.
	 */
	public function guard(): void {
		if ( $this->guarded ) {
			return;
		}
		$this->guarded = true;

		// MySQL matches meta_key without regard to case, so update_post_meta()
		// and delete_post_meta() with another case reach this row.
		$refuse = fn( mixed $check, mixed $object_id, mixed $meta_key ): mixed => is_string( $meta_key ) && 0 === strcasecmp( $meta_key, $this->meta_key ) ? false : $check;

		// Run last, so no other filter can allow the write again.
		foreach ( array( 'add_post_metadata', 'update_post_metadata', 'delete_post_metadata' ) as $hook ) {
			add_filter( $hook, $refuse, PHP_INT_MAX, 3 );
		}
	}

	/**
	 * Write the first row for a post.
	 *
	 * Call it from one writer, such as the request that creates the post.
	 * wp_postmeta has no unique index on (post_id, meta_key), so nothing makes
	 * concurrent inits exclusive. Under InnoDB REPEATABLE READ the NOT EXISTS
	 * subquery locks the post's index range. A concurrent init then either
	 * deadlocks or loses the check (in 9 of 17 test runs nothing deadlocked).
	 * init() runs the insert again after a deadlock, three tries in all, after a
	 * random wait of 2 to 12 ms so that the losers do not collide again. Under
	 * READ COMMITTED both can insert, and transition() then throws
	 * Meta_State_Error. Call it outside a database transaction, because a
	 * deadlock rolls the whole transaction back.
	 *
	 * @param int        $post_id Post ID.
	 * @param BackedEnum $state   Initial state.
	 * @return bool True when this call inserted the row. False only when a row already exists.
	 * @throws Meta_State_Error When no row was inserted and none exists, or a read fails.
	 */
	public function init( int $post_id, BackedEnum $state ): bool {
		global $wpdb;

		$this->assert_post_id( $post_id );
		$this->assert_case( $state );

		// Raw SQL: core has no insert-if-absent, and add_post_meta() lets two callers both insert.
		$insert = $wpdb->prepare(
			"INSERT INTO {$wpdb->postmeta} (post_id, meta_key, meta_value) SELECT %d, %s, %s FROM DUAL WHERE NOT EXISTS ( SELECT 1 FROM {$wpdb->postmeta} WHERE post_id = %d AND CAST(meta_key AS BINARY) = %s )",
			$post_id,
			$this->meta_key,
			(string) $state->value,
			$post_id,
			$this->meta_key
		);

		$tries = 0;
		do {
			if ( $tries > 0 ) {
				// Losers that retry at once deadlock again. In a live run of 20 racers on 150 posts, 2259 of 3000 calls ran out of tries without this wait.
				usleep( wp_rand( 2000, 12000 ) );
			}
			++$tries;
			$inserted = $wpdb->query( $insert );
			$error    = $wpdb->last_error;
		} while ( false === $inserted && str_contains( $error, 'Deadlock found' ) && $tries < self::MAX_INIT_TRIES );

		if ( $this->written( $post_id, $inserted ) ) {
			do_action( self::TRANSITIONED_ACTION, $post_id, $this->meta_key, null, $state );
			return true;
		}

		if ( array() === $this->read_rows( $post_id ) ) {
			throw new Meta_State_Error(
				sprintf( 'init() wrote no %s row for post %d and none exists after %d tries: %s', $this->meta_key, $post_id, $tries, '' === $error ? 'no database error' : $error ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
			);
		}
		return false;
	}

	/**
	 * Move a post from one state to another.
	 *
	 * The UPDATE matches the row's meta_id and the exact from value, so of any
	 * number of concurrent callers that start from the same state, one changes
	 * the row.
	 *
	 * @param int        $post_id Post ID.
	 * @param BackedEnum $from    State the post must be in.
	 * @param BackedEnum $to      State to move it to.
	 * @return bool True only when this call changed the row from $from to $to.
	 * @throws InvalidArgumentException When the edge is not in the table. Nothing is read or written.
	 * @throws Meta_State_Error When the post has more than one row for the key, or the read or the UPDATE fails.
	 */
	public function transition( int $post_id, BackedEnum $from, BackedEnum $to ): bool {
		global $wpdb;

		$this->assert_post_id( $post_id );
		$this->assert_case( $from );
		$this->assert_case( $to );
		if ( ! isset( $this->edges[ $from->value ][ $to->value ] ) ) {
			throw new InvalidArgumentException(
				sprintf( '%s has no edge %s -> %s.', $this->meta_key, $from->value, $to->value ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
			);
		}

		$rows = $this->read_rows( $post_id );

		if ( count( $rows ) > 1 ) {
			throw new Meta_State_Error(
				sprintf( 'Post %d has more than one %s row.', $post_id, $this->meta_key ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
			);
		}
		if ( 1 !== count( $rows ) || (string) $from->value !== $rows[0]->meta_value ) {
			return false;
		}

		// Raw SQL: update_post_meta() with a previous value is not a compare-and-swap.
		$changed = $wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->postmeta} SET meta_value = %s WHERE meta_id = %d AND post_id = %d AND CAST(meta_key AS BINARY) = %s AND CAST(meta_value AS BINARY) = %s",
				(string) $to->value,
				(int) $rows[0]->meta_id,
				$post_id,
				$this->meta_key,
				(string) $from->value
			)
		);

		if ( '' !== $wpdb->last_error ) {
			// A failed UPDATE may still have run, such as after a lost connection.
			wp_cache_delete( $post_id, 'post_meta' );
			wp_cache_set_posts_last_changed();
			throw $this->database_error( $post_id, 'UPDATE' );
		}

		if ( ! $this->written( $post_id, $changed ) ) {
			return false;
		}

		do_action( self::TRANSITIONED_ACTION, $post_id, $this->meta_key, $from, $to );
		return true;
	}

	/**
	 * Read the key's rows (two at most) from the primary database.
	 *
	 * @param int $post_id Post ID.
	 * @return object[] Rows with meta_id and meta_value.
	 */
	private function read_rows( int $post_id ): array {
		global $wpdb;

		// HyperDB (VIP mu-plugins, drop-ins/hyperdb/db.php) keeps $srtm as true,
		// which sends every read of the request to the primary (:351-353, :450), or
		// as an array of tables, which sends only reads of those tables there
		// (:450, :457-466). HyperDB sets the array entry itself after a write
		// (:452-456). Set the entry for postmeta, so a replica cannot return an
		// old state. Plain wpdb has one server, so there is nothing to set.
		if ( is_array( $wpdb->srtm ?? null ) ) {
			$wpdb->srtm[ $wpdb->postmeta ] = true;
		}

		// Raw SQL: get_post_meta() reads the cache and cannot return the row's meta_id.
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND CAST(meta_key AS BINARY) = %s LIMIT 2",
				$post_id,
				$this->meta_key
			)
		);
		if ( '' !== $wpdb->last_error ) {
			throw $this->database_error( $post_id, 'SELECT' );
		}

		return (array) $rows;
	}

	/**
	 * Build the error for a failed query, from wpdb's last error.
	 *
	 * @param int    $post_id Post ID.
	 * @param string $verb    SQL verb of the failed query.
	 */
	private function database_error( int $post_id, string $verb ): Meta_State_Error {
		global $wpdb;

		return new Meta_State_Error(
			sprintf( '%s of %s for post %d failed: %s', $verb, $this->meta_key, $post_id, $wpdb->last_error ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		);
	}

	/**
	 * Drop cached meta after a write attempt, and report whether it changed one row.
	 *
	 * @param int      $post_id Post ID.
	 * @param int|bool $result  wpdb::query() result.
	 */
	private function written( int $post_id, int|bool $result ): bool {
		wp_cache_delete( $post_id, 'post_meta' );
		if ( 1 !== $result ) {
			return false;
		}
		wp_cache_set_posts_last_changed();
		return true;
	}

	/**
	 * Refuse a case of another enum.
	 *
	 * @param mixed $state Candidate state.
	 * @throws InvalidArgumentException When it is not a case of the state enum.
	 */
	private function assert_case( mixed $state ): void {
		if ( ! $state instanceof $this->enum ) {
			throw new InvalidArgumentException(
				sprintf( 'Expected a %s case for %s, got %s.', $this->enum, $this->meta_key, get_debug_type( $state ) ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
			);
		}
	}

	/**
	 * Refuse a post ID that cannot own meta.
	 *
	 * @param int $post_id Post ID.
	 * @throws InvalidArgumentException When it is below 1.
	 */
	private function assert_post_id( int $post_id ): void {
		if ( $post_id < 1 ) {
			throw new InvalidArgumentException(
				sprintf( 'Meta_State needs a positive post ID, got %d.', $post_id ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
			);
		}
	}
}
