<?php

	require_once 'images.php';

	// Define globals
	define('MAX_IMAGE_UPLOAD_SIZE', 6);	// In Mb
	define('MAX_IMAGE_UPLOAD_COUNT', 5);

	class ResultConstants {
		const OK = 'OK';
		const WARN = 'WARN';
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

	// Get normalized list of files (see: https://php.net/manual/en/features.file-upload.post-method.php#120686)
	function getPhotoFiles() {
		$function = function($files, $photo_files = array(), $path = array()) use (&$function) {
			foreach ($files as $key => $value) {
				$temp = $path;
				$temp[] = $key;

				if (is_array($value)) {
					$photo_files = $function($value, $photo_files, $temp);
				} else {
					$next = array_splice($temp, 1, 1);
					$temp = array_merge($temp, $next);

					$new = &$photo_files;

					foreach ($temp as $key) {
						$new = &$new[$key];
					}

					$new = $value;
				}
			}

			return $photo_files;
		};

		return $function($_FILES);
	}

	// Create new (empty) image file
	function createNewImageFile() {

		// Find last photo file name used
		$lastPhotoFound = FALSE;
		$dir = dir(IMG_FOLDER);
		if(!$dir) {
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Failed to read image directory'));
		}
		while(($dirEntry = $dir->read()) !== FALSE) {
			if(preg_match('/^photo\d{4}\.jpg$/', $dirEntry) && is_file(IMG_FOLDER . $dirEntry)) {
				if(!$lastPhotoFound || $lastPhotoFound < $dirEntry) {
					$lastPhotoFound = $dirEntry;
				}
			}
		}
		$dir->close();

		// Increase photo number
		if(!$lastPhotoFound) {
			$lastPhotoFound = 'photo0000.jpg';
		}
		$photoNumber = intval(substr($lastPhotoFound, 5, 4)) + 1;
		if($photoNumber > 9999) {
			return FALSE;
		}

		// Create new photo file and return name
		$newPhotoName = IMG_FOLDER . 'photo' . substr('0000' . $photoNumber, -4) . '.jpg';
		if(touch($newPhotoName)) {
			return $newPhotoName;
		}
		return FALSE;
	}

	// Save file
	function saveFile($photo) {

		// Test if name is present
		if(!isset($photo['name'])) {
			return 'A photo failed to upload (no name is present)';
		}

		// Test for presence of all required fields
		if(!(isset($photo['error']) && isset($photo['type']) && isset($photo['tmp_name']) && isset($photo['size']))) {
			return 'Photo named "' . $photo['name'] . '" failed to upload (some data is missing)';
		}

		// Test for max size (MAX_IMAGE_UPLOAD_SIZE)
		if($photo['error'] === UPLOAD_ERR_INI_SIZE || $photo['error'] === UPLOAD_ERR_FORM_SIZE || $photo['size'] > MAX_IMAGE_UPLOAD_SIZE * 1000 * 1000) {
			return 'Photo named "' . $photo['name'] . '" too large (' . MAX_IMAGE_UPLOAD_SIZE . 'M bytes per file is allowed)';
		}

		// Test for valid upload
		if($photo['error'] !== UPLOAD_ERR_OK) {
			return 'Photo named "' . $photo['name'] . '" failed to upload (error ' . $photo['error'] . ')';
		}

		// Test for valid type
		if($photo['type'] !== "image/jpeg") {
			return 'Photo named "' . $photo['name'] . '" has invalid type (received "' . $photo['type'] . '" expected a jpg/jpeg file)';
		}

		// Test if file is really uploaded
		if(!is_uploaded_file($photo['tmp_name'])) {
			return 'Internal error: photo is not uploaded properly.';
		}

		// Get new photo name
		$newPhotoName = createNewImageFile();
		if(!$newPhotoName) {
			return 'Photo named "' . $photo['name'] . '" could not be stored, because no filename could be created.';
		}

		// Process photo
		$processed = processImage($photo['tmp_name'], $newPhotoName);

		if(!$processed) {
			return 'Photo named "' . $photo['name'] . '" could not be processed or copied to its destination location.';
		}

		return TRUE;
	}

	// Main
	try {

		// Initialize
		set_error_handler("errorHandler");

		// Check if photo is/photos are received
		$photos = $_FILES['photo'];
		if(!$photos['name']) {
			exitWithResult(array('resultCode' => ResultConstants::INVALID_INPUT, 'resultMessage' => 'No photos provided'));
		}
		$files = getPhotoFiles();
		if(!$files['photo'] || !is_array($files['photo'])) {
			exitWithResult(array('resultCode' => ResultConstants::INVALID_INPUT, 'resultMessage' => 'No photos provided'));
		}

		// Check if not too many photos are received
		if(count($files) > MAX_IMAGE_UPLOAD_COUNT) {
			exitWithResult(array('resultCode' => ResultConstants::INVALID_INPUT, 'resultMessage' => 'Too many photos (max ' . MAX_IMAGE_UPLOAD_COUNT . ' per upload)'));
		}

		// Save photos
		$errors = [];
		$hasValidImages = FALSE;
		foreach($files['photo'] as $photo) {
			$result = saveFile($photo);
			if($result === TRUE) {
				$hasValidImages = TRUE;
			} else {
				$errors[] = $result;
			}
		}

		// Handle error situation
		if(count($errors) !== 0) {
			if($hasValidImages) {
				exitWithResult(array('resultCode' => ResultConstants::WARN, 'resultMessage' => implode("\n", $errors)));
			} else {
				exitWithResult(array('resultCode' => ResultConstants::INVALID_INPUT, 'resultMessage' => implode("\n", $errors)));
			}
		}

		exitWithResult(array('resultCode' => ResultConstants::OK));
	} catch(Exception $e) {
		exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => $e->getMessage()));
	}
?>
