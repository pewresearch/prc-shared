# PRC Primitives

Shared PHP library for PRC Platform plugins. It holds block rendering helpers, HTML processors built on `WP_HTML_Tag_Processor`, a delay/cancel helper for Action Scheduler jobs, a URL to post ID resolver, term data store relationships that keep a post type and a taxonomy in 1:1 sync, feature flags, and the post publish pipeline lifecycle hooks.

The package changes infrequently. Plugins such as email builder and Apple News depend on it as a stable layer.

## Where it lives

`prc/primitives` is a Composer path package inside `prc-shared`. The root `composer.json` and `plugins/prc-shared/composer.json` both require it from `plugins/prc-shared/primitives`. On PRC Platform the root autoloader loads it. Off platform, `prc-shared` loads it for every PRC plugin through its Jetpack Autoloader. Other plugins must not require it.

Keep the `version` in `composer.json` above every released 2.x tag. The Jetpack Autoloader picks the highest version when an older plugin still bundles its own copy.

Every public symbol lives under `PRC\Primitives\<Module>`.

## Trees

| Directory                    | Namespace                              | What it contains                                                                                                                                                                                     |
| ---------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/block-utils/`           | `PRC\Primitives\BlockUtils`            | `classNames`, `find_block` / `find_blocks`, gap and spacing helpers, `Pagination`, `strip_block_from_post_content`, device and URL helpers                                                           |
| `src/html-processors/`       | `PRC\Primitives\HTML_Processors`       | `TableProcessor`, `HeadingProcessor`, `ElementFinder`, and the `parse_*` functions                                                                                                                   |
| `src/delayed-action/`        | `PRC\Primitives\DelayedAction`         | Queue and cancel a unique delayed Action Scheduler job                                                                                                                                               |
| `src/url-helper/`            | `PRC\Primitives\URL_Helper`            | `URL_Helper`, which resolves a preview link, wp-admin edit link, or canonical URL to a post ID                                                                                                       |
| `src/term-data-store/`       | `PRC\Primitives\TDS`                   | `add_relationship`, `get_related_post`, `get_related_term`, and the sync hooks. Forked from 10up/term-data-store; see `src/term-data-store/LICENSE`                                                  |
| `src/feature-flags/`         | `PRC\Primitives\Feature_Flags`         | `register_feature_flag`, `is_feature_enabled`, `get_feature_flags_context`, the pure `Evaluator`, and the `ExperimentSource` storage contract                                                        |
| `src/post-publish-pipeline/` | `PRC\Primitives\Post_Publish_Pipeline` | `boot`, the `prc_platform_on_*` and `prc_platform_async_on_*` lifecycle hooks, `enqueue_async_event`, the pipeline REST fields, and `Post_Resolution\Post_URL_Resolver`                              |
| `src/concurrency/`           | `PRC\Primitives\Concurrency`           | `Lease`, a per-key options-table lease with a heartbeat; `Claim_Store`, `Options_Claim_Store`, and `Table_Claim_Store`, first-writer-wins claims; `run_once`; `Meta_State`, post meta state machines |

Callers keep their own post meta and hook callbacks. `DelayedAction` only talks to the scheduler.

```php
use PRC\Primitives\DelayedAction\ActionSchedulerGateway;
use PRC\Primitives\DelayedAction\DelayedAction;
use PRC\Primitives\URL_Helper\URL_Helper;
use function PRC\Primitives\TDS\add_relationship;
use function PRC\Primitives\BlockUtils\classNames;
use function PRC\Primitives\HTML_Processors\parse_table_block_into_array;

$class = classNames( 'foo', array( 'is-active' => $active ) );
$data  = parse_table_block_into_array( $html );

$delayed = new DelayedAction( new ActionSchedulerGateway() );
$queued  = $delayed->queue( 'prc_example_send', array( $post_id ), 'prc-example', 600 );
$cancel  = $delayed->cancel( 'prc_example_send', array( $post_id ), 'prc-example' );

$post_id = ( new URL_Helper( $url ) )->post_id;

