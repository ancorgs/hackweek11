function initPhoto(width) {
  var video = $('#local video');
  var video_tag = video[0];
  var canvas = $('#local canvas');
  video.attr('width', width);
  canvas.attr('width', width);
  video.data('resized', false);

  uiAskForCamera(true);
  getUserMedia(
    { 
      video: {"mandatory": {"maxHeight": "240", "maxWidth": "320"}, "optional": []},
      audio: true,
      data: false
    },
    function(stream) {
      mediaStream = stream;
      if (navigator.mozGetUserMedia) {
        video_tag.mozSrcObject = stream;
      } else {
        var vendorURL = window.URL || window.webkitURL;
        video_tag.src = vendorURL ? vendorURL.createObjectURL(stream) : stream;
      }
      video_tag.play();
      uiAskForCamera(false);
    },
    function(err) {
      console.log("An error occured! " + err);
      uiAskForCamera(false);
    }
  );

  video_tag.addEventListener('canplay', function(ev){
    // At some point, after some completely unrelated change,
    // I had to add a timeout to avoid videoWidth being 0
    // in Firefox (known bug, apparently) :-/
    var ms = 1;
    if (/firefox/i.test(navigator.userAgent))
      ms = 2000;
    window.setTimeout(
        function() {
          var height = video_tag.videoHeight / (video_tag.videoWidth/width);
          video.attr('height', height);
          canvas.attr('height', height);
          video.data('resized', true);
        }, ms);
  }, false);
}

function takePicture() {
  var canvas = $('#local canvas')[0];
  var video = $('#local video')[0];
  var width = $('#local video').attr('width');
  var height = $('#local video').attr('height');
  var context = canvas.getContext('2d');

  context.drawImage(video, 0, 0, width, height);
  var imgData = context.getImageData(0, 0, width, height);
  var pixels  = imgData.data;

  for (var i = 0, n = pixels.length; i < n; i += 4) {
    var grayscale = pixels[i] * .3 + pixels[i+1] * .59 + pixels[i+2] * .11;
    pixels[i  ] = grayscale;        // red
    pixels[i+1] = grayscale;        // green
    pixels[i+2] = grayscale;        // blue
    //pixels[i+3]              is alpha
  }
  //redraw the image in black & white
  context.putImageData(imgData, 0, 0);
  if ($('#local img').is(":visible")) {
    $('#local img').hide();
    $('#local canvas').show();
  }
}

function takePictures(timeout) {
  // Are we ready?
  if ($('#local video').data('resized')) {
    takePicture();
    sendData(
      'updateUser',
      {
        img: $('#local canvas')[0].toDataURL('image/jpeg',0.4),
        name: username
      });
    window.setTimeout(function() {takePictures(timeout)}, timeout);
  } else {
    // Give another second to the initialization process
    window.setTimeout(function() {takePictures(timeout)}, 1000);
  }
}
