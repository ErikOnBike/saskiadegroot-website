//
// Developed by Erik at www.toolparadise.nl
//

// UI Definition for rectangular photo
var rectangularPhotoInput = {
	id: "rect-photo-select",
	type: "html",
	html: '<div class="rect-photo-dialog"><div class="header"></div><div class="rect-photo"><img src=""></div><div class="zoom-label">Zoom:</div><div class="zoom-control"><div class="range"><div class="position"></div></div></div></div>',
	onShow: function(editor, dialog, input, page, selection) {

		// Initialize
		var self = this;
		var inputContainer = input.select(".rect-photo");
		var inputImage = input.select("img");
		var zoomRange = input.select(".range");
		var zoomPosition = input.select(".position");
		var imageNaturalWidth = 1;	// Fake 1x1 until image is loaded
		var imageNaturalHeight = 1;
		var imageMinimalZoom = 1;
		var thisElementIsVisible = false;	// Assume element not visible on 'main' tab
		var needsRedraw = false;

		// Retrieve info from input (values can change because of resize/orientation change/etc)
		function getImageInfo() {

			// Get width of container and use for height as well (container is square)
			var containerWidth = inputContainer.node().clientWidth;
			var containerHeight = containerWidth;

			// Get width and height of image
			var imageWidth = inputImage.node().clientWidth;
			var imageHeight = inputImage.node().clientHeight;

			// Range width
			var rangeWidth = zoomRange.node().clientWidth;

			return {
				container: { width: containerWidth, height: containerHeight },
				image: { width: imageWidth, height: imageHeight },
				range: { width: rangeWidth },
				minOrigin: { x: Math.min(containerWidth - imageWidth, 0), y: Math.min(containerHeight - imageHeight, 0) }
			};
		}

		// Drag image event handlers
		function dragStart(d) {

			// Test if dragging is 'allowed'
			if(inputImage.attr("src") === NO_PHOTO_SRC) {
				d.ignoreDrag = true;
				return;
			}
			delete d.ignoreDrag;

			// Calculate bounds
			var info = getImageInfo();
			d.minX = info.minOrigin.x;
			d.minY = info.minOrigin.y;
		}
		function dragMove(d) {

			// Test if dragging is 'allowed'
			if(d.ignoreDrag) {
				return;
			}

			// Move image into dragged position
			d.x = Math.min(Math.max(d3.event.x, d.minX), 0);
			d.y = Math.min(Math.max(d3.event.y, d.minY), 0);
			inputImage
				.style("margin-left", d.x + "px")
				.style("margin-top", d.y + "px")
			;
		}
		function dragEnd(d) {
			delete d.ignoreDrag;

			// Update data
			updateData();
		}

		// Add drag behaviour to image
		inputImage
			.datum({ x: 0, y: 0 })
			.call(d3.drag()
				.on("start", dragStart)
				.on("drag", dragMove)
				.on("end", dragEnd)
			)
		;

		// Zoom event handlers (drag on zoom position within zoom range)
		function zoomStart(d) {

			// Test if zooming is 'allowed'
			if(inputImage.attr("src") === NO_PHOTO_SRC) {
				d.ignoreZoom = true;
				return;
			}
			delete d.ignoreZoom;

			// Calculate bounds
			var info = getImageInfo();
			d.maxX = info.range.width;
		}
		function zoomMove(d) {

			// Test if zooming is 'allowed'
			if(d.ignoreZoom) {
				return;
			}

			// Set zoom control
			d.x = Math.max(Math.min(d3.event.x, d.maxX), 0);
			d.y = d3.event.y;
			zoomPosition.style("left", d.x + "px");

			// Zoom image
			var zoomValue = 5 / d.maxX * d.x;
			inputImage.style("width", (100 * (imageMinimalZoom + zoomValue)) + "%");

			// Adjust origin if necessary (origin will have negative values, use Math.max!)
			var info = getImageInfo();
			var left = parseFloat(inputImage.style("margin-left"));
			var top = parseFloat(inputImage.style("margin-top"));
			inputImage
				.style("margin-left", Math.max(left, info.minOrigin.x) + "px")
				.style("margin-top", Math.max(top, info.minOrigin.y) + "px")
			;
		}
		function zoomEnd(d) {
			delete d.ignoreZoom;

			// Update data
			updateData();
		}

		// Add drag behaviour to zoom position
		zoomPosition
			.datum({ x: 0, y: 0 })
			.call(d3.drag()
				.on("start", zoomStart)
				.on("drag", zoomMove)
				.on("end", zoomEnd)
			)
			.on("click", function() {
				browser.stopEvent();
			})
		;

		// Add click behaviour on zoom range
		zoomRange
			.on("click", function() {
				// Hack to get relative offset
				d3.event = {
					x: d3.event.offsetX,
					y: d3.event.offsetY
				};
				var positionNode = zoomPosition.node();
				var positionDatum = zoomPosition.datum();
				zoomStart.call(positionNode, positionDatum);
				zoomMove.call(positionNode, positionDatum);
				zoomEnd.call(positionNode, positionDatum);
			})
		;

		// Set zoom level programmatically (see zoomMove for values)
		function setZoom(zoom) {

			// Retrieve current zoom position
			var positionNode = zoomPosition.node();
			var positionDatum = zoomPosition.datum();

			// Add max zoom position to the position data by calling zoomStart
			zoomStart.call(positionNode, positionDatum);

			// Set zoom position according to provided zoom parameter
			positionDatum.x = ((zoom / 100) - imageMinimalZoom) / 5 * positionDatum.maxX;

			// Update display
			zoomPosition.style("left", positionDatum.x + "px");

			// Update image
			inputImage.style("width", zoom + "%");
		}

		// Update data into image attributes
		function updateData() {

			// Retrieve current values
			var containerWidth = inputContainer.node().clientWidth || 1;
			var zoomFactor = parseFloat(inputImage.style("width")) / 100;
			var top = Math.abs(parseFloat(inputImage.style("margin-top")));
			var left = Math.abs(parseFloat(inputImage.style("margin-left")));

			// Turn absolute values into percentage of width
			var selection = {
				topPercentage: top / containerWidth,
				leftPercentage: left / containerWidth,
				zoomFactor: zoomFactor
			};

			// Get thumbnail coordinates
			var thumbnail = {
				offsetX: imageNaturalWidth * selection.leftPercentage / zoomFactor,
				offsetY: selection.topPercentage / zoomFactor * imageNaturalWidth,
				size: imageNaturalWidth / zoomFactor
			};

			// Decide what to store
			if(inputImage.attr("data-selection")) {
				inputImage.attr("data-selection", selection.leftPercentage.toFixed(5) + "," + selection.topPercentage.toFixed(5) + "," + selection.zoomFactor.toFixed(5));
			} else {
				inputImage.attr("data-thumbnail", inputImage.attr("src") + "@" + thumbnail.offsetX.toFixed(5) + "," + thumbnail.offsetY.toFixed(5) + "," + thumbnail.size.toFixed(5));
			}
		}

		// Update image with thumbnail info on image
		function updateThumbnail() {
			var thumbnailDataString = inputImage.attr("data-thumbnail");
			if(!thumbnailDataString) {
				return;
			}

			// Check if images match
			var thumbnailImage = thumbnailDataString.replace(/^(.*)@.*$/, "$1");
			if(thumbnailImage !== inputImage.attr("src")) {
				updateData();
				return;
			}

			// Remove image from data string and parse position and size
			thumbnailDataString = thumbnailDataString.replace(/^.*@(.*)$/, "$1");
			var thumbnailData = thumbnailDataString.split(",");
			var thumbnail = {
				offsetX: +thumbnailData[0],
				offsetY: +thumbnailData[1],
				size: +thumbnailData[2]
			};

			// Calculate values relative to container
			var containerWidth = inputContainer.node().clientWidth || 1;
			var zoomFactor = imageNaturalWidth / thumbnail.size;
			var left = -thumbnail.offsetX / imageNaturalWidth * containerWidth * zoomFactor;
			var top = -thumbnail.offsetY * containerWidth * zoomFactor / imageNaturalWidth;
			var zoom = zoomFactor * 100;

			// Update image and zoom
			inputImage
				.style("margin-top", top + "px")
				.style("margin-left", left + "px")
			;
			inputImage.datum().x = left;
			inputImage.datum().y = top;
			setZoom(zoom);
		}

		// Update image with selection info on image
		function updateSelection() {
			var selectionString = inputImage.attr("data-selection");
			if(!selectionString || !selectionString.match(/^[\d\.]+,[\d\.]+,[\d\.]+$/)) {
				return;
			}
			var selectionData = selectionString.split(",");
			var selection = {
				leftPercentage: +selectionData[0],
				topPercentage: +selectionData[1],
				zoomFactor: +selectionData[2]
			};

			// Calculate absolute values from percentages
			var containerWidth = inputContainer.node().clientWidth || 1;
			var left = -selection.leftPercentage * containerWidth;
			var top = -selection.topPercentage * containerWidth;
			var zoom = selection.zoomFactor * 100;

			// Update image and zoom
			inputImage
				.style("margin-top", top + "px")
				.style("margin-left", left + "px")
			;
			inputImage.datum().x = left;
			inputImage.datum().y = top;
			setZoom(zoom);
		}

		// Redraw function
		function redraw() {

			// Set default values when no image is supplied
			if(inputImage.attr("src") === NO_PHOTO_SRC) {
				imageNaturalWidth = 1;
				imageNaturalHeight = 1;
				imageMinimalZoom = 1;
				inputImage
					.style("margin-left", "0px")
					.style("margin-top", "0px")
				;
				inputImage.datum().x = 0;
				inputImage.datum().y = 0;
				setZoom(100 * imageMinimalZoom);	// Set zoom position to 0
				return;
			}

			// Getting/setting dimensions and GUI controls is not useful if element is not visible (redraw later)
			if(!thisElementIsVisible) {
				needsRedraw = true;
			}

			// Get natural image dimensions
			var naturalDimensions = getNaturalDimensions();
			imageNaturalWidth = naturalDimensions.width;
			imageNaturalHeight = naturalDimensions.height;
			imageMinimalZoom = 1;
			if(imageNaturalWidth > imageNaturalHeight) {
				imageMinimalZoom = imageNaturalWidth / imageNaturalHeight;
			}
			var zoom = 100 * imageMinimalZoom;	// Effectively setting zoom to 0
			inputImage
				.style("margin-left", "0px")
				.style("margin-top", "0px")
			;
			inputImage.datum().x = 0;
			inputImage.datum().y = 0;
			setZoom(zoom);

			// If data available redraw image (based on info provided)
			updateThumbnail();
			updateSelection();

			// Otherwise set data
			updateData();
		}
		function getNaturalDimensions() {
			var width = 1;
			var height = 1;
			var src = inputImage.attr("src");
			d3.selectAll("img[src=\"" + src + "\"]").each(function() {
				var imageNode = this;
				if(imageNode.naturalWidth > width) {
					width = imageNode.naturalWidth;
				}
				if(imageNode.naturalHeight > height) {
					height = imageNode.naturalHeight;
				}
			});
			return { width: width, height: height };
		}

		// Check if elements is or becomes visible (if so perform requested redraw)
		var ckeDialog = dialog.datum().ckeDialog;
		if(!thisElementIsVisible && ckeDialog.definition && ckeDialog.definition.contents && ckeDialog.definition.contents.length === 1 && ckeDialog.getContentElement(ckeDialog.definition.contents[0].id, self.id) === self) {

			// Element is part of a dialog with 1 tab (so tab will be visible)
			thisElementIsVisible = true;
		} else {

			// Check if element becomes visible if a tab is selected
			ckeDialog.on("selectPage", function(evt) {

				// Only test if not already found out it is visible
				if(!thisElementIsVisible && evt && evt.data && evt.data.page) {
					if(ckeDialog.getContentElement(evt.data.page, self.id) === self) {
						thisElementIsVisible = true;
						if(needsRedraw) {
							window.setTimeout(function() {
								redraw();
							}, 100);
						}
					}
				}
			});
		}

		// Redraw if image is loaded and set thumbnail
		input.select("img").on("load", function() {
			redraw();
		});
	}
};

