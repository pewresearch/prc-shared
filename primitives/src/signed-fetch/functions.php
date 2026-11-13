<?php
/**
 * Signed machine-fetch functions for consumer plugins.
 *
 * @package PRC\Primitives\Signed_Fetch
 */

declare(strict_types=1);

namespace PRC\Primitives\Signed_Fetch;

/**
 * Register the request hooks. PRC Shared calls it when it loads. Later calls do nothing.
 */
function boot(): void {
	Signed_Fetch::boot();
}

/**
 * Append a short-lived ticket that lets a render service fetch $url for $post_id.
 *
 * @param string $url     Absolute URL to sign.
 * @param string $purpose Consumer slug, e.g. `print` or `chart-export`.
 * @param int    $post_id Post the ticket unlocks.
 * @param int    $ttl     Seconds until expiry.
 */
function sign_url( string $url, string $purpose, int $post_id, int $ttl = Signed_Fetch::DEFAULT_TTL ): string {
	return Signed_Fetch::sign_url( $url, $purpose, $post_id, $ttl );
}

/**
 * Whether the current request carries a valid ticket for $post_id and $purpose.
 *
 * @param int    $post_id Post being rendered.
 * @param string $purpose Consumer slug the ticket must name.
 */
function request_authorizes( int $post_id, string $purpose ): bool {
	return Signed_Fetch::request_authorizes( $post_id, $purpose );
}

/**
 * Whether this request renders an unpublished post through a valid ticket.
 */
function is_signed_draft_render(): bool {
	return Signed_Fetch::is_signed_draft_render();
}

/**
 * Whether a valid ticket authorized this request's main post, whatever its status.
 */
function is_signed_render(): bool {
	return Signed_Fetch::is_signed_render();
}
