<?php
/**
 * A state that Meta_State cannot read or write safely.
 *
 * @package PRC\Primitives\Concurrency
 */

declare(strict_types=1);

namespace PRC\Primitives\Concurrency;

use RuntimeException;

/**
 * Thrown by `Meta_State`, so an ambiguous state or a database error never reads as "not in that state".
 *
 * Causes: two rows for the key, a database error on a read or on the `transition()` UPDATE,
 * and an `init()` that wrote no row when none exists.
 */
final class Meta_State_Error extends RuntimeException {}