// Add plugin
CKEDITOR.plugins.add("photos", {
	init: function(editor) {

		// Add command
		editor.addCommand("editPhotos", siteEditor.generateCommand({
			exec: function(editor, page, selection) {
				editor.openDialog("photosDialog");
			},
			refresh: function(editor, page, selection) {
				var polaroid = page.select(".polaroid");
				this.setState(polaroid.size() === 1 ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED);
			}
		}));

		// Add button
		editor.ui.addButton("EditPhotos", {
			label: "Edit Photos",
			command: "editPhotos"
		});

		// Add icon (hack, don't want to recompile CKeditor because of dev-environment)
		editor.on("instanceReady", function() {
			d3.selectAll(".cke_button__editphotos_icon")
				.style("background-image", "url('/edit/plugins/photos/icons/photos.png')")
				.style("background-size", "16px")
			;
		});

		// Add dialog
		CKEDITOR.dialog.add("photosDialog", function(editor) {
			return siteEditor.generateDialog({
				title: "Edit Photos",
				minWidth: 400,
				minHeight: 400,
				contents: [
					{
						id: "tab-photos-polaroid",
						label: "Polaroid",
						elements: [
							{
								id: "txt-photos-polaroid-img",
								type: "html",
								html: '<div class="polaroid-dialog"><div class="polaroid-image"><img src=""><span class="remove button">X</span></div><h3>Select image:</h3><div class="polaroid-selection"></div></div>'
							},
							{
								id: "txt-photos-polaroid-label",
								type: "text",
								label: "Label"
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
								html: '<form class="image-upload" action="/edit/php/uploadimage.php" method="post" enctype="multipart/form-data"><input type="hidden" name="type" value="polaroid"><div><label for="file">Choose page photo to upload</label><input type="file" accept=".jpg,.jpeg,.png" id="file" name="photo[]" multiple></div><div><button type="submit">Send to server</button></div></form>'
							}
						]
					},
					{
						id: "tab-photos-blog",
						label: "Blog thumbnail",
						elements: [
							shallowCopy(rectangularPhotoInput)
						]
					}
				],
				onShow: function(editor, dialog, page, selection) {

					// Add current image to dialog
					var ckeDialog = this;
					var dialogImage = dialog.select(".polaroid-dialog img");
					this.copyFromSiteToDialog();

					// Remove thumbnail page for non-blog pages
					if(!page.classed("blog") || page.classed("blog-page")) {
						ckeDialog.hidePage("tab-photos-blog");
					}

					// Add header description for thumbnail
					dialog.select(".header").text("Select thumbnail fragment for blog overview");

					// (Re)layout dialog (needed for certain changes)
					function layoutDialog() {
						window.setTimeout(function() {
							ckeDialog.layout();
						}, 100);
					}

					// Resize/reposition dialog on tab change (every tab has own size)
					ckeDialog.on("selectPage", layoutDialog);

					// Redraw dialog
					function redraw() {
						
						var titleInput = ckeDialog.getContentElement("tab-photos-polaroid", "txt-photos-polaroid-label");

						// If no polaroid, remove title
						var hasPolaroid = dialogImage.attr("src") !== NO_PHOTO_SRC;
						if(!hasPolaroid) {
							titleInput.setValue(NO_POLAROID_TITLE);
							titleInput.disable();
						} else {
							titleInput.enable();
						}

						// Update thumbnail if necessary
						var thumbnailImage = dialog.select(".rect-photo img");
						if(thumbnailImage.attr("src") !== dialogImage.attr("src")) {
							thumbnailImage.attr("src", dialogImage.attr("src"));
						}

						// Relayout dialog
						layoutDialog();
					}

					// Add handler to remove polaroid
					dialog.select(".remove.button").on("click", function() {
						dialogImage.attr("src", NO_PHOTO_SRC);
						redraw();
					});

					// Add possible images to dialog
					function updateAvailableImages() {
						d3.json("/edit/php/getInfo.php")
							.header("Content-Type", "application/json")
							.post(JSON.stringify({ info: "polaroidUrls" }), function(error, data) {
								if(error || !data || data.resultCode !== "OK" || !Array.isArray(data.urls)) {
									window.alert("Failed to read photos from server: " + data.resultMessage);
									return;
								}
								data.urls.sort();
								dialog.select(".polaroid-selection").selectAll("img").data(data.urls)
									.enter()
										.insert("img", "*")
											.attr("src", function(d) { return d; })
											.on("click", function() {
												// Reset label if this is first image selected
												if(dialogImage.attr("src") === NO_PHOTO_SRC) {
													ckeDialog.setValueOf("tab-photos-polaroid", "txt-photos-polaroid-label", "");
												}
												dialogImage.attr("src", d3.select(this).attr("src"));
												redraw();
											})
									.exit().remove()
								;
							})
						;
					}

					// Keep track whether images are uploaded
					dialog.datum().imagesAreUploaded = false;

					// Add upload handler
					var formElement = dialog.select("form.image-upload");
					formElement.on("submit", function() {
						d3.event.preventDefault();
						d3.json(formElement.attr("action"))
							.post(new FormData(formElement.node()), function(error, data) {
								if(data.resultCode !== "OK") {
									window.alert("Failed to upload photos: " + data.resultMessage);
									return;
								} else {
									dialog.datum().imagesAreUploaded = true;
									window.alert("Photo(s) uploaded successfully");
								}

								// Files uploaded correctly, update available images
								updateAvailableImages();
							})
						;
					});

					// Load currently available images
					updateAvailableImages();

					// Redraw
					redraw();
				},
				onOk: function(editor, dialog, page, selection) {
					if(this.hasDialogChanges()) {
						this.copyFromDialogToSite();
					}
				},
				onCancel: function(editor, dialog, page, selection) {

					// Show message if images have been uploaded
					if(dialog.datum().imagesAreUploaded) {
						window.alert("Already uploaded images will remain available");
					}
				}
			},
			// Mapping between site and editor
			[
				{
					from: {
						page: ".polaroid img",
						attributes: [ "src", "data-cke-saved-src" ]	// data-cke-saved-src is required hack
					},
					to: {
						dialog: ".polaroid-dialog img",
						attributes: [ "src", "src" ]
					}
				},
				{
					from: {
						page: ".polaroid",
						attributes: [ "title" ]
					},
					to: {
						input: "tab-photos-polaroid",
						attributes: [ "txt-photos-polaroid-label" ]
					}
				},
				{
					from: {
						page: ".polaroid img",
						attributes: [ "data-thumbnail" ],
					},
					to: {
						dialog: ".rect-photo img",
						attributes: [ "data-thumbnail" ]
					}
				}
			]);
		});
	}
});
