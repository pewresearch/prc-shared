# @prc/shared

## 1.5.0

### Minor Changes

- 49275b5: The PRC primitives library now lives inside PRC Shared at `plugins/prc-shared/primitives/` and ships as version 2.4.0. It no longer comes from a separate repository, so a primitives change ships in the same pull request as the code that uses it.

    The library also includes the post publish pipeline lifecycle hooks from Origin `prc-primitives` trunk. They stay dormant until a site calls `PRC\Primitives\Post_Publish_Pipeline\boot()`.

- 1d96db5: PRC Scripts is now PRC Shared. The plugin slug is `prc-shared` and the npm package is `@prc/shared`. Sites that run it outside PRC Platform must activate `prc-shared` and deactivate `prc-scripts`. Plugins that declare `Requires Plugins: prc-shared` need it active.
- f8730c1: PRC Shared now loads the shared PRC primitives library for every PRC plugin when the plugins run outside PRC Platform. Plugins no longer bundle their own copy, so standalone installs need PRC Shared active.

### Patch Changes

- 867486e: The post publish pipeline now comes from `plugins/prc-shared/primitives/` instead of the `prc-post-publish-pipeline` plugin. These plugins no longer list that plugin in `Requires Plugins`. Publish, update, unpublish, and trash hooks fire the same way as before. The mu-plugin loader boots the pipeline once, so PRC Shared now runs it on the platform.
- faac5de: PRC Shared now boots the post publish pipeline itself. Sites outside the PRC Platform that run PRC Shared with plugins like PRC Schema SEO now get the publish, update, unpublish, and trash hooks.
