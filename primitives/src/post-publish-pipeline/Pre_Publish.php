<?php
/**
 * Pre-publish lifecycle event for scheduled posts.
 *
 * @package PRC\Primitives\Post_Publish_Pipeline
 */

declare(strict_types=1);

namespace PRC\Primitives\Post_Publish_Pipeline;

use WP_Post;

/**
 * Fires `prc_platform_on_pre_publish` a lead time before a scheduled post goes live,
 * so listeners can prepare assets (chart images) without publishing anything early.
 *
 * Each write to a post reconciles its one job: scheduled posts get a job at
 * publish time minus the lead, everything else loses its job. The job checks
 * the post again when it runs, so a stale job does nothing.
 */
final class Pre_Publish {

	public const HOOK = 'prc_platform_post_publish_pipeline_pre_publish';

	public const DEFAULT_LEAD_SECONDS = 15 * MINUTE_IN_SECONDS;

	private const DEFAULT_POST_TYPES = array( 'post' );

	/**
	 * Schedule, move, or cancel the pre-publish job for a post after a write.
	 *
	 * @param WP_Post $post Post after the write.
	 */
	public static function reconcile( WP_Post $post ): void {
		if ( ! function_exists( 'as_schedule_single_action' ) || ! function_exists( 'as_unschedule_all_actions' ) ) {
			return;
		}

		$args = array( 'post_id' => (int) $post->ID );
		as_unschedule_all_actions( self::HOOK, $args, Pipeline::ASYNC_GROUP );

		$run_at = self::run_at( $post );
		if ( null === $run_at ) {
			return;
		}

		if ( $run_at <= time() ) {
			as_enqueue_async_action( self::HOOK, $args, Pipeline::ASYNC_GROUP, true );
			return;
		}

		as_schedule_single_action( $run_at, self::HOOK, $args, Pipeline::ASYNC_GROUP, true );
	}

	/**
	 * Action Scheduler callback. Fires the event only if the post is still scheduled inside the lead window.
	 *
	 * @param mixed $post_id Post ID.
	 */
	public static function run( $post_id ): void {
		$post = get_post( (int) $post_id );
		if ( ! $post instanceof WP_Post ) {
			return;
		}

		$run_at = self::run_at( $post );
		if ( null === $run_at || $run_at > time() ) {
			return;
		}

		Pipeline::dispatch_pre_publish( (int) $post->ID );
	}

	/**
	 * When the pre-publish job should run, or null when the post should have none.
	 *
	 * @param WP_Post $post Post.
	 */
	private static function run_at( WP_Post $post ): ?int {
		if ( 'future' !== $post->post_status || ! in_array( $post->post_type, self::post_types(), true ) ) {
			return null;
		}

		$publish_at = get_post_timestamp( $post );
		if ( false === $publish_at ) {
			return null;
		}

		/**
		 * Filters how many seconds before a scheduled publish the pre-publish event fires.
		 *
		 * @param int     $lead_seconds Lead time. Default 15 minutes.
		 * @param WP_Post $post         Scheduled post.
		 */
		$lead = (int) apply_filters( 'prc_platform_post_publish_pipeline_pre_publish_lead_seconds', self::DEFAULT_LEAD_SECONDS, $post );

		return $publish_at - max( 0, $lead );
	}

	/**
	 * @return string[]
	 */
	private static function post_types(): array {
		/**
		 * Filters the post types that get a pre-publish event when scheduled.
		 *
		 * @param string[] $post_types Post types. Default `post`.
		 */
		return (array) apply_filters( 'prc_platform_post_publish_pipeline_pre_publish_post_types', self::DEFAULT_POST_TYPES );
	}
}
