<?php
/**
 * Claims stored as rows in a dedicated table.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

use InvalidArgumentException;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- INSERT IGNORE on the primary key is atomic across VIP nodes, and the object cache must not hide another node's insert.

/**
 * Rows in `{$wpdb->prefix}prc_claims`, one table per site, read and written without the object cache.
 *
 * Differs from `Options_Claim_Store` on purpose:
 * - Names compare byte for byte (`varbinary`). `Foo`, `foo`, and `foo ` are three claims.
 * - A value is stored byte for byte (`longblob`), and a stored empty string reads back as `''`, not `null`.
 * - An empty name throws.
 *
 * A name is at most 191 bytes (`strlen()`), not characters. A longer name throws before any write.
 *
 * `expires_at` is the purge deadline, one day after the last `add()` or `set()`. It is not a read filter: a row past it
 * still wins `add()` and still reads until `purge()` deletes it, so a claim lives at least one day.
 *
 * The table is installed three ways. `install()` is the explicit path: the `wp prc claims install` command runs it at
 * deploy, and an `admin_init` version check runs it on the first admin request after a release. First use is the
 * fallback: every method installs the table when the site's schema version is not current. `boot()` also installs it
 * when a site is created. A table that is missing while the version option is current (a restored database, a dropped
 * table) heals once: the failed query clears the option, installs, and runs again once.
 */
final class Table_Claim_Store implements Claim_Store {

	/**
	 * Table name without the site prefix.
	 */
	public const TABLE = 'prc_claims';

	/**
	 * Schema version. Raise it when the CREATE TABLE statement changes, so `dbDelta()` runs once per site.
	 */
	public const VERSION = '1';

	/**
	 * Per-site option holding the installed schema version.
	 */
	public const VERSION_OPTION = 'prc_claims_db_version';

	/**
	 * Seconds from the last write until a row may be purged.
	 */
	public const TTL = 86400;

	/**
	 * Action Scheduler hook and group of the daily purge.
	 */
	public const PURGE_HOOK  = 'prc_claims_purge';
	public const PURGE_GROUP = 'prc-claims';

	/**
	 * Seconds to wait before a request tries to schedule the purge again after Action Scheduler failed, for example because its tables are missing.
	 */
	public const SCHEDULE_BACKOFF = HOUR_IN_SECONDS;

	/**
	 * Seconds to wait before an admin request tries to install the table again after an install failed.
	 */
	public const INSTALL_BACKOFF = 5 * MINUTE_IN_SECONDS;

	/**
	 * MySQL error number of "Table doesn't exist".
	 */
	private const ER_NO_SUCH_TABLE = 1146;

	/**
	 * Length of claim_key in bytes.
	 */
	private const MAX_NAME_LENGTH = 191;

	/**
	 * Rows one purge DELETE removes, and the most batches one purge runs. A batch that comes back full means more rows wait.
	 */
	private const PURGE_BATCH       = 1000;
	private const PURGE_MAX_BATCHES = 100;

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
	 * Register the site hooks. PRC Shared calls it when it loads. Later calls do nothing, because WordPress keeps one entry per callback and priority.
	 */
	public static function boot(): void {
		// Core's own callback runs at priority 10 and creates the site's tables, so this runs after it.
		add_action( 'wp_initialize_site', array( self::class, 'install_for_site' ), 20 );
		add_action( 'admin_init', array( self::class, 'maybe_install' ) );
		add_filter( 'wpmu_drop_tables', array( self::class, 'add_to_drop_tables' ), 10, 2 );
		add_action( 'action_scheduler_init', array( self::class, 'schedule_purge' ) );
		add_action( self::PURGE_HOOK, array( self::class, 'run_purge' ) );

		if ( defined( 'WP_CLI' ) && WP_CLI && class_exists( 'WP_CLI' ) ) {
			\WP_CLI::add_command( 'prc claims', Claims_Command::class );
		}
	}

	/**
	 * Create or update the table for the current site.
	 *
	 * The version option is written only once the table exists, so a failed `dbDelta()` runs again on the next use.
	 *
	 * @return bool Whether the table exists.
	 */
	public static function install(): bool {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		// No charset clause: every column is binary or numeric, so a collation would change nothing and could only fail.
		$table = $wpdb->prefix . self::TABLE;
		dbDelta(
			"CREATE TABLE {$table} (
  claim_key varbinary(191) NOT NULL,
  value longblob NOT NULL,
  expires_at bigint(20) unsigned NOT NULL,
  PRIMARY KEY  (claim_key),
  KEY expires_at (expires_at)
);"
		);

		// SELECT, not SHOW TABLES: the WordPress test suite turns CREATE TABLE into a temporary table that SHOW TABLES skips.
		$suppressed = $wpdb->suppress_errors( true );
		$exists     = false !== $wpdb->query( "SELECT 1 FROM {$table} LIMIT 0" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- The table name is the site prefix plus a constant.
		$wpdb->suppress_errors( $suppressed );

		if ( $exists ) {
			update_option( self::VERSION_OPTION, self::VERSION, true );
		}

		return $exists;
	}

