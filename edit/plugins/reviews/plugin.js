//
// Developed by Erik at www.toolparadise.nl
//

// Add plugin
CKEDITOR.plugins.add("reviews", {
	init: function(editor) {

		// Add commands
		editor.addCommand("editReviews", siteEditor.generateCommand({
			exec: function(editor, page, selection) {
				editor.openDialog("reviewsDialog");
			}
		}));

		// Add buttons
		editor.ui.addButton("EditReviews", {
			label: "Reviews",
			command: "editReviews"
		});

		// Add icons (hack, don't want to recompile CKeditor because of dev-environment)
		editor.on("instanceReady", function() {
			d3.selectAll(".cke_button__editreviews_icon")
				.style("background-image", "url('/edit/plugins/reviews/icons/reviews.png')")
				.style("background-size", "16px")
			;
		});

		// Helpers
		var ckeDialog = null;
		var dialog = null;
		var editReviews = null;
		var editReviewIndex = null;
		var setupDialog = function(newCkeDialog, newDialog) {
			ckeDialog = newCkeDialog;
			dialog = newDialog;
			editReviewIndex = null;
			editReviews = website.reviews.map(function(review) {
				return shallowCopy(review);
			});

			updateReviews();
		};
		var copyReviewToDialog = function(review) {
			ckeDialog.setValueOf("tab-reviews", "txt-text-nl", review ? review["text-nl"] : "");
			ckeDialog.setValueOf("tab-reviews", "txt-text-en", review ? review["text-en"] : "");
			ckeDialog.setValueOf("tab-reviews", "txt-name", review ? review.name : "");
			ckeDialog.setValueOf("tab-reviews", "select-category", review ? review.category : "hide");

			// Reset review index if no (actual) review is shown
			if(review === null) {
				editReviewIndex = null;
			}

			// Show selection in table
			dialog.select(".reviews-dialog tbody").selectAll("tr").classed("selected", function(d, i) {
				return i === editReviewIndex;
			});
		};
		var getReviewFromDialog = function(alwaysAnswer) {
			if(!alwaysAnswer && editReviewIndex === null) {
				return null;
			}
			return {
				"text-nl": ckeDialog.getValueOf("tab-reviews", "txt-text-nl"),
				"text-en": ckeDialog.getValueOf("tab-reviews", "txt-text-en"),
				name: ckeDialog.getValueOf("tab-reviews", "txt-name"),
				category: ckeDialog.getValueOf("tab-reviews", "select-category")
			};
		};
		var saveReview = function() {
			var review = getReviewFromDialog(true);
			if(editReviewIndex !== null) {
				editReviews[editReviewIndex] = review;
			} else {
				editReviews.push(review);
			}
			copyReviewToDialog(null);	// Empty dialog to create new review
			updateReviews();
		};
		var areReviewsEqual = function(review1, review2) {
			return review1["text-nl"] === review2["text-nl"] &&
				review1["text-en"] === review2["text-en"] &&
				review1.name === review2.name &&
				review1.category === review2.category;
		};
		var hasReviewChanges = function() {

			// Get review from dialog (and stop if none is present)
			var editReview = getReviewFromDialog();
			if(!editReview) {
				return false;
			}

			// Compare against original review
			var originalReview = editReviews[editReviewIndex];
			return !areReviewsEqual(editReview, originalReview);
		};
		var hasAnyReviewChanged = function() {
			if(hasReviewChanges()) {
				return true;
			}
			if(editReviews.length != website.reviews.length) {
				return true;
			}
			for(var i = 0; i < editReviews.length; i++) {
				if(!areReviewsEqual(editReviews[i], website.reviews[i])) {
					return true;
				}
			}
			return false;
		};
		var updateReviews = function() {

			// Join reviews on table body
			var dataElements = dialog.select(".reviews-dialog tbody").selectAll("tr").data(editReviews);

			// Append new reviews
			var news = dataElements
				.enter()
					.append("tr")
						.on("click", function(d, i) {
							browser.stopEvent();

							// Check if review already selected
							if(editReviewIndex === i) {
								return;
							}

							// Check if changes are made to already selected review
							if(hasReviewChanges() && !window.confirm("Selected review is changed. Discard changes?")) {
								return;
							}

							// Copy selected review to dialog
							editReviewIndex = i;
							copyReviewToDialog(d);
						});
			;
			news.append("td").attr("class", "title-nl");
			news.append("td").attr("class", "title-en");
			news.append("td").attr("class", "name");
			news.append("td").attr("class", "category");
			news.append("td").attr("class", "action").append("button").text("❌").on("click", function(d, i) {
				browser.stopEvent();

				// Check if selected review is shown and has changed
				if(editReviewIndex === i && hasReviewChanges()) {
					if(!window.confirm("Selected review is changed. Delete anyway?")) {
						return;
					}
				}

				// Confirm deletion
				if(!window.confirm("Deleting review. Are you sure?")) {
					return;
				}

				// Update view (incl. removing review if current is being deleted)
				if(editReviewIndex === i) {
					copyReviewToDialog(null);
				} else if(i < editReviewIndex) {
					editReviewIndex--;
				}
				editReviews.splice(i, 1);
				updateReviews();
			});

			// Update new and existing elements
			var updates = news.merge(dataElements);
			updates.select(".title-nl").text(function(d) { return d["text-nl"]; });
			updates.select(".title-en").text(function(d) { return d["text-en"]; });
			updates.select(".name").text(function(d) { return d.name; });
			updates.select(".category").text(function(d) { return d.category; });

			// Remove old elements
			dataElements.exit().remove();
		};

		// Add dialogs
		CKEDITOR.dialog.add("reviewsDialog", function(editor) {
			return siteEditor.generateDialog({
				title: "Reviews",
				minWidth: 700,
				minHeight: 400,
				contents: [
					{
						id: "tab-reviews",
						label: "Reviews",
						elements: [
							{
								id: "txt-text-nl",
								type: "textarea",
								label: "Text NL"
							},
							{
								id: "txt-text-en",
								type: "textarea",
								label: "Text EN"
							},
							{
								id: "txt-name",
								type: "text",
								label: "Reviewer"
							},
							{
								id: "select-category",
								type: "select",
								items: [
									[ "<Hidden>", "hide" ],
									[ "Drawing workshops", "drawing-workshops" ],
									[ "Drawing for teachers", "drawing-teachers" ],
									[ "Coaching drawing", "coaching-drawing" ],
									[ "Coaching MatriX", "coaching-matrix" ],
									[ "Guiding walking", "guiding-walking" ],
									[ "Guiding cycling", "guiding-cycling" ],
									[ "Guiding lectures", "guiding-lectures" ]
								],
								default: "hide",
								label: "Select category"
							},
							{
								id: "button-save",
								type: "button",
								label: "Save review",
								onClick: function(editor, dialog, input, page, selection) {
									saveReview();
								}
							},
							{
								type: "html",
								html: '<div class="reviews-dialog"><table><thead><tr><td class="title-nl">NL</td><td class="title-en">EN</td><td class="name">Reviewer</td><td class="category">Category</td><td class="action"></td></tr></thead><tbody></tbody></table></div>'
							},
							{
								id: "button-add",
								type: "button",
								label: "Add review",
								onClick: function(editor, dialog, input, page, selection) {
									editReviews.push({
										"text-nl": "",
										"text-en": "",
										name: "",
										category: "hide"
									});
									updateReviews();

									// Make newly added review the selected review (if current selected review has not changed)
									if(!hasReviewChanges()) {
										editReviewIndex = editReviews.length - 1;
										copyReviewToDialog(editReviews[editReviewIndex]);
									}
								}
							}
						]
					}
				],
				onShow: function(editor, dialog, page, selection) {

					var ckeDialog = this;
					setupDialog(ckeDialog, dialog);
				},
				onOk: function(editor, dialog, page, selection) {
					if(hasReviewChanges()) {
						window.alert("Selected review has unsaved changes.");
						return false;
					}

					// If there are any changes, simply replace reviews and store them
					if(hasAnyReviewChanged()) {
						website.reviews = editReviews;
						siteEditor.storeReviews();
					}
				},
				onCancel: function(editor, dialog, page, selection) {
					return !hasAnyReviewChanged() || confirm("Reviews have changed. Discard changes?");
					
				}
			});
		});
	}
});
