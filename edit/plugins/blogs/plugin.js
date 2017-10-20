//
// Developed by Erik at www.toolparadise.nl
//

// Globals
var today = new Date(Date.now());
var todayString = today.getFullYear() + "-" + ("0" + (today.getMonth() + 1)).substr(-2) + "-" + ("0" + today.getDate()).substr(-2);

// UI Definition for blog id and date inputs
var blogIdInput = {
	id: "txt-blog-id",
	type: "text",
	label: "ID",
	onInput: function(editor, dialog, input, page, selection) {
		var check = checkBlogId(this);
		dialog.select(".blog-dialog .error.id").text(check.error || check.warning || "");
	},
	validate: function(editor, dialog, input, page, selection) {
		var check = checkBlogId(this);
		if(check.error) {
			window.alert(check.error);
			return false;
		} else if(check.warning) {
			return window.confirm("Is it okay that: " + check.warning);
		}
		return true;
	}
};
function checkBlogId(ckeInput) {
	var blogId = ckeInput.getValue() || "";

	// Check for valid content/remove invalid content
	blogId = blogId.toLowerCase();
	if(!/^[a-z0-9\-]+$/.test(blogId)) {

		// Remove invalid characters
		blogId = blogId
			.replace(/ /g, "-")		// Replace space by dash
			.replace(/[^a-z0-9\-]/g, "")	// Remove remaining invalid characters
		;
		siteEditor.setInputValue(ckeInput, blogId);
	} else if(ckeInput.getValue() !== blogId) {

		// Changed to lower case
		siteEditor.setInputValue(ckeInput, blogId);
	}

	// Check for value and uniqueness
	var blogIdExists = blogs.entries.find(function(entry) {
		return entry.id === blogId;
	});
	if(blogId.length === 0) {
		return { error: "ID: Please provide a unique ID." };
	} else if(blogIdExists) {
		return { error: "ID: ID already exists. Please provide unique one." };
	}
	return {};
};
var blogDateInput = {
	id: "txt-blog-date",
	type: "text",
	label: "Date",
	default: todayString,
	onInput: function(editor, dialog, input, page, selection) {
		var check = checkBlogDate(this);
		dialog.select(".blog-dialog .error.date").text(check.error || check.warning || "");
	},
	validate: function(editor, dialog, input, page, selection) {
		var check = checkBlogDate(this);
		if(check.error) {
			window.alert(check.error);
			return false;
		} else if(check.warning) {
			return window.confirm("Is it okay that: " + check.warning);
		}
		return true;
	}
};
function checkBlogDate(ckeInput) {
	var dateString = ckeInput.getValue();
	var dateValue = Date.parse(dateString);
	if(!dateString) {
		return { error: "Date: Please provide a (publishing) date." };
	} else if(!/^20[0-9][0-9]-[0-9]{2}-[0-9]{2}$/.test(dateString)) {
		return { error: "Date: Date not in format: yyyy-mm-dd" };
	} else if(Number.isNaN(dateValue)) {
		return { error: "Date: Not a valid date." };
	} else if((new Date(dateValue)) > today) {
		return { warning: "Date: Date is in future" };
	} else if((new Date(dateValue)).getDay() === 0) {
		return { warning: "Date: Be careful date is on Sunday!" };
	}
	return {};
};

