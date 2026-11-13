<?php
/**
 * WP-CLI command that installs the claims table.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

/**
 * Manage the `prc_claims` table that `Table_Claim_Store` uses.
 *
 * Run it at deploy, so the first request that calls `run_once()` does not create the table.
 * VIP asks for `dbDelta()` in an upgrade routine: https://docs.wpvip.com/databases/custom-tables/
 */
final class Claims_Command {

	/**
	 * Create or update the claims table. Safe to run again.
	 *
	 * ## OPTIONS
	 *
	 * [--all-sites]
	 * : On a network, install the table for every site. Without it, install for the site in --url.
	 *
	 * ## EXAMPLES
	 *
	 *     wp prc claims install --url=www.example.org/site
	 *     wp prc claims install --all-sites
	 *
	 * @param array<int, string>    $args       Positional arguments. None.
	 * @param array<string, string> $assoc_args Flags.
	 */
	public function install( array $args, array $assoc_args ): void {
		unset( $args );

		$results = Table_Claim_Store::install_sites( isset( $assoc_args['all-sites'] ) );
		$failed  = array();
		foreach ( $results as $blog_id => $installed ) {
			if ( $installed ) {
				\WP_CLI::log( sprintf( 'Site %d: the claims table is ready.', $blog_id ) );
			} else {
				$failed[] = $blog_id;
			}
		}

		if ( array() !== $failed ) {
			\WP_CLI::error( sprintf( 'The claims table is missing for site %s.', implode( ', ', $failed ) ) );
		}

		\WP_CLI::success( sprintf( 'The claims table is ready on %d site(s).', count( $results ) ) );
	}
}