add_action( 'init', fn() => add_relationship( 'staff', 'bylines' ), 20 );
```

`queue()` returns `{ queued: true, scheduled_at: int }` or a `WP_Error`. Codes are `action_scheduler_unavailable` and `schedule_failed`. `cancel()` returns `{ cancelled: true }` or a `WP_Error`. Codes are `no_pending`, `in_progress`, and `action_scheduler_unavailable`.

`URL_Helper::$post_id` is an `int` or a `WP_Error` with code `404`. It is `null` when the input is not a valid URL.

Call `add_relationship()` after both the post type and the taxonomy are registered. It throws `Invalid_Input_Exception` when either is missing or already paired. Pass `false` as the third argument to keep post permalinks unchanged. Post and term meta keys are `tds_term_id` and `tds_post_id`.

### Strip a block from post content

`strip_block_from_post_content()` empties a block when it renders inside `core/post-content` and your callback returns `true`. Blocks in the template, the editor, and REST data are not touched.

```php
use function PRC\Primitives\BlockUtils\strip_block_from_post_content;

strip_block_from_post_content(
	'core/post-date',
	fn( array $block, int $post_id, ?\WP_Block $instance ): bool => 'prc_email_campaign' === get_post_type( $post_id )
);
```

Pass one block name or an array of names. The optional third argument is the `render_block_{name}` priority. The callback gets the parsed block, the ID of the innermost post being rendered, and the `WP_Block` instance. The primitive does not check post types. Put that condition in the callback. Register rules before the page renders, for example on `init`. Several rules can share a block, and any rule that returns `true` removes it.

The rule does not affect a block that a `pre_render_block` filter short-circuits, at any priority. The primitive tracks post content from `render_block_context`, which WordPress only runs for blocks that will render. Call `PostContentBlockFilter::reset()` in test teardown to remove the hooks.

### Feature flags

Register a flag on `init`, then check it where the behavior changes.

```php
use function PRC\Primitives\Feature_Flags\register_feature_flag;
use function PRC\Primitives\Feature_Flags\is_feature_enabled;

add_action(
	'init',
	fn() => register_feature_flag(
		'block-library/carousel-v2',
		array(
			'label'       => 'Carousel v2',
			'description' => 'Swap the carousel for the v2 slider.',
			'default'     => false,
		)
	)
);

if ( is_feature_enabled( 'block-library/carousel-v2' ) ) {
	// New behavior.
}
```

A slug is lowercase letters, digits, and dashes, with at most one slash. An unregistered slug returns `false` and triggers `_doing_it_wrong`.

Experiments decide the value. An experiment is a set of `slug => bool` overrides plus an audience. The audience is everyone, every logged-in WP user, a list of WP roles, a list of WP user IDs, or a list of VIP Vary_Cache groups. Logged-out visitors never match the logged-in audience. The library does not store experiments. The `prc-feature-flags` plugin stores them as a post type and calls `set_experiment_source()`. Without a source, every flag returns its default.

When more than one running experiment matches the visitor and sets the same flag, off wins. Any experiment can therefore act as a kill switch.

A block that needs a flag in the browser passes it through the Interactivity API context:

```php
use function PRC\Primitives\Feature_Flags\get_feature_flags_context;

