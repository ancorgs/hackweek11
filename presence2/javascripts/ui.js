function uiAddPeer(name) {
  var content = '<div style="display: none" id="peer-'+name+'" data-name="'+name+'" class="peer">';
  content += '<span class="name">'+name+'</span>';
  content += '<img src="images/user_placeholder.png" /></div>';
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
