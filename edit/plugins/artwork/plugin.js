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
		var currentDialog = null;
		var currentSelection = null;
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
							},
							{
								id: "btn-delete",
								type: "button",
								label: "Delete",
								onClick: function() {
									if(window.confirm("Remove artwork? This can't be undone.") !== true) {
										return;
									}
									var imageContainer = currentSelection.node().parentElement.parentElement;
									var nextImageContainer = imageContainer.nextElementSibling || imageContainer.previousElementSibling;
									if(!nextImageContainer) {
										window.alert("Oops...removing the last artwork is not supported.\nFirst add a new artwork, before removing this one.");
										return;
									}
									d3.select(imageContainer).remove();

									// Show next (or previous if no next is available) image
									siteEditor.setEditorSelection(currentDialog.getParentEditor(), d3.select(nextImageContainer).select("img"));
									currentDialog.definition.onShow.call(currentDialog);
								}
							}
						]
					},
					{
						id: "tab-photos-upload",
						label: "Upload",
						elements: [
							{
								id: "file-upload-photo",
								type: "html",
								html: '<form class="image-upload" action="/edit/php/uploadimage.php" method="post" enctype="multipart/form-data"><input type="hidden" name="type" value="artwork"><div><label for="file">Choose artwork image to upload</label><input type="file" accept=".jpg,.jpeg,.png" id="file" name="photo[]" multiple></div><div><button type="submit">Send to server</button></div></form>'
							}
						]
					},
				],
				onShow: function(editor, dialog, page, selection) {
					currentDialog = this;
					currentSelection = selection;
					this.copyFromSiteToDialog();

					// Add upload handler
					var formElement = dialog.select("form.image-upload");
					formElement.on("submit", function() {
						d3.event.preventDefault();
						d3.json(formElement.attr("action"))
							.post(new FormData(formElement.node()), function(error, data) {
								if(data.resultCode !== "OK") {
									window.alert("Failed to upload artwork: " + data.resultMessage);
									return;
								} else if(data.resultNames) {
									window.alert("Artwork is uploaded successfully");
									var imageNames = data.resultNames.split(",");
									imageNames.forEach(function(imageName) {
										imageGrid.insertImage(imageName);
									});
									// Show new image (new image is first in grid)
									siteEditor.setEditorSelection(currentDialog.getParentEditor(), page.select(".image-grid img"));
									currentDialog.definition.onShow.call(currentDialog);
								} else {
									window.alert("No artwork uploaded");
								}
							})
						;
					});
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
