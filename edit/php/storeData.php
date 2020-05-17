<?php

	require_once 'images.php';

	// Define globals
	define('DATA_FOLDER', ROOT_FOLDER . 'data' . DIRECTORY_SEPARATOR);
	define('BACKUP_FOLDER', '..' . DIRECTORY_SEPARATOR . 'backup' . DIRECTORY_SEPARATOR);
	define('HOST', 'https://www.saskiadegroot.nl/');

	class ResultConstants {
		const OK = 'OK';
		const INVALID_INPUT = 'Input is invalid';
		const WRITE_FAILURE = 'Write failure';
		const INTERNAL = 'Internal failure';
	}

	// Functions to handle errors and exit
	function errorHandler($errno, $errstr, $errfile, $errline)
	{
		exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => $errstr));
		return TRUE;
	}
	function exitWithResult($result) {
		if(is_string($result)) {
			$result = array('resultCode' => $result);
		}
		print json_encode($result);
		exit();
	}

	// Function to create backup according to following policy:
	//	Max two backups per day are stored: first and last
	//	If the first backup already exists, the last backup is created or updated
	function createBackup($filename) {

		// Read data
		$data = file_get_contents($filename);
		if($data === FALSE) {
			error_log('Failed to read data for making backup.');
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Failed to read data for backup'));
		}

		// Decide which file to backup to
		$fileExtension = '.json';
		$bareFilename = substr(strrchr($filename, DIRECTORY_SEPARATOR), 1, -strlen($fileExtension));	// Remove leading separator and ending .json
		$date = date('Ymd');
		$backupFilename = BACKUP_FOLDER . $bareFilename . '.' . $date . '.first' . $fileExtension;
		if(file_exists($backupFilename)) {
			$backupFilename = BACKUP_FOLDER . $bareFilename . '.' . $date . '.last' . $fileExtension;
		}

		// Create backup
		if(file_put_contents($backupFilename, $data) === FALSE) {
			error_log('Failed to write data for making backup.');
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Failed to write data for backup'));
		}
	}

	// Function to validate input data
	function isValidData($data) {

		// Data should be object
		if(!($data && is_object($data))) {
			error_log('No data/object provided.');
			return FALSE;
		}

		// Data should contain a type field
		if(!(isStringField($data, 'type') && property_exists($data, 'data'))) {
			error_log('No type or data provided.');
			return FALSE;
		}

		// Data should be according to given type
		if($data->type === 'artwork') {
			if(!isValidArtwork($data->data)) {
				return FALSE;
			}
		} else if($data->type === 'page') {
			if(!isValidPage($data->data)) {
				return FALSE;
			}
		} else if($data->type === 'blog') {
			if(!isValidBlog($data->data)) {
				return FALSE;
			}
		} else if($data->type === 'reviews') {
			if(!isValidReviews($data->data)) {
				return FALSE;
			}
		} else {
			return FALSE;
		}

		return TRUE;
	}
	function isValidArtwork($artwork) {

		// Artwork should be an array
		if(!is_array($artwork) || count($artwork) === 0) {
			error_log('No array/empty array for artwork data.');
			return FALSE;
		}

		// Every work should contain 6 string fields
		$fields = [ 'src', 'selection', 'title-nl', 'title-en', 'category' ];
		foreach($artwork as $work) {
			if(!hasOnlyValidStringFields($work, $fields)) {
				return FALSE;
			}
		}

		return TRUE;
	}
	function isValidPage($page) {

		// Page should be an object
		if(!is_object($page)) {
			error_log('No object for page data.');
			return FALSE;
		}

		// Page should contain 4 string fields
		$fields = [ 'language', 'id', 'category', 'content' ];
		return hasOnlyValidStringFields($page, $fields);
	}
	function isValidBlog($blog) {

		// Page should be an object
		if(!is_object($blog)) {
			error_log('No object for blog data.');
			return FALSE;
		}

		// Page should contain 6 string fields
		$fields = [ 'language', 'id', 'category', 'content', 'img', 'date', 'status' ];
		return hasOnlyValidStringFields($blog, $fields);
	}
	function isValidReviews($reviews) {

		// Reviews should be an array
		if(!is_array($reviews)) {
			error_log('No array for reviews data.');
			return FALSE;
		}

		// Reviews should contain 4 string fields
		$fields = [ 'text-nl', 'text-en', 'name', 'category' ];
		foreach($reviews as $review) {
			if(!hasOnlyValidStringFields($review, $fields)) {
				return FALSE;
			}
		}

		return TRUE;
	}
	function hasOnlyValidStringFields($object, $fields) {

		// Check for correct number of fields
		if(count(get_object_vars($object)) !== count($fields)) {
			error_log('Object properties not exactly equal to: ' . implode(',', $fields));
			return FALSE;
		}

		// Check for specific fields
		foreach($fields as $field) {
			if(!isStringField($object, $field)) {
				error_log('Object property ' . $field . ' does not exist/is empty.');
				return FALSE;
			}
		}

		return TRUE;
	}
	function isStringField($obj, $field) {
		return property_exists($obj, $field) && is_string($obj->$field);
	}

	// Handle data
	function handleData($data) {
		if($data->type === 'artwork') {
			handleArtwork($data->data);
		} else if($data->type === 'page') {
			handlePage($data->data);
		} else if($data->type === 'blog') {
			handleBlog($data->data);
		} else if($data->type === 'reviews') {
			handleReviews($data->data);
		} else {
			error_log('Unknown data type: ' . $data->type);
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Invalid data type'));
		}
	}
	function handleArtwork($artwork) {

		// Convert Artwork to text
		$artworkContent = json_encode($artwork, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

		// Create backup
		$filename = DATA_FOLDER . 'artwork.json';
		createBackup($filename);

		// Write the artwork
		if(file_put_contents($filename, $artworkContent) === FALSE) {
			error_log('Failed to write artwork.');
			exitWithResult(array('resultCode' => ResultConstants::WRITE_FAILURE, 'resultMessage' => 'Failed to write artwork'));
		}
	}
	function handlePage($page) {

		// Get text based on page language
		$text = readText($page->language);

		// Test for presence of page
		$pageId = $page->id;
		if(!property_exists($text->pages, $pageId)) {
			error_log('Page with id ' . $pageId . ' does not exist.');
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Unknown page: ' . $pageId));
		}

		// Replace existing page with new one
		$existingPage = $text->pages->$pageId;
		$existingPage->category = $page->category;
		$existingPage->content = $page->content;

		// Write text back to file
		writeText($page->language, $text);

		// Update sitemap
		updateSitemap();
	}
	function handleBlog($blog) {

		// Get text based on blog language
		$text = readText($blog->language);

		// Check for presence of blog
		$blogId = $blog->id;
		if(!property_exists($text->blogs, $blogId)) {

			// Add blog
			$text->blogs->$blogId = (object)null;
		}

		// Check status of blog
		if($blog->status === "removed") {

			// Remove blog
			unset($text->blogs->$blogId);
		} else {

			// Replace (new or selected) blog with new values
			$existingBlog = $text->blogs->$blogId;
			$existingBlog->content = $blog->content;
			$existingBlog->date = $blog->date;
			$existingBlog->status = $blog->status;

			// Handle image separately
			if(!property_exists($existingBlog, 'img') || $existingBlog->img !== $blog->img) {
				if(!handleBlogImage($blog->img, $blogId)) {
					error_log('Failed to create thumbnail');
					exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Thumbnail could not be processed: ' . $blog->img));
				}
				$existingBlog->img = $blog->img;
			}
		}

		// Write text back to file
		writeText($blog->language, $text);

		// Update sitemap
		updateSitemap();
	}
	function handleBlogImage($img, $blogId) {

		// Test for special case without an image
		if($img === '') {
			return TRUE;
		}

		// Test for presence of thumbnail info
		$match = preg_match('/^(\/img\/photo[\d]{4}\.jpg)@([\d\.]+),([\d\.]+),([\d\.]+)$/', $img, $matches);
		if($match === FALSE) {
			error_log('Unknown thumbnail info: ' . $img);
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Unknown thumbnail info: ' . $img));
		} else if(!$match && strpos($img, "@") !== FALSE) {
			error_log('Invalid thumbnail info: ' . $img);
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Invalid thumbnail info: ' . $img));
		}

		// If no thumbnail info present return
		if(!$match) {
			return null;
		}

		// Create new thumbnail
		$fileName = 'thumbnail-' . $blogId . '.jpg';
		$outputFileName = IMG_FOLDER . 'thumbnail-' . $blogId . '.jpg';
		$image = processImage(ROOT_FOLDER . $matches[1], $outputFileName, TRUE, $matches[2], $matches[3], $matches[4]);
		if(is_string($image)) {
			error_log('Invalid thumbnail: ' . $image);
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Invalid thumbnail: ' . $image));
		} else if($image === null) {
			error_log('Processing thumbnail failed.');;
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Processing thumbnail failed.'));
		}

		return TRUE;
	}
	function handleReviews($reviews) {

		// Convert reviews to text
		$reviewsContent = json_encode($reviews, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

		// Create backup
		$filename = DATA_FOLDER . 'reviews.json';
		createBackup($filename);

		// Write the reviews
		if(file_put_contents($filename, $reviewsContent) === FALSE) {
			error_log('Failed to write reviews.');
			exitWithResult(array('resultCode' => ResultConstants::WRITE_FAILURE, 'resultMessage' => 'Failed to write reviews'));
		}
	}
	function updateSitemap() {

		$urls = [];

		// Handle both languages
		$languages = [ 'nl', 'en' ];
		foreach($languages as $language) {

			// Read website content
			$text = readText($language);

			// Select all pages
			foreach($text->pages as $pageName => $pageObject) {
				$urls[] = HOST . $language . $pageName;
			}

			// Select all blogs
			foreach($text->blogs as $blogName => $blogObject) {
				if($blogObject->status === "published") {
					$urls[] = HOST . $language . '/blog/' . $blogName;
				}
			}
		}

		file_put_contents(ROOT_FOLDER . 'sitemap.txt', implode("\n", $urls));
	}
	function readText($language) {

		// Read in all text in given language
		$filename = DATA_FOLDER . 'text-' . $language . '.json';
		$textContent = file_get_contents($filename);
		if($textContent === FALSE) {
			error_log('Failed to read file ' . $filename);
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'No text found'));
		}

		// Convert text to JSON
		$text = json_decode($textContent);
		if(!($text && is_object($text))) {
			error_log('Failed to parse json text from: ' . $filename);
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Previously stored text is not in JSON format or result is not an object'));
		}

		return $text;
	}
	function writeText($language, $text) {

		// Convert text back to a string
		$textContent = json_encode($text, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

		// Create backup
		$filename = DATA_FOLDER . 'text-' . $language . '.json';
		createBackup($filename);

		// Write back the text
		if(file_put_contents($filename, $textContent) === FALSE) {
			error_log('Failed to write file: ' . $filename);
			exitWithResult(array('resultCode' => ResultConstants::WRITE_FAILURE, 'resultMessage' => 'Failed to write text'));
		}
	}

	// Main
	try {

		// Initialize
		set_error_handler('errorHandler');

		// Read input
		$postData = file_get_contents('php://input');
		if($postData === FALSE) {
			error_log('No POST data in request.');
			exitWithResult(array('resultCode' => ResultConstants::INVALID_INPUT, 'resultMessage' => 'No input provided'));
		}
		$data = json_decode($postData);

		// Check valid input
		if(!isValidData($data)) {
			error_log('Input is not valid JSON: ' . $postData);
			exitWithResult(array('resultCode' => ResultConstants::INVALID_INPUT, 'resultMessage' => 'Input is not valid JSON'));
		}

		// Handle data
		handleData($data);

		exitWithResult(array('resultCode' => ResultConstants::OK));
	} catch(Exception $e) {
		error_log('Exception: ' . $e->getMessage());
		exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => $e->getMessage()));
	}
?>
