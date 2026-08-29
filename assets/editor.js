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

	var SIDEBAR_NAME = 'blockferry-sidebar';

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

		return 'blockferry-' + slug + '.html';
	}

	function BlockFerryPanel() {
		var importState = useState( '' );
		var importValue = importState[ 0 ];
		var setImportValue = importState[ 1 ];

		var patternState = useState( '' );
		var patternName = patternState[ 0 ];
		var setPatternName = patternState[ 1 ];

		var savingState = useState( false );
		var saving = savingState[ 0 ];
		var setSaving = savingState[ 1 ];

		function selectionLabel() {
			var ids = wp.data.select( 'core/block-editor' ).getSelectedBlockClientIds();
			if ( ids && ids.length ) {
				return __( 'Using your current selection.', 'blockferry' );
			}
			return __( 'Nothing selected, so the whole post will be used.', 'blockferry' );
		}

		function handleCopy() {
			var blocks = collectBlocks();
			if ( ! blocks.length ) {
				notice( 'error', __( 'There are no blocks to copy yet.', 'blockferry' ) );
				return;
			}
			var markup = wp.blocks.serialize( blocks );
			copyToClipboard( markup ).then(
				function () {
					notice( 'success', __( 'Blocks copied. Paste them into any block editor.', 'blockferry' ) );
				},
				function () {
					notice( 'error', __( 'Could not reach the clipboard. Try the download instead.', 'blockferry' ) );
				}
			);
		}

		function handleDownload() {
			var blocks = collectBlocks();
			if ( ! blocks.length ) {
				notice( 'error', __( 'There are no blocks to export yet.', 'blockferry' ) );
				return;
			}
			var markup = wp.blocks.serialize( blocks );
			downloadFile( markup, suggestedFilename() );
			notice( 'success', __( 'Export file downloaded.', 'blockferry' ) );
		}

		function insertMarkup( markup ) {
			var trimmed = ( markup || '' ).trim();
			if ( ! trimmed ) {
				notice( 'error', __( 'Paste some block markup first.', 'blockferry' ) );
				return;
			}

			var parsed = wp.blocks.parse( trimmed );
			parsed = parsed.filter( function ( block ) {
				return block && block.name;
			} );

			if ( ! parsed.length ) {
				notice( 'error', __( 'That did not look like block markup.', 'blockferry' ) );
				return;
			}

			wp.data.dispatch( 'core/block-editor' ).insertBlocks( parsed );
			notice( 'success', __( 'Blocks added to the post.', 'blockferry' ) );
			setImportValue( '' );
		}

		function handleFile( event ) {
			var file = event.target.files && event.target.files[ 0 ];
			if ( ! file ) {
				return;
			}
			var reader = new FileReader();
			reader.onload = function () {
				insertMarkup( String( reader.result ) );
			};
			reader.onerror = function () {
				notice( 'error', __( 'That file could not be read.', 'blockferry' ) );
			};
			reader.readAsText( file );
			event.target.value = '';
		}

		function handleSavePattern() {
			var blocks = collectBlocks();
			if ( ! blocks.length ) {
				notice( 'error', __( 'Select the blocks you want to save first.', 'blockferry' ) );
				return;
			}

			var title = ( patternName || '' ).trim();
			if ( ! title ) {
				notice( 'error', __( 'Give the pattern a name.', 'blockferry' ) );
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
					notice( 'success', __( 'Saved as a synced pattern.', 'blockferry' ) );
				},
				function () {
					setSaving( false );
					notice( 'error', __( 'The pattern could not be saved.', 'blockferry' ) );
				}
			);
		}

		return el(
			Fragment,
			null,
			el(
				PanelBody,
				{ title: __( 'Export', 'blockferry' ), initialOpen: true },
				el( 'p', { className: 'blockferry-hint' }, selectionLabel() ),
				el(
					Button,
					{ variant: 'primary', onClick: handleCopy, className: 'blockferry-button' },
					__( 'Copy blocks', 'blockferry' )
				),
				el(
					Button,
					{ variant: 'secondary', onClick: handleDownload, className: 'blockferry-button' },
					__( 'Download as file', 'blockferry' )
				)
			),
			el(
				PanelBody,
				{ title: __( 'Import', 'blockferry' ), initialOpen: false },
				el( TextareaControl, {
					label: __( 'Paste block markup', 'blockferry' ),
					value: importValue,
					onChange: setImportValue,
					rows: 6,
					placeholder: '<!-- wp:paragraph -->...',
				} ),
				el(
					Button,
					{
						variant: 'primary',
						onClick: function () {
							insertMarkup( importValue );
						},
						className: 'blockferry-button',
					},
					__( 'Add blocks', 'blockferry' )
				),
				el( 'p', { className: 'blockferry-hint' }, __( 'Or load a file exported from another site:', 'blockferry' ) ),
				el( 'input', {
					type: 'file',
					accept: '.html,.htm,.txt',
					onChange: handleFile,
					className: 'blockferry-file',
				} )
			),
			el(
				PanelBody,
				{ title: __( 'Save as pattern', 'blockferry' ), initialOpen: false },
				el( 'p', { className: 'blockferry-hint' }, selectionLabel() ),
				el( TextControl, {
					label: __( 'Pattern name', 'blockferry' ),
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
						className: 'blockferry-button',
					},
					saving ? __( 'Saving...', 'blockferry' ) : __( 'Save synced pattern', 'blockferry' )
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
					__( 'Block Ferry', 'blockferry' )
				),
				el(
					PluginSidebar,
					{ name: SIDEBAR_NAME, icon: 'migrate', title: __( 'Block Ferry', 'blockferry' ) },
					el( BlockFerryPanel, null )
				)
			);
		},
	} );
} )( window.wp );
