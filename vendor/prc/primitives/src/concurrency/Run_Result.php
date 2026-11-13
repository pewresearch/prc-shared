<?php
/**
 * The outcome of one run_once() call, and the value a callback returns to it.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

use InvalidArgumentException;

/**
 * A callback returns `final()` or `retryable()`. `run_once()` returns any of the five statuses.
 *
 * Only a `final` result is stored. It is stored as `{"v":1,"value":"..."}`, which is never an empty string.
 */
final class Run_Result {

	/**
	 * Done. Stored, so every later call returns it without running the callback.
	 */
	public const FINAL = 'final';

	/**
	 * Not done. Never stored, so the next call runs the callback again.
	 */
	public const RETRYABLE = 'retryable';

	/**
	 * Another caller holds the lease. The callback did not run.
	 */
	public const BUSY = 'busy';

	/**
	 * The callback ran, but the lease was lost before the store, so nothing of this call was stored.
	 */
	public const LOST = 'lost';

	/**
	 * The claim store failed, or a stored result could not be read.
	 */
	public const ERROR = 'error';

	/**
	 * Version of the stored JSON.
	 */
	private const STORED_VERSION = 1;

	/**
	 * Construct.
	 *
	 * Public so `Run_Once` can build the `busy`, `lost`, and `error` outcomes. A callback uses `final()` or `retryable()`.
	 *
	 * @internal
	 *
	 * @param string $status One of the status constants.
	 * @param string $value  Result value. Valid UTF-8, because a final result is stored as JSON.
	 * @param bool   $ran    Whether the callback ran in this call. False when the result came from the store.
	 * @throws InvalidArgumentException When the status is unknown or the value is not valid UTF-8.
	 */
	public function __construct(
		public readonly string $status,
		public readonly string $value = '',
		public readonly bool $ran = true,
	) {
		if ( ! in_array( $status, array( self::FINAL, self::RETRYABLE, self::BUSY, self::LOST, self::ERROR ), true ) ) {
			throw new InvalidArgumentException( 'Unknown Run_Result status.' );
		}
		if ( ! mb_check_encoding( $value, 'UTF-8' ) ) {
			throw new InvalidArgumentException( 'A Run_Result value must be valid UTF-8.' );
		}
	}

	/**
	 * A finished result. `run_once()` stores it.
	 *
	 * @param string $value Result value.
	 */
	public static function final( string $value = '' ): self {
		return new self( self::FINAL, $value );
	}

	/**
	 * A result that must not stop the next call from running the callback.
	 *
	 * @param string $value Result value, for example a reason.
	 */
	public static function retryable( string $value = '' ): self {
		return new self( self::RETRYABLE, $value );
	}

	/**
	 * The string `run_once()` writes to the claim store.
	 *
	 * @internal
	 */
	public function to_stored(): string {
		return (string) wp_json_encode(
			array(
				'v'     => self::STORED_VERSION,
				'value' => $this->value,
			)
		);
	}

	/**
	 * Read a stored final result. Null when the string is not one.
	 *
	 * @internal
	 *
	 * @param string $stored Value read from the claim store.
	 */
	public static function from_stored( string $stored ): ?self {
		$data = json_decode( $stored, true );
		if ( ! is_array( $data ) || self::STORED_VERSION !== ( $data['v'] ?? null ) || ! is_string( $data['value'] ?? null ) ) {
			return null;
		}

		return new self( self::FINAL, $data['value'], false );
	}
}
