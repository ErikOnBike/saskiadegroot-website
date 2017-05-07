<?php defined('C5_EXECUTE') or die("Access Denied."); ?>

</div>

<?php View::element('footer_required'); ?>

<div id="full-image-presenter">
  <a id="full-image-container" class="polaroid" href="javascript:void(0)">
    <img id="full-image-block" src="">
  </a>
</div>
<script>
    // Handle polaroids
    // Add an container (anchor) around all images which are classed 'polaroid'.
    // This container will add styling to the image.
    // Add an click event handler to the container.
    var polaroids = document.querySelectorAll('img.polaroid');
    if(polaroids && polaroids.length) {
      for(var i = 0; i < polaroids.length; i++) {
        var polaroid = polaroids[i];
        var parentNode = polaroid.parentNode;
        if(parentNode) {

          // Create image container
          var imageContainer = document.createElement('a');
          imageContainer.setAttribute('class', polaroid.getAttribute('class'));  // Copy styling and title (used from css)
          imageContainer.setAttribute('title', polaroid.getAttribute('title'));
          imageContainer.setAttribute('style', polaroid.getAttribute('style'));
          imageContainer.setAttribute('href', 'javascript:void(0)');  // Add click handler (dummy href)
          polaroid.setAttribute('style', 'width: 100%');  // Make image fill new anchor parent

          // Replace existing image with container and then add image to container
          parentNode.replaceChild(imageContainer, polaroid);
          imageContainer.appendChild(polaroid);

          // Add click event handler
          imageContainer.onclick = showImageFullScreen;
        }
      }
    }

    // Get elemts for showing full (polaroid) image
    var fullImagePresenter = document.getElementById('full-image-presenter');
    var fullImageContainer = document.getElementById('full-image-container');
    var fullImageBlock = document.getElementById('full-image-block');

    // Add event handler when full (polaroid) image is clicked
    fullImageContainer.onclick = hideImageFullScreen;

    // Show full (polaroid) image
    // This function is an event handler for clicking on a polaroid image.
    // Find the exact location where the image is shown and create an exact copy
    // on top of it.
    // Animate this copied image to fill the window available (it will move into a
    // centered position inside the window).
    //
    function showImageFullScreen(e) {

      // Prevent other behaviour from click
      e.preventDefault();

      // Get image and container
      var imageContainer = this;
      var image = imageContainer.firstChild;

      // Retrieve URL for a large image (smaller images will be shown on media with less resolution)
      var url = image.currentSrc;
      if(url) {
        url = url.replace(/\/thumbnails\/(small|medium)\//, '/thumbnails/large/');  // Always use large image (if thumbnails are used)
      }
      fullImageBlock.src = url;

      // Copy title from selected image to be used as title beneath full image
      fullImageContainer.setAttribute('title', imageContainer.getAttribute('title'));

      // Clear all applied (inline) styles from full image
      fullImageContainer.setAttribute('style', '');

      // Find actual size of image on screen and adjust full image based on it (to become exact copy)
      var imageContainerClientRect = imageContainer.getBoundingClientRect();
      fullImageContainer.style.top = imageContainerClientRect.top + 'px';
      fullImageContainer.style.left = imageContainerClientRect.left + 'px';
      fullImageContainer.style.width = imageContainerClientRect.width + 'px';
      // Height is not set, because image is kept in ratio (ie height will be calculated automatically)

      // If all went well, show image
      fullImagePresenter.style.display = 'block';

      // Calculate scale for final full image (filling window for 90%)
      var pageWidth = document.documentElement.clientWidth;
      var pageHeight = document.documentElement.clientHeight;
      var scale = Math.min(pageWidth * 0.9 / imageContainerClientRect.width, pageHeight * 0.9 / imageContainerClientRect.height);

      // Calculate final full image size
      var finalWidth = imageContainerClientRect.width * scale;
      var finalHeight = imageContainerClientRect.height * scale;
      var finalClientRect = { // This is not a full client rect!
        width: finalWidth,
        height: finalHeight,
        left: (pageWidth - finalWidth) / 2,
        top: (pageHeight - finalHeight) / 2
      };

      // Calculate some CSS dimensions
      var imageContainerStyle = window.getComputedStyle(imageContainer);
      var fontSize = parseInt(imageContainerStyle.fontSize);
      var finalFontSize = fontSize * scale;
      var paddingSize = parseInt(imageContainerStyle.paddingLeft);
      var finalPaddingSize = paddingSize * scale;

      // Animate image
      var startTime = null;
      var ANIMATION_TIME = 500;
      function animate(timestamp) {
        if(!startTime) {
          startTime = timestamp;
        }
        var progress = timestamp - startTime;
        var growPercentage = Math.min(1, progress / ANIMATION_TIME);

        // Update container size
        fullImageContainer.style.top = (imageContainerClientRect.top + (finalClientRect.top - imageContainerClientRect.top) * growPercentage) + 'px';
        fullImageContainer.style.left = (imageContainerClientRect.left + (finalClientRect.left - imageContainerClientRect.left) * growPercentage) + 'px';
        fullImageContainer.style.width = (imageContainerClientRect.width + (finalClientRect.width - imageContainerClientRect.width) * growPercentage) + 'px';
        // Height is not set, because image is kept in ratio (ie height will be calculated automatically)

        // Apply styling to the container
        fullImageContainer.style.fontSize = (fontSize + (finalFontSize - fontSize) * growPercentage) + 'px';
        fullImageContainer.style.padding = (paddingSize + (finalPaddingSize - paddingSize) * growPercentage) + 'px';

        // Darken screen background (behind full image)
        fullImagePresenter.style.backgroundColor = 'rgba(80, 80, 80, ' + (0.6 * growPercentage) + ')';

        // Loop animation
        if(progress < ANIMATION_TIME) {
          window.requestAnimationFrame(animate);
        }
      }
      window.requestAnimationFrame(animate);

      // Prevent anchor from assuming default action
      return false;
    }
    function hideImageFullScreen(e) {
      e.preventDefault();

      // Animate image
      var startTime = null;
      var ANIMATION_TIME = 500;
      function animate(timestamp) {
        if(!startTime) {
          startTime = timestamp;
        }
        var progress = timestamp - startTime;
        var growPercentage = Math.min(1, progress / ANIMATION_TIME);

        // Make full image more transparent and lighten background again
        fullImageContainer.style.opacity = 1.0 - 1.0 * growPercentage;
        fullImagePresenter.style.backgroundColor = 'rgba(80, 80, 80, ' + (0.6 - 0.6 * growPercentage) + ')';

        // Loop animation (if done looping, hide image presenter)
        if(progress < ANIMATION_TIME) {
          window.requestAnimationFrame(animate);
        } else {
          fullImagePresenter.style.display = 'none';
        }
      }
      window.requestAnimationFrame(animate);
      return false;
    }
</script>
</body>
</html>
