=== FerryForge ===
Contributors: gunjanjaswal
Tags: blocks, block editor, patterns, export, import
Requires at least: 6.3
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Move blocks between sites. Export a selection or whole post, import it anywhere, and save selections as synced patterns.

== Description ==

Native copy and paste only works when both editors are open in the same browser at the same moment. That falls apart the second you need to send a layout to a client, move it between two sites you cannot have open together, or keep a copy for next month. FerryForge turns the blocks into a file you can save, share, and bring back whenever you want.

Select a few blocks (or leave nothing selected to grab the entire post), open the FerryForge sidebar, and you can:

* Copy the blocks to your clipboard to paste into any block editor.
* Download them as a file you can hand to a client or import on another site later.
* Import a file, or paste block markup, straight into the post you are editing.
* Save the selection as a synced pattern so you can reuse it across the site.

No accounts, no external service, no settings page to wade through. Everything happens in the editor.

The export uses standard block markup, so anything you copy or download will paste cleanly into a normal WordPress editor even without this plugin installed on the other end.

= Support the plugin =

If FerryForge saves you some time, you can buy me a coffee on Ko-fi: https://ko-fi.com/gunjanjaswal

Built by Gunjan Jaswal. Questions or ideas? Reach me at hello@gunjanjaswal.me or https://www.gunjanjaswal.me

== Installation ==

1. Upload the `ferryforge` folder to the `/wp-content/plugins/` directory, or install it from the Plugins screen in your dashboard.
2. Activate the plugin.
3. Open any post or page in the block editor and click the FerryForge icon in the top toolbar to open the sidebar.

== Frequently Asked Questions ==

= Where do I find it in the editor? =

Open the options menu (the three dots at the top right of the editor) and choose FerryForge, or click its icon in the toolbar. The sidebar opens with Export, Import, and Save as pattern sections.

= What gets exported when I have nothing selected? =

Every top-level block in the post. Select specific blocks first if you only want part of it.

= Can I import a file into a site that does not have FerryForge? =

The export is plain block markup, so you can open the file, copy the contents, and paste them directly into any block editor. The import panel here just makes it a click instead.

= Does it send my content anywhere? =

No. Copying, downloading, and importing all run in your browser. Saving a pattern uses your own site's REST API, the same way the editor already does.

== Screenshots ==

1. The FerryForge sidebar with the Export, Import, and Save as pattern sections.

== Changelog ==

= 1.0.0 =
* First release.
* Export selected blocks, or the whole post, to the clipboard or a downloadable file.
* Import blocks from a file or pasted markup straight into the post you are editing.
* Save a selection as a synced pattern.

== Upgrade Notice ==

= 1.0.0 =
First release of FerryForge.