	/**
	 * Install the table for a site that was just created.
	 *
	 * @param object $site New site, a WP_Site. Typed as object because the class is not loaded on a single site.
	 */
	public static function install_for_site( object $site ): void {
		switch_to_blog( (int) $site->blog_id );
		try {
			self::install();
		} finally {
			restore_current_blog();
		}
	}

	/**
	 * Install the table on an admin request when this site's schema version is not current.
	 *
	 * After a failed install the next try waits `INSTALL_BACKOFF` seconds, so a database that refuses `CREATE TABLE` does not run `dbDelta()` on every admin request.
	 */
	public static function maybe_install(): void {
		if ( self::VERSION === get_option( self::VERSION_OPTION ) || false !== wp_cache_get( 'install_failed', self::PURGE_GROUP ) ) {
			return;
		}

		if ( ! self::install() ) {
			wp_cache_set( 'install_failed', 1, self::PURGE_GROUP, self::INSTALL_BACKOFF ); // phpcs:ignore WordPressVIPMinimum.Performance.LowExpiryCacheTime.CacheTimeUndetermined -- The constant is 300 seconds.
		}
	}

	/**
	 * Install the table for the current site, or for every site of a network.
	 *
	 * @param bool $all_sites Whether to visit every site of a network. A single site always installs for itself.
	 * @return array<int, bool> Whether the table exists, by site ID.
	 */
	public static function install_sites( bool $all_sites = false ): array {
		if ( ! $all_sites || ! is_multisite() ) {
			return array( get_current_blog_id() => self::install() );
		}

		$results = array();
		foreach ( get_sites( array( 'fields' => 'ids', 'number' => 0 ) ) as $blog_id ) {
			switch_to_blog( (int) $blog_id );
			try {
				$results[ (int) $blog_id ] = self::install();
			} finally {
				restore_current_blog();
			}
		}

		return $results;
	}

	/**
	 * Drop the table with the site, as core does for its own tables.
	 *
	 * @param string[] $tables  Tables to drop.
	 * @param int      $site_id Site being deleted.
	 * @return string[]
	 */
	public static function add_to_drop_tables( array $tables, int $site_id ): array {
		global $wpdb;
		$tables[ self::TABLE ] = $wpdb->get_blog_prefix( $site_id ) . self::TABLE;

		return $tables;
	}

	/**
	 * Schedule the daily purge for this site, once.
	 *
	 * The object cache answers most requests, so the Action Scheduler query runs about once every six hours.
	 * After a failed schedule a failure marker holds the next try back for `SCHEDULE_BACKOFF` seconds.
	 */
	public static function schedule_purge(): void {
		if ( ! function_exists( 'as_has_scheduled_action' ) || false !== wp_cache_get( 'purge_scheduled', self::PURGE_GROUP ) || false !== wp_cache_get( 'purge_schedule_failed', self::PURGE_GROUP ) ) {
			return;
		}

		if ( ! as_has_scheduled_action( self::PURGE_HOOK, array(), self::PURGE_GROUP ) ) {
			$scheduled = as_schedule_recurring_action( time() + HOUR_IN_SECONDS, DAY_IN_SECONDS, self::PURGE_HOOK, array(), self::PURGE_GROUP, true );
			if ( ! $scheduled ) {
				// Action Scheduler failed (for example its tables are missing). Each try runs failing queries, so wait before the next one.
				wp_cache_set( 'purge_schedule_failed', 1, self::PURGE_GROUP, self::SCHEDULE_BACKOFF ); // phpcs:ignore WordPressVIPMinimum.Performance.LowExpiryCacheTime.CacheTimeUndetermined -- The constant is one hour.
				return;
			}
		}
		wp_cache_set( 'purge_scheduled', 1, self::PURGE_GROUP, 6 * HOUR_IN_SECONDS );
	}

	/**
	 * The Action Scheduler callback. Skips a site that never installed the table.
	 *
	 * @throws Claim_Store_Error When a DELETE fails, so Action Scheduler records the job as failed.
	 */
	public static function run_purge(): void {
		if ( self::VERSION !== get_option( self::VERSION_OPTION ) ) {
			return;
		}
		if ( null === ( new self() )->purge() ) {
			throw new Claim_Store_Error( 'The prc_claims purge failed.' );
		}
	}

	/**
	 * Delete rows past `expires_at`, in batches of 1000 and at most 100 batches. A live row never matches.
	 *
	 * @param int $pause_microseconds Wait after each full batch, so the primary database can serve other queries.
	 * @return int|null Rows deleted, or null when a DELETE fails.
	 */
	public function purge( int $pause_microseconds = 100000 ): ?int {
		$table   = $this->table();
		$deleted = 0;

		for ( $batch = 0; $batch < self::PURGE_MAX_BATCHES; $batch++ ) {
			$rows = $this->write(
				$this->db->prepare(
					"DELETE FROM {$table} WHERE expires_at < %d ORDER BY expires_at ASC LIMIT %d",
					time(),
					self::PURGE_BATCH
				)
			);
			if ( false === $rows ) {
				return null;
			}
			$deleted += (int) $rows;
			if ( $rows < self::PURGE_BATCH ) {
				break;
			}
			usleep( $pause_microseconds );
		}

		return $deleted;
	}

