<?php
/**
 * Concurrency functions for consumer plugins.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

/**
 * Register the claims table hooks: install on site creation, drop with the site, and the daily purge. PRC Shared calls it when it loads. Later calls do nothing.
 */
function boot(): void {
	Table_Claim_Store::boot();
}

/**
 * Run $fn once per key and keep its final result.
 *
 * @param string      $key   Unique, non-empty key. Any bytes and any length.
 * @param callable    $fn    Returns `Run_Result::final()` or `Run_Result::retryable()`. It receives a `Closure(): bool` that
 *                           returns true while this run still holds the lease and extends it by one TTL. See `Run_Once::run()`.
 * @param Claim_Store $store Where final results live, for example `new Table_Claim_Store()`.
 * @param int         $ttl   Lease TTL in seconds. Keep it above the longest run of $fn.
 */
function run_once( string $key, callable $fn, Claim_Store $store, int $ttl ): Run_Result {
	return Run_Once::run( $key, $fn, $store, $ttl );
}
