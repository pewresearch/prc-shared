<?php
/**
 * Signed machine-fetch tickets.
 *
 * @package PRC\Primitives\Signed_Fetch
 */

declare(strict_types=1);

namespace PRC\Primitives\Signed_Fetch;

use WP_Post;
use WP_Query;

/**
 * Short-lived HMAC tickets that let trusted render services (screenshots, PDFs)
 * fetch one post's front end, including drafts, without a WordPress session.
 *
 * Invariants:
 * - A ticket binds purpose, blog, post, and expiry. A ticket minted for one
 *   purpose or post never authorizes another.
 * - Tickets are minted only by server code, never from UI.
 * - Unlocking a draft changes only this request's copy of the post. The object
 *   cache keeps the stored status.
 */
final class Signed_Fetch {

	public const SIGNATURE_VAR = 'prc_sf';

	public const EXPIRES_VAR = 'prc_sf_exp';

	public const PURPOSE_VAR = 'prc_sf_for';

	public const DEFAULT_TTL = 900;

	/**
	 * Statuses a valid ticket may render on the front end.
	 *
	 * @var string[]
	 */
	public const UNLOCKABLE_STATUSES = array( 'draft', 'pending', 'future' );

	private static bool $booted = false;

	/**
	 * Verification results for this request, keyed by "purpose|post_id".
	 *
	 * @var array<string, bool>
	 */
	private static array $verified = array();

	private static int $draft_render_post_id = 0;

	private static int $signed_render_post_id = 0;

	public static function boot(): void {
		if ( self::$booted ) {
			return;
		}
		self::$booted = true;

		add_action( 'pre_get_posts', array( __CLASS__, 'maybe_unlock_main_query' ) );
	}

	/**
	 * Append a ticket for $post_id and $purpose to $url.
	 *
	 * @param string $url     Absolute URL the render service will fetch.
	 * @param string $purpose Consumer slug, e.g. `print` or `chart-export`.
	 * @param int    $post_id Post the ticket unlocks.
	 * @param int    $ttl     Seconds until expiry.
	 */
	public static function sign_url( string $url, string $purpose, int $post_id, int $ttl = self::DEFAULT_TTL ): string {
		$purpose = sanitize_key( $purpose );
		$expires = time() + max( 1, $ttl );

		return add_query_arg(
			array(
				self::SIGNATURE_VAR => self::signature( $purpose, $post_id, $expires ),
				self::EXPIRES_VAR   => $expires,
				self::PURPOSE_VAR   => $purpose,
			),
			$url
		);
	}

	/**
	 * Whether the current request carries a valid, unexpired ticket for $post_id and $purpose.
	 *
	 * @param int    $post_id Post the caller is about to render.
	 * @param string $purpose Consumer slug the ticket must name.
	 */
	public static function request_authorizes( int $post_id, string $purpose ): bool {
		$purpose = sanitize_key( $purpose );
		$key     = $purpose . '|' . $post_id;

		if ( ! isset( self::$verified[ $key ] ) ) {
			self::$verified[ $key ] = self::verify_request( $post_id, $purpose );

			if ( self::$verified[ $key ] && 0 === self::$signed_render_post_id ) {
				self::$signed_render_post_id = $post_id;
			}
		}

		return self::$verified[ $key ];
	}

	/**
	 * Whether this request renders an unpublished post through a valid ticket.
	 *
	 * Consumers use it to include draft content the post references (synced
	 * charts, package chapters) that an anonymous request would otherwise skip.
	 */
	public static function is_signed_draft_render(): bool {
		return self::$draft_render_post_id > 0;
	}

	/**
	 * Whether this request carries a valid ticket that a consumer checked, whatever the post status.
	 *
	 * Set by the first successful request_authorizes() call. That covers the
	 * main singular query and routes that serve before it runs, such as
	 * print-engine's `/print`. The client is a render service, not a reader,
	 * so consumers use it to skip reader analytics.
	 */
	public static function is_signed_render(): bool {
		return self::$signed_render_post_id > 0;
	}

