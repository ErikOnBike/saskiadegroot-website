//
// Developed by Erik at www.toolparadise.nl
//

// Simple class (ie no inheritance)
function instantiateClass(attributesAndMethods) {

	// Create new class
	var classInstance = new function() {};
	var classPrototype = classInstance.__proto__;
	if(!classPrototype) {
		classPrototype = Object.getPrototypeOf(classInstance);	// IE10
	}

	// Add supplied attributes and methods
	Object.keys(attributesAndMethods).forEach(function(key) {
		if(typeof attributesAndMethods[key] === "function") {

			// Add method
			classPrototype[key] = attributesAndMethods[key];
		} else {

			// Add attribute
			classInstance[key] = attributesAndMethods[key];
		}
	});

	return classInstance;
}

// MemoryStorage
var memoryStorage = instantiateClass({

	// Attributes
	storage: {},

	// Methods
	setItem: function(key, value) {
		this.storage[key] = value;
	},
	getItem: function(key) {
		return this.storage[key];
	}
});

// Browser
var browser = instantiateClass({

	// Attributes
	screenSizes: [],
	defaultEventHandlerOptions: false,
	sessionStorage: window.sessionStorage,
	localStorage: window.localStorage,
	lastSwipeTimestamp: 0,

	// Methods
	initialize: function() {

		this.testSupport();
		this.setDefaults();
		this.fixSafariSwipeGesture();
		this.makeEditable();

		// Initialize screen sizes
		if(window.matchMedia) {
			var mediaQueryRegEx = /^\s*@media\s.*\bmin-width\b\s*:\s*([0-9\.\-]+)px/i;
			var styleSheets = document.styleSheets || [];
			var styleSheetsCount = styleSheets.length;
			for(var i = 0; i < styleSheetsCount; i++) {
				var cssRules = [];
				try {
					cssRules = styleSheets[i].cssRules || styleSheets[i].rules || [];
				} catch(e) {
					// Ignore exception
				}
				for(var j = 0; j < cssRules.length; j++) {
					if(cssRules[j].type === 4) {
						var mediaQueryRegExResult = mediaQueryRegEx.exec(cssRules[j].cssText);
						if(mediaQueryRegExResult && mediaQueryRegExResult[1]) {
							this.screenSizes.push(parseFloat(mediaQueryRegExResult[1]));
						}
					}
				}
			}
			if(this.screenSizes.length > 0) {
				this.screenSizes.sort(function(a, b) { return a - b; });
			}
		}
		if(this.screenSizes.length === 0) {
			this.screenSizes = [ 480 ];	// Default initial value (required below)
		}

		// Add handler for reloading Google Maps (@@update only when required (ie shown or being loaded)
		if(window.matchMedia) {
			this.screenSizes.forEach(function(screenSize) {
				window.matchMedia("(min-width: " + screenSize + "px)").addListener(function(matcher) {
					var googleMaps = d3.selectAll(".gmaps");
					googleMaps.attr("src", googleMaps.attr("src"));
				});
			});
		}
	},
	testSupport: function() {

		// Test browser feature: options argument to addEventListener
		try {
			var options = Object.defineProperty({}, "passive", {
				get: function() {
					browser.defaultEventHandlerOptions = { passive: true };
				}
			});

			window.addEventListener("test", null, options);
		} catch(err) {
			// Browser does not support feature (no further actions required)
		}

		// Test browser feature: local and session storage
		try {
			var testValue = "xyz";
			[ "localStorage", "sessionStorage" ].forEach(function(storage) {
				window[storage].setItem(testValue, testValue);
				if(window[storage].getItem(testValue) !== testValue) {
					throw "Invalid localStorage";
				}
				window[storage].removeItem(testValue);
			});
		} catch(err) {

			// Using same memory storage is no issue (keys being used are different)
			this.sessionStorage = memoryStorage;
			this.localStorage = memoryStorage;
		}

		// Fix for IE
		if(!String.prototype.startsWith) {
			String.prototype.startsWith = function(searchString, position) {
				return this.substr(position || 0, searchString.length) === searchString;
			};
		}
	},
	setDefaults: function() {

		// Prevent browser from automatically scrolling to previous position
		if("scrollRestoration" in history) {
			history.scrollRestoration = "manual";
		} else {
			history.scrollRestoration = "fake";
		}
	},
	fixSafariSwipeGesture: function() {
		if(navigator.vendor && navigator.vendor.indexOf("Apple") >= 0 &&
		   navigator.userAgent && navigator.userAgent.toLowerCase().indexOf("safari") >= 0) {
			window.addEventListener("mousewheel", function() {
				browser.lastSwipeTimestamp = Date.now();
			}, false);
		}
	},
	didSwipeGestureOccurJustNow: function() {
		return Date.now() - this.lastSwipeTimestamp < 1000;
	},
	makeEditable: function() {

		// Add edit features if allowed (no access to following files if not logged in as admin)
		if(browser.isEditable()) {
			var head = d3.select("head");
			head.append("link")
				.attr("rel", "stylesheet")
				.attr("href", "/edit/css/edit.css")
			;
			head.append("script")
				.attr("src", "/edit/ckeditor/ckeditor.js")
				.on("load", function() {
					head.append("script")
						.attr("src", "/edit/js/edit.js")
					;
				})
			;
			blogs.__proto__.entryFilter = function() { return true; };
			pagePresenter.doNotApplyTilting = true;
		}
	},
	isEditable: function() {
		return browser.sessionStorage.getItem("edit");
	},
	stopEvent: function() {
		d3.event.preventDefault();
		d3.event.stopPropagation();
	},
	defaultLanguage: function() {
		var language = window.navigator.userLanguage;	// IE
		if(!language) {
			language = window.navigator.language;	// Rest of the world
		}
		if(language) {
			language = language.replace(/^([a-z]*).*$/, "$1");
		}
		return language;
	},
	getLanguage: function() {

		// Get language stored
		var language = browser.sessionStorage.getItem("language");
		if(!language) {
			language = browser.localStorage.getItem("language");
			if(!language) {
				language = this.defaultLanguage();
			}
		}
		return language;
	},
	setLanguage: function(language) {

		// Store language (both in session and local storage)
		browser.sessionStorage.setItem("language", language);
		browser.localStorage.setItem("language", language);
	},
	extractLanguageFromUrl: function() {
		var info = browser.extractInfoFromUrl();
		if(info) {
			return info.language;
		}
		return null;
	},
	extractPageFromUrl: function() {
		var info = browser.extractInfoFromUrl();
		if(info) {
			return info.page;
		}
		return null;
	},
	extractInfoFromUrl: function() {

		var extractInfo = function(path) {

			// Extract language from path
			var matches = path.match(/^\/?([a-z]{2})(\/.*)?$/);
			if(matches) {
				var languageInPath = matches[1];
				var pathRemainder = matches[2] || "";

				// Test for valid language
				if(website.languages.indexOf(languageInPath) < 0) {
					languageInPath = null;
				}

				// Extract (valid) page from path
				var page = pages.forUrl(pathRemainder);

				// Answer result
				return {
					language: languageInPath,
					path: pathRemainder,
					page: page
				};
			}

			// Return result without language
			if(path) {
				return {
					language: null,
					path: path.replace(/^\/?/, "/"),	// Always start with /
					page: null
				};
			}

			return null;
		};

		if(document.location) {
			var info = null;
			if(document.location.search) {
				info = extractInfo(document.location.search.replace(/^\?/, ""));
			}
			if(!info && document.location.pathname) {
				info = extractInfo(document.location.pathname);
			}

			return info;
		}

		return null;
	}
});