echo wp_interactivity_data_wp_context(
	array_merge(
		array( 'items' => $items ),
		get_feature_flags_context( array( 'block-library/carousel-v2' ) )
	)
);
```

The block reads `context.featureFlags[ 'block-library/carousel-v2' ]`. The value is rendered into cached HTML. It is correct for logged-in users, because VIP bypasses the page cache for them, and for each Vary_Cache group, because each group gets its own cached variant. Logged-out visitors outside every group only match experiments that target everyone.

`get_evaluation_log()` returns every assignment made for the current visitor in this request, keyed by slug. Each `Assignment` names the experiments that decided it. Pass a `VisitorContext` to `is_feature_enabled()` to evaluate for someone else, for example in WP-CLI. Those evaluations are not logged.

`log_error()` also sends the error to Sentry when the wp-sentry plugin is active and has a DSN.

Call `FeatureFlags::reset()` in test teardown.

### Post publish pipeline

The pipeline turns each `wp_after_insert_post` into one set of PRC lifecycle hooks. Nothing registers until something calls `boot()`. PRC Shared calls it when it loads, on the platform and on any other site that runs it. Later calls do nothing.

```php
\PRC\Primitives\Post_Publish_Pipeline\boot();
```

The pipeline tracks `post`, `feature`, `quiz`, `fact-sheet`, `short-read`, `events`, `mini-course`, `press-release`, `block_module`, `collections`, and `prc_newsletter`. Filter `prc_platform_post_publish_pipeline_post_types` to change the list. It skips autosaves, revisions, and writes made while `DOING_AUTOSAVE` or `DOING_AJAX` is true. WP-CLI writes still fire the hooks, but under WP-CLI the post object keeps placeholder `label` and `canonical_url` values.

Sync hooks fire during the save request. Each has a per-post-type variant, for example `prc_platform_on_short-read_publish`.

| Hook                                | Fires when                                                                                                            | Args                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `prc_platform_on_post_init`         | A new post is inserted as `auto-draft`. Only the ID is meaningful. The variant is `prc_platform_on_{post_type}_init`. | `$post`                                                       |
| `prc_platform_on_status_transition` | The status differs from the prior status, including the first insert                                                  | `$post`, `$current`, `$prior` (null on insert), `$has_blocks` |
| `prc_platform_on_incremental_save`  | Both the prior and the current status are `draft` or `publish`                                                        | `$post`                                                       |
| `prc_platform_on_publish`           | `draft` or `future` moves to `publish`                                                                                | `$post`, `$has_blocks`                                        |
| `prc_platform_on_update`            | Any other save that leaves the post in `publish`                                                                      | `$post`, `$has_blocks`                                        |
| `prc_platform_on_unpublish`         | `publish` moves to `draft`                                                                                            | `$post`, `$has_blocks`                                        |
| `prc_platform_on_trash`             | The post moves to `trash`                                                                                             | `$post`, `$has_blocks`                                        |
| `prc_platform_on_untrash`           | `trash` moves to `publish` or `draft`                                                                                 | `$post`, `$has_blocks`                                        |

`$post` is a copy of the `WP_Post` with three more fields: `label`, `canonical_url`, and `visibility` (the `_postVisibility` meta, or `false`). Filter `prc_platform_wp_post_object` to add fields. The pipeline fills its own at priority 1.

Publish, update, unpublish, trash, and untrash also queue one Action Scheduler job, `prc_platform_post_publish_pipeline_async_dispatch` in group `prc-post-publish-pipeline`. The job loads the post again and fires `prc_platform_async_on_{event}` and `prc_platform_async_on_{post_type}_{event}` with `$post` and `$has_blocks`. It drops itself when the status has moved on, for example a publish job for a post that is now a draft. Async hooks have no prior status. `get_async_editor_id()` returns the user whose save queued the running job.

To queue an async event for a write that skipped the sync hooks, call `enqueue_async_event()`. It also accepts `incremental_save`, which the pipeline never queues itself.

```php
\PRC\Primitives\Post_Publish_Pipeline\enqueue_async_event( $post_id, 'publish' );
```

| Hook                                                      | Type                                                                        | Use                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `prc_platform_post_publish_pipeline_should_process`       | Filter (`$should`, `$post_id`, `$post_after`, `$is_update`, `$post_before`) | Return `false` to skip every sync hook and async job for one write |
| `prc_platform_post_publish_pipeline_should_enqueue_async` | Filter (`$should`, `$post_id`, `$event`, `$post_type`)                      | Return `false` to skip the async job. Sync hooks still fire.       |
| `prc_platform_post_publish_pipeline_async_event_enqueued` | Action (`$post_id`, `$event`, `$editor_id`)                                 | Queue a dedicated job that must not wait behind the shared one     |

Tracked post types also get four REST fields. `label` is the content format: the first `formats` term on the primary site (`PRC_PRIMARY_SITE_ID`, default 1), the first `category` elsewhere, and `Report` when there is none. Post types such as `quiz` and `short-read` always use a fixed label. `canonical_url` is the `_redirect` meta when set, otherwise the permalink. `post_parent` and `word_count` round out the set, and `/wp/v2/posts?post_parent=<id>` filters by parent.

`Post_Resolution\Post_URL_Resolver::resolve()` maps a pasted URL or Slack `<url|label>` token to a `Resolved_Post_URL` or an `Unresolved_Post_URL` with reason `foreign_host` or `not_found`. It returns `null` for text that is not an http(s) URL. URLs on `pewresearch.org` and its staging hosts resolve against `home_url()`.

### Lease

`PRC\Primitives\Concurrency\Lease` lets one process at a time work on a key. It keeps one row in the blog's options table. The row name is the prefix plus the key, and the value is `{token}|{expiry}`.

```php
use PRC\Primitives\Concurrency\Lease;