	/**
	 * Add the one-shot unlock filter when the main singular query carries a ticket.
	 *
	 * @hook pre_get_posts
	 *
	 * @param WP_Query $query Query being prepared.
	 */
	public static function maybe_unlock_main_query( $query ): void {
		if ( ! $query instanceof WP_Query || ! $query->is_main_query() || ! $query->is_singular() || is_admin() ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- signed machine ticket, verified in unlock_signed_post().
		if ( ! isset( $_GET[ self::SIGNATURE_VAR ] ) ) {
			return;
		}

		add_filter( 'posts_results', array( __CLASS__, 'unlock_signed_post' ), 10, 2 );
	}

	/**
	 * Swap the queried draft for an in-request published copy when the ticket matches it.
	 *
	 * The copy is a clone so WP_Query primes the object cache from the database
	 * instead of caching the unlocked status.
	 *
	 * @hook posts_results
	 *
	 * @param WP_Post[] $posts Query results.
	 * @param WP_Query  $query Query.
	 * @return WP_Post[]
	 */
	public static function unlock_signed_post( $posts, $query ) {
		if ( ! $query instanceof WP_Query || ! $query->is_main_query() ) {
			return $posts;
		}
		remove_filter( 'posts_results', array( __CLASS__, 'unlock_signed_post' ), 10 );

		if ( ! is_array( $posts ) || 1 !== count( $posts ) || ! $posts[0] instanceof WP_Post ) {
			return $posts;
		}

		$post = $posts[0];
		if ( ! self::request_authorizes( (int) $post->ID, self::requested_purpose() ) ) {
			return $posts;
		}

		if ( ! in_array( $post->post_status, self::UNLOCKABLE_STATUSES, true ) ) {
			return $posts;
		}

		$unlocked              = clone $post;
		$unlocked->post_status = 'publish';
		$posts[0]              = $unlocked;

		self::$draft_render_post_id = (int) $post->ID;
		self::send_private_response_headers();

		$post_id = (int) $post->ID;
		add_filter(
			'map_meta_cap',
			static function ( $caps, $cap, $user_id, $args ) use ( $post_id ) {
				if ( 'read_post' === $cap && isset( $args[0] ) && (int) $args[0] === $post_id ) {
					return array( 'exist' );
				}
				return $caps;
			},
			10,
			4
		);
		add_filter( 'redirect_canonical', '__return_false' );
		add_filter( 'comments_open', '__return_false' );
		add_filter( 'pings_open', '__return_false' );

		return $posts;
	}

	/**
	 * Clear request state. Tests only.
	 */
	public static function reset(): void {
		self::$verified              = array();
		self::$draft_render_post_id  = 0;
		self::$signed_render_post_id = 0;
		remove_filter( 'posts_results', array( __CLASS__, 'unlock_signed_post' ), 10 );
	}

	private static function verify_request( int $post_id, string $purpose ): bool {
		if ( $post_id <= 0 || '' === $purpose || self::requested_purpose() !== $purpose ) {
			return false;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- signed machine ticket, not a form nonce.
		$signature_raw = isset( $_GET[ self::SIGNATURE_VAR ] ) ? wp_unslash( $_GET[ self::SIGNATURE_VAR ] ) : '';
		$expires_raw   = isset( $_GET[ self::EXPIRES_VAR ] ) ? wp_unslash( $_GET[ self::EXPIRES_VAR ] ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		if ( ! is_string( $signature_raw ) || '' === $signature_raw || ! is_string( $expires_raw ) || ! ctype_digit( $expires_raw ) ) {
			return false;
		}

		$expires = (int) $expires_raw;
		if ( $expires < time() ) {
			return false;
		}

		return hash_equals( self::signature( $purpose, $post_id, $expires ), sanitize_text_field( $signature_raw ) );
	}

	private static function requested_purpose(): string {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- signed machine ticket, verified by the caller.
		$raw = isset( $_GET[ self::PURPOSE_VAR ] ) ? wp_unslash( $_GET[ self::PURPOSE_VAR ] ) : '';

		return is_string( $raw ) ? sanitize_key( $raw ) : '';
	}

	private static function signature( string $purpose, int $post_id, int $expires ): string {
		$payload = implode( '|', array( $purpose, get_current_blog_id(), $post_id, $expires ) );

		return hash_hmac( 'sha256', $payload, self::signing_key() );
	}

	private static function signing_key(): string {
		/**
		 * Filters the HMAC key for signed machine-fetch tickets.
		 *
		 * @param string $key Key material. Default the site's auth salt.
		 */
		return (string) apply_filters( 'prc_signed_fetch_key', wp_salt( 'auth' ) );
	}

	private static function send_private_response_headers(): void {
		add_filter( 'wp_robots', 'wp_robots_no_robots' );

		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}

		if ( headers_sent() ) {
			return;
		}

		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow' );
	}
}