	/**
	 * Atomic insert-if-absent.
	 *
	 * @param string $name  Claim name.
	 * @param string $value Claim value.
	 */
	public function add( string $name, string $value ): ?bool {
		$result = $this->write(
			$this->db->prepare(
				"INSERT IGNORE INTO {$this->table()} (claim_key, value, expires_at) VALUES (%s, %s, %d)",
				self::name( $name ),
				$value,
				time() + self::TTL
			)
		);
		if ( false === $result ) {
			return null;
		}

		return 1 === (int) $result;
	}

	/**
	 * Insert or replace, and push the purge deadline out by a day.
	 *
	 * @param string $name  Claim name.
	 * @param string $value Claim value.
	 */
	public function set( string $name, string $value ): bool {
		$result = $this->write(
			$this->db->prepare(
				"INSERT INTO {$this->table()} (claim_key, value, expires_at) VALUES (%s, %s, %d) ON DUPLICATE KEY UPDATE value = VALUES(value), expires_at = VALUES(expires_at)",
				self::name( $name ),
				$value,
				time() + self::TTL
			)
		);

		return false !== $result;
	}

	/**
	 * Read from the primary database.
	 *
	 * @param string $name Claim name.
	 */
	public function get( string $name ): ?string {
		$row = $this->select( $name );

		return null === $row ? null : (string) $row[0];
	}

	/**
	 * Read from the primary database, throwing when the query fails.
	 *
	 * @param string $name Claim name.
	 * @throws Claim_Store_Error When the query fails.
	 */
	public function lookup( string $name ): ?string {
		$row = $this->select( $name );
		if ( '' !== (string) $this->db->last_error ) {
			throw new Claim_Store_Error( 'A claims table read failed.' );
		}

		return null === $row ? null : (string) $row[0];
	}

	/**
	 * One row's value. `get_row()` keeps `''` apart from a missing row, which `get_var()` does not. `wpdb::query()` clears `last_error` first.
	 *
	 * @param string $name Claim name.
	 * @return array<int, mixed>|null
	 */
	private function select( string $name ): ?array {
		$sql = $this->db->prepare(
			"SELECT value FROM {$this->table()} WHERE claim_key = %s LIMIT 1",
			self::name( $name )
		);
		$row = $this->db->get_row( $sql, ARRAY_N );
		if ( null === $row && $this->heal_missing_table() ) {
			$row = $this->db->get_row( $sql, ARRAY_N );
		}

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Run one write query. When the table is missing, heal it once and run the query again once.
	 *
	 * @param string $sql Prepared SQL.
	 * @return int|bool Rows affected, or false when the query fails.
	 */
	private function write( string $sql ): int|bool {
		$result = $this->db->query( $sql );
		if ( false === $result && $this->heal_missing_table() ) {
			$result = $this->db->query( $sql );
		}

		return $result;
	}

	/**
	 * After a failed query, repair a table that does not exist although the schema version is current.
	 *
	 * Clears the version option and installs. The caller runs its query again once, so a table that cannot be created costs one install per call.
	 * A site whose version is not current already ran the first-use install before the query, so it does not install a second time.
	 *
	 * @return bool Whether the table exists again and the caller should retry.
	 */
	private function heal_missing_table(): bool {
		$dbh   = $this->db->dbh ?? null;
		$error = (string) $this->db->last_error;
		if ( '' === $error || self::VERSION !== get_option( self::VERSION_OPTION ) ) {
			return false;
		}

		$missing = ( $dbh instanceof \mysqli && self::ER_NO_SUCH_TABLE === $dbh->errno )
			|| ( str_contains( $error, "doesn't exist" ) && str_contains( $error, $this->db->prefix . self::TABLE ) );
		if ( ! $missing ) {
			return false;
		}

		delete_option( self::VERSION_OPTION );

		return self::install();
	}

	/**
	 * This site's table name, installing the table first when the site's schema version is not current.
	 *
	 * Read the prefix on every call: `switch_to_blog()` changes it. No static memo, so a blog never borrows another's answer.
	 */
	private function table(): string {
		if ( self::VERSION !== get_option( self::VERSION_OPTION ) ) {
			self::install();
		}

		return $this->db->prefix . self::TABLE;
	}

	/**
	 * A name that fits claim_key.
	 *
	 * A longer name is truncated by MySQL outside strict mode, so two names that share the first 191 bytes would share one claim, and the read would never find it.
	 *
	 * @param string $name Claim name.
	 * @throws InvalidArgumentException When the name is empty or too long.
	 */
	private static function name( string $name ): string {
		if ( '' === $name || strlen( $name ) > self::MAX_NAME_LENGTH ) {
			throw new InvalidArgumentException(
				sprintf( 'A claim name is 1 to %d bytes.', self::MAX_NAME_LENGTH )
			);
		}

		return $name;
	}
}
