function uiAddPeer(name) {
  var content = '<div style="display: none" id="peer-'+name+'" data-name="'+name+'" class="peer">';
  content += '<span class="name">'+name+'</span>';
  content += '<img src="images/user_placeholder.png" />';
  content += '<video style="display: none"></video></div>';
  $('#peers').append(content);
  $('#peer-'+name).fadeIn();
  $('#peer-'+name).click(function() {
    sendData('videoCall', name);
    openVideoChannel();
  });
}

function uiRemovePeer(name) {
  $('#peer-'+name).fadeOut(function () { $(this).remove });
}

function uiUpdatePeer(content) {
  var name = content["name"];
  var img = content["img"];
  if (img) {
    $('#peer-'+name+' img').attr('src', img);
  }
}

function uiLocalVideo(stream) {
  $("#video-off").show();
  $('#local video').show();
  $('#local canvas').hide();
}

function uiStopVideo() {
  $("#video-off").hide();
  $('#local video').hide();
  $('#local canvas').show();
  $('#peers .peer video').hide();
  $('#peers .peer img').show();
}

function uiPeerVideo(name, stream) {
  var id = '#peer-'+name;
  attachMediaStream($(id+' video').get(0), stream);
  $(id+' video').show();
  $(id+' img').hide();
}

function uiStopPeerVideo(name) {
  var id = '#peer-'+name;
  $(id+' video').hide();
  $(id+' img').show();
}

function uiAskForCamera(enabled) {
  if (enabled) {
    $.blockUI({
      message: '<div><img src="images/up_arrow.png"/></div>',
      css: {
        border: 'none',
        padding: '15px',
        backgroundColor: 'transparent',
        color: '#aaa',
        top: '10px',
        left: (navigator.mozGetUserMedia ? '-100px' : '300px')
      } });
  } else {
    $.unblockUI();
  }
}
