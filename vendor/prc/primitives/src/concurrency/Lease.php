<?php
/**
 * Per-key lease stored as one row in the options table.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

use InvalidArgumentException;

/**
 * Options-table compare-and-swap lease with an owner token and a heartbeat.
 *
 * Row: option_name "{option_prefix}{key}", option_value "{token}|{expiry_unix}",
 * autoload "no". Do not change the name or the value format: a row that an
 * earlier release wrote must still block across a deploy.
 *
 * Reads go through direct SQL, never get_option(), so a stale options cache
 * cannot report a lease as free or as owned. Every write deletes the options
 * cache entry for the row.
 *
 * A lease does not fence the work it guards. owns() checks the token, not the
 * expiry, and a holder that runs past the TTL without refresh() can lose the
 * row to a new holder while it still works.
 */
final class Lease {

	/**
	 * Length of wp_options.option_name.
	 */
	private const MAX_OPTION_NAME_LENGTH = 191;

	/**
	 * Construct.
	 *
	 * @param string $option_prefix Prefix for the option_name row (e.g. prc_email_mandrill_lock_).
	 * @param int    $ttl_seconds   Freshness window before the lease may be reclaimed.
	 * @param string $token_prefix  Optional uniqid() prefix (e.g. report_).
	 */
	public function __construct(
		private readonly string $option_prefix,
		private readonly int $ttl_seconds,
		private readonly string $token_prefix = '',
	) {}

	/**
	 * Whether a fresh (non-expired) lease is held for a key.
	 *
	 * @param int|string $key Post ID or other resource key.
	 */
	public function is_held( int|string $key ): bool {
		return $this->expiry( $this->read_value( $key ) ) >= time();
	}

	/**
	 * Atomically acquire the lease for a key.
	 *
	 * The first holder INSERTs the row, and the UNIQUE option_name index
	 * rejects a second insert. An expired row is reclaimed with a
	 * compare-and-swap UPDATE on its exact value, so one worker wins.
	 *
	 * @param int|string $key Post ID or other resource key.
	 * @return string Owner token on success, or '' when a fresh lease is held.
	 */
	public function acquire( int|string $key ): string {
		global $wpdb;

		$option_name = $this->option_name( $key );
		$token       = uniqid( $this->token_prefix, true );
		$new_value   = $token . '|' . ( time() + $this->ttl_seconds );
		$existing    = $this->read_value( $key );

		if ( '' === $existing ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$inserted = $wpdb->insert(
				$wpdb->options,
				array(
					'option_name'  => $option_name,
					'option_value' => $new_value,
					'autoload'     => 'no',
				)
			);
			if ( $inserted ) {
				wp_cache_delete( $option_name, 'options' );
				return $token;
			}
			$existing = $this->read_value( $key );
		}

		if ( $this->expiry( $existing ) >= time() ) {
			return '';
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$reclaimed = $wpdb->update(
			$wpdb->options,
			array( 'option_value' => $new_value ),
			array(
				'option_name'  => $option_name,
				'option_value' => $existing,
			)
		);

		if ( $reclaimed ) {
			wp_cache_delete( $option_name, 'options' );
			return $token;
		}

		return '';
	}

	/**
	 * Whether the row still carries this token. Does not check the expiry.
	 *
	 * @param int|string $key   Post ID or other resource key.
	 * @param string     $token Owner token returned by acquire().
	 */
	public function owns( int|string $key, string $token ): bool {
		if ( '' === $token ) {
			return false;
		}
		return str_starts_with( $this->read_value( $key ), $token . '|' );
	}

	/**
	 * Extend the expiry, but only while this token still owns the row.
	 *
	 * @param int|string $key   Post ID or other resource key.
	 * @param string     $token Owner token returned by acquire().
	 * @return bool True if this token owns the row after the refresh.
	 */
	public function refresh( int|string $key, string $token ): bool {
		global $wpdb;

		if ( '' === $token ) {
			return false;
		}

		$current = $this->read_value( $key );
		if ( ! str_starts_with( $current, $token . '|' ) ) {
			return false;
		}

		$option_name = $this->option_name( $key );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->update(
			$wpdb->options,
			array( 'option_value' => $token . '|' . ( time() + $this->ttl_seconds ) ),
			array(
				'option_name'  => $option_name,
				'option_value' => $current,
			)
		);
		wp_cache_delete( $option_name, 'options' );

		// The affected-row count is 0 when the new expiry equals the old one,
		// so read the row again instead of trusting it.
		return $this->owns( $key, $token );
	}

	/**
	 * Delete the row, but only while this token still owns it.
	 *
	 * @param int|string $key   Post ID or other resource key.
	 * @param string     $token Owner token returned by acquire().
	 * @return bool True if this call deleted the row.
	 */
	public function release( int|string $key, string $token ): bool {
		global $wpdb;

		if ( '' === $token ) {
			return false;
		}

		$current = $this->read_value( $key );
		if ( ! str_starts_with( $current, $token . '|' ) ) {
			return false;
		}

		$option_name = $this->option_name( $key );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$deleted = $wpdb->delete(
			$wpdb->options,
			array(
				'option_name'  => $option_name,
				'option_value' => $current,
			)
		);
		wp_cache_delete( $option_name, 'options' );

		return 1 === $deleted;
	}

	/**
	 * Delete the row whoever owns it. For reset and CLI paths only; a live
	 * holder loses mutual exclusion.
	 *
	 * @param int|string $key Post ID or other resource key.
	 */
	public function clear( int|string $key ): void {
		global $wpdb;

		$option_name = $this->option_name( $key );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->delete( $wpdb->options, array( 'option_name' => $option_name ) );
		wp_cache_delete( $option_name, 'options' );
	}

	/**
	 * Option name holding the lease for a key.
	 *
	 * Without strict SQL mode MySQL truncates a longer name on insert. Later
	 * updates and deletes match the full name, never the stored row, so the
	 * lease would stay held forever.
	 *
	 * @param int|string $key Post ID or other resource key.
	 * @throws InvalidArgumentException When the name exceeds wp_options.option_name.
	 */
	private function option_name( int|string $key ): string {
		$option_name = $this->option_prefix . $key;
		if ( strlen( $option_name ) > self::MAX_OPTION_NAME_LENGTH ) {
			throw new InvalidArgumentException(
				sprintf( 'Lease option name is longer than %d characters: %s', self::MAX_OPTION_NAME_LENGTH, $option_name ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
			);
		}
		return $option_name;
	}

	/**
	 * Read the raw "token|expiry" value straight from the DB.
	 *
	 * @param int|string $key Post ID or other resource key.
	 * @return string Empty string when no row exists.
	 */
	private function read_value( int|string $key ): string {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$value = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT option_value FROM {$wpdb->options} WHERE option_name = %s",
				$this->option_name( $key )
			)
		);
		return null === $value ? '' : (string) $value;
	}

	/**
	 * Parse the expiry timestamp out of a "token|expiry" value.
	 *
	 * @param string $lease_value Stored value.
	 * @return int Expiry timestamp, or 0 when unparseable or absent.
	 */
	private function expiry( string $lease_value ): int {
		if ( '' === $lease_value ) {
			return 0;
		}
		$parts  = explode( '|', $lease_value );
		$expiry = end( $parts );
		return is_numeric( $expiry ) ? (int) $expiry : 0;
	}
}
