function initPhoto(width) {
  $('body').append(
      '<video id="photovideo" style="display:none" width="'+width+'"></video>');

  var video = $('#photovideo');
  var video_tag = video[0];
  var canvas = $('#local canvas');
  canvas.attr('width', width);
  video.data('resized', false);

  getUserMedia(
    { 
      video: true, 
      audio: false,
      data: false
    },
    function(stream) {
      if (navigator.mozGetUserMedia) {
        video_tag.mozSrcObject = stream;
      } else {
        var vendorURL = window.URL || window.webkitURL;
        video_tag.src = vendorURL ? vendorURL.createObjectURL(stream) : stream;
      }
      video_tag.play();
    },
    function(err) {
      console.log("An error occured! " + err);
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
          video_tag.muted = "muted";
          video.attr('height', height);
          canvas.attr('height', height);
          video.data('resized', true);
        }, ms);
  }, false);
}

function takePicture() {
  var canvas = $('#local canvas')[0];
  var video = $('#photovideo')[0];
  var width = $('#photovideo').attr('width');
  var height = $('#photovideo').attr('height');
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
  $('#local img').hide();
  $('#local canvas').show();
}

function takePictures(timeout) {
  // Are we ready?
  if ($('#photovideo').data('resized')) {
    takePicture();
    sendData(
      'updateUser',
      {
        img: $('#local canvas')[0].toDataURL('image/jpeg',0.7),
        name: username
      });
    window.setTimeout(function() {takePictures(timeout)}, timeout);
  } else {
    // Give another second to the initialization process
    window.setTimeout(function() {takePictures(timeout)}, 1000);
  }
}