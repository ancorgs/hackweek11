function uiAddPeer(name) {
  var content = '<div style="display: none" id="peer-'+name+'" data-name="'+name+'" class="peer">';
  content += '<span class="name">'+name+'</span>';
  content += '<img src="images/user_placeholder.png" />';
  content += '<video style="display: none"></video></div>';
  $('#peers').append(content);
  $('#peer-'+name).fadeIn();
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
  $("#video-on").hide();
  $("#video-off").show();
  $('#local video').show();
  $('#local canvas').hide();
}

function uiStopVideo() {
  $("#video-on").show();
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
