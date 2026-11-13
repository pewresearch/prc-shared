<?php
/**
 * Named claims with an atomic insert-if-absent.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

/**
 * Storage where the first add() of a name wins across every PHP node.
 */
interface Claim_Store {

	/**
	 * Insert a value only when the name is free.
	 *
	 * @param string $name  Unique name.
	 * @param string $value Value.
	 * @return bool|null True when inserted, false when the name exists, null on a storage error.
	 */
	public function add( string $name, string $value ): ?bool;

	/**
	 * Insert or replace a value.
	 *
	 * @param string $name  Unique name.
	 * @param string $value Value.
	 * @return bool False on a storage error.
	 */
	public function set( string $name, string $value ): bool;

	/**
	 * Read a value.
	 *
	 * @param string $name Unique name.
	 * @return string|null Null when the name is absent or the read fails.
	 */
	public function get( string $name ): ?string;

	/**
	 * Read a value, failing closed.
	 *
	 * @param string $name Unique name.
	 * @return string|null Null only when the name is absent.
	 * @throws Claim_Store_Error When the read fails.
	 */
	public function lookup( string $name ): ?string;
}
