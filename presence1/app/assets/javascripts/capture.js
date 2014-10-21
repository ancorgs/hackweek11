function w() {
  return 200;
}

function h() {
  return $('#video').attr('height');
}

function init_video() {
  var video = $('#video');
  var video_tag = video[0];
  var studio = $('#studio');
  video.attr('width', window.w());
  studio.attr('width', window.w());
  video.data('resized', false);
  video.data('streaming', false);

  navigator.getMedia = ( navigator.getUserMedia || 
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia);

  navigator.getMedia(
    { 
      video: true, 
      audio: false 
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
    // in Firefox :-/
    window.setTimeout(
        function() {
          var height = video_tag.videoHeight / (video_tag.videoWidth/window.w());
          video.attr('height', height);
          studio.attr('height', height);
          video.data('resized', true);
        }, 2000);
  }, false);
}

function takePicture() {
  var studio = $('#studio')[0];
  var video = $('#video')[0];
  var width = window.w();
  var height = window.h();
  var context = studio.getContext('2d');

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
}

function sendStream(timeout) {
  if ($('#video').data('streaming')) {
    // Are we ready?
    if ($('#video').data('resized')) {
      takePicture();
      updateUser();
      window.setTimeout(function() {sendStream(timeout)}, timeout);
    } else {
      // Give another second to the initialization process
      window.setTimeout(function() {sendStream(timeout)}, 1000);
    }
  }
}

function updateUser() {
  $.ajax({
    url: window.location + "/user",
    dataType: "json",
    type: "PATCH",
    data: {
      user: {
        last_pic: $('#studio')[0].toDataURL('image/png'),
        pic_height: window.h()
      }
    }
  });
}

function startSending(timeout) {
  $('#video').data('streaming', true);
  sendStream(timeout);
}

function stopSending() {
  $('#video').data('streaming', false);
}
