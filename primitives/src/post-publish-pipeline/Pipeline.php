<?php
/**
 * Standard lifecycle hooks for posts.
 *
 * @package PRC\Primitives\Post_Publish_Pipeline
 */

declare(strict_types=1);

namespace PRC\Primitives\Post_Publish_Pipeline;

use WP_Error;
use WP_Post;
use WP_REST_Request;

final class Pipeline {

	public const ASYNC_DISPATCH_HOOK = 'prc_platform_post_publish_pipeline_async_dispatch';

	public const ASYNC_GROUP = 'prc-post-publish-pipeline';

	private const ASYNC_EVENTS = array(
		'publish',
		'update',
		'unpublish',
		'untrash',
		'trash',
		'incremental_save',
	);

	private const DEFAULT_POST_TYPES = array(
		'post',
		'feature',
		'quiz',
		'fact-sheet',
		'short-read',
		'events',
		'mini-course',
		'press-release',
		'block_module',
		'collections',
		'prc_newsletter',
	);

	private const LABEL_FALLBACKS = array(
		'fact-sheet'         => 'Fact Sheet',
		'interactives'       => 'Feature',
		'quiz'               => 'Quiz',
		'short-read'         => 'Short Read',
		'events'             => 'Event',
		'dataset'            => 'Dataset',
		'prc_newsletter'     => 'Newsletter',
		'prc_email_campaign' => 'Newsletter',
		'press-release'      => 'Press Release',
		'decoded'            => 'Decoded',
		'collections'        => 'Collection',
	);

	private static ?self $instance = null;

	private static int $async_editor_id = 0;

	public static function boot(): void {
		if ( null !== self::$instance ) {
			return;
		}
		self::$instance = new self();

		if ( ! ( defined( 'WP_CLI' ) && \WP_CLI ) ) {
			add_filter( 'prc_platform_wp_post_object', self::$instance->apply_extra_wp_post_object_fields( ... ), 1, 1 );
		}
		add_action( 'rest_api_init', self::$instance->register_rest_fields( ... ) );
		add_filter( 'rest_post_query', self::$instance->add_post_parent_request_to_rest_api( ... ), 10, 2 );
		add_action( 'wp_after_insert_post', self::$instance->process_post_publish_pipeline( ... ), 10, 4 );
		add_action( self::ASYNC_DISPATCH_HOOK, self::$instance->dispatch_async_event( ... ), 10, 3 );
		add_action( Pre_Publish::HOOK, Pre_Publish::run( ... ), 10, 1 );
	}

	/**
	 * Fire the pre-publish hooks for a post now, without checking its schedule.
	 *
	 * @param int $post_id Post ID.
	 */
	public static function dispatch_pre_publish( int $post_id ): void {
		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post || null === self::$instance || in_array( $post->post_status, array( 'publish', 'trash' ), true ) ) {
			return;
		}

		$ref_post = self::$instance->setup_extra_wp_post_object_fields( $post );
		if ( is_wp_error( $ref_post ) ) {
			return;
		}

		$has_blocks = has_blocks( $post );
		$post_type  = $post->post_type;

