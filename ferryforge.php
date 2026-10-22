<?php
/**
 * Plugin Name:       Ferry Forge
 * Plugin URI:        https://github.com/gunjanjaswal/FerryForge
 * Description:       Move blocks between sites. Export a selection (or the whole post) to a file or the clipboard, import it anywhere, and save a selection as a synced pattern, all from the editor sidebar.
 * Version:           1.1.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            Gunjan Jaswal
 * Author URI:        https://gunjanjaswal.me
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       ferryforge
 *
 * @package FerryForge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FERRYFORGE_VERSION', '1.1.0' );

/**
 * Enqueue the editor sidebar script and styles.
 */
function ferryforge_enqueue_editor_assets() {
	$script_path = plugin_dir_path( __FILE__ ) . 'assets/editor.js';
	$style_path  = plugin_dir_path( __FILE__ ) . 'assets/editor.css';

	wp_enqueue_script(
		'ferryforge-editor',
		plugins_url( 'assets/editor.js', __FILE__ ),
		array(
			'wp-plugins',
			'wp-edit-post',
			'wp-element',
			'wp-components',
			'wp-block-editor',
			'wp-blocks',
			'wp-data',
			'wp-i18n',
			'wp-api-fetch',
		),
		FERRYFORGE_VERSION,
		true
	);

	wp_set_script_translations( 'ferryforge-editor', 'ferryforge' );

	if ( file_exists( $style_path ) ) {
		wp_enqueue_style(
			'ferryforge-editor',
			plugins_url( 'assets/editor.css', __FILE__ ),
			array(),
			FERRYFORGE_VERSION
		);
	}

	unset( $script_path );
}
add_action( 'enqueue_block_editor_assets', 'ferryforge_enqueue_editor_assets' );

/**
 * Register the image sideload REST route used by the importer.
 */
function ferryforge_register_routes() {
	register_rest_route(
		'ferryforge/v1',
		'/sideload',
		array(
			'methods'             => 'POST',
			'callback'            => 'ferryforge_sideload',
			'permission_callback' => function () {
				return current_user_can( 'upload_files' );
			},
			'args'                => array(
				'urls' => array(
					'required' => true,
					'type'     => 'array',
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'ferryforge_register_routes' );

/**
 * Pull a set of external image URLs into this site's media library.
 *
 * Returns a map of original URL => local URL. Images already on this site, or
 * ones that fail to import, are left pointing at their original URL.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function ferryforge_sideload( $request ) {
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$urls = (array) $request->get_param( 'urls' );
	$urls = array_slice( array_values( array_unique( $urls ) ), 0, 50 );
	$home = home_url();
	$map  = array();

	foreach ( $urls as $raw ) {
		$url = esc_url_raw( (string) $raw );
		if ( '' === $url ) {
			continue;
		}
		// Leave images that already live on this site untouched.
		if ( 0 === strpos( $url, $home ) ) {
			$map[ $url ] = $url;
			continue;
		}
		if ( ! preg_match( '#^https?://#i', $url ) ) {
			continue;
		}

		$attachment_id = media_sideload_image( $url, 0, null, 'id' );
		if ( is_wp_error( $attachment_id ) ) {
			continue;
		}

		$local = wp_get_attachment_url( $attachment_id );
		if ( $local ) {
			$map[ $url ] = $local;
		}
	}

	return rest_ensure_response( array( 'map' => $map ) );
}

/**
 * Add Ko-fi support and contact links next to the plugin's action links.
 *
 * @param array $links Existing action links.
 * @return array
 */
function ferryforge_action_links( $links ) {
	$links[] = sprintf(
		'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
		esc_url( 'https://ko-fi.com/gunjanjaswal' ),
		esc_html__( 'Support on Ko-fi', 'ferryforge' )
	);
	$links[] = sprintf(
		'<a href="%s">%s</a>',
		esc_url( 'mailto:hello@gunjanjaswal.me' ),
		esc_html__( 'Contact developer', 'ferryforge' )
	);

	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'ferryforge_action_links' );
