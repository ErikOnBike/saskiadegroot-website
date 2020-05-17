CKEDITOR.editorConfig = function(config) {

	config.toolbar = [
		{ name: "document", items: [ "Save", "Sourcedialog", "Status" ] },
		{ name: "clipboard", items: [ "Cut", "Copy", "Paste", "PasteText", "PasteFromWord", "-", "Undo", "Redo" ] },
		{ name: "editing", items: [ "Find", "Replace", "-", "Scyat" ] },
		{ name: "links", items: [ "Link", "Unlink", "Anchor" ] },
		{ name: "insert", items: [ "Image", "SpecialChar" ] },
		"/",
		{ name: "basicstyles", items: [ "Bold", "Italic", "Strike", "Subscript", "Superscript", "-", "h1", "h2" ] },
		{ name: "paragraph", items: [ "NumberedList", "BulletedList", "ToggleBullets" ] },
		//{ name: "styles", items: [ "Format" ] },
		{ name: "extra", items: [ "EditArtwork", "EditPhotos", "-", "NewBlog", "RemoveBlog", "PublishBlog", "-", "EditReviews" ] }
	];

	config.disableObjectResizing = true;
	config.enterMode = CKEDITOR.ENTER_P;
	config.entities_additional = "";
	config.specialChars = [
		[ "&lt;", "Less than" ],
		[ "&gt;", "Greater than" ],
		"[",
		"]",
		"{",
		"}",
		"&laquo;",
		"&raquo;",
		"|",
		"@",
		'"',
		"~",
		"=",
		"&asymp;",
		"&times;",
		"&divide;",
		[ "&plusmn;", "Plus minus" ],
		"&euro;",
		"&sect;",
		"&hellip;",
		"&copy;",
		"&reg;",
		"&trade;",
		"&deg;",
		"&sup1;",
		"&sup2;",
		"&sup3;",
		"&para;",
		"&ordm;",
		"&frac14;",
		"&frac12;",
		"&frac34;",
		"&iexcl;",
		"&iquest;",
		"&Auml;",
		"&Agrave;",
		"&Aacute;",
		"&Acirc;",
		"&Atilde;",
		"&Aring;",
		"&auml;",
		"&agrave;",
		"&aacute;",
		"&acirc;",
		"&atilde;",
		"&aring;",
		"&AElig;",
		"&aelig;",
		"&Ccedil;",
		"&ccedil;",
		"&Euml;",
		"&Egrave;",
		"&Eacute;",
		"&Ecirc;",
		"&euml;",
		"&egrave;",
		"&eacute;",
		"&ecirc;",
		"&Iuml;",
		"&Igrave;",
		"&Iacute;",
		"&Icirc;",
		"&iuml;",
		"&igrave;",
		"&iacute;",
		"&icirc;",
		"&Ntilde;",
		"&ntilde;",
		"&Ouml;",
		"&Ograve;",
		"&Oacute;",
		"&Ocirc;",
		"&Otilde;",
		"&Oslash;",
		"&ouml;",
		"&ograve;",
		"&oacute;",
		"&ocirc;",
		"&otilde;",
		"&oslash;",
		"&OElig;",
		"&oelig;",
		"&Uuml;",
		"&Ugrave;",
		"&Uacute;",
		"&Ucirc;",
		"&uuml;",
		"&ugrave;",
		"&uacute;",
		"&ucirc;",
		"&szlig;",
		"&#9658;",
		[ "&larr;", "Left arrow" ],
		[ "&rarr;", "Right arrow" ],
		[ "&uarr;", "Up arrow" ],
		[ "&darr;", "Down arrow" ],
		[ "&harr;", "Left/right arrow" ],
		[ "&crarr;", "Return arrow" ],
		[ "&lArr;", "Left double arrow" ],
		[ "&rArr;", "Right double arrow" ],
		[ "&hArr;", "Left/right double arrow" ],
		[ "&nbsp;", "Non breaking space" ],
		[ "​", "No width space" ],
		[ "&#8209;", "Non breaking dash" ]
	];
	config.resize_enabled = false;
	config.dialog_noConfirmCancel = true;
	config.format_tags = "p;h1;h2";
	config.allowedContent = "div[*](*);p;br;ul(no-bullets);ol;li;h1(title,drawing-background,coaching-background,guiding-background);h2;b;i;s;sub;sup;a[*](mailsecurity,telsecurity);img[src,title,data-thumbnail,data-selection,data-title-nl,data-title-en]{margin-left,margin-top,width}(*);svg[*];use[*];iframe[*](gcal,desktop,mobile,gmaps)"; 
	config.uploadUrl = "/edit/php/uploadimage.php";
};

CKEDITOR.on("dialogDefinition", function(ev) {
	var dialogName = ev.data.name;
	var dialogDefinition = ev.data.definition;

	// Check if the definition is from the link dialog
	if(dialogName == "link") {

		// Remove target and advanced tab
		dialogDefinition.removeContents("target");
		dialogDefinition.removeContents("advanced");
	}
});