		/**
		 * Fires a lead time before a scheduled post publishes. The post and anything it references are still unpublished.
		 *
		 * @param object $ref_post   The post object with extra fields.
		 * @param bool   $has_blocks Whether the post content has blocks.
		 */
		do_action( 'prc_platform_on_pre_publish', $ref_post, $has_blocks );
		do_action( "prc_platform_on_{$post_type}_pre_publish", $ref_post, $has_blocks );
	}

	public static function enqueue_async_event( int $post_id, string $event ): void {
		if ( $post_id <= 0 || ! in_array( $event, self::ASYNC_EVENTS, true ) ) {
			return;
		}

		$post_type = get_post_type( $post_id );
		if ( ! $post_type ) {
			return;
		}

		/**
		 * Filter whether to enqueue the async tier job for this lifecycle event.
		 *
		 * Unlike `prc_platform_post_publish_pipeline_should_process`, returning false here keeps the
		 * sync `prc_platform_on_*` hooks. It skips `prc_platform_post_publish_pipeline_async_event_enqueued`
		 * and the `prc_platform_async_on_*` job.
		 *
		 * @param bool   $should_enqueue Whether to enqueue. Default true.
		 * @param int    $post_id        Post ID.
		 * @param string $event          Lifecycle event slug.
		 * @param string $post_type      Post type.
		 */
		if ( ! apply_filters( 'prc_platform_post_publish_pipeline_should_enqueue_async', true, $post_id, $event, $post_type ) ) {
			return;
		}

		$editor_id = (int) get_current_user_id();

		/**
		 * Fires when an async tier lifecycle event is queued for a post.
		 *
		 * Covers every caller of enqueue_async_event(), including writes that suppressed
		 * the sync tier (e.g. report-package chapters published from their parent).
		 * Use it to schedule dedicated jobs that must not wait behind the shared async job.
		 *
		 * @param int    $post_id   Post ID.
		 * @param string $event     Lifecycle event slug.
		 * @param int    $editor_id User ID of the acting editor.
		 */
		do_action( 'prc_platform_post_publish_pipeline_async_event_enqueued', $post_id, $event, $editor_id );

		if ( function_exists( 'as_enqueue_async_action' ) ) {
			as_enqueue_async_action(
				self::ASYNC_DISPATCH_HOOK,
				array(
					'post_id'   => $post_id,
					'event'     => $event,
					'editor_id' => $editor_id,
				),
				self::ASYNC_GROUP,
				true
			);
			return;
		}

		self::$instance?->dispatch_async_event( $post_id, $event, $editor_id );
	}

	public static function get_async_editor_id(): int {
		return self::$async_editor_id;
	}

	private function dispatch_async_event( $post_id, $event, $editor_id = 0 ): void {
		$post_id   = (int) $post_id;
		$event     = (string) $event;
		$editor_id = (int) $editor_id;

		if ( $post_id <= 0 || ! in_array( $event, self::ASYNC_EVENTS, true ) ) {
			return;
		}

		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post ) {
			return;
		}

		if ( ! in_array( $post->post_type, $this->get_allowed_post_types(), true ) ) {
			return;
		}

		if ( ! self::event_matches_status( $event, $post->post_status ) ) {
			return;
		}

		$ref_post = $this->setup_extra_wp_post_object_fields( $post );
		if ( is_wp_error( $ref_post ) ) {
			return;
		}

		$has_blocks            = has_blocks( $post );
		$post_type             = $post->post_type;
		self::$async_editor_id = $editor_id;

		do_action( "prc_platform_async_on_{$event}", $ref_post, $has_blocks );
		do_action( "prc_platform_async_on_{$post_type}_{$event}", $ref_post, $has_blocks );

		self::$async_editor_id = 0;
	}

	/**
	 * Whether a queued event still describes the post. A publish job for a post that is now a draft is stale.
	 *
	 * @param string $event  One of ASYNC_EVENTS.
	 * @param string $status Current post status.
	 */
	private static function event_matches_status( string $event, string $status ): bool {
		return match ( $event ) {
			'incremental_save'             => in_array( $status, array( 'draft', 'publish' ), true ),
			'publish', 'update', 'untrash' => 'publish' === $status,
			'unpublish'                    => 'publish' !== $status,
			'trash'                        => 'trash' === $status,
		};
	}

	/**
	 * @return string[]
	 */
	private function get_allowed_post_types(): array {
		return apply_filters( 'prc_platform_post_publish_pipeline_post_types', self::DEFAULT_POST_TYPES );
	}

	/**
	 * @param array<string, mixed> $post REST response data (`id`) or pipeline post fields (`ID`).
	 */
	private static function post_id( array $post ): int {
		return (int) ( array_key_exists( 'id', $post ) ? $post['id'] : $post['ID'] );
	}

	/**
	 * @param array<string, mixed> $post REST response data or pipeline post fields.
	 */
	private function restfully_get_label( array $post ): string {
		$post_id  = self::post_id( $post );
		$fallback = self::LABEL_FALLBACKS[ get_post_type( $post_id ) ] ?? null;
		if ( null !== $fallback ) {
			return $fallback;
		}

		$primary_site_id = defined( 'PRC_PRIMARY_SITE_ID' ) ? (int) PRC_PRIMARY_SITE_ID : 1;
		$taxonomy        = get_current_blog_id() === $primary_site_id ? 'formats' : 'category';
		$terms           = wp_get_object_terms( $post_id, $taxonomy, array( 'fields' => 'names' ) );
		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return 'Report';
		}

		return ucwords( str_replace( '-', ' ', (string) array_shift( $terms ) ) );
	}

	/**
	 * @param array<string, mixed> $post REST response data.
	 * @return int|false
	 */
	private function restfully_get_post_parent( array $post ) {
		return wp_get_post_parent_id( self::post_id( $post ) );
	}

	/**
	 * @param array<string, mixed> $args    WP_Query args.
	 * @param WP_REST_Request      $request REST request.
	 * @return array<string, mixed>
	 */
	private function add_post_parent_request_to_rest_api( $args, $request ) {
		if ( $request->get_param( 'post_parent' ) ) {
			$args['post_parent'] = $request->get_param( 'post_parent' );
		}
		return $args;
	}

	/**
	 * @param array<string, mixed> $post REST response data.
	 */
	private function restfully_get_word_count( array $post ): int {
		$content = $post['content']['rendered'];
		$content = wp_strip_all_tags( strip_shortcodes( $content ), true );
		return str_word_count( $content );
	}

	/**
	 * @param array<string, mixed> $post REST response data or pipeline post fields.
	 * @return string|false
	 */
	private function restfully_get_canonical_url( array $post ) {
		$post_id = self::post_id( $post );
		$url     = get_post_meta( $post_id, '_redirect', true );
		if ( ! empty( $url ) ) {
			return $url;
		}
		return get_permalink( $post_id );
	}

	private function register_rest_fields(): void {
		$allowed_post_types = $this->get_allowed_post_types();

		register_rest_field(
			$allowed_post_types,
			'label',
			array(
				'get_callback' => $this->restfully_get_label( ... ),
				'schema'       => array(
					'description' => 'Content format label for this post.',
					'type'        => 'string',
					'context'     => array( 'view', 'edit', 'embed' ),
				),
			)
		);
		register_rest_field(
			$allowed_post_types,
			'post_parent',
			array( 'get_callback' => $this->restfully_get_post_parent( ... ) )
		);
		register_rest_field(
			$allowed_post_types,
			'word_count',
			array( 'get_callback' => $this->restfully_get_word_count( ... ) )
		);
		register_rest_field(
			$allowed_post_types,
			'canonical_url',
			array( 'get_callback' => $this->restfully_get_canonical_url( ... ) )
		);
	}

	/**
	 * @param WP_Post $post Post.
	 * @return object|WP_Error
	 */
	private function setup_extra_wp_post_object_fields( WP_Post $post ) {
		$ref_post = (array) $post;

		$ref_post['canonical_url'] = false;
		$ref_post['label']         = null;
		$ref_post['visibility']    = false;

		/**
		 * Fill or extend the post object passed to the pipeline hooks. The pipeline fills label,
		 * canonical_url, and visibility at priority 1, except under WP-CLI.
		 *
		 * @param array<string, mixed> $ref_post Post fields.
		 */
		$ref_post = apply_filters( 'prc_platform_wp_post_object', $ref_post );

		if ( is_wp_error( $ref_post ) ) {
			return $ref_post;
		}

		if ( empty( $ref_post ) ) {
			return new WP_Error( 'empty_post_object', 'The $ref_post passed to apply_extra_wp_post_object_fields is empty', $ref_post );
		}

		return (object) $ref_post;
	}

	/**
	 * @param array<string, mixed> $ref_post Post fields.
	 * @return array<string, mixed>
	 */
	private function apply_extra_wp_post_object_fields( array $ref_post ): array {
		$ref_post['canonical_url'] = $this->restfully_get_canonical_url( $ref_post );
		$ref_post['label']         = $this->restfully_get_label( $ref_post );
		$visibility                = get_post_meta( $ref_post['ID'], '_postVisibility', true );
		if ( ! empty( $visibility ) ) {
			$ref_post['visibility'] = $visibility;
		}
		return $ref_post;
	}

	/**
	 * @param int          $post_id         Post ID.
	 * @param WP_Post      $post_obj_now    Post after the write.
	 * @param bool         $is_update       Whether the write updated an existing post.
	 * @param WP_Post|null $post_obj_before Post before the write, or null for a new post.
	 */
	private function process_post_publish_pipeline( $post_id, $post_obj_now, $is_update, $post_obj_before ): void {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( defined( 'DOING_AJAX' ) && DOING_AJAX ) {
			return;
		}

		if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) || ! in_array( $post_obj_now->post_type, $this->get_allowed_post_types(), true ) ) {
			return;
		}

		/**
		 * Filter whether the post publish pipeline should process this insert/update.
		 *
		 * Return false to skip all `prc_platform_on_*` lifecycle hooks for this write
		 * (e.g. while syncing report-package chapter status/date/terms from a parent).
		 *
		 * @param bool      $should_process  Whether to process. Default true.
		 * @param int       $post_id         Post ID.
		 * @param \WP_Post  $post_obj_now    Post object after the write.
		 * @param bool      $is_update       Whether this is an update.
		 * @param ?\WP_Post $post_obj_before Post object before the write, or null for a new post.
		 */
		if ( ! apply_filters(
			'prc_platform_post_publish_pipeline_should_process',
			true,
			$post_id,
			$post_obj_now,
			$is_update,
			$post_obj_before
		) ) {
			return;
		}

		Pre_Publish::reconcile( $post_obj_now );

		$prior_status   = is_object( $post_obj_before ) && property_exists( $post_obj_before, 'post_status' ) ? $post_obj_before->post_status : null;
		$current_status = $post_obj_now->post_status;

		$ref_post   = $this->setup_extra_wp_post_object_fields( $post_obj_now );
		$has_blocks = has_blocks( $post_obj_now );
		$post_type  = $post_obj_now->post_type;

		if ( is_wp_error( $ref_post ) ) {
			return;
		}

		if ( false === $is_update && 'auto-draft' === $current_status && empty( $prior_status ) ) {
			/**
			 * Fires when a new post is inserted as an auto-draft. Only the post ID is meaningful this early.
			 *
			 * @param object $ref_post The post object with extra fields.
			 */
			do_action( 'prc_platform_on_post_init', $ref_post );
			do_action( "prc_platform_on_{$post_type}_init", $ref_post );
		}

		/**
		 * Fires on every observed status transition (current vs prior).
		 *
		 * Listen here instead of `transition_post_status` to get the pipeline's
		 * autosave, revision, and post type gating.
		 *
		 * @param object  $ref_post       The post object with extra fields.
		 * @param string  $current_status The post's new status.
		 * @param ?string $prior_status   The post's previous status (null on first save).
		 * @param bool    $has_blocks     Whether the post content has blocks.
		 */
		if ( $current_status !== $prior_status ) {
			do_action( 'prc_platform_on_status_transition', $ref_post, $current_status, $prior_status, $has_blocks );
			do_action( "prc_platform_on_{$post_type}_status_transition", $ref_post, $current_status, $prior_status, $has_blocks );
		}

		$incremental_statuses = array( 'publish', 'draft' );
		if ( in_array( $current_status, $incremental_statuses, true ) && in_array( $prior_status, $incremental_statuses, true ) ) {
			do_action( 'prc_platform_on_incremental_save', $ref_post );
			do_action( "prc_platform_on_{$post_type}_incremental_save", $ref_post );
		}

		$event = match ( $current_status ) {
			'publish' => match ( true ) {
				in_array( $prior_status, array( 'draft', 'future' ), true ) => 'publish',
				'trash' === $prior_status => 'untrash',
				default => 'update',
			},
			'draft'   => match ( $prior_status ) {
				'publish' => 'unpublish',
				'trash'   => 'untrash',
				default   => null,
			},
			'trash'   => 'trash',
			default   => null,
		};

		if ( null === $event ) {
			return;
		}

		do_action( "prc_platform_on_{$event}", $ref_post, $has_blocks );
		do_action( "prc_platform_on_{$post_type}_{$event}", $ref_post, $has_blocks );
		self::enqueue_async_event( (int) $post_id, $event );
	}
}
