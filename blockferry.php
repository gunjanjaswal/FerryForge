<?php
/**
 * Plugin Name:       Block Ferry
 * Plugin URI:        https://www.gunjanjaswal.me
 * Description:       Move blocks between sites. Export a selection (or the whole post) to a file or the clipboard, import it anywhere, and save a selection as a synced pattern, all from the editor sidebar.
 * Version:           1.0.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            Gunjan Jaswal
 * Author URI:        https://www.gunjanjaswal.me
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       blockferry
 *
 * @package BlockFerry
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BLOCKFERRY_VERSION', '1.0.0' );

/**
 * Enqueue the editor sidebar script and styles.
 */
function blockferry_enqueue_editor_assets() {
	$script_path = plugin_dir_path( __FILE__ ) . 'assets/editor.js';
	$style_path  = plugin_dir_path( __FILE__ ) . 'assets/editor.css';

	wp_enqueue_script(
		'blockferry-editor',
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
		BLOCKFERRY_VERSION,
		true
	);

	wp_set_script_translations( 'blockferry-editor', 'blockferry' );

	if ( file_exists( $style_path ) ) {
		wp_enqueue_style(
			'blockferry-editor',
			plugins_url( 'assets/editor.css', __FILE__ ),
			array(),
			BLOCKFERRY_VERSION
		);
	}

	unset( $script_path );
}
add_action( 'enqueue_block_editor_assets', 'blockferry_enqueue_editor_assets' );

/**
 * Add Ko-fi support and contact links next to the plugin's action links.
 *
 * @param array $links Existing action links.
 * @return array
 */
function blockferry_action_links( $links ) {
	$links[] = sprintf(
		'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
		esc_url( 'https://ko-fi.com/gunjanjaswal' ),
		esc_html__( 'Support on Ko-fi', 'blockferry' )
	);
	$links[] = sprintf(
		'<a href="%s">%s</a>',
		esc_url( 'mailto:hello@gunjanjaswal.me' ),
		esc_html__( 'Contact developer', 'blockferry' )
	);

	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'blockferry_action_links' );
