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
    var fullImagePresenter = document.getElementById('full-image-presenter');
    var fullImageContainer = document.getElementById('full-image-container');
    var fullImageBlock = document.getElementById('full-image-block');
    function showImageFullScreen(e) {
      e.preventDefault();
      var imageContainer = this;  // Anchor actually
      var image = e.target;
      if(image) {
        var url = image.currentSrc;
        if(url) {
          url = url.replace(/\/thumbnails\/(small|medium)\//, '/thumbnails/large/');  // Always use large image (if thumbnails are used)
        }
/*
        var containerStyle = imageContainer.getAttribute('style');
        var width = containerStyle.replace(/^.*(width: +[0-9\.]+(px|em|vw|%)?).*$/, "$1");
        imageContainer.setAttribute('data-width', width);
        imageContainer.setAttribute('style', containerStyle.replace(width, "")); // Remove width
        imageContainer.setAttribute('class', 'polaroid clicked left');
        console.log(width);
*/
        var imagePosition = { offsetTop: imageContainer.offsetTop, offsetLeft: imageContainer.offsetLeft };
console.log(imagePosition);
        var imageParent = imageContainer.offsetParent;
        while(imageParent) {
          imagePosition.offsetTop += imageParent.offsetTop;
          imagePosition.offsetLeft += imageParent.offsetLeft;
          imageParent = imageParent.offsetParent;
        }
        fullImagePresenter.style.top = imagePosition.offsetTop + "px";
        fullImagePresenter.style.left = imagePosition.offsetLeft + "px";
        fullImageContainer.setAttribute('title', imageContainer.getAttribute('title'));
        fullImageBlock.src = url;
        console.log(imagePosition);
      }
      return false;
    }
</script>
</body>
</html>