$lease = new Lease( 'prc_example_lock_', 120, 'example_' );
$token = $lease->acquire( $post_id );
if ( '' === $token ) {
	return new WP_Error( 'locked', 'Another run holds this post.' );
}
try {
	do_step_one( $post_id );
	if ( ! $lease->refresh( $post_id, $token ) ) {
		return new WP_Error( 'lease_lost', 'The lease expired before step two.' );
	}
	do_step_two( $post_id );
} finally {
	$lease->release( $post_id, $token );
}
```

`acquire()` returns a token, or `''` while a fresh lease is held. An expired row is taken over with a compare and swap, so one caller wins. `refresh()` and `release()` return `false` when the token no longer owns the row, and they never change another holder's row. `owns()` checks the token only. `clear()` deletes the row whoever holds it. Use it for resets only.

Row names compare under the options table collation (case- and accent-insensitive `*_ci`, trailing spaces ignored), so keys that differ only in case, accents, or trailing spaces share one lease.

The lease does not stop work that runs past the TTL. Keep each step shorter than the TTL and call `refresh()` between steps. A key is an `int` or a `string`. The prefix and key together must fit in 191 characters, or every method throws `InvalidArgumentException`. Do not change a prefix in use: a row written before a deploy must still block after it. The TLA+ model is `tests/prc-primitives/formal/Lease.tla`. Run `npm run verify:formal -- concurrency`.

### Claim

`PRC\Primitives\Concurrency\Claim_Store` records a name once. The first `add()` of a name wins on every PHP node. Later adds of that name get `false` and leave the stored value as it is. Use it when one outcome must be recorded once, such as a release decision or a sent notice.

```php
use PRC\Primitives\Concurrency\Options_Claim_Store;

$claims = new Options_Claim_Store();
$won    = $claims->add( 'prc_example_sent_' . $campaign_id, (string) time() );
if ( null === $won ) {
	return new WP_Error( 'claim_failed', 'The claim could not be stored.', array( 'status' => 503 ) );
}
if ( false === $won ) {
	return; // Another request already sent it.
}
send_notice( $campaign_id );
```

| Method                 | Returns                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `add( $name, $value )` | `true` when this call inserted the row, `false` when the name exists, `null` on a database error  |
| `set( $name, $value )` | `false` on a database error. Overwrites, so it is not a claim                                     |
| `get( $name )`         | The value, or `null` when the name is absent or the read fails                                    |
| `lookup( $name )`      | The value, or `null` only when the name is absent. Throws `Claim_Store_Error` when the read fails |

Use `lookup()` when an absent row changes what the caller does next, so a database error never reads as "not claimed".

`Options_Claim_Store` keeps one row per name in the current blog's options table, with autoload off. The row name is the claim name as given, so do not change a name in use: a row written before a deploy must still win after it. `add()` is `INSERT IGNORE` on the unique `option_name`, not `add_option()`, which upserts. Reads skip the options cache, and on VIP they go to the primary database.

Rules for `Options_Claim_Store`:

- The 191 limit counts bytes, with `strlen()`, not characters. A longer name throws `InvalidArgumentException`, because MySQL would truncate it and two names could share one claim. A name of 100 `é` is 200 bytes and throws, although the column holds 191 characters.
- A stored empty string reads as `null` from `get()` and from `lookup()`, because `wpdb::get_var()` returns `null` for `''`. Store a non-empty value, such as `'1'`.
- Names compare under the options table collation (case- and accent-insensitive `*_ci`, trailing spaces ignored), so `Foo`, `foo`, and `foo ` are one claim.
- Do not call `get_option()` on a claim name. It can cache the default from before the claim existed and keep returning it after `add()`. Read through `get()` or `lookup()`.
- A value that is not valid UTF-8 is stored as an empty string, which reads as `null`.

### Table claims

`PRC\Primitives\Concurrency\Table_Claim_Store` is a `Claim_Store` with its own table, `{prefix}prc_claims`, one per site. Use it for claims that are many, short lived, or that must not share the options table. It has the same four methods.

```php
use PRC\Primitives\Concurrency\Table_Claim_Store;

