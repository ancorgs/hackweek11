function getPics(timeout) {
  updatePics();
  window.setTimeout(function() {getPics(timeout)}, timeout);
}

function updatePics() {
  $.ajax({
    url: window.location,
    dataType: "json",
    data: { newer_than: $('#pics').data('timestamp') },
    type: "GET"
  }).done(function(data) {
    var old_pic_ids = $.makeArray(
      $('#pics .pic').map(function(i,e) { return $(e).data('id') })
    );
    var users = data['users'];

    users.forEach(function(u) {
      var id = u['id'];
      var idx = old_pic_ids.indexOf(id);

      // The pic already exists, update it
      if (idx >= 0) {
        var pic = '#pics #pic-'+id;
        $(pic + ' .name').text(u['name']);
        if (u['last_pic']) {
          $(pic + ' img').attr('src', u['last_pic']);
        }

        old_pic_ids.splice(idx, 1);
      // The pic does not exist, create it
      } else {
        var content = '<div id="pic-'+id+'" data-id="'+id+'" class="pic">';
        content += '<span class="name">'+u['name']+'</span>';
        content += '<img src="'+u['last_pic']+'" /></div>';
        $("#pics").append(content);
      }
    });
    // Remove old elements
    old_pic_ids.forEach(function(id) {
      $('#pics #pic-'+id).fadeOut();
    });
    // Update timestamp
    $('#pics').data('timestamp', data['timestamp']);
  });
}
