//
// Developed by Erik at www.toolparadise.nl
//

// Globals
var NO_POLAROID_TITLE = "--none--";	// See /css/main.css
var NO_PHOTO_SRC = "/img/no_photo.png";

var siteEditor = instantiateClass({

	// Attributes

	// Methods
	insertEditors: function() {

		// Do not create inline editors automatically
		CKEDITOR.disableAutoInline = true;

		// Add data attributes for blog thumbnails
		blogs.entries.forEach(function(blogEntry) {

			// Get blog page
			var page = pages.forName(blogEntry.name);
			website.loadResourcesLate(page);

			// Add date and status to pages
			page
				.attr("data-publish-date", blogEntry.date)
				.attr("data-status", blogEntry.status)
			;
			var blogMenu = d3.select(".menu-" + blogEntry.name);
			blogMenu.attr("data-status", page.attr("data-status"));

			// Add thumbnail info to polaroid image
			if(blogEntry.img.indexOf("@") >= 0) {
				page.select(".polaroid img").attr("data-thumbnail", blogEntry.img);
			}
		});

		// Make all pages editable (if not already editable)
		d3.selectAll("section.page:not(.cke_editable)")
			.attr("contenteditable", "true")
			.each(function() {
				siteEditor.addTextEditor(this);
			})
		;

		// Add entry to menu to add blog posts (if not already present)
		if(d3.selectAll(".menu-create-blog").size() === 0) {
			d3.select(".menu-blog ul")
				.insert("li", "*")
					.classed("sub-menu menu-item menu-create-blog", true)
					.on("click", function() {

						// Show blog page and open blogs dialog (will automatically go to 'new blog tab')
						var blogPage = pages.forName("blog");
						pagePresenter.showPage(blogPage, {}, function() {
							var editor = siteEditor.getPageEditor(blogPage);
							editor.once("focus", function() {
								editor.openDialog("newBlogDialog");
							});
							editor.focus();
						});
						browser.stopEvent();
					})
					.append("a")
						.text("<New blog>")
			;
		}

		// Add warning on change of language
		var languages = website.languages;
		languages.forEach(function(language) {
			var selection = "a[href=\"/" + language + "\"]";
			var anchor = d3.select(selection);
			var originalClickHandler = anchor.on("click");
			anchor.on("click", function() {
				if(!siteEditor.hasUnsavedPages() || window.confirm("There are changes. Changing language means losing these changes. Continu?")) {
					originalClickHandler();
				}
				browser.stopEvent();
			});
		});
	},
	addTextEditor: function(node) {
		var editor = CKEDITOR.inline(node, {
			extraPlugins: "nbsp,sourcedialog,allowsave,uploadimage,pagestatus,unbulletedlist,artwork,photos,blogs,reviews",
			startupFocus: false,
			customConfig: "/edit/ckeditor.config.js"
		});
		editor.on("save", function() {
			siteEditor.savePage(editor, function() {
				window.alert("Page saved succesfully.");
				FB.ui({
					method: "share",
					display: "popup",
					href: document.location.href
				}, function(response) {
					console.log(response);
				});
			});
		});
		editor.on("instanceReady", function() {

			// Hack for situations where pages are made readonly because of visibility
			editor.setReadOnly(false);
		});

		return editor;
	},
	removeEditors: function() {
		siteEditor.getAllEditors().forEach(function(editor) {
			editor.destroy();
		});
	},
	getPageEditor: function(page) {
		var editors = this.getAllEditors();
		var pageEditors = editors.filter(function(editor) {
			var editorPage = siteEditor.getEditorPage(editor);
			return editorPage.node() === page.node();
		});
		if(pageEditors.length === 1) {
			return pageEditors[0];
		}
		return null;
	},
	getEditorPage: function(editor) {
		var page = d3.select(editor.element.$);
		if(page.classed("page")) {
			return page;
		}
		return null;
	},
	getEditorSelection: function(editor) {
		return d3.select(editor.elementPath().lastElement.$);
	},
	setEditorSelection: function(editor, selection) {
		var range = new CKEDITOR.dom.range(editor.document);
		var editorNode = new CKEDITOR.dom.node(selection.node());
		range.setStartBefore(editorNode);
		range.setEndAfter(editorNode);
		editor.getSelection().selectRanges([ range ]);
	},
	getAllEditors: function() {
		return Object.keys(CKEDITOR.instances).map(function(editorName) {
			return CKEDITOR.instances[editorName];
		});
	},
	getDirtyEditors: function() {
		return this.getAllEditors().filter(function(editor) {
			return editor.checkDirty();
		});
	},
	getUnsavedPages: function() {
		return this.getDirtyEditors().map(function(editor) {
			return siteEditor.getEditorPage(editor);
		});
	},
	hasUnsavedPages: function () {
		return this.getDirtyEditors().length > 0;
	},
	getPageData: function(editor) {

		// Create page data
		var pageData = {
			language: browser.getLanguage(),
			id: "",
			category: "",
			content: editor.getData()
//					.replace(/>\s+/g, ">")		// Whitespace after tag
//					.replace(/\s+</g, "<")		// Whitespace before tag
					.replace(/^\s+/, "")		// Whitespace at start
					.replace(/\s+$/, "")		// Whitespace at end
		};

		// Add id and category
		var categories = [ "drawing", "coaching", "guiding", "contact", "blog" ];
		var editorPage = siteEditor.getEditorPage(editor);
		pageData.id = editorPage.attr("data-href");
		pageData.category = categories.filter(function(cat) { return editorPage.classed(cat); })[0];
		if(!pageData.category) {
			pageData.category = "";
		}

		// Add image, date and draft state in case of blog and update id
		if(pageData.category === "blog" && editorPage.attr("data-publish-date")) {
			var image = editorPage.select("img");
			if(image.attr("src") !== NO_PHOTO_SRC) {
				pageData.img = image.attr("data-thumbnail");
			} else {
				pageData.img = "";
			}
			pageData.date = editorPage.attr("data-publish-date");
			pageData.status = editorPage.attr("data-status");
			pageData.id = pageData.id.replace(/^\/blog\//, "");
		}

		// Parse document (fragment)
		var parser = new DOMParser();
		var pageDocument = parser.parseFromString(pageData.content, "text/html");
		var pageElement = d3.select(pageDocument).select("body");

		// Filter content for polaroids
		polaroids.removeAll(pageElement);

		// Filter content for image-grid
		imageGrid.removeImages(pageElement);

		// Filter content for icons
		icons.removeAll(pageElement);

		// Filter content for blogs
		blogs.removeAll(pageElement);

		// Filter content for secure elements
		security.removeAll(pageElement);

		// Filter link handlers
		pages.removeLinkHandlers(pageElement);

		// Keep final result
		pageData.content = pageElement.node().innerHTML;

		return pageData;
	},
	closeAllEditors: function(callback) {
		var hasClosedEditor = false;
		var editors = this.getAllEditors();
		editors.forEach(function(editor) {
			if(editor.focusManager.hasFocus) {
				editor.focusManager.blur(true);
				hasClosedEditor = true;
			}
		});

		// Do callback (delayed when editor had to be closed)
		window.setTimeout(callback, hasClosedEditor ? 100 : 0);
	},
	savePage: function(editor, callback) {
		var pageData = siteEditor.getPageData(editor);
		if(pageData.status === "new") {
			pageData.status = "draft";
		}
		var editorPage = siteEditor.getEditorPage(editor);
		var performSave = function() {
			siteEditor.storePage(pageData, function(error, result) {
				if(error || !result) {
					window.alert("Failed to store page: " + pageData.id);
					return;
				}
				if(result.resultCode !== "OK") {
					window.alert("Failed to store page: " + pageData.id + " (" + result.resultCode + " -> " + result.resultMessage + ")");
					return;
				}
				if(editorPage.attr("data-status") === "new") {
					editorPage.attr("data-status", "draft");
				}

				// Update blog thumbnail (hack)
				var imageSrc = pageData.img;
				if(pageData.img && pageData.img.indexOf("@") >= 0) {
					imageSrc = "/img/thumbnail-" + pageData.id + ".jpg";
				}
			
				d3.select(".blog-entry[data-name=\"blog-" + pageData.id + "\"] img")
					.attr("src", imageSrc)
					.attr("data-cke-saved-src", imageSrc)
				;

				// Reset dirty flag
				editor.resetDirty();
				if(callback) {
					callback();
				}
			});
		};
		if(editorPage.select(".image-grid").size() === 1) {
			siteEditor.saveArtwork(performSave);
		} else {
			performSave();
		}
	},
	storePage: function(pageData, callback) {
		d3.json("/edit/php/storeData.php")
			.header("Content-Type", "application/json")
			.post(JSON.stringify({ type: pageData.category === "blog" ? "blog" : "page", data: pageData }), callback)
		;
	},
	saveArtwork: function(callback) {

		// Test if artwork has changed (before storing pages, since it will filter out the artwork)
		var newArtwork = [];
		d3.selectAll(".image-grid").each(function() {
			var grid = d3.select(this);
			var category = grid.attr("data-category");
			grid.selectAll("img").each(function() {
				var image = d3.select(this);
				newArtwork.push({
					src: image.attr("src"),
					selection: image.attr("data-selection"),
					"title-nl": image.attr("data-title-nl"),
					"title-en": image.attr("data-title-en"),
					"category": category
				});
			});
		});
		var isChanged = website.images.length !== newArtwork.length;
		if(!isChanged) {
			newArtwork.forEach(function(anArtwork, index) {
				Object.keys(anArtwork).forEach(function(attr) {
					if(anArtwork[attr] !== website.images[index][attr]) {
						isChanged = true;
					}
				});
			});
		}
		if(isChanged) {

			// Keep changes (both remote and locally)
			siteEditor.storeArtwork(newArtwork, function() {
				website.images = newArtwork;
				if(callback) {
					callback();
				}
			});
		} else {
			if(callback) {
				callback();
			}
		}
	},
	storeArtwork: function(artwork, callback) {
		d3.json("/edit/php/storeData.php")
			.header("Content-Type", "application/json")
			.post(JSON.stringify({ type: "artwork", data: artwork }), function(error, data) {
				if(error || !data) {
					window.alert("Failed to store artwork!");
					return;
				}
				if(data.resultCode !== "OK") {
					window.alert("Failed to store artwork: " + data.resultCode + " [" + data.resultMessage + "]");
					return;
				}
				window.alert("Stored artwork succesfully");
				if(callback) {
					callback();
				}
			})
		;
	},
	storeReviews: function() {
		d3.json("/edit/php/storeData.php")
			.header("Content-Type", "application/json")
			.post(JSON.stringify({ type: "reviews", data: website.reviews }), function(error, data) {
				if(error || !data) {
					window.alert("Failed to store reviews!");
					return;
				}
				if(data.resultCode !== "OK") {
					window.alert("Failed to store reviews: " + data.resultCode + " [" + data.resultMessage + "]");
					return;
				}
				window.alert("Stored reviews succesfully");
			})
		;
	},
	addNewBlogEntry: function(blogId, blogDate) {

		// Create 'empty' blog entry (use "--none--" for Polaroid title to hide it, see /css/main.css)
		var blogName = "blog-" + blogId;
		var blogTitle = blogId
			.replace(/-/g, " ")
			.replace(/^([a-z])/, function(match) { return match.toUpperCase(); })
		;
		var blogImage = NO_PHOTO_SRC;
		var blogContent = '<h1>' + blogTitle + '</h1><h2>' + website.getFullDateString(blogDate, true) + '<\/h2><div class="polaroid tilted icon" data-icon="curly-box" data-keep-ratio="false" title="--none--"><img src="' + blogImage + '"></div><p>First paragraph</p><p>Second paragraph</p>';
		var blogLink = "/blog/" + blogId;
		var blogStatus = "new";

		// Add entry to blogs page (will also create page and menu item)
		blogs.showEntries([ {
			id: blogId,
			name: blogName,
			date: blogDate,
			img: blogImage,
			content: blogContent,
			title: blogTitle,
			link: blogLink,
			status: blogStatus
		} ]);

		// Retrieve newly created blog page
		var blogPageName = ".page-" + blogName;
		var blogPage = d3.select(blogPageName);
		blogPage
			.attr("data-publish-date", blogDate)
			.attr("data-status", blogStatus)
		;

		// Update (newly added) menu
		var blogMenuName = ".menu-" + blogName;
		var blogMenuItem = d3.select(blogMenuName);
		blogMenuItem
			.attr("data-status", blogStatus)
			.datum({
				name: blogMenuName,
				page: blogPage,
				mainMenu: d3.select(".menu-blog")
			})
			.on("click", function() {
				pagePresenter.showPage(blogPage);
				browser.stopEvent();
			})
		;

		// Update (newly added) page and add editor
		var newPageIndex = 1;
		d3.selectAll(".page").each(function() {
			var datum = d3.select(this).datum();
			if(datum && datum.index && datum.index >= newPageIndex) {
				newPageIndex = datum.index + 1;
			}
		});
		blogPage
			.datum({
				name: blogName,
				index: newPageIndex,
				menu: blogMenuItem
			})
			.attr("contenteditable", "true")
		;

		return blogPage;
	},
	removeBlogElements: function(editor) {

		// Retrieve element info
		var id = pages.getName(siteEditor.getEditorPage(editor));
		var pageName = "page-" + id;
		var blogName = id;	// Blogs are a bit special for naming
		var menuName = "menu-" + id;

		// Remove editor
		editor.focusManager.blur(true);
		editor.destroy();

		// Show blogs page
		pagePresenter.showPage(pages.forName("blog"), {}, function() {

			// Remove page
			d3.select("." + pageName).remove();

			// Remove menu
			d3.select("." + menuName).remove();

			// Remove from blogs page
			d3.select("#blogs .blog-entry[data-name=\"" + blogName + "\"]").remove();
		});
	},
	showPage: function(page, focus) {
		window.setTimeout(function() {
			siteEditor.closeAllEditors(function() {
				pagePresenter.showPage(page, {}, function() {
					if(focus) {
						var editor = siteEditor.getPageEditor(page);
						editor.focus();
					}
				});
			});
		}, 100);
	},
	getParentFor: function(selection, selector) {

		// Iterate through parents up to page level
		while(selection.size() === 1 && !selection.classed("page")) {
			var filteredSelection = selection.filter(selector);
			if(filteredSelection.size() > 1) {
				console.error("Internal error: parent with more than 1 element");
			}
			if(filteredSelection.size() === 1) {
				return filteredSelection;
			}
			selection = d3.select(selection.node().parentNode);
		}
		return null;
	},
	generateCommand: function(definition) {

		// Replace exec/refresh functions taking extra parameters page and selection (D3-style)
		[ "exec", "refresh" ].forEach(function(funcName) {
			var func = definition[funcName];
			if(func) {
				definition[funcName] = function(editor) {
					var page = siteEditor.getEditorPage(editor);
					var selection = siteEditor.getEditorSelection(editor);
					return func.call(this, editor, page, selection);
				};
			}
		});
		if(definition.refresh) {
			definition.contextSensitive = 1;
		}

		return definition;
	},
	generateDialog: function(definition, mapping) {

		// Replace onShow/onOk/onCancel functions taking extra parameters page, dialog and selection (D3-style)
		[ "onShow", "onOk", "onCancel" ].forEach(function(funcName) {
			var func = definition[funcName];
			if(func) {
				definition[funcName] = function() {
					var ckeDialog = this;
					var dialog = d3.select(ckeDialog.getElement().$);
					var editor = ckeDialog.getParentEditor();
					var page = siteEditor.getEditorPage(editor);
					var selection = siteEditor.getEditorSelection(editor);
					if(funcName === "onShow") {
						this.copyFromSiteToDialog = function() {
							siteEditor.copyFromSiteToDialog(dialog, editor, page, selection, mapping);
						};
						this.copyFromDialogToSite = function() {
							siteEditor.copyFromDialogToSite(dialog, editor, page, selection, mapping);
						};
						this.hasDialogChanges = function() {
							return siteEditor.hasDialogChanges(dialog, editor, page, selection, mapping);
						};
						dialog.datum({ ckeDialog: ckeDialog });
						dialog.selectAll("input").attr("autocomplete", "off");
					}
					return func.call(this, editor, dialog, page, selection);
				};
			}
		});

		// Replace element onShow/onClick functions taking extra parameters page, dialog and selection (D3-style)
		[ "onShow", "onInput", "validate", "onClick" ].forEach(function(funcName) {
			definition.contents.forEach(function(tabContents) {
				tabContents.elements.forEach(function(element) {
					var func = element[funcName];
					if(func) {
						element[funcName] = function() {
							var ckeInput = this;
							var ckeDialog = ckeInput.getDialog();
							var input = d3.select("#" + ckeInput.domId);
							var dialog = d3.select(ckeDialog.getElement().$);
							var editor = ckeDialog.getParentEditor();
							var page = siteEditor.getEditorPage(editor);
							var selection = siteEditor.getEditorSelection(editor);
							return func.call(this, editor, dialog, input, page, selection);
						};
					}
				});
			});
		});

		return definition;
	},
	copyFromSiteToDialog: function(dialog, editor, page, selection, mapping) {
		var ckeDialog = dialog.datum().ckeDialog;

		// Ready if no mapping available
		if(!mapping) {
			return;
		}

		// Iterate mappings
		mapping.forEach(function(map) {

			// Copy data
			siteEditor.copyDialogData(map.from, map.to, dialog, editor, page, selection);
		});
	},
	copyFromDialogToSite: function(dialog, editor, page, selection, mapping) {
		var ckeDialog = dialog.datum().ckeDialog;

		// Ready if no mapping available
		if(!mapping) {
			return;
		}

		// Iterate mappings
		mapping.forEach(function(map) {

			// Copy data
			siteEditor.copyDialogData(map.to, map.from, dialog, editor, page, selection);
		});
	},
	copyDialogData(from, to, dialog, editor, page, selection) {
		return siteEditor.doDialogDataWith(from, to, dialog, editor, page, selection, siteEditor.copyDataToElement);
	},
	compareDialogData(from, to, dialog, editor, page, selection) {
		return siteEditor.doDialogDataWith(from, to, dialog, editor, page, selection, siteEditor.compareDataToElement);
	},
	doDialogDataWith(from, to, dialog, editor, page, selection, dataOperation) {
		var ckeDialog = dialog.datum().ckeDialog;

		// Retrieve data
		var fromSelection = null;
		if(from.page) {
			fromSelection = page.select(from.page);
		} else if(from.page === "") {
			fromSelection = page;
		} else if(from.dialog) {
			fromSelection = dialog.select(from.dialog);
		} else if(from.dialog === "") {
			fromSelection = dialog;
		} else if(from.selection) {
			fromSelection = selection.select(from.selection);
		} else if(from.selection === "") {
			fromSelection = selection;
		} else if(from.input) {
			fromSelection = { ckeDialog: ckeDialog, input: from.input };
		} else {
			console.error("Unknown from-mapping: ", from);
			return;
		}
		var attributeData = siteEditor.copyDataFromElement(fromSelection, from.attributes);

		// Perform conversion to destination attributes (in place, because attributes are copies)
		if(to.attributes) {
			attributeData.forEach(function(attribute, index) {
				attribute.name = to.attributes[index];
			});
		}

		// Do data operation
		var toSelection = null;
		if(to.page) {
			toSelection = page.select(to.page);
		} else if(to.page === "") {
			toSelection = page;
		} else if(to.dialog) {
			toSelection = dialog.select(to.dialog);
		} else if(to.dialog === "") {
			toSelection = dialog;
		} else if(to.selection) {
			toSelection = selection.select(to.selection);
		} else if(to.selection === "") {
			toSelection = selection;
		} else if(to.input) {
			toSelection = { ckeDialog: ckeDialog, input: to.input };
		} else {
			console.error("Unknown to-mapping: ", to);
			return;
		}

		return dataOperation(toSelection, attributeData);
	},
	copyDataFromElement: function(element, attributes) {
		return attributes.map(function(name) {
			if(element.ckeDialog) {
				return {
					name: name,
					value: element.ckeDialog.getValueOf(element.input, name)
				};
			} else {
				return {
					name: name,
					value: element.attr(name)
				};
			}
		});
	},
	copyDataToElement: function(element, attributeData) {
		attributeData.forEach(function(attribute) {
			if(element.ckeDialog) {
				element.ckeDialog.setValueOf(element.input, attribute.name, attribute.value);
			} else {
				element.attr(attribute.name, attribute.value);
			}
		});

		return true;
	},
	compareDataToElement: function(element, attributes) {
		return attributes.every(function(attribute) {
			if(element.ckeDialog) {
				return element.ckeDialog.getValueOf(element.input, attribute.name) === attribute.value;
			} else {
				return element.attr(attribute.name) === attribute.value;
			}
		});
	},
	hasDialogChanges: function(dialog, editor, page, selection, mapping) {
		var ckeDialog = dialog.datum().ckeDialog;

		// Ready if no mapping available
		if(!mapping) {
			return false;
		}

		// Iterate mappings
		return !mapping.every(function(map) {

			// Compare data
			return siteEditor.compareDialogData(map.from, map.to, dialog, editor, page, selection);
		});
	},
	setInputValue: function(ckeInput, value) {

		// Set input value keeping selection/cursor position
		var original = ckeInput.getValue() || "";
		var inputNode = ckeInput.getInputElement().$;
		var selectionStart = inputNode.selectionStart;
		var selectionEnd = inputNode.selectionEnd;
		ckeInput.setValue(value);
		if(original.length > value.length) {
			selectionStart -= original.length - value.length;
			selectionEnd -= original.length - value.length;
		}
		if(selectionStart > value.length) {
			selectionStart = value.length;
		}
		if(selectionEnd > value.length) {
			selectionEnd = value.length;
		}
		inputNode.selectionStart = selectionStart;
		inputNode.selectionEnd = selectionEnd;
	}
});


// Helper function
function shallowCopy(obj) {
	var result = {};

	Object.keys(obj).forEach(function(key) {
		result[key] = obj[key];
	});

	return result;
}

// Remove/insert editor whenever website is shown (when changing language)
website.addBeforeShowHandler(siteEditor.removeEditors);
website.addAfterShowHandler(siteEditor.insertEditors);

// Add Facebook init
window.fbAsyncInit = function() {
	FB.init({
		appId: '136663913622599',
		xfbml: true,
		version: 'v2.10'
	});
	FB.AppEvents.logPageView();
};
d3.select("head").append("script").attr("src", "https://connect.facebook.net/en_US/sdk.js");