$claims = new Table_Claim_Store();
$claims->add( 'prc_example_sent_' . $campaign_id, '1' ); // true, false, or null, as above.
```

The table has `claim_key varbinary(191)` as the primary key, `value longblob`, and `expires_at bigint` with an index. `add()` is `INSERT IGNORE` on the primary key. `get()` and `lookup()` read from the primary database.

Rules for `Table_Claim_Store`. It differs from `Options_Claim_Store` on purpose:

- Names compare byte for byte. `Foo`, `foo`, and `foo ` are three claims.
- A value is stored byte for byte. A stored empty string reads back as `''`. `null` still means "absent".
- A name is 1 to 191 bytes, counted with `strlen()`. An empty or longer name throws `InvalidArgumentException` before any write.
- `expires_at` is the purge deadline: one day after the last `add()` or `set()`. It does not filter reads. A row past it still wins `add()` and still reads until the purge deletes it, so a claim lives at least one day. `set()` moves the deadline out.
- An Action Scheduler job, `prc_claims_purge` in group `prc-claims`, runs once a day on each site and deletes rows past the deadline, 1000 rows at a time and at most 100 batches per run. `purge()` runs the same loop and returns the number of rows deleted, or `null` when a `DELETE` fails.
- `schedule_purge()` checks for the job on `action_scheduler_init` and keeps a `purge_scheduled` cache key for 6 hours. If someone cancels the purge action, it is scheduled again only after that key expires.
- When Action Scheduler fails to schedule the job (for example, its tables are missing), `schedule_purge()` sets a `purge_schedule_failed` cache key for one hour. While it lasts, no request calls Action Scheduler for this job.
- Do not move a claim name between the two stores and expect the same answers. The three points above differ.

#### Install

The table installs at site creation, at deploy, or on first use. It is not on every site until one of those happens.

- At deploy: run `wp prc claims install` for a site, or `wp prc claims install --all-sites` on a network. It runs `dbDelta()` and is safe to run again. VIP asks for `dbDelta()` in an upgrade routine, not on a live request: <https://docs.wpvip.com/databases/custom-tables/>.
- After a release: `boot()` hooks `admin_init`. The first admin request on a site with a stale `prc_claims_db_version` option installs the table. After a failed install the next try waits five minutes.
- At site creation: `boot()` installs the table on `wp_initialize_site` (priority 20, after core builds the site's own tables). `boot()` also drops the table with the site (`wpmu_drop_tables`) and schedules the purge.
- On first use (the fallback): every method checks `prc_claims_db_version` and runs `dbDelta()` when it is not current. This covers a database imported from another environment, and code that calls `switch_to_blog()` into a site that no request has loaded yet.
- A missing table with a current version option heals once. The failed query clears the option, installs, and runs again once. This covers a restored or truncated database.

A table that cannot be created makes `add()` return `null` and `lookup()` throw, so a caller fails closed.

The first caller (F5, form submissions) must create the table at deploy with `wp prc claims install --all-sites`, or prove on staging that first-use `dbDelta()` works under the VIP database user. Do not assume it.

### Run once

`run_once()` runs a callback once per key and keeps its final result. A second call with the same key returns the stored result and does not run the callback.

```php
use PRC\Primitives\Concurrency\Run_Result;
use PRC\Primitives\Concurrency\Table_Claim_Store;

use function PRC\Primitives\Concurrency\run_once;