// Mobile Browser
var mobileBrowser = instantiateClass({

	// Attributes
	hamburgerOrdered: false,	// Hamburger menu
	rollUpInitialized: false,

	// Methods
	initialize: function() {

		// Open menu-block if hamburger-menu clicked
		d3.select(".hamburger-menu")
			.on("click", function() {
				d3.select("#menu").classed("opened", true);
				mobileBrowser.hamburgerOrdered = true;
				browser.stopEvent();

				// Initialize roll up
				if(!mobileBrowser.rollUpInitialized) {

					// Close menu-block if roll-up menu-item is clicked
					menus.forName("roll-up").on("click", function() {
						mobileBrowser.closeMenu();
						browser.stopEvent();
					});
					mobileBrowser.rollUpInitialized = true;
				}
			})
		;

		// Close menu-block and/or presenter if orientation changed
		window.addEventListener("orientationchange", function() {
			mobileBrowser.closeMenu();
			if(d3.select("#full-image-presenter").classed("visible")) {
				d3.select("#full-image").on("click")();	// Simulate click on image presenter
			}
		});

		// Add handler for smallest screen size to close menu on change (useful when changing orientation on phone)
		if(window.matchMedia) {
			var previousMatch = false;
			window.matchMedia("(min-width: " + browser.screenSizes[0] + "px)").addListener(function(matcher) {
				if(matcher.matches && !previousMatch) {
					mobileBrowser.closeMenu();
				}
				previousMatch = matcher.matches;
			});
		}
	},
	closeMenu: function() {
		d3.select("#menu").classed("opened", false);
		this.hamburgerOrdered = false;
	}
});

// Security
var security = instantiateClass({

	// Methods
	apply: function() {

		// Replace secure mail addresses
		d3.selectAll("a.mailsecurity:not([data-original])").each(function() {
			var anchor = d3.select(this);
			var mailAddress = anchor.text()
				.replace(/ op locatie /g, "@")
				.replace(/ in /g, ".")
			;
			anchor
				.attr("href", "mailto:" + mailAddress)
				.attr("data-original", anchor.text())	// Keep original
				.text(mailAddress)
			;
		});

		// Replace secure phone numbers
		d3.selectAll("a.telsecurity:not([data-original])").each(function() {
			var anchor = d3.select(this);
			var phoneNumber = anchor.text()
				.replace(/nul/g, "0")
				.replace(/twee/g, "2")
				.replace(/drie/g, "3")
				.replace(/vier/g, "4")
				.replace(/vijf/g, "5")
				.replace(/zes/g, "6")
				.replace(/zeven/g, "7")
				.replace(/acht/g, "8")
				.replace(/negen/g, "9")
				.replace(/een/g, "1")	// Change as last item to prevent "tweenegen" from becoming "tw1egen"
			;
			var internationalPhoneNumber = phoneNumber
				.replace(/^0/, "+31")
				.replace(/[\- ]/g, "")
			;
			anchor
				.attr("href", "tel:" + internationalPhoneNumber)
				.attr("data-original", anchor.text())	// Keep original
				.text(phoneNumber)
			;
		});
	},
	removeAll: function(selection) {

		// Restore secure mail addresses
		selection.selectAll("a.mailsecurity[data-original]").each(function() {
			var anchor = d3.select(this);
			anchor
				.text(anchor.attr("data-original"))
				.attr("href", "#")
				.attr("data-original", null)
			;
		});

		// Restore secure phone numbers
		selection.selectAll("a.telsecurity[data-original]").each(function() {
			var anchor = d3.select(this);
			anchor
				.text(anchor.attr("data-original"))
				.attr("href", "#")
				.attr("data-original", null)
			;
		});
	}
});

