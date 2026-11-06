<?php
/**
 * Post publish pipeline functions for consumer plugins.
 *
 * @package PRC\Primitives\Post_Publish_Pipeline
 */

declare(strict_types=1);

namespace PRC\Primitives\Post_Publish_Pipeline;

/**
 * Register the pipeline hooks. PRC Shared calls it when it loads. Later calls do nothing.
 */
function boot(): void {
	Pipeline::boot();
}

/**
 * Queue an async tier event for a post, for writes that suppressed the sync tier.
 *
 * @param int    $post_id Post ID.
 * @param string $event   Lifecycle event: publish, update, unpublish, untrash, trash, or incremental_save.
 */
function enqueue_async_event( int $post_id, string $event ): void {
	Pipeline::enqueue_async_event( $post_id, $event );
}

/**
 * Fire `prc_platform_on_pre_publish` for a post now, e.g. for chapters of a scheduled package.
 *
 * @param int $post_id Post ID. Published and trashed posts are ignored.
 */
function dispatch_pre_publish( int $post_id ): void {
	Pipeline::dispatch_pre_publish( $post_id );
}

/**
 * User ID of the editor whose write queued the running `prc_platform_async_on_*` hook, or 0 outside one.
 */
function get_async_editor_id(): int {
	return Pipeline::get_async_editor_id();
}

/**
 * User accountable for a write: the acting editor, else the last editor, else the author.
 *
 * WP-Cron and CLI writes run as user 0, so scheduled publishes fall back to the
 * user who last edited (and so scheduled) the post.
 *
 * @param \WP_Post $post      Post being written.
 * @param int      $editor_id Acting editor, or 0.
 */
function resolve_publishing_user( \WP_Post $post, int $editor_id ): int {
	if ( $editor_id > 0 ) {
		return $editor_id;
	}

	$revision    = wp_get_post_revisions(
		$post->ID,
		array(
			'posts_per_page' => 1,
			'check_enabled'  => false,
		)
	);
	$last_editor = $revision ? (int) reset( $revision )->post_author : (int) get_post_meta( $post->ID, '_edit_last', true );
	if ( $last_editor > 0 ) {
		return $last_editor;
	}

	return (int) $post->post_author;
}
