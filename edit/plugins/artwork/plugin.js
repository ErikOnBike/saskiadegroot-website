//
// Developed by Erik at www.toolparadise.nl
//

// Add plugin
CKEDITOR.plugins.add("artwork", {
	init: function(editor) {

		// Add command
		editor.addCommand("toggleEditArtwork", siteEditor.generateCommand({
			exec: function(editor, page, selection) {
				editor.openDialog("artworkDialog");
			},
			refresh: function(editor, page, selection) {
				var image = siteEditor.getParentFor(selection, ".image");
				this.setState(image ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED);
			}
		}));

		// Add button
		editor.ui.addButton("EditArtwork", {
			label: "Edit Artwork",
			command: "toggleEditArtwork"
		});

		// Add icon (hack, don't want to recompile CKeditor because of dev-environment)
		editor.on("instanceReady", function() {
			d3.selectAll(".cke_button__editartwork_icon")
				.style("background-image", "url('/edit/plugins/artwork/icons/artwork.png')")
				.style("background-size", "16px")
			;
		});

		// Add dialog
		CKEDITOR.dialog.add("artworkDialog", function(editor) {
			return siteEditor.generateDialog({
				title: "Artwork properties",
				minWidth: 400,
				minHeight: 400,
				contents: [
					{
						id: "tab-artwork-basic",
						label: "Size settings",
						elements: [
							shallowCopy(rectangularPhotoInput),
							{
								id: "txt-artwork-title-nl",
								type: "text",
								label: "Title NL"
							},
							{
								id: "txt-artwork-title-en",
								type: "text",
								label: "Title EN"
							}
						]
					}
				],
				onShow: function(editor, dialog, page, selection) {
					this.copyFromSiteToDialog();
				},
				onOk: function(editor, dialog, page, selection) {
					if(this.hasDialogChanges()) {
						this.copyFromDialogToSite();
						selection.each(imageGrid.updateImage);
					}
				}
			},
			// Mapping between site and editor
			[
				{
					from: {
						selection: "",
						attributes: [ "src", "data-selection" ]
					},
					to: {
						dialog: ".rect-photo img",
						attributes: [ "src", "data-selection" ]
					}
				},
				{
					from: {
						selection: "",
						attributes: [ "data-title-nl", "data-title-en" ]
					},
					to: {
						input: "tab-artwork-basic",
						attributes: [ "txt-artwork-title-nl", "txt-artwork-title-en" ]
					}
				}
			]);
		});
	}
});