// Pages
var pages = instantiateClass({

	// Attributes
	activePage: null,

	// Methods
	initialize: function() {
		this.activePage = this.forName("empty");
		this.activePage.datum({ name: "empty", index: 0 });	// Needed in scrollPosition.store()
	},
	appendPages: function(pagesObject) {
		Object.keys(pagesObject).forEach(function(pageUrl) {
			var pageId = "page-" + pageUrl
				.replace(/^\//, "")	// Remove / at start
				.replace("/", "-")	// Replace all other / with -
			;
			var pageData = pagesObject[pageUrl];
			d3.select("#content").append("section")
				.attr("class", "page " + pageId + (pageData.category ? " " + pageData.category : ""))
				.attr("data-href", pageUrl)
				.html(pageData.content)
			;
		});
	},
	updateAll: function() {

		// Add extra info and event handlers to pages and menus
		d3.selectAll(".page").each(function(d, index) {
			var page = d3.select(this);
			var name = pages.getName(page);
			page.datum({ 
				name: name,
				index: index
			});

			// Add menu-item to page and vice versa
			var menu = menus.forName(name);	// Currently pages and menus share the same name
			if(menu) {
				page.datum().menu = menu;
				menu.datum().page = page;
				menu.datum().name = name;
			}
		});

		// Update menu and link handlers
		this.updateMenuHandlers();
		this.updateLinkHandlers();
	},
	updateMenuHandlers: function() {

		// Add event handlers to menus
		d3.selectAll(".page").each(function() {
			var page = d3.select(this);

			// Add click handler to menu
			var menu = page.datum().menu;
			if(menu) {
				menu
					// For touch devices add class to prevent 'hovering' effect
					.on("touchstart", function() {
						menu.classed("touched", true);
					}, browser.defaultEventHandlerOptions)
					.on("touchend", function() {
						pagePresenter.showPage(page);
						browser.stopEvent();
					})

					// For mouse input remove class to show 'hovering' effect
					.on("mouseover", function() {
						menu.classed("touched", false);
					}, browser.defaultEventHandlerOptions)
					.on("click", function() {
						pagePresenter.showPage(page);
						browser.stopEvent();
					})
				;
			}
		});
	},
	updateLinkHandlers: function() {

		// Add click handler to (internal) page navigations
		d3.selectAll("a[href]").each(function() {
			var anchor = d3.select(this);
			anchor.datum({});
			var href = anchor.attr("data-href");
			if(!href) {
				href = anchor.attr("href");
			}
			if(href.charAt(0) === "/") {
				var page = pages.forUrl(href);

				// If no page, href will be language
				if(!page) {

					// In case of language selected
					page = href;
				} else {

					// On first usage keep original href
					if(!anchor.attr("data-href")) {
						anchor.attr("data-href", href);
					}

					// Update link to include language (if it is not the language link itself)
					anchor.attr("href", "/" + website.getLanguage() + anchor.attr("data-href"));
				}

				anchor

					// For touch devices differentiate between scroll and click
					.on("touchstart", function() {
						anchor.datum().scrollY = window.scrollY;
					}, browser.defaultEventHandlerOptions)
					.on("touchend", function() {
						// If page did not scroll, it's a click!
						if(anchor.datum().scrollY === window.scrollY) {
							pagePresenter.showPage(page);
						}
						browser.stopEvent();
					})

					// For a mouse a click is a click
					.on("click", function() {
						pagePresenter.showPage(page);
						browser.stopEvent();
					})
				;
			}
		});
	},
	removeLinkHandlers: function(selection) {

		// Remove link handlers
		selection.selectAll("a[data-href]").each(function() {
			var anchor = d3.select(this);
			anchor
				.attr("href", anchor.attr("data-href"))		// Copy data-href to href
				.attr("data-href", null)			// Remove data-href
			;
		});
	},
	getName: function(page) {

		// Get name from datum
		var pageDatum = page.datum();
		if(pageDatum && pageDatum.name) {
			return pageDatum.name;
		}

		// Retrieve name from class attribute (only needed during initialization phase)
		return page.attr("class").replace(/^.*page-([a-z0-9\-]*).*$/, "$1");
	},
	forName: function(pageName) {
		var page = d3.select(".page.page-" + pageName);
		if(page.size() === 1) {
			return page;
		}
		return null;
	},
	forUrl: function(url) {

		// Normalize url
		var pageName = url
			.replace(/^\??\/?/, "")		// Remove ? and/or / at start
			.replace(/\/$/, "")		// Remove trailing slash
			.replace(/\//, "-")		// Replace / with -
			.replace(/[a-zA-Z]/g, function(match) {
				return match.toLowerCase();
			})				// Lowercase all characters
			//.replace(/[^a-z0-9\-]/g, "")	// Remove all except for alphanumerics and dashes
		;
		if(pageName === "") {
			pageName = website.homePageName;
		}
		return this.forName(pageName);
	},
	isReloaded: function() {
		return window.performance && window.performance.navigation && window.performance.navigation.type === 1;
	}
});

// Menus
var menus = instantiateClass({

	// Methods
	initialize: function() {
		d3.selectAll(".menu li").each(function() {
			var menu = d3.select(this);
			var href = menu.attr("class")
				.replace(/^menu-/, "")	// Remove menu- prefix
				.replace(/-/, "/")	// Replace dash with slash
			;
			menu.insert("a", "*")
				.attr("href", href)
			;
		});
	},
	setText: function(menusObject) {

		// Iterate main menus
		var mainMenusObject = menusObject["main-menus"];
		Object.keys(mainMenusObject).forEach(function(mainMenuId) {
			d3.select(".main-menu." + mainMenuId + " a").text(mainMenusObject[mainMenuId]);
		});

		// Iterate sub menus
		var subMenusObject = menusObject["sub-menus"];
		Object.keys(subMenusObject).forEach(function(subMenuId) {
			d3.select(".sub-menu." + subMenuId + " a").text(subMenusObject[subMenuId]);
		});
	},
	updateAll: function() {

		// Add extra info to main-menus
		d3.selectAll(".menu > li").each(function() {
			var mainMenu = d3.select(this);
			mainMenu
				.datum({})
				.classed("main-menu", true)
				.classed("menu-item", true)
			;

			// Add extra info to sub-menus
			mainMenu.selectAll("li").each(function() {
				var subMenu = d3.select(this);
				subMenu
					.datum({ mainMenu: mainMenu })
					.classed("sub-menu", true)
					.classed("menu-item", true)
				;
			});
		});
	},
	forName: function(menuName) {
		var menu = d3.select(".menu-item.menu-" + menuName);
		if(menu.size() === 1) {
			return menu;
		}
		return null;
	}
});

// Blogs
var blogs = instantiateClass({

	// Attributes
	entries: [],

	// Methods
	setEntries: function(blogsObject) {

		// Add blog entries to array (instead of object)
		this.entries = [];
		Object.keys(blogsObject).forEach(function(blogId) {
			blogs.entries.push({
				id: blogId,
				name: "blog-" + blogId,
				date: blogsObject[blogId].date,
				img: blogsObject[blogId].img,
				thumbnail: blogsObject[blogId].img.indexOf("@") >= 0 ? "/img/thumbnail-" + blogId + ".jpg" : "/img/no_photo.png",
				content: blogsObject[blogId].content.replace(/(<img [^>]*) src=/, "$1 data-load-late-src="),
				title: blogs.extractElement(blogsObject[blogId].content, "h1"),
				link: "/blog/" + blogId,
				status: blogsObject[blogId].status
			});
		});

		// Sort entries oldest first (since they will be inserted in the reverse order on main blog page)
		this.entries.sort(function(a, b) {
			if(a.date < b.date) {
				return -1;
			} else if(a.date > b.date) {
				return 1;
			} else {
				return 0;
			}
		});

		this.showEntries(this.entries.filter(this.entryFilter));
	},
	entryFilter: function(entry) {
		return entry.status === "published";
	},
	showEntries: function(blogEntries) {

		// Create pages for blog entries
		var blogPages = {
		};

		// Iterate over the blog entries
		blogEntries.forEach(function(blogEntry) {

			// Create a new blog page
			blogPages[blogEntry.link] = {
				category: "blog",
				content: blogEntry.content
			};

			// Add entry to main blog page
			var blogElement = d3.select("#blogs")
				.insert("div", "*")
					.attr("class", "blog-entry")
					.attr("data-name", blogEntry.name)
					.on("click", function() {
						var page = pages.forUrl(blogEntry.link);
						pagePresenter.showPage(page);
					})
			;
			blogElement
				.append("div")
					.attr("class", "blog-image")
					.append("img")
						.attr("data-load-lazy-src", blogEntry.thumbnail)
			;
			blogElement
				.append("h1")
					.text(blogEntry.title)
			;
			blogElement
				.append("h2")
					.text(website.getFullDateString(blogEntry.date) +
						(blogEntry.status !== "published" ? " (" + blogEntry.status.toUpperCase() + ")" : ""))
			;
			blogElement
				.append("div")
					.attr("class", "content")
					.html(blogs.extractElement(blogEntry.content, "p"))
			;
			blogElement
				.append("div")
					.attr("class", "link")
					.append("a")
						.attr("href", blogEntry.link)
						.text(website.text.general.blogReadMore)
			;

			// Add blog entry to menu (although not visible)
			d3.select(".menu-blog ul")
				.insert("li", "li:not(.menu-create-blog)")
					.attr("class", "menu-item sub-menu menu-" + blogEntry.name)
					.append("a")
						.attr("href", blogEntry.link)
						.text(blogEntry.title)
			;
		});

		// Append pages to DOM
		pages.appendPages(blogPages);
	},
	removeAll: function(selection) {

		// Remove items from blogs page
		selection.select("#blogs").selectAll("*").remove();
	},
	removeMenus: function() {
		d3.select(".menu-blog ul").selectAll("li").remove();
	},
	extractElement: function(content, tagName) {

		// Extract (first matching) element from content
		// Find tags
		var openTagIndex = content.indexOf("<" + tagName + ">");
		if(openTagIndex < 0) {
			return "";
		}
		var closeTagIndex = content.indexOf("<\/" + tagName + ">");
		if(closeTagIndex < 0 || closeTagIndex < openTagIndex) {
			return "";
		}

		// Position start index after tag
		openTagIndex += tagName.length + 2;	// Incl < and >
		return content.substring(openTagIndex, closeTagIndex);
	}
});

// Reviews
var reviews = instantiateClass({

	// Methods
	appendReviews: function(reviews) {
		var language = website.getLanguage();
		if(!language) {
			return;
		}
		reviews.forEach(function(review) {

			// Retrieve category, removing any subcategories (format: "cat-subcat" like "guiding-cycling")
			if(!review.category) {
				return;
			}
			var category = review.category.replace(/-.*$/, "");

			// Retrieve language specific text (stop if none present)
			var text = review["text-" + language];
			if(!text) {
				return;
			}

			// Append review to all relevant locations
			var reviewElement = d3.selectAll('[data-reviews="' + category + '"]')
				.append("li")
					.append("div")
						.attr("class", "review")
			;
			reviewElement
				.append("div")
					.attr("class", "text")
					.text(text)
			;
			reviewElement
				.append("div")
					.attr("class", "name")
					.text(review.name || website.text.general.anonymous)
			;
		});
	}
});

// Page presenter
var pagePresenter = instantiateClass({

	// Attributes
	pageCounter: 1,
	reviews: [],
	reviewTimer: null,

	// Methods
	initialize: function() {

		// Add event handler to show page based on current URL (for handling 'fake' history)
		window.addEventListener("popstate", function(event) {

			// Restore scroll to original position (if scrollRestoration is not supported)
			if(history.scrollRestoration === "fake") {
				var scrollY = window.scrollY;
				var scrollHandler = function() {
					window.scroll(0, scrollY);
					window.removeEventListener("scroll", scrollHandler, false);
				};
				window.addEventListener("scroll", scrollHandler, false);
			}

			// Show page based on current (newly popped) URL
			pagePresenter.showPageFromURL({ showPageFromHistory: true });
		}, false);
	},
	showPageFromURL: function(options) {

		// Show page based on current URL and language provided
		var page = null;
		var language = null;
		var info = browser.extractInfoFromUrl();
		if(info) {
			language = info.language;
			page = info.page;
		}

		// If not valid, use default home page
		if(!page) {
			page = pages.forName(website.homePageName);
		}

		// If language change load new text (will call this method recursively)
		if(language && language !== website.getLanguage()) {
			website.loadText(language);
		} else {

			// Show page
			options.ignoreHistory = true;
			this.showPage(page, options);

			// Replace query URL with absolute URL
			website.historyUpdateLocation(page);
		}
	},
	showLanguage: function(newLanguage, options) {
		website.loadText(newLanguage.substr(1));	// Strip leading slash
	},
	showPage: function(newActivePage, options, callback) {

		// Add default options if none provided
		if(!options) {
			options = {};
		}

		// Test for language change (single language)
		if(typeof newActivePage === "string") {

			// Show page in new language (no callback expected, ignoring it)
			this.showLanguage(newActivePage, options);
			return;
		}

		// Load resources
		website.loadResourcesLate(newActivePage);

		// Fix for Safari
		var didSwipeGestureOccurJustNow = browser.didSwipeGestureOccurJustNow();

		// Retrieve location current and new active page
		var activePageIndex = pages.activePage.datum().index;
		var newActivePageIndex = newActivePage.datum().index;

		// Validate result found
		if(activePageIndex === newActivePageIndex) {
			if(callback) {
				callback();
			}
			return;
		}

		// Save current scroll position and create scroll range
		scrollPosition.store();
		newActivePage.datum().scroll = {
			from: window.scrollY,
			to: options.showPageFromHistory ? scrollPosition.retrieve(newActivePage.datum().name) : 0
		};

		// Decide if special move forward (because of history) is required
		var moveForward = false;
		if(options.ignoreHistory) {
			var historyPageCounter = website.historyPageCounter();
			if(historyPageCounter > this.pageCounter) {
				moveForward = true;
			}
			this.pageCounter = historyPageCounter;
		}

		// Position new active page relative to current active page
		// If not moveForward but ignoreHistory then the back button or refresh button is pressed (both move page from left to right)
		if(!moveForward && (options.ignoreHistory || newActivePageIndex < activePageIndex)) {
			pages.activePage.datum().animate = { from: 0, to: 100 };
			newActivePage.datum().animate = { from: -100, to: 0 };
			moveForward = false;
		} else {
			pages.activePage.datum().animate = { from: 0, to: -100 };
			newActivePage.datum().animate = { from: 100, to: 0 };
			moveForward = true;
		}

		// Straighten all polaroids (unapply tilting) on new active page
		var tiltedPolaroids = newActivePage.selectAll(".polaroid.tilted");
		tiltedPolaroids
			.classed("left", false)
			.classed("right", false)
		;
		var isTiltedApplied = false;

		// Initialize reviews
		if(!browser.isEditable()) {
			pagePresenter.initReview(newActivePage);
		}

		// Remove visibility from all other pages
		var pagesInvolved = [ pages.activePage.node(), newActivePage.node() ];
		d3.selectAll(".page").each(function() {
			if(pagesInvolved.indexOf(this) < 0) {
				d3.select(this).classed("visible", false);
			}
		});

		// Animate new active page into view
		d3.selectAll(pagesInvolved)
			.style("left", function(pageDatum) {
				return pageDatum.animate.from + "vw";
			})
			.style("right", function(pageDatum) {
				return -pageDatum.animate.from + "vw";
			})
			.classed("visible", true)
			.interrupt()
			.transition()
				.duration(didSwipeGestureOccurJustNow ? 0 : 750)
				.delay(function() {
					// No delay if a page from history is shown
					return options.showPageFromHistory ? 0 : 200;
				})
				.style("left", function(pageDatum) {
					return pageDatum.animate.to + "vw";
				})
				.style("right", function(pageDatum) {
					return -pageDatum.animate.to + "vw";
				})
				.attrTween("data-scroll", function() {
					// This attrTween is a trick to have a time based transition (data-scroll is fake attribute)
					var page = d3.select(this);
					if(page.datum().index === newActivePageIndex) {
						var scroll = page.datum().scroll;
						return function(t) {

							// Scroll to destination position
							window.scroll(0, scroll.from + (scroll.to - scroll.from) * t);

							// Start tilting polariods if almost done with animation
							if(t > 0.95 && !isTiltedApplied) {
								var direction = moveForward ? "right" : "left";
								tiltedPolaroids.classed(direction, true && !pagePresenter.doNotApplyTilting);
								isTiltedApplied = true;
							}

							// Return null to keep empty attribute
							return null;
						};
					} else {
						// Return null to keep empty attribute "data-scroll"
						return function() { return null; };
					}
				})
				.on("interrupt end", function() {
					var page = d3.select(this);
					var isNewActivePage = page.datum().index === newActivePageIndex;

					// Remove fake attribute
					page.attr("data-scroll", null);

					// Start tilting polariods (needed in case of interrupt)
					if(!isTiltedApplied) {
						var direction = moveForward ? "right" : "left";
						tiltedPolaroids.classed(direction, true && !pagePresenter.doNotApplyTilting);
					}

					// Set menu status for selected page
					var menu = page.datum().menu;
					if(menu) {
						menu.classed("active", isNewActivePage);

						// If menu is sub-menu update main-menu appropriately
						if(menu.classed("sub-menu")) {
							menu.datum().mainMenu.classed("subactive", isNewActivePage);
						}
					}

					// Hide old active page, set new active page
					if(isNewActivePage) {
						pages.activePage = newActivePage;
						if(!options.ignoreHistory) {
							pagePresenter.pageCounter++;
							website.historyAddPage(pages.activePage);
						}
					} else {
						page.classed("visible", false);
					}

					// Remove temporary style values
					page
						.style("left", null)
						.style("right", null)
					;

					// Set SEO values and start showing reviews on new page
					if(isNewActivePage && !browser.isEditable()) {
						website.doSEO();
						pagePresenter.showReview(true);
					}

					// Call callback only once
					if(callback) {
						callback();
						callback = null;
					}
				})
		;

		// On touch devices close menu (if opened), will run in parallel with page animation
		if(mobileBrowser.hamburgerOrdered) {
			mobileBrowser.closeMenu();
		}
	},
	showReview: function(firstTime) {

		// Reset timer if still running
		if(this.reviewTimer) {
			window.clearTimeout(this.reviewTimer);
			this.reviewTimer = null;
		}

		// Check for presence of review element
		var page = pages.activePage;
		var reviewElement = page.select(".dynamic.review");
		if(reviewElement.size() === 0) {
			return;
		}

		// Filter on review categories (set as data on review element)
		var reviewCategories = reviewElement.attr("data-reviews");
		if(reviewCategories) {
			reviewCategories = reviewCategories.split(",");
		} else {
			reviewCategories = [];
		}
		var filter = function(review) {

			// Filter on category and non-empty content
			return reviewCategories.indexOf(review.category) >= 0 && review["text-" + website.getLanguage()];
		};
		this.reviews = this.reviews.filter(filter);

		// Add (shuffled/randomized) reviews from website if no more reviews available
		var availableReviews = website.reviews.filter(filter);
		var availableReviewsCount = availableReviews.length;
		if(this.reviews.length === 0) {
			this.reviews = d3.shuffle(availableReviews);
		}

		// Show review
		var timeout = 7000;	// 7 seconds
		if(availableReviewsCount > 0) {

			// Retrieve review text
			var review = this.reviews.splice(0, 1)[0];
			var text = review["text-" + website.getLanguage()];

			// Make timeout dependend on amount of text
			timeout = Math.min(20000, Math.max(timeout, text.split(" ").length * 200));

			// Helper function
			var updateReview = function() {

				// Update category, text and name
				reviewElement.attr("data-review", review.category);
				reviewElement.select(".text").text(text);
				reviewElement.select(".name").text(review.name || website.text.general.anonymous);
			};

			// Animate if more than 1 review available
			if(availableReviewsCount > 1) {

				// Animate existing review of screen
				reviewElement
					.style("left", firstTime ? "-100%" : "0%")	// Start off screen first time around
					.transition()
						.duration(750)
						.style("left", "-100%")
						.on("interrupt end", function() {

							// If of screen (to left), move to right (off screen) and give new content
							reviewElement.style("left", "100%");
							updateReview();
						})

						// Animate back into view
						.transition()
							.duration(750)
							.style("left", "0%")
							.on("interrupt end", function() {
								reviewElement.style("left", null);
							})
				;
			} else {
				reviewElement.style("left", null);
				updateReview();
			}
		}

		// Show next review in 3 seconds (if available reviews is 0 it might mean reviews are not loaded yet, retry)
		if(availableReviewsCount !== 1) {
			this.reviewTimer = window.setTimeout(function() {
				pagePresenter.showReview();
			}, timeout);
		}
	},
	initReview: function(page) {

		// Create content of review element
		var reviewElement = page.select(".dynamic.review");
		if(reviewElement.select(".text").size() === 0) {
			reviewElement.append("div").attr("class", "text");
			reviewElement.append("div").attr("class", "name");
		}

		// Set empty content
		reviewElement.style("left", null);
		reviewElement.select(".text").text("");
		reviewElement.select(".name").text("");

		// Add event handler
		reviewElement.on("click", function() {
			var category = reviewElement.attr("data-review");
			if(!category) {
				return;
			}

			// Remove subcategories
			category = category.replace(/-.*$/, "");

			// Find matching page
			var page = pages.activePage;
			var pageUrl = page.attr("data-href");
			if(!pageUrl) {
				return;
			}
			var reviewPageUrl = pageUrl.replace(/^(\/[a-z0-9]*)(?:\/[a-z0-9]*)?$/, "$1/reviews");
			if(reviewPageUrl === pageUrl) {
				return;	// No replace took place
			}
			var reviewPage = pages.forUrl(reviewPageUrl);
			if(!reviewPage) {
				return;
			}

			// Show page
			pagePresenter.showPage(reviewPage);
		});
	}
});

// Polaroid images
var polaroids = instantiateClass({

	// Methods
	initialize: function() {

		// Remove image if clicked outside polaroid
		d3.select("#full-image-presenter").on("click", function() {
			polaroids.showFull(d3.select("#full-image"));
		});
	},
	updateAll: function() {

		// Update all polaroid DIVs
		d3.selectAll(".polaroid").each(function() {
			polaroids.update(this);
		});
	},
	update: function(nodeOrSelector) {

		// Update polaroid
		var polaroid = d3.select(nodeOrSelector);

		// Mark images tall (allowing better sizing through CSS)
		polaroid.select("img").each(function() {
			var image = d3.select(this);
			var imageNode = image.node();
			if(imageNode.complete || imageNode.readyState === 4) {
				polaroids.markPolaroidTall(polaroid, image);
			} else {
				image.on("load", function() {
					polaroids.markPolaroidTall(polaroid, image);
				})
			}
		});

		// Add click handlers
		polaroid.on("click", function() {
			polaroids.showFull(polaroid);
		});
	},
	markPolaroidTall: function(polaroid, image) {
		var imageNode = image.node();
		if(imageNode.width && imageNode.height && imageNode.height > imageNode.width) {
			polaroid.classed("tall", true);
		}
	},
	showFull: function(polaroidOrImage) {
		var presenter = d3.select("#full-image-presenter");
		var fullImage = d3.select("#full-image");
		var pageWidth = document.documentElement.clientWidth;
		var pageHeight = document.documentElement.clientHeight;

		// Animate to full size image or vice versa?
		if(polaroidOrImage.node() !== fullImage.node()) {

			// Get size of polaroid and its font
			var polaroidInfo = this.getSizeInfo(polaroidOrImage);

			// Copy image and title to full image
			fullImage.select("img").attr("src",
				polaroidOrImage.classed("polaroid") ?
					polaroidOrImage.select("img").attr("src") :
					polaroidOrImage.attr("src")
			);
			fullImage.attr("title", polaroidOrImage.attr("title"));

			// Set initial full image size (to match current polaroid)
			fullImage
				.style("left", polaroidInfo.left + "px")
				.style("top", polaroidInfo.top + "px")
				.style("width", polaroidInfo.width + "px")
				.style("font-size", polaroidInfo.fontSize + "px")
				.style("opacity", 0.2)
			;

			// Calculate scale (fill width or height to 90%) and final full image size
			var scale = Math.min(pageWidth * 0.9 / polaroidInfo.width, pageHeight * 0.9 / polaroidInfo.height);
			var finalSize = {
				width: polaroidInfo.width * scale,
				height: polaroidInfo.height * scale
			};
			finalSize.left = (pageWidth - finalSize.width) / 2;
			finalSize.top = (pageHeight - finalSize.height) / 2;
			finalSize.fontSize = (pageWidth / pageHeight > 1.5 ? pageHeight : pageWidth) * 0.022;

			// Animate image to full image while keeping the original in hovered state
			polaroidOrImage.classed("keep-hovered", true);
			presenter.classed("visible", true);
			fullImage.datum(polaroidOrImage);
			fullImage.interrupt().transition()
				.delay(100)
				.duration(600)
				.style("left", finalSize.left + "px")
				.style("top", finalSize.top + "px")
				.style("width", finalSize.width + "px")
				.style("font-size", finalSize.fontSize + "px")
				.style("opacity", 1.0)
				.attrTween("data-background", function() {
					// This attrTween is a trick to have a time based transition (data-background is fake attribute)
					return function(t) {
						presenter.style("background-color", "rgba(80,80,80," + (0.6 * t) + ")");

						// Return null to keep empty attribute
						return null;
					};
				})
				.on("interrupt end", function() {
					fullImage
						.style("left", 100 * finalSize.left / pageWidth + "%")
						.style("top", 100 * finalSize.top / pageHeight + "%")
						.style("width", 100 * finalSize.width / pageWidth + "%")
						.style("font-size", "2.2" + (pageWidth / pageHeight > 1.5 ? "vh" : "vw"))
					;
				})
			;
		} else {
			// Remove full image (polaroid is actually fullImage and contains polaroid as datum)
			var fullImageInfo = this.getSizeInfo(fullImage);
			var originalPolaroid = fullImage.datum();

			// Retrieve current polaroid info
			var polaroidInfo = this.getSizeInfo(originalPolaroid);

			// Animate full image back to polaroid
			fullImage
				.interrupt()
				.style("left", fullImageInfo.left + "px")
				.style("top", fullImageInfo.top + "px")
				.style("width", fullImageInfo.width + "px")
				.style("font-size", ((pageWidth / pageHeight > 1.5 ? pageHeight : pageWidth) * 0.022) + "px")
				.transition()
					.delay(100)
					.duration(600)
					.style("left", polaroidInfo.left + "px")
					.style("top", polaroidInfo.top + "px")
					.style("width", polaroidInfo.width + "px")
					.style("font-size", polaroidInfo.fontSize + "px")
					.style("opacity", 0.2)
					.attrTween("data-background", function() {
						// This attrTween is a trick to have a time based transition (data-background is fake attribute)
						return function(t) {
							presenter.style("background-color", "rgba(80,80,80," + (0.6 * (1.0 - t)) + ")");

							// Return null to keep empty attribute
							return null;
						};
					})
					.on("interrupt end", function() {
						d3.select("#full-image-presenter").classed("visible", false);
						window.setTimeout(function() {
							originalPolaroid.classed("keep-hovered", false);
						}, 100);
					})
			;
		}
		browser.stopEvent();
	},
	getSizeInfo: function(element) {
		var sizeInfo = element.node().getBoundingClientRect();
		sizeInfo.fontSize = parseFloat(element.style("font-size"));
		return sizeInfo;
	},
	removeAll: function(selection) {
		selection.selectAll(".polaroid")
			.classed("left", false)
			.classed("right", false)
			.classed("tall", false)
			.each(function() {
				icons.removeAll(d3.select(this));
			})
		;
	}
});

// SVG icons
var icons = instantiateClass({

	// Methods
	updateAll: function() {
		// Insert icons into page
		d3.selectAll(".icon").each(function() {
			icons.update(this);
		});
	},
	update: function(nodeOrSelector) {
		var icon = d3.select(nodeOrSelector);
		icon.insert("svg", "*")
			.attr("xmlns", "http://www.w3.org/2000/svg")
			.attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
			.attr("preserveAspectRatio", icon.attr("data-keep-ratio") === "false" ? "none" : null)
			.attr("viewBox", "0 0 24 24")
			.append("use")
				.attr("xlink:href", "#" + icon.attr("data-icon"))
		;
	},
	removeAll: function(selection) {

		// Remove icons
		selection.selectAll(".icon[data-icon]")
			.select("svg").remove();
	}
});

// Image Grid
var imageGrid = instantiateClass({

	// Attributes
	showingImages: false,

	// Methods
	showImages: function(images) {
		var imagesPerCategory = images.reduce(function(imagesPerCategory, image) {
			if(!imagesPerCategory[image.category]) {
				imagesPerCategory[image.category] = [];
			}
			imagesPerCategory[image.category].push(image);
			return imagesPerCategory;
		}, {});

		// Append images per category
		Object.keys(imagesPerCategory).forEach(function(category) {
			d3.select('[data-category="' + category + '"].image-grid').selectAll(".image-container")
				.data(imagesPerCategory[category])
				.enter()
					.append("div")
						.attr("class", "image-container")
						.append("div")
							.attr("class", "image")
							.append("img")
								.attr("data-load-late-src", function(d) { return d.src; })
								.attr("data-selection", function(d) { return d.selection; })
								.attr("data-title-nl", function(d) { return d["title-nl"]; })
								.attr("data-title-en", function(d) { return d["title-en"]; })
								.each(imageGrid.updateImage)
								.on("click", function() {
									var image = d3.select(this);
									polaroids.showFull(image);
								})
			;
		});
		this.showingImages = true;
	},
	insertImage: function(imageUrl) {
		var grid = pages.activePage.select(" .image-grid");
		grid.insert("div", ":first-child")
			.attr("class", "image-container")
			.append("div")
				.attr("class", "image")
				.append("img")
					.attr("src", imageUrl)
					.attr("data-selection", "0,0,1.0")
					.attr("data-title-nl", "Nieuw")
					.attr("data-title-en", "New")
		;
	},
	updateImage: function() {
		var image = d3.select(this);
		var titleAttr = "data-title-" + website.getLanguage();
		var imageSelection = image.attr("data-selection");
		var imageSelectionData = imageSelection ? imageSelection.split(",") : [ 0, 0, 1.0 ];
		image
			.attr("title", image.attr(titleAttr))
			.style("margin-left", (-parseFloat(imageSelectionData[0]) * 100) + "%")
			.style("margin-top", (-parseFloat(imageSelectionData[1]) * 100) + "%")
			.style("width", (parseFloat(imageSelectionData[2]) * 100) + "%")
		;
	},
	removeImages: function(selection) {
		selection.select(".image-grid")
			.selectAll("*")
				.text("")	// Remove whitespace
				.remove()	// Remove children
		;
		selection.select(".image-grid").text("");	// Remove whitespace
	}
});

// Scroll positions (for page transitions)
var scrollPosition = instantiateClass({

	// Methods
	initialize: function() {
		window.addEventListener("unload", function() {
			scrollPosition.store();
		}, false);
	},
	store: function() {

		// Store scroll position per page (per session)
		var scrollPositions = browser.sessionStorage.getItem("scrollPositions");
		if(scrollPositions) {
			scrollPositions = JSON.parse(scrollPositions);
		} else {
			scrollPositions = {};
		}
		scrollPositions[pages.activePage.datum().name] = window.scrollY;
		browser.sessionStorage.setItem("scrollPositions", JSON.stringify(scrollPositions));
	},
	retrieve: function(pageName) {

		// Retrieve scroll position for specified page
		var scrollPositions = browser.sessionStorage.getItem("scrollPositions");
		if(scrollPositions) {
			scrollPositions = JSON.parse(scrollPositions);
			var position = scrollPositions[pageName];
			if(position) {
				return position;
			}
		}
		return 0;
	}
});

var website = instantiateClass({

	// Attributes
	title: "Saskia de Groot",
	homePageName: "home",
	languages: [ "nl", "en" ],
	images: null,
	text: null,
	reviews: null,
	initializeCompleted: false,
	busyShowing: false,
	hasBeenShown: false,
	beforeShowHandlers: [],
	afterShowHandlers: [],
	beforeLoadTextHandlers: [],

	// Methods
	load: function() {
		var language = browser.extractLanguageFromUrl();
		this.loadText(language);
		this.loadArtwork();
		this.loadReviews();
	},
	loadResource: function(node, attrName) {
		var element = d3.select(node);
		element
			.attr("src", element.attr(attrName))
			.attr(attrName, null)	// Remove 'old' attr
		;
	},
	loadResourcesLazy: function() {

		// Replace (delayed) all resource src attributes with value in load-lazy attribute
		window.setTimeout(function() {
			var attrName = "data-load-lazy-src";
			d3.selectAll("[" + attrName + "]").each(function() {
				website.loadResource(this, attrName);
			});
		}, 1500);
	},
	loadResourcesLate: function(page) {

		// Replace (direct) all resource src attributes in given page with value in load-late or load-lazy attribute
		var attrName = "data-load-late-src";
		page.selectAll("[" + attrName + "]").each(function() {
			website.loadResource(this, attrName);
		});
		attrName = "data-load-lazy-src";
		page.selectAll("[" + attrName + "]").each(function() {
			website.loadResource(this, attrName);
		});
	},
	loadAllResourcesLate: function() {
		d3.selectAll(".page").each(function() {
			var page = d3.select(this);
			website.loadResourcesLate(page);
		});
	},
	loadArtwork: function() {

		// Load artwork
		d3.json("/data/artwork.json", function(error, data) {
			if(error || !data || !Array.isArray(data)) {
				console.error("Failed to load artwork", error, data);
				return;
			}

			// Store artwork and show website
			website.images = data;
			website.show();
		});
	},
	loadReviews: function() {

		// Load reviews
		d3.json("/data/reviews.json", function(error, data) {
			if(error || !data || !Array.isArray(data)) {
				console.error("Failed to load reviews", error, data);
				return;
			}

			// Store reviews
			website.reviews = data;
			website.show();
		});
	},
	loadText: function(language, callback) {

		// Test language
		if(!language || this.languages.indexOf(language) < 0) {

			// Invalid language and already showing, just stop
			if(this.hasBeenShown) {
				return;
			}

			// Use browser language
			language = this.getLanguage();
		}

		// Call before load text handlers (stop if a handler returns false)
		if(!this.beforeLoadTextHandlers.every(function(handler) {
			return handler();
		})) {
			return;
		}

		// Load text
		d3.json("/data/text-" + language + ".json", function(error, data) {

			// Check result
			if(error || !data || typeof data !== "object") {
				console.error("Failed to load text", error, data);
				return;
			}

			// Remember language choice (and reflect change in url)
			browser.setLanguage(language);
			website.historyUpdateLocation();

			// Store pages and show website
			website.text = data;
			website.show();
		});
	},
	show: function() {

		// Decide if site can be shown
		if(!this.fullyLoaded() || this.busyShowing) {
			return;
		}

		// Mark status
		this.busyShowing = true;

		// Show empty page
		pagePresenter.showPage(pages.forName("empty"), { ignoreHistory: true }, function() {

			// Hide menu
			d3.select("body").classed("initialized", false);

			// Allow the menu to hide with animation
			window.setTimeout(function() {

				// Run all before show handlers in turn
				website.beforeShowHandlers.forEach(function(handler) {
					handler();
				});

				// Remove existing pages and reset menus
				d3.selectAll("section.page").remove();
				menus.updateAll();

				// Set header text
				website.setHeaderText(website.text.services);

				// Set menu text
				menus.setText(website.text.menus);

				// Append new pages to DOM
				pages.appendPages(website.text.pages);

				// Append new blog entries to DOM
				blogs.removeMenus();
				blogs.setEntries(website.text.blogs);

				// Append reviews to pages
				reviews.appendReviews(website.reviews);

				// Update menus, pages, etc
				imageGrid.showImages(website.images);
				menus.updateAll();	// Order menus and pages initialization is important!
				pages.updateAll();
				polaroids.updateAll();
				icons.updateAll();
				security.apply();

				// Show currently language
				var language = browser.getLanguage();
				website.languages.forEach(function(lang) {
					d3.select("a[href=\"/" + lang + "\"]").classed("active", lang === language);
				});

				// Mark site as initialized
				d3.select("body").classed("initialized", true);

				// Show page based on current URL (short timeout for visual effect)
				window.setTimeout(function() {
					pagePresenter.showPageFromURL({ showPageFromHistory: pages.isReloaded });

					// Call after show handlers in turn
					website.afterShowHandlers.forEach(function(handler) {
						handler();
					});
				}, 600);

				// Mark status
				website.busyShowing = false;
				website.hasBeenShown = true;
			}, website.hasBeenShown ? 600 : 0);	// If page has not been shown, no delay needed since nothing to hide
		});
	},
	initializeComplete: function() {
		this.initializeCompleted = true;
	},
	fullyLoaded: function() {
		return this.initializeCompleted && this.text && this.images && this.reviews;
	},
	getLanguage: function() {
		var language = browser.getLanguage();
		if(this.languages.indexOf(language) < 0) {
			language = this.languages[0];
		}
		return language;
	},
	getFullDateString: function(dateString, skipPastNames) {
		var today = new Date(Date.now());
		today.setHours(0, 0, 0, 0);
		var date = null;

		// Get Date object from input (or default today)
		if(dateString) {
			var match = dateString.match(/^(\d\d\d\d)-(\d\d)-(\d\d)$/);
			if(!match) {
				console.error("Internal error: invalid date-string: " + dateString);
				return dateString;
			}
			date = new Date(+match[1], +match[2] - 1, +match[3]);
		} else {
			date = today;
		}

		// Check for specific dates
		var days = skipPastNames ?
			-1 :		// Prevent past names from being generated
			Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
		;
		if(days === 0) {
			return website.text.general.pastNames.today;
		} else if(days === 1) {
			return website.text.general.pastNames.yesterday;
		} else if(days === 2) {
			return website.text.general.pastNames.dayBeforeYesterday;
		} else if(days === 7) {
			return website.text.general.pastNames.week;
		} else if(days === 14) {
			return website.text.general.pastNames.twoWeeks;
		} else if(days > 0 && days < 14) {
			return days + " " + website.text.general.pastNames.days;
		} else {
			return website.text.general.dayNames[date.getDay()] + " " + date.getDate() + " " + website.text.general.monthNames[date.getMonth()] + " " + date.getFullYear();
		}
	},
	addBeforeShowHandler: function(handler) {
		this.beforeShowHandlers.push(handler);
	},
	addAfterShowHandler: function(handler) {
		this.afterShowHandlers.push(handler);
	},
	addBeforeLoadTextHandler: function(handler) {
		this.beforeLoadTextHandlers.push(handler);
	},
	setHeaderText: function(servicesObject) {
		Object.keys(servicesObject).forEach(function(serviceId) {
			d3.select(".services a[href=\"/" + serviceId + "\"]").text(servicesObject[serviceId]);
		});
	},
	historyAddPage: function(page) {
		var header = page.select("h1");
		document.title = website.title + (header.size() === 1 ? " - " + header.text() : "");
		history.pushState(
			{
				pageCounter: pagePresenter.pageCounter
			},
			document.title,
			"/" + this.getLanguage() + page.attr("data-href")
		);
	},
	historyUpdateLocation: function(page) {
		var pageCounter = pagePresenter.pageCounter;
		if(history.state && history.state.pageCounter && history.state.pageCounter > pageCounter) {
			pageCounter = history.state.pageCounter;
		}

		// Extract page from url
		var info = browser.extractInfoFromUrl();
		var url = "";
		if(info) {
			if(info.page) {
				url = info.page.attr("data-href");
			} else if(info.path) {
				url = info.path;
			}
		}
		history.replaceState(
			{
				pageCounter: pageCounter
			},
			document.title,
			"/" + this.getLanguage() + url
		);
	},
	historyPageCounter: function() {
		if(history.state && history.state.pageCounter) {
			return history.state.pageCounter;
		}
		return 1;
	},
	doSEO: function() {
		try {
			// Helper
			var getText = function(element) {
				if(element && element.size() > 0) {
					return element.text();
				}
				return "";
			};

			// Use main header for title
			var page = pages.activePage;
			var pageTitle = getText(page.select("h1"));
			var fullTitle = this.title + (pageTitle ? " - " + pageTitle : "");

			// Use polaroid for image (otherwise logo)
			var image = page.select(".polaroid img");
			if(image.size() !== 1 || !image.attr("src") || image.attr("src") === "/img/no_photo.png") {
				image = d3.select("#logo img");
			}

			// Set head parameters
			// (not sure if the Open Graph elements work since FB might not execute client JS before parsing metadata)
			var head = d3.select("head");
			head.select("title").text(fullTitle);
			head.select("meta[name=\"description\"]").attr("content", getText(page.select("p")));
			head.select("meta[property=\"og:type\"]").attr("content", page.classed("blog") ? "article" : "website");
			head.select("meta[property=\"og:image\"]").attr("content", document.location.protocol + "//" + document.location.host + image.attr("src"));
			if(head.select("meta[property=\"og:locale\"]").size() === 0) {
				head.append("meta").attr("property", "og:locale");
			}
			head.select("meta[property=\"og:locale\"]").attr("content", website.getLanguage());
		} catch(err) {
			// Ignore
		}
	}
});

// The following initializations require the DOM to be loaded
document.addEventListener("DOMContentLoaded", function() {
	mobileBrowser.initialize();
	menus.initialize();
	pages.initialize();
	pagePresenter.initialize();
	scrollPosition.initialize();
	polaroids.initialize();
	website.initializeComplete();
	website.show();
}, false);

// Main
browser.initialize();
website.addAfterShowHandler(website.loadResourcesLazy);
website.load();
