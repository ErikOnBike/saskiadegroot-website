<?php

	// Define globals
	define('ROOT_FOLDER', '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR);
	define('IMG_FOLDER', ROOT_FOLDER . 'img' . DIRECTORY_SEPARATOR);
	define('MAX_IMAGE_WIDTH', 1280);
	define('MAX_IMAGE_HEIGHT', 960);
	define('MAX_THUMBNAIL_WIDTH', 200);
	define('MAX_THUMBNAIL_HEIGHT', 200);

	// Process image
	function processImage($inputFileName, $outputFileName, $isThumbnail = FALSE, $offsetX = 0, $offsetY = 0, $size = 0) {
		$image = new Imagick($inputFileName);

		$processOkay = $image->valid();
		$processOkay = $processOkay && $image->setSamplingFactors(array('2x2', '1x1', '1x1'));
		$processOkay = $processOkay && $image->stripImage();
		$processOkay = $processOkay && $image->setImageCompressionQuality(90);
		$processOkay = $processOkay && $image->setImageInterlaceScheme(Imagick::INTERLACE_NO);
		$processOkay = $processOkay && rotateImage($image);
		$processOkay = $processOkay && resizeImage($image, $isThumbnail, $offsetX, $offsetY, $size);
		$processOkay = $processOkay && $image->writeImage($outputFileName);

		return $processOkay;
	}
	function rotateImage($image) {

		// Decide how to rotate image to make it correctly oriented
		$rotation = 0;
		switch($image->getImageOrientation()) {
			case Imagick::ORIENTATION_BOTTOMRIGHT:
				$rotation = 180;
			break;
			case Imagick::ORIENTATION_RIGHTTOP:
				$rotation = 90;
			break;
			case Imagick::ORIENTATION_LEFTBOTTOM:
				$rotation = -90;
			break;
		}

		// Only rotate if there is actually a rotation angle
		if($rotation !== 0) {
			return $image->rotateImage("#000", $rotation);
		}
		return TRUE;
	}
	function resizeImage($image, $isThumbnail, $offsetX, $offsetY, $size) {

		// Clip image for thumbnails
		if($isThumbnail) {
			if(!$image->cropImage($size, $size, $offsetX, $offsetY)) {
				return FALSE;
			}
			if(!$image->setImagePage($size, $size, 0, 0)) {
				return FALSE;
			}
		}

		// Decide resize ratio based on current geometry
		$maxWidth = $isThumbnail ? MAX_THUMBNAIL_WIDTH : MAX_IMAGE_WIDTH;
		$maxHeight = $isThumbnail ? MAX_THUMBNAIL_HEIGHT : MAX_IMAGE_HEIGHT;
		$geometry = $image->getImageGeometry();
		$isLandscapeImage = $geometry['width'] > $geometry['height'];
		$ratio = 1;
		if($isLandscapeImage) {
			$ratio = min($maxWidth / $geometry['width'], $maxHeight / $geometry['height']);
		} else {
			$ratio = min($maxHeight / $geometry['width'], $maxWidth / $geometry['height']);
		}

		// Only resize when downscaling (ie do not upscale)
		if($ratio < 1.0) {
			$newWidth = $ratio * $geometry['width'];
			$newHeight = $ratio * $geometry['height'];
			return $image->resizeImage($newWidth, $newHeight, Imagick::FILTER_LANCZOS, 0.95);	// Add slight sharpen
		}
		return TRUE;
	}
?>
