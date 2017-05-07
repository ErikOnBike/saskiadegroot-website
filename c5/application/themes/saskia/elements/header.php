<?php defined('C5_EXECUTE') or die("Access Denied.");

$this->inc('elements/header_top.php');
?>

<header>
    <div class="container">
        <div class="row">
            <div class="col-sm-2 col-xs-8 home-select">
		<a href="" alt="Home"><img src="<?php echo $this->getThemePath(); ?>/images/logo.jpg"></a>
            </div>
            <div class="col-sm-8 col-xs-8">
                <?php
                $a = new GlobalArea('Header Navigation');
                $a->display();
                ?>
            </div>
            <div class="col-sm-2 col-xs-2 lang-select">
		<a href="" alt=""><img src=""></a>
            </div>
        </div>
    </div>
</header>
<script>
	// Test if browser supports local storage
	var hasLocalStorage = false;
	var storage = window["localStorage"];
	if(storage && typeof storage.setItem === "function") {
		storage.setItem("item123", "123");
		var result = storage.getItem("item123");
		storage.removeItem("item123");
		hasLocalStorage = result === "123";
	}

	// Retrieve language from URL
	var currentLanguage = window.location.pathname.replace(/^(\/c5\/index.php)?\/(nl|en)\/.*$/, "$2");

	// Check for language found in URL
	if(currentLanguage === "nl" || currentLanguage === "en") {

		// Remember language selected
		if(hasLocalStorage) {
			storage.setItem("last_used_lang", currentLanguage);
		}

	} else {

		// Reset currentLanguage (to prevent using accidental 'garbage' from the replace method above)
		currentLanguage = null;

		// Retrieve language from browser
		if(hasLocalStorage) {

			// Use last used language (if any)
			currentLanguage = storage.getItem("last_used_lang");
		} else {
			
			// Use browser language
			currentLanguage = window.navigator.userLanguage;	// IE
			if(!currentLanguage) {
				currentLanguage = window.navigator.language;	// Rest of the world
			}

			// Remove regional information
			if(currentLanguage) {
				currentLanguage = currentLanguage.replace(/-.*$/, "");
			}
		}
	}

	// If no valid language is found, select default language
	if(currentLanguage !== "nl" && currentLanguage !== "en") {
		currentLanguage = "nl";
	}

	// Show 'other' language as selectable language
	var otherLanguage = currentLanguage === "nl" ? "en" : "nl";
	$(".lang-select a")
		.attr("href", window.location.href.replace(/\/(nl|en)\//, "/" + otherLanguage + "/"))
		.attr("alt", otherLanguage === "nl" ? "Wissel taal" : "Switch language")
	;
	$(".lang-select img")
		.attr("src", "<?php echo $this->getThemePath(); ?>/images/lang_" + otherLanguage + ".png")
	;

	// Update home button
	$(".home-select a")
		.attr("href", window.location.protocol + "//" + window.location.host + "/" + otherLanguage + "/home")
	;
</script>
