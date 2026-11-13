<?php
/**
 * Run a callback once per key and keep its final result.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

use InvalidArgumentException;
use UnexpectedValueException;

/**
 * Claim read, lease, claim read, callback, fence, claim write, release.
 *
 * The claim name and the lease row name come from a hash of the key, so the
 * options table collation (case, accents, trailing spaces), invalid UTF-8, and
 * a long key cannot make two keys share a claim or a lease.
 *
 * Two reads: the first skips the lease for a key that is already done. The
 * second runs inside the lease, because a caller can read "absent", lose the
 * CPU while another caller finishes and releases, and then win the lease.
 *
 * The fence is Lease::owns() just before the store. It is a check, not a
 * lock. The claim store's first-writer-wins add() is what keeps one stored
 * result.
 *
 * This records one outcome once. It does not stop the callback from running
 * twice. A crash between the callback and the store, a lease that expires
 * during the callback, and the gap between the fence and the store each allow
 * a second run.
 */
final class Run_Once {

	/**
	 * Claim name prefix. Neither prefix starts with the other, so a claim name never equals a lease row name.
	 */
	public const CLAIM_PREFIX = 'prc_run_once_done_';

	/**
	 * Lease row prefix.
	 */
	public const LEASE_PREFIX = 'prc_run_once_lease_';

	/**
	 * Lease token prefix.
	 */
	private const TOKEN_PREFIX = 'run_once_';

	/**
	 * Bytes of the key that stay readable in a name. The rest of the name is the digest.
	 */
	private const READABLE_LENGTH = 40;

	/**
	 * Run $fn unless a final result for $key is already stored.
	 *
	 * @param string      $key   Unique, non-empty key. Any bytes and any length.
	 * @param callable    $fn    Returns `Run_Result::final()` or `Run_Result::retryable()`. It receives one argument, a
	 *                           `Closure(): bool` that checks the lease. It returns true while this run still holds the
	 *                           lease, and extends the lease by one TTL. It returns false once another run has taken the
	 *                           lease. A callback that is about to write or send something should call it first, and stop
	 *                           when it returns false. A callback that declares no parameter can ignore it.
	 * @param Claim_Store $store Where final results live.
	 * @param int         $ttl   Lease TTL in seconds, at least 1. Keep it above the longest run of $fn.
	 * @throws InvalidArgumentException When the key or the TTL is invalid. Nothing is read or written.
	 * @throws UnexpectedValueException When $fn does not return a final or retryable Run_Result. Nothing is stored.
	 */
	public static function run( string $key, callable $fn, Claim_Store $store, int $ttl ): Run_Result {
		self::validate( $key, $ttl );
		$name = self::claim_name( $key );
		$slot = self::lease_key( $key );

		$seen = self::read( $store, $name );
		if ( null !== $seen ) {
			return $seen;
		}

		$lease = new Lease( self::LEASE_PREFIX, $ttl, self::TOKEN_PREFIX );
		$token = $lease->acquire( $slot );
		if ( '' === $token ) {
			return new Run_Result( Run_Result::BUSY, '', false );
		}

		try {
			$seen = self::read( $store, $name );
			if ( null !== $seen ) {
				return $seen;
			}

			$result = $fn( static fn(): bool => $lease->refresh( $slot, $token ) );
			if ( ! $result instanceof Run_Result || ! in_array( $result->status, array( Run_Result::FINAL, Run_Result::RETRYABLE ), true ) ) {
				throw new UnexpectedValueException( 'run_once() callback must return Run_Result::final() or Run_Result::retryable().' );
			}

			if ( Run_Result::RETRYABLE === $result->status ) {
				return $result;
			}

			if ( ! $lease->owns( $slot, $token ) ) {
				return self::lost( $key, $result, sprintf( 'the lease was lost (TTL %d s)', $ttl ), true );
			}

			$added = $store->add( $name, $result->to_stored() );
			if ( null === $added ) {
				return new Run_Result( Run_Result::ERROR, $result->value, true );
			}
			if ( false === $added ) {
				return self::lost( $key, $result, 'another result won the claim', false );
			}

			return $result;
		} finally {
			$lease->release( $slot, $token );
		}
	}

	/**
	 * Claim name for a key: the claim prefix, a readable part of the key, and the SHA-256 digest of the whole key.
	 *
	 * The name is ASCII and at most 124 bytes, so it fits `wp_options.option_name` and `Table_Claim_Store`. The digest is lowercase hex.
	 * Two keys that differ in any byte have different digests, whatever the collation of the table. The readable part is only for a person who reads the table.
	 *
	 * @param string $key Key.
	 */
	public static function claim_name( string $key ): string {
		return self::CLAIM_PREFIX . self::slot( $key );
	}

	/**
	 * The key `run()` gives to `Lease`, which adds `LEASE_PREFIX` to build the lease row name.
	 *
	 * @param string $key Key.
	 */
	public static function lease_key( string $key ): string {
		return self::slot( $key );
	}

	/**
	 * Readable part, an underscore, and the digest.
	 *
	 * @param string $key Key.
	 */
	private static function slot( string $key ): string {
		$readable = substr( (string) preg_replace( '/[^A-Za-z0-9_-]/', '-', substr( $key, 0, self::READABLE_LENGTH ) ), 0, self::READABLE_LENGTH );

		return $readable . '_' . hash( 'sha256', $key );
	}

	/**
	 * Reject a key or a TTL before any read or write.
	 *
	 * @param string $key Key.
	 * @param int    $ttl Lease TTL in seconds.
	 * @throws InvalidArgumentException When either is invalid.
	 */
	private static function validate( string $key, int $ttl ): void {
		if ( '' === $key ) {
			throw new InvalidArgumentException( 'A run_once() key is not empty.' );
		}
		if ( $ttl < 1 ) {
			throw new InvalidArgumentException( 'A run_once() lease TTL is at least 1 second.' );
		}
	}

	/**
	 * Read the stored result for a claim name.
	 *
	 * @param Claim_Store $store Claim store.
	 * @param string      $name  Claim name.
	 * @return Run_Result|null Null only when nothing is stored. A failed read and a stored value that does not decode both return an error, because the callback may already have run.
	 */
	private static function read( Claim_Store $store, string $name ): ?Run_Result {
		try {
			$stored = $store->lookup( $name );
		} catch ( Claim_Store_Error ) {
			return new Run_Result( Run_Result::ERROR, '', false );
		}
		if ( null === $stored ) {
			return null;
		}

		return Run_Result::from_stored( $stored ) ?? new Run_Result( Run_Result::ERROR, '', false );
	}

	/**
	 * Log a result that was not stored and report it.
	 *
	 * @param string     $key         Key.
	 * @param Run_Result $result      What the callback returned.
	 * @param string     $reason      Why nothing was stored.
	 * @param bool       $lease_lost  Whether the reason is a lost lease.
	 */
	private static function lost( string $key, Run_Result $result, string $reason, bool $lease_lost ): Run_Result {
		error_log( sprintf( 'run_once: result for "%s" not stored: %s.', self::claim_name( $key ), $reason ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Runs after the callback, where a thrown error would hide the callback's result. The log shows the claim name, which is plain ASCII, not the raw key.

		if ( $lease_lost ) {
			/**
			 * Fires when a run_once() callback finished but its lease was gone, so its result was not stored.
			 *
			 * @param string $key Key.
			 */
			do_action( 'prc_primitives_run_once_lease_lost', $key );
		}

		return new Run_Result( Run_Result::LOST, $result->value, true );
	}
}