$result = run_once(
	'send-newsletter-' . $campaign_id,
	function () use ( $campaign_id ): Run_Result {
		if ( ! provider_is_up() ) {
			return Run_Result::retryable( 'provider down' ); // Not stored. The next call runs again.
		}
		return Run_Result::final( send_newsletter( $campaign_id ) ); // Stored.
	},
	new Table_Claim_Store(),
	120 // Lease TTL in seconds. Keep it above the longest run of the callback.
);
```

The callback returns `Run_Result::final( $value )` or `Run_Result::retryable( $value )`. `run_once()` returns a `Run_Result` with `status`, `value`, and `ran` (true when the callback ran in this call).

| Status      | Meaning                                                                                                                                                                                                   | `ran`   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `final`     | Done. The value is stored. `ran` is `false` when it came from the store                                                                                                                                   | either  |
| `retryable` | The callback asked to run again. Nothing is stored                                                                                                                                                        | `true`  |
| `busy`      | Another caller holds the lease. The callback did not run                                                                                                                                                  | `false` |
| `lost`      | The callback ran, but the lease was lost before the store, or another result won. Nothing of this call is stored. The call logs it and fires `prc_primitives_run_once_lease_lost` when the lease was lost | `true`  |
| `error`     | The claim store failed, or the stored value could not be read. Check `ran`: after a failed store the callback has run                                                                                     | either  |

The order is: read the claim, take a `Lease` on the key, read the claim again, run the callback, check the lease is still ours, store the result with `add()`, release. The second read matters. A caller can read "absent", wait while another caller finishes and releases, and then win the lease. The stored result is `{"v":1,"value":"..."}`, which is never empty. A callback that throws, or returns something other than a `final` or `retryable` result, stores nothing and releases the lease.

The key is any non-empty string, of any length and with any bytes. `run_once()` hashes it, so the options table collation, invalid UTF-8, and a long key cannot make two keys share a claim or a lease. The claim name is `prc_run_once_done_{readable}_{sha256}` and the lease row is `prc_run_once_lease_{readable}_{sha256}`. `{readable}` is the first 40 bytes of the key, with every byte outside `A-Z a-z 0-9 _ -` changed to `-`. `{sha256}` is the lowercase hex digest of the whole key. Both names are plain ASCII and at most 124 bytes. `Run_Once::claim_name( $key )` returns the claim name. The two prefixes differ and neither starts with the other, so a claim name never equals a lease row name. The TTL is at least 1 second. An empty key or a bad TTL throws `InvalidArgumentException` before any read.

`Run_Result::final()` and `Run_Result::retryable()` are the public way to build a result. The constructor is `@internal`: `run_once()` uses it for the `busy`, `lost`, and `error` outcomes.

#### Exactly-once windows

`run_once()` records one outcome once. It does not stop the callback from running more than once. Six cases run the callback again:

1. A crash after the callback and before `add()`. The lease stays until the TTL ends. The next caller after that runs the callback again.
2. A TTL shorter than the callback. A second caller reclaims the lease while the first still runs. Both run. If another caller took the lease, the late holder finds it lost and stores nothing. If nobody took it, the late holder stores its result as usual.
3. The gap between the fence and `add()`. The fence is `Lease::owns()`, then `add()`. The lease can pass to another caller between those two calls. `add()` keeps one stored result.
4. An `add()` database error. `run_once()` returns `error` with `ran` set to `true`. Nothing is stored, so the next call runs the callback again.
5. A callback that throws. Nothing is stored, and the lease is released. The next call runs the callback again.
6. A `retryable` result. Nothing is stored. The next call runs the callback again. This is the purpose of the status.

Keep the callback safe to repeat, or give it its own marker.

Set the TTL above the worst-case run of the callback. 30 to 60 seconds is typical. `run_once()` never calls `Lease::refresh()` on its own.

A callback that is about to write or send something can check its lease first. `run_once()` passes the callback one argument, a `Closure(): bool`. The closure calls `Lease::refresh()` with this run's token. It returns `true` while this run still holds the lease, and it extends the lease by one TTL. It returns `false` once another caller has taken the lease. The callback then stops and returns `Run_Result::retryable()`. A callback that declares no parameter ignores the argument.

```php
function ( Closure $holds ): Run_Result {
	if ( ! $holds() ) {
		return Run_Result::retryable( 'lease lost' ); // Another caller owns this key now. Write and send nothing.
	}
	return Run_Result::final( send_newsletter( $campaign_id ) );
}
```

The effective hold is the TTL to the TTL plus 1 second, not exactly the TTL. The lease expiry compares whole-second `time()` values. A TTL of 3 seconds with a callback of 3.5 seconds ran twice at once in 8 of 20 trials. With a callback of 4.0 seconds it ran twice at once in 18 of 20.

The TLA+ model is `tests/prc-primitives/formal/RunOnce.tla`. Run `npm run verify:formal -- concurrency`. It checks that the callback never runs over a stored result, that only a final result is stored, that the claim is written once, and (for runs without retryable results) that the number of starts is at most 1 plus the crashes plus the lease expiries.

### Meta state

`PRC\Primitives\Concurrency\Meta_State` keeps a post's workflow state in one post meta row and moves it only along the edges you list. When several requests try to move a post out of the same state, one wins.

```php
use PRC\Primitives\Concurrency\Meta_State;

