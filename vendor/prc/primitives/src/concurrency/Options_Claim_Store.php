<?php
/**
 * Claims stored as rows in the options table.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

use InvalidArgumentException;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- add_option() reads then writes (ON DUPLICATE KEY UPDATE), so it is not atomic across VIP nodes. INSERT IGNORE on the unique option_name is, and the object cache must not hide another node's insert.

/**
 * Rows in `{$wpdb->options}` with autoload off, read and written without the options cache.
 *
 * Row: option_name is the claim name as given, option_value is the value.
 * Do not prefix or encode the name: a row that an earlier release wrote must
 * still be found, and still win add(), after a deploy.
 */
final class Options_Claim_Store implements Claim_Store {

	/**
	 * Length of wp_options.option_name.
	 */
	private const MAX_NAME_LENGTH = 191;

	/**
	 * Database handle.
	 *
	 * @var \wpdb
	 */
	private object $db;

	/**
	 * Use the global database handle.
	 *
	 * @param object|null $db Database handle. Null uses the global `$wpdb`.
	 */
	public function __construct( ?object $db = null ) {
		global $wpdb;
		$this->db = $db ?? $wpdb;
		if ( method_exists( $this->db, 'send_reads_to_masters' ) ) {
			$this->db->send_reads_to_masters();
		}
	}

	/**
	 * Atomic insert-if-absent.
	 *
	 * @param string $name  Option name.
	 * @param string $value Option value.
	 */
	public function add( string $name, string $value ): ?bool {
		$result = $this->db->query(
			$this->db->prepare(
				"INSERT IGNORE INTO {$this->db->options} (option_name, option_value, autoload) VALUES (%s, %s, 'off')",
				self::name( $name ),
				$value
			)
		);
		if ( false === $result ) {
			return null;
		}

		return 1 === (int) $result;
	}

	/**
	 * Insert or replace.
	 *
	 * @param string $name  Option name.
	 * @param string $value Option value.
	 */
	public function set( string $name, string $value ): bool {
		$result = $this->db->query(
			$this->db->prepare(
				"INSERT INTO {$this->db->options} (option_name, option_value, autoload) VALUES (%s, %s, 'off') ON DUPLICATE KEY UPDATE option_value = VALUES(option_value)",
				self::name( $name ),
				$value
			)
		);
		return false !== $result;
	}

	/**
	 * Read from the database, not the options cache.
	 *
	 * @param string $name Option name.
	 */
	public function get( string $name ): ?string {
		$value = $this->select( $name );
		return is_string( $value ) ? $value : null;
	}

	/**
	 * Read from the database, throwing when the query fails.
	 *
	 * @param string $name Option name.
	 * @throws Claim_Store_Error When the query fails.
	 */
	public function lookup( string $name ): ?string {
		$value = $this->select( $name );
		if ( '' !== (string) $this->db->last_error ) {
			throw new Claim_Store_Error( 'An options table read failed.' );
		}
		return is_string( $value ) ? $value : null;
	}

	/**
	 * One option row's value. `wpdb::query()` clears `last_error` first.
	 *
	 * @param string $name Option name.
	 */
	private function select( string $name ): mixed {
		return $this->db->get_var(
			$this->db->prepare(
				"SELECT option_value FROM {$this->db->options} WHERE option_name = %s LIMIT 1",
				self::name( $name )
			)
		);
	}

	/**
	 * A name that fits wp_options.option_name.
	 *
	 * INSERT IGNORE truncates a longer name, so two names that share the first
	 * 191 characters would share one claim, and lookup() would never find it.
	 *
	 * @param string $name Option name.
	 * @throws InvalidArgumentException When the name is too long.
	 */
	private static function name( string $name ): string {
		if ( strlen( $name ) > self::MAX_NAME_LENGTH ) {
			throw new InvalidArgumentException(
				sprintf( 'Claim name is longer than %d characters: %s', self::MAX_NAME_LENGTH, $name ) // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
			);
		}
		return $name;
	}
}
