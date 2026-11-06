<?php
/**
 * PRC Shared
 *
 * @package           PRC_Shared_Plugin
 * @author            Seth Rubenstein
 * @copyright         2024 Pew Research Center
 * @license           GPL-2.0-or-later
 *
 * @wordpress-plugin
 * Plugin Name:       PRC Shared
 * Plugin URI:        https://github.com/pewresearch/prc-shared
 * Description:       Shared first-party (@prc/*) and third-party JavaScript, stylesheets, and script modules for all PRC Platform plugins.
 * Version:           1.0.0
 * Requires at least: 6.8
 * Requires PHP:      8.2
 * Author:            Pew Research Center
 * Author URI:        https://pewresearch.org
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       prc-shared
 */

namespace PRC\Platform\Shared_Plugin;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}


define( 'PRC_SHARED_FILE', __FILE__ );
define( 'PRC_SHARED_DIR', __DIR__ );
define( 'PRC_SHARED_VERSION', '1.0.0' );

// Every PRC plugin requires prc-shared, so it is the single place that loads
// prc/primitives off platform. Inside the PRC Platform monorepo the root
// autoloader already provides it.
if ( ! defined( 'PRC_PLATFORM' ) ) {
	$prc_shared_autoloader = __DIR__ . '/vendor/autoload_packages.php';
	if ( file_exists( $prc_shared_autoloader ) ) {
		require_once $prc_shared_autoloader;
	}
	unset( $prc_shared_autoloader );
}

if ( function_exists( '\PRC\Primitives\Post_Publish_Pipeline\boot' ) ) {
	\PRC\Primitives\Post_Publish_Pipeline\boot();
}

if ( function_exists( '\PRC\Primitives\Signed_Fetch\boot' ) ) {
	\PRC\Primitives\Signed_Fetch\boot();
}

/**
 * Helper utilities
 */
require plugin_dir_path( __FILE__ ) . 'includes/utils.php';

/**
 * The core bootstrap class that is used to define the hooks that initialize the various components.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-bootstrap.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function run_prc_shared() {
	$plugin = new Bootstrap();
	$plugin->run();
}
run_prc_shared();
