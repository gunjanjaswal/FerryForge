( function ( wp ) {
	'use strict';

	var el = wp.element.createElement;
	var useState = wp.element.useState;
	var Fragment = wp.element.Fragment;
	var __ = wp.i18n.__;
	var registerPlugin = wp.plugins.registerPlugin;
	var PluginSidebar = wp.editPost.PluginSidebar;
	var PluginSidebarMoreMenuItem = wp.editPost.PluginSidebarMoreMenuItem;

	var Button = wp.components.Button;
	var PanelBody = wp.components.PanelBody;
	var TextareaControl = wp.components.TextareaControl;
	var TextControl = wp.components.TextControl;
	var CheckboxControl = wp.components.CheckboxControl;

	var SIDEBAR_NAME = 'ferryforge-sidebar';

	function notice( type, message ) {
		var dispatch = wp.data.dispatch( 'core/notices' );
		var options = { type: 'snackbar', isDismissible: true };
		if ( type === 'error' ) {
			dispatch.createErrorNotice( message, { isDismissible: true } );
		} else {
			dispatch.createSuccessNotice( message, options );
		}
	}

	// Return the currently selected blocks, or every top-level block when the
	// selection is empty.
	function collectBlocks() {
		var store = wp.data.select( 'core/block-editor' );
		var ids = store.getSelectedBlockClientIds();

		if ( ids && ids.length ) {
			return store.getBlocksByClientId( ids );
		}

		return store.getBlocks();
	}

	function copyToClipboard( text ) {
		if ( navigator.clipboard && navigator.clipboard.writeText ) {
			return navigator.clipboard.writeText( text );
		}

		return new Promise( function ( resolve, reject ) {
			try {
				var area = document.createElement( 'textarea' );
				area.value = text;
				area.style.position = 'fixed';
				area.style.opacity = '0';
				document.body.appendChild( area );
				area.focus();
				area.select();
				document.execCommand( 'copy' );
				document.body.removeChild( area );
				resolve();
			} catch ( err ) {
				reject( err );
			}
		} );
	}

	function downloadFile( text, filename ) {
		var blob = new Blob( [ text ], { type: 'text/html' } );
		var url = URL.createObjectURL( blob );
		var link = document.createElement( 'a' );
		link.href = url;
		link.download = filename;
		document.body.appendChild( link );
		link.click();
		document.body.removeChild( link );
		URL.revokeObjectURL( url );
	}

	function suggestedFilename() {
		var title = wp.data.select( 'core/editor' ).getEditedPostAttribute( 'title' );
		var slug = ( title || 'blocks' )
			.toLowerCase()
			.replace( /[^a-z0-9]+/g, '-' )
			.replace( /^-+|-+$/g, '' );

		if ( ! slug ) {
			slug = 'blocks';
		}

		return 'ferryforge-' + slug + '.html';
	}

	function FerryForgePanel() {
		var importState = useState( '' );
		var importValue = importState[ 0 ];
		var setImportValue = importState[ 1 ];

		var patternState = useState( '' );
		var patternName = patternState[ 0 ];
		var setPatternName = patternState[ 1 ];

		var savingState = useState( false );
		var saving = savingState[ 0 ];
		var setSaving = savingState[ 1 ];

		var mediaState = useState( false );
		var importMedia = mediaState[ 0 ];
		var setImportMedia = mediaState[ 1 ];

		function selectionLabel() {
			var ids = wp.data.select( 'core/block-editor' ).getSelectedBlockClientIds();
			if ( ids && ids.length ) {
				return __( 'Using your current selection.', 'ferryforge' );
			}
			return __( 'Nothing selected, so the whole post will be used.', 'ferryforge' );
		}

		function handleCopy() {
			var blocks = collectBlocks();
			if ( ! blocks.length ) {
				notice( 'error', __( 'There are no blocks to copy yet.', 'ferryforge' ) );
				return;
			}
			var markup = wp.blocks.serialize( blocks );
			copyToClipboard( markup ).then(
				function () {
					notice( 'success', __( 'Blocks copied. Paste them into any block editor.', 'ferryforge' ) );
				},
				function () {
					notice( 'error', __( 'Could not reach the clipboard. Try the download instead.', 'ferryforge' ) );
				}
			);
		}

		function handleDownload() {
			var blocks = collectBlocks();
			if ( ! blocks.length ) {
				notice( 'error', __( 'There are no blocks to export yet.', 'ferryforge' ) );
				return;
			}
			var markup = wp.blocks.serialize( blocks );
			downloadFile( markup, suggestedFilename() );
			notice( 'success', __( 'Export file downloaded.', 'ferryforge' ) );
		}

		// Pull image URLs out of raw block markup.
		function extractImageUrls( markup ) {
			var urls = [];
			var seen = {};
			var re = /https?:\/\/[^\s"'<>\\]+?\.(?:png|jpe?g|gif|webp|svg|avif)/gi;
			var match;
			while ( ( match = re.exec( markup ) ) !== null ) {
				var url = match[ 0 ];
				if ( ! seen[ url ] ) {
					seen[ url ] = true;
					urls.push( url );
				}
			}
			return urls;
		}

		function doInsert( markup ) {
			var parsed = wp.blocks.parse( markup );
			parsed = parsed.filter( function ( block ) {
				return block && block.name;
			} );

			if ( ! parsed.length ) {
				notice( 'error', __( 'That did not look like block markup.', 'ferryforge' ) );
				return;
			}

			wp.data.dispatch( 'core/block-editor' ).insertBlocks( parsed );
			notice( 'success', __( 'Blocks added to the post.', 'ferryforge' ) );
			setImportValue( '' );
		}

		function insertMarkup( markup, sideload ) {
			var trimmed = ( markup || '' ).trim();
			if ( ! trimmed ) {
				notice( 'error', __( 'Paste some block markup first.', 'ferryforge' ) );
				return;
			}

			if ( ! sideload ) {
				doInsert( trimmed );
				return;
			}

			var urls = extractImageUrls( trimmed );
			if ( ! urls.length ) {
				doInsert( trimmed );
				return;
			}

			notice( 'success', __( 'Importing images, one moment...', 'ferryforge' ) );
			wp.apiFetch( {
				path: '/ferryforge/v1/sideload',
				method: 'POST',
				data: { urls: urls },
			} ).then(
				function ( res ) {
					var map = ( res && res.map ) || {};
					var updated = trimmed;
					Object.keys( map ).forEach( function ( original ) {
						if ( map[ original ] && map[ original ] !== original ) {
							updated = updated.split( original ).join( map[ original ] );
						}
					} );
					doInsert( updated );
				},
				function () {
					notice( 'error', __( 'Could not import the images, so the blocks were added with their original links.', 'ferryforge' ) );
					doInsert( trimmed );
				}
			);
		}

		function handleFile( event ) {
			var file = event.target.files && event.target.files[ 0 ];
			if ( ! file ) {
				return;
			}
			var reader = new FileReader();
			reader.onload = function () {
				insertMarkup( String( reader.result ), importMedia );
			};
			reader.onerror = function () {
				notice( 'error', __( 'That file could not be read.', 'ferryforge' ) );
			};
			reader.readAsText( file );
			event.target.value = '';
		}

		function handleSavePattern() {
			var blocks = collectBlocks();
			if ( ! blocks.length ) {
				notice( 'error', __( 'Select the blocks you want to save first.', 'ferryforge' ) );
				return;
			}

			var title = ( patternName || '' ).trim();
			if ( ! title ) {
				notice( 'error', __( 'Give the pattern a name.', 'ferryforge' ) );
				return;
			}

			setSaving( true );
			wp.apiFetch( {
				path: '/wp/v2/blocks',
				method: 'POST',
				data: {
					title: title,
					content: wp.blocks.serialize( blocks ),
					status: 'publish',
				},
			} ).then(
				function () {
					setSaving( false );
					setPatternName( '' );
					notice( 'success', __( 'Saved as a synced pattern.', 'ferryforge' ) );
				},
				function () {
					setSaving( false );
					notice( 'error', __( 'The pattern could not be saved.', 'ferryforge' ) );
				}
			);
		}

		return el(
			Fragment,
			null,
			el(
				PanelBody,
				{ title: __( 'Export', 'ferryforge' ), initialOpen: true },
				el( 'p', { className: 'ferryforge-hint' }, selectionLabel() ),
				el(
					Button,
					{ variant: 'primary', onClick: handleCopy, className: 'ferryforge-button' },
					__( 'Copy blocks', 'ferryforge' )
				),
				el(
					Button,
					{ variant: 'secondary', onClick: handleDownload, className: 'ferryforge-button' },
					__( 'Download as file', 'ferryforge' )
				)
			),
			el(
				PanelBody,
				{ title: __( 'Import', 'ferryforge' ), initialOpen: false },
				el( TextareaControl, {
					label: __( 'Paste block markup', 'ferryforge' ),
					value: importValue,
					onChange: setImportValue,
					rows: 6,
					placeholder: '<!-- wp:paragraph -->...',
				} ),
				el( CheckboxControl, {
					label: __( 'Also import images into this site', 'ferryforge' ),
					help: __( 'Copies any external images into your media library and updates the links, so the layout does not depend on the other site.', 'ferryforge' ),
					checked: importMedia,
					onChange: setImportMedia,
				} ),
				el(
					Button,
					{
						variant: 'primary',
						onClick: function () {
							insertMarkup( importValue, importMedia );
						},
						className: 'ferryforge-button',
					},
					__( 'Add blocks', 'ferryforge' )
				),
				el( 'p', { className: 'ferryforge-hint' }, __( 'Or load a file exported from another site:', 'ferryforge' ) ),
				el( 'input', {
					type: 'file',
					accept: '.html,.htm,.txt',
					onChange: handleFile,
					className: 'ferryforge-file',
				} )
			),
			el(
				PanelBody,
				{ title: __( 'Save as pattern', 'ferryforge' ), initialOpen: false },
				el( 'p', { className: 'ferryforge-hint' }, selectionLabel() ),
				el( TextControl, {
					label: __( 'Pattern name', 'ferryforge' ),
					value: patternName,
					onChange: setPatternName,
				} ),
				el(
					Button,
					{
						variant: 'primary',
						onClick: handleSavePattern,
						isBusy: saving,
						disabled: saving,
						className: 'ferryforge-button',
					},
					saving ? __( 'Saving...', 'ferryforge' ) : __( 'Save synced pattern', 'ferryforge' )
				)
			)
		);
	}

	registerPlugin( SIDEBAR_NAME, {
		icon: 'migrate',
		render: function () {
			return el(
				Fragment,
				null,
				el(
					PluginSidebarMoreMenuItem,
					{ target: SIDEBAR_NAME, icon: 'migrate' },
					__( 'Ferry Forge', 'ferryforge' )
				),
				el(
					PluginSidebar,
					{ name: SIDEBAR_NAME, icon: 'migrate', title: __( 'Ferry Forge', 'ferryforge' ) },
					el( FerryForgePanel, null )
				)
			);
		},
	} );
} )( window.wp );
