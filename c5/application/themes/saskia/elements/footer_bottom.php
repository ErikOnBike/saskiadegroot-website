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
    var polaroids = document.querySelectorAll('img.polaroid');
    if(polaroids && polaroids.length) {
      for(var i = 0; i < polaroids.length; i++) {
        var polaroid = polaroids[i];
        var parentNode = polaroid.parentNode;
        if(parentNode) {
          var anchorNode = document.createElement('a');
          anchorNode.setAttribute('class', polaroid.getAttribute('class'));  // Copy styling and title (used from css)
          anchorNode.setAttribute('title', polaroid.getAttribute('title'));
          anchorNode.setAttribute('style', polaroid.getAttribute('style'));
          anchorNode.setAttribute('href', 'javascript:void(0)');  // Add click handler (dummy href)
          anchorNode.onclick = showImageFullScreen;
          polaroid.setAttribute('style', 'width: 100%');  // Make image fill new anchor parent
          parentNode.replaceChild(anchorNode, polaroid);  // Insert new anchor as parent for image
          anchorNode.appendChild(polaroid);
        }
      }
    }

    // Get elemts for showing full (polaroid) image
    var fullImagePresenter = document.getElementById('full-image-presenter');
    var fullImageContainer = document.getElementById('full-image-container');
    var fullImageBlock = document.getElementById('full-image-block');

    // Scale for polaroid is 'stored' in width of image container (see content.less)
    var fullImageScalePercentage = parseInt(window.getComputedStyle(fullImageContainer).width) / 100;

    // Show full (polaroid) image
    // This function is an event handler for clicking on a polaroid image.
    // Since the image has a :hover style, this style is assumed 'active' (ie scale is applied).
    // Find the exact location where the image is shown (in hover-mode) and create an exact match
    // on top of it. Animate this one to fill the space (ie window) available (scroll if necessary).
    //
    function showImageFullScreen(e) {
      e.preventDefault();
      var imageContainer = this;  // Anchor actually
      var image = e.target;       // Real image
      if(image) {

        // Retrieve URL for a large image (smaller images will be shown on media with less resolution)
        var url = image.currentSrc;
        if(url) {
          url = url.replace(/\/thumbnails\/(small|medium)\//, '/thumbnails/large/');  // Always use large image (if thumbnails are used)
        }

        // Start with current relative position and find absolute position
        var imagePosition = { offsetTop: imageContainer.offsetTop, offsetLeft: imageContainer.offsetLeft };
        var imageParent = imageContainer.offsetParent;
        while(imageParent) {
          imagePosition.offsetTop += imageParent.offsetTop;
          imagePosition.offsetLeft += imageParent.offsetLeft;
          imageParent = imageParent.offsetParent;
        }

        // Find actual size and adjust image based on 
        var style = window.getComputedStyle(imageContainer);
        var styleWidth = parseInt(style.width);
        var styleHeight = parseInt(style.height);
        imagePosition.offsetTop -= styleHeight * (fullImageScalePercentage - 1) / 2;
        imagePosition.offsetTop -= window.scrollY;
        imagePosition.offsetLeft -= styleWidth * (fullImageScalePercentage - 1) / 2;
        styleWidth *= fullImageScalePercentage;
        styleHeight *= fullImageScalePercentage;
        fullImageContainer.style.top = imagePosition.offsetTop + "px";
        fullImageContainer.style.left = imagePosition.offsetLeft + "px";
        fullImageContainer.style.width = styleWidth + "px";
        fullImageContainer.style.height = styleHeight + "px";
        fullImageContainer.setAttribute('title', imageContainer.getAttribute('title'));
        fullImageBlock.src = url;

        // If all went well, show image
        fullImagePresenter.style.display = "block";
      }
      return false;
    }
</script>
</body>
</html>