enum Send_State: string {
	case Queued  = 'queued';
	case Sending = 'sending';
	case Sent    = 'sent';
}

$state = new Meta_State(
	'_prc_example_send_state',
	Send_State::class,
	array(
		array( Send_State::Queued, Send_State::Sending ),
		array( Send_State::Sending, Send_State::Sent ),
		array( Send_State::Sending, Send_State::Queued ),
	)
);

$state->init( $post_id, Send_State::Queued ); // In the request that creates the post.

if ( ! $state->transition( $post_id, Send_State::Queued, Send_State::Sending ) ) {
	return; // Another request moved it first, or it is not queued.
}
send( $post_id );
$state->transition( $post_id, Send_State::Sending, Send_State::Sent );
```

| Method                               | Returns                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `init( $post_id, $state )`           | `true` when this call wrote the first row. `false` only when a row already exists. Throws `Meta_State_Error` when no row exists |
| `transition( $post_id, $from, $to )` | `true` only when this call changed the row from `$from` to `$to`; `false` when the row is missing, holds another value, or lost |

Use `Meta_State` instead of `update_post_meta( $id, $key, $to, $from )`. Core's version is not a compare and swap: a `$from` of `''` or `'0'` makes it unconditional, a missing row makes it add one, and it matches values without regard to case or trailing spaces. `transition()` reads the row from the primary database, then runs one `UPDATE` that matches the row's `meta_id` and the exact `$from` bytes. It succeeds only when that `UPDATE` changes one row. Keys and values match byte for byte.

Under HyperDB the primary read sets `$wpdb->srtm[ $wpdb->postmeta ] = true`. That sends later reads of the `postmeta` table in the same request to the primary, and reads of other tables stay on the replicas. It does not call `send_reads_to_masters()`, which pins every read of the request. HyperDB pins a table the same way after any write to it. When `$wpdb` is not HyperDB, nothing is set.

A call that changes the row fires one action. A call that loses fires nothing.

```php
do_action( 'prc_meta_state_transitioned', $post_id, $meta_key, $from, $to );
```

| Argument    | Value                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| `$post_id`  | The post ID                                                                      |
| `$meta_key` | The key of the `Meta_State` that wrote. Every `Meta_State` fires this one action |
| `$from`     | The `BackedEnum` case the row held. `null` after `init()`                        |
| `$to`       | The `BackedEnum` case the row holds now                                          |

The action runs after the write and after the cache is cleared, so `get_post_meta()` returns the `$to` value, unless a listener moves the row again (see below). A listener checks `$meta_key` first, then compares the cases, for example `Send_State::Sent === $to`. Core meta hooks such as `updated_post_meta` still do not run, so nothing that listens to them (search sync, for example) sees the change.

A listener must not throw. When a listener throws, the won `transition()` throws too. The row and the cache are already right, so a retry returns `false`. A listener must not call `transition()` either. The inner call fires its event first, so a later listener sees the inner event before the outer one. Then `get_post_meta()` returns the inner state, not the outer `$to`. Queue other work, for example with Action Scheduler, and return.

Call `guard()` once, early (`plugins_loaded` or `init`), to refuse writes that skip the edge table. It adds `add_post_metadata`, `update_post_metadata`, and `delete_post_metadata` filters that return `false` for the key. `add_post_meta()`, `update_post_meta()`, `delete_post_meta()`, `delete_post_meta_by_key()`, and a REST `meta` write then fail and leave the row. REST answers with HTTP 500 and the error `rest_meta_database_error`. The match ignores case, because MySQL matches `meta_key` without regard to case. `Meta_State` writes with its own SQL, so the filters do not stop it. `wp_delete_post()` still removes the row, because core deletes post meta by `meta_id`, which does not run these filters. A second call to `guard()` does nothing. `guard()` also drops a `meta_input` write of the key from `wp_insert_post()` and `wp_update_post()`, without an error. Other code can still change the row with `update_metadata_by_mid()`, delete it with `delete_metadata_by_mid()`, or use direct SQL. To avoid the REST 500, make the key read-only in REST: register it with an `auth_callback` that returns `false` (REST answers 403 `rest_cannot_update`), or with `show_in_rest` set to `false` (REST ignores the key).

The constructor throws `InvalidArgumentException` before any write when the key is empty or longer than 255 characters, the enum is not a `BackedEnum`, a case value is `''`, `'0'`, or serialized data, or an edge is not a `[ from, to ]` pair of two different cases. `transition()` throws `InvalidArgumentException` for an edge that is not in the table, and the stored value does not change. Both methods throw it for a post ID below 1 or a case of another enum.

Rules for callers:

- Never gate a decision on `get_post_meta()`. The cache can be stale across processes. The `transition()` return value is the gate.
- Write the key only through `Meta_State`, and call `guard()` to enforce it. Writes skip the meta API, so core meta hooks such as `updated_post_meta` do not run. Each write deletes the post's meta cache and moves the posts `last_changed`, so `get_post_meta()` and cached meta queries show the new value.
- Call `init()` from one writer. `wp_postmeta` has no unique index on the post and key, so `init()` uses `INSERT ... SELECT ... WHERE NOT EXISTS`. Under InnoDB REPEATABLE READ, concurrent `init()` calls lock the post's index range, and each loser either deadlocks or loses the check. In 9 of 17 test runs nothing deadlocked. `init()` runs the insert again after a deadlock, three tries in all, with a random wait of 2 to 12 ms before each new try. Then it reads the key from the primary. It returns `false` when a row exists, and throws `Meta_State_Error` when none does. The only quiet `false` is "a row already exists". Call `init()` outside a database transaction, because a deadlock rolls the whole transaction back.
- Under READ COMMITTED, concurrent `init()` calls can all insert, and `transition()` then throws on the duplicate rows.
- A database error in `transition()` (on the read or on the `UPDATE`) throws `Meta_State_Error`. It never returns `false`, because `false` means "not in that state". `transition()` does not retry.
- Two rows for the key make `transition()` throw `Meta_State_Error` and change nothing. Delete the extra row to recover.
- A `true` from `transition()` does not fence the work that follows. A worker that dies after `Queued -> Sending` leaves the post in `Sending`. Add an edge back, such as `Sending -> Queued`, for the job that recovers it.

### Isolation level

Production is MySQL 8.4.8 at `REPEATABLE-READ`, global and session. It was read on 2026-11-09 with a read-only `wp db query`. VIP docs name no isolation level, so `Meta_State` depends on this one. Under `READ COMMITTED` the `init()` guard fails. In a test with 20 racers per post at that level, 149 of 150 posts ended with two to 20 rows. Check the level again after any VIP database change.

`Meta_State` uses the current blog's `postmeta` table.

## Tests

Tests live in `tests/prc-primitives/phpunit/` and need the WordPress PHPUnit library, the VIP dev-env database, and the `mysqli` extension for the host PHP (`php8.4-mysql`).

```bash
npm run vip:cloud                                   # the dev-env database must run
npm run test:php -- prc-primitives                  # single site
WP_MULTISITE=1 npm run test:php -- prc-primitives   # network
```

`tests/prc-primitives/phpunit/wp-tests-config.php` is the test config. `bootstrap.php` points `WP_PHPUNIT__TESTS_CONFIG` at it unless you set that variable. The config finds the database port of the `prcplatform-database-1` container and the WordPress core of the dev-env. Set `WP_TESTS_DB_HOST` or `WP_TESTS_ABSPATH` to use others.

Two differences from production:

- `wp-phpunit` is 6.9.7 (`composer.lock`), and the dev-env WordPress is 7.1.4. Some core behavior can differ.
- The dev-env content directory holds the HyperDB `db.php` drop-in, and that drop-in breaks `factory->blog->create()`. The config sets `WP_CONTENT_DIR` to an empty temporary directory.

Refresh the design-system palette fixture from the theme:

```bash
cp themes/prc-design-system/theme.json tests/prc-primitives/phpunit/block-utils/fixtures/prc-design-system/theme.json
```
