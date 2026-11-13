<?php
/**
 * A claim read that failed, as opposed to a name that is absent.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

use RuntimeException;

/**
 * Thrown by `Claim_Store::lookup()`, so a database error never reads as "absent".
 */
final class Claim_Store_Error extends RuntimeException {}