// Add plugin
CKEDITOR.plugins.add("blogs", {
	init: function(editor) {

		// Add commands
		editor.addCommand("newBlog", siteEditor.generateCommand({
			exec: function(editor, page, selection) {
				editor.openDialog("newBlogDialog");
			},
			refresh: function(editor, page, selection) {
				var isBlogPage = page.classed("page-blog");
				this.setState(isBlogPage ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED);
			}
		}));
		editor.addCommand("removeBlog", siteEditor.generateCommand({
			exec: function(editor, page, selection) {
				if(window.confirm("Remove this blog page?")) {

					// Remove stored blog
					page.attr("data-status", "removed");
					siteEditor.savePage(editor, function() {
						siteEditor.removeBlogElements(editor);
					});
				}
			},
			refresh: function(editor, page, selection) {
				var isUnpublishedBlogPage = page.classed("page blog") && !page.classed("page-blog") && page.attr("data-status") !== "published";
				this.setState(isUnpublishedBlogPage ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED);
			}
		}));
		editor.addCommand("publishBlog", siteEditor.generateCommand({
			exec: function(editor, page, selection) {
				if(page.attr("data-status") !== "published") {
					editor.openDialog("publishBlogDialog");
				} else {
					page.attr("data-status", "draft");
					this.refresh(editor, page, selection);
					siteEditor.savePage(editor, function() {
						page.datum().menu
							.attr("data-status", "draft")
						;
						window.alert("Blog unpublished succesfully.");
					});
				}
			},
			refresh: function(editor, page, selection) {
				var isBlogPage = page.classed("page blog") && !page.classed("page-blog");
				var isUnpublishedBlogPage = page.attr("data-status") !== "published";
				this.setState(isBlogPage ? (isUnpublishedBlogPage ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_ON) : CKEDITOR.TRISTATE_DISABLED);
			}
		}));

		// Add buttons
		editor.ui.addButton("NewBlog", {
			label: "New Blog",
			command: "newBlog"
		});
		editor.ui.addButton("RemoveBlog", {
			label: "Remove Blog",
			command: "removeBlog"
		});
		editor.ui.addButton("PublishBlog", {
			label: "Publish Blog",
			command: "publishBlog"
		});

		// Add icons (hack, don't want to recompile CKeditor because of dev-environment)
		editor.on("instanceReady", function() {
			d3.selectAll(".cke_button__newblog_icon")
				.style("background-image", "url('/edit/plugins/blogs/icons/blog-new.png')")
				.style("background-size", "16px")
			;
			d3.selectAll(".cke_button__removeblog_icon")
				.style("background-image", "url('/edit/plugins/blogs/icons/blog-remove.png')")
				.style("background-size", "16px")
			;
			d3.selectAll(".cke_button__publishblog_icon")
				.style("background-image", "url('/edit/plugins/blogs/icons/blog-publish.png')")
				.style("background-size", "16px")
			;
		});

		// Add dialogs
		CKEDITOR.dialog.add("newBlogDialog", function(editor) {
			return siteEditor.generateDialog({
				title: "New blog",
				minWidth: 400,
				minHeight: 400,
				contents: [
					{
						id: "tab-blog-new",
						label: "New blog",
						elements: [
							blogIdInput,
							blogDateInput,
							{
								type: "html",
								html: '<div class="blog-dialog"><div class="error id"></div><div class="error date"></div><div>ID must be a short unique name for blog. For example "stop-using-coloring-pages", "drawing-kids-colourtation-2017-09-22", "colourtation-part1-2017-09-22" or "tips-for-trips-2017-09-29".<br>Date must be a valid date (will be shown on blog overview).</div></div>'
							}
						]
					}
				],
				onShow: function(editor, dialog, page, selection) {
					// No special actions (generateDialog will add functionality, so don't remove this empty method)
				},
				onOk: function(editor, dialog, page, selection) {

					// Add new blog entry
					var ckeDialog = this;
					var blogId = ckeDialog.getValueOf("tab-blog-new", "txt-blog-id");
					var blogDate = ckeDialog.getValueOf("tab-blog-new", "txt-blog-date");
					var blogName = "blog-" + blogId;
					var newBlogPage = siteEditor.addNewBlogEntry(blogId, blogDate);

					// Go to newly added blog
					pagePresenter.showPage(newBlogPage, {}, function() {
						var ckeEditor = siteEditor.addTextEditor(newBlogPage.node());
						window.setTimeout(function() {
							siteEditor.getPageEditor(pages.forName("blog")).focusManager.blur(true);
							ckeEditor.focus();
						}, 300);
					});
				}
			});
		});
		CKEDITOR.dialog.add("publishBlogDialog", function(editor) {
			return siteEditor.generateDialog({
				title: "Publish blog",
				minWidth: 400,
				minHeight: 400,
				contents: [
					{
						id: "tab-blog-publish",
						label: "Publish blog",
						elements: [
							blogDateInput,
							{
								type: "html",
								html: '<div class="blog-dialog"><div class="error date"></div><div>Date must be a valid date (will be shown on blog overview).</div></div>'
							}
						]
					}
				],
				onShow: function(editor, dialog, page, selection) {
					this.copyFromSiteToDialog();
				},
				onOk: function(editor, dialog, page, selection) {

					// Update status and date
					var ckeDialog = this;
					var ckeDateInput = ckeDialog.getContentElement("tab-blog-publish", "txt-blog-date");
					this.copyFromDialogToSite();
					page
						.attr("data-status", "published")
						.select("h1 + h2")
							.text(website.getFullDateString(ckeDateInput.getValue(), true))
					;
					d3.select(".page-blog .blog-entry[data-name=\"" + pages.getName(page) + "\"] h1 + h2")
						.text(website.getFullDateString(ckeDateInput.getValue()))
					;

					// Save page
					siteEditor.savePage(editor, function() {
						page.datum().menu
							.attr("data-status", "published")
						;
						window.alert("Blog published succesfully.");
					});
				}
			},
			// Mapping between site and editor
			[
				{
					from: {
						page: "",
						attributes: [ "data-publish-date" ]
					},
					to: {
						input: "tab-blog-publish",
						attributes: [ "txt-blog-date" ]
					}
				}
			]);
		});
	}
});
