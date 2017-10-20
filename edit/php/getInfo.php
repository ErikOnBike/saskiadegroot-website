<?php

	// Define globals
	define('ROOT_FOLDER', '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR);
	define('DATA_FOLDER', ROOT_FOLDER . 'data' . DIRECTORY_SEPARATOR);
	define('IMG_FOLDER', ROOT_FOLDER . 'img' . DIRECTORY_SEPARATOR);

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

	// Function to validate input data
	function isValidData($data) {

		// Data should be object
		if(!($data && is_object($data))) {
			return FALSE;
		}

		// Data should contain only an info field
		if(!isNonEmptyField($data, 'info')) {
			return FALSE;
		}

		// Test for allowed value of info field
		$allowedInfo = [ 'polaroidUrls' ];
		return array_search($data->info, $allowedInfo, TRUE) !== FALSE;
	}
	function isNonEmptyField($obj, $field) {
		return property_exists($obj, $field) && is_string($obj->$field);
	}

	// Handle data
	function handleData($data) {
		if($data->info === 'polaroidUrls') {
			handleGetPolaroidUrls();
		} else {
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Invalid info requested'));
		}
	}
	function handleGetPolaroidUrls() {

		// Read all relevant file names
		$polaroidUrls = [];
		$dir = dir(IMG_FOLDER);
		if(!$dir) {
			exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Failed to read directory'));
		}
		while(($dirEntry = $dir->read()) !== FALSE) {
			if(preg_match('/^photo\d{4}\.jpg$/', $dirEntry) && is_file(IMG_FOLDER . $dirEntry) && filesize(IMG_FOLDER . $dirEntry) > 0) {
				$polaroidUrls[] = '/img/' . $dirEntry;
			}
		}
		$dir->close();

		// Answer result
		exitWithResult(array('resultCode' => ResultConstants::OK, 'urls' => $polaroidUrls));
	}

	// Main
	try {

		// Initialize
		set_error_handler("errorHandler");

		// Read input
		$postData = file_get_contents('php://input');
		if($postData === FALSE) {
			exitWithResult(array('resultCode' => ResultConstants::INVALID_INPUT, 'resultMessage' => 'No input provided'));
		}
		$data = json_decode($postData);

		// Check valid input
		if(!isValidData($data)) {
			exitWithResult(array('resultCode' => ResultConstants::INVALID_INPUT, 'resultMessage' => 'Input is not valid JSON'));
		}

		// Handle data
		handleData($data);

		exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => 'Failed to handle request'));
	} catch(Exception $e) {
		exitWithResult(array('resultCode' => ResultConstants::INTERNAL, 'resultMessage' => $e->getMessage()));
	}
?>
