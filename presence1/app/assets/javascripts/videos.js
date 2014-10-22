var janus = null;
var janusMCU = null;
var janusFeeds = [];

function initJanus() {
  // Initialize the library (console debug enabled)
  Janus.init({debug: true, callback: function() {
    // Make sure the browser supports WebRTC
    if(!Janus.isWebrtcSupported()) {
      alert("No WebRTC support... ");
      return;
    }
    alert('wtd');
    janusRoom = parseInt($('#video').data('room'));
  }});
}

function startVideo(url, display) {
  // Create session
  janus = new Janus(
    {
      server: url,
      success: function() {
        // Attach to video MCU test plugin
        janus.attach(
          {
            plugin: "janus.plugin.videoroom",
            success: function(pluginHandle) {
              janusMCU = pluginHandle;
              console.log("Plugin attached! (" + janusMCU.getPlugin() + ", id=" + janusMCU.getId() + ")");
              console.log("  -- This is a publisher/manager");
              var register = { "request": "join", "room": janusRoom, "ptype": "publisher", "display": display };
              janusMCU.send({"message": register});
            },
            error: function(error) {
              console.log("  -- Error attaching plugin... " + error);
              alert("Error attaching plugin... " + error);
            },
            consentDialog: function(on) {
              console.log("Consent dialog should be " + (on ? "on" : "off") + " now");
            },
            onmessage: function(msg, jsep) {
              console.log(" ::: Got a message (publisher) :::");
              console.log(JSON.stringify(msg));
              var event = msg["videoroom"];
              console.log("Event: " + event);
              if(event != undefined && event != null) {
                if(event === "joined") {
                  // Publisher/manager created
                  var janusID = msg["id"];
                  console.log("Successfully joined room " + msg["room"] + " with ID " + janusID);
                  publishOwnFeed();
                  // Any new feed to attach to?
                  if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                    var list = msg["publishers"];
                    console.log("Got a list of available publishers/janusFeeds:");
                    console.log(list);
                    for(var f in list) {
                      var id = list[f]["id"];
                      var display = list[f]["display"];
                      console.log("  >> [" + id + "] " + display);
                      newRemoteFeed(id, display)
                    }
                  }
                } else if(event === "destroyed") {
                  // The room has been destroyed
                  console.log("The room has been destroyed!");
                  alert(error, function() {
                    window.location.reload();
                  });
                } else if(event === "event") {
                  // Any new feed to attach to?
                  if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                    var list = msg["publishers"];
                    console.log("Got a list of available publishers/feeds:");
                    console.log(list);
                    for(var f in list) {
                      var id = list[f]["id"];
                      var display = list[f]["display"];
                      console.log("  >> [" + id + "] " + display);
                      newRemoteFeed(id, display)
                    }
                  } else if(msg["leaving"] !== undefined && msg["leaving"] !== null) {
                    // One of the publishers has gone away?
                    var leaving = msg["leaving"];
                    console.log("Publisher left: " + leaving);
                    detachRemoteFeed(leaving);
                  } else if(msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                    // One of the publishers has unpublished?
                    var unpublished = msg["unpublished"];
                    console.log("Publisher left: " + unpublished);
                    detachRemoteFeed(unpublished);
                  } else if(msg["error"] !== undefined && msg["error"] !== null) {
                    alert(msg["error"]);
                  }
                }
              }
              if(jsep !== undefined && jsep !== null) {
                console.log("Handling SDP as well...");
                console.log(jsep);
                janusMCU.handleRemoteJsep({jsep: jsep});
              }
            },
            onlocalstream: function(stream) {
              console.log(" ::: Got a local stream :::");
              console.log(JSON.stringify(stream));
              $("#video-placeholder").hide();
              $("#video").show();
              $("#join").hide();
              $("#leave").show();
              attachMediaStream($('#video').get(0), stream);
            },
            onremotestream: function(stream) {
              // The publisher stream is sendonly, we don't expect anything here
            },
            oncleanup: function() {
              console.log(" ::: Got a cleanup notification: we are unpublished now :::");
            }
          });
      },
      error: function(error) {
        console.log(error);
        alert(error, function() {
          window.location.reload();
        });
      },
      destroyed: function() {
        window.location.reload();
      }
    });
}

function stopVideo() {
  $("#video-placeholder").show();
  $("#video").hide();
  $("#join").show();
  $("#leave").hide();
  janus.destroy();
}

function newRemoteFeed(id, display) {
  // A new feed has been published, create a new plugin handle and attach to it as a listener
  var remoteFeed = null;
  janus.attach(
    {
      plugin: "janus.plugin.videoroom",
      success: function(pluginHandle) {
        remoteFeed = pluginHandle;
        console.log("Plugin attached! (" + remoteFeed.getPlugin() + ", id=" + remoteFeed.getId() + ")");
        console.log("  -- This is a subscriber");
        // We wait for the plugin to send us an offer
        var listen = { "request": "join", "room": janusRoom, "ptype": "listener", "feed": id };
        remoteFeed.send({"message": listen});
      },
      error: function(error) {
        console.log("  -- Error attaching plugin... " + error);
        alert("Error attaching plugin... " + error);
      },
      onmessage: function(msg, jsep) {
        console.log(" ::: Got a message (listener) :::");
        console.log(JSON.stringify(msg));
        var event = msg["videoroom"];
        console.log("Event: " + event);
        if(event != undefined && event != null) {
          if(event === "attached") {
            // Subscriber created and attached
            for(var i=1;i<6;i++) {
              if(janusFeeds[i] === undefined || janusFeeds[i] === null) {
                janusFeeds[i] = remoteFeed;
                remoteFeed.rfindex = i;
                break;
              }
            }
            remoteFeed.rfid = msg["id"];
            remoteFeed.rfdisplay = msg["display"];
            console.log("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
          } else {
            // What has just happened?
          }
        }
        if(jsep !== undefined && jsep !== null) {
          console.log("Handling SDP as well...");
          console.log(jsep);
          // Answer and attach
          remoteFeed.createAnswer(
            {
              jsep: jsep,
              media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
              success: function(jsep) {
                console.log("Got SDP!");
                console.log(jsep);
                var body = { "request": "start", "room": janusRoom };
                remoteFeed.send({"message": body, "jsep": jsep});
              },
              error: function(error) {
                console.log("WebRTC error:");
                console.log(error);
                alert("WebRTC error... " + JSON.stringify(error));
              }
            });
        }
      },
      onlocalstream: function(stream) {
        // The subscriber stream is recvonly, we don't expect anything here
      },
      onremotestream: function(stream) {
        console.log("Remote feed #" + remoteFeed.rfindex);
        if($('#video-'+remoteFeed.rfindex).length === 0) {
          var content = '<div id="video-'+remoteFeed.rfindex+'" class="video">';
          content += '<span class="name">'+remoteFeed.rfdisplay+'</span>';
          content += '<video autoplay/></div>';
          $('#videos').append(content);
        }
        attachMediaStream($('#video-'+remoteFeed.rfindex+' video').get(0), stream);
      },
      oncleanup: function() {
        console.log(" ::: Got a cleanup notification (remote feed " + id + ") :::");
      }
    });
}

function detachRemoteFeed(feedID) {
  var remoteFeed = null;
  for(var i=1; i<6; i++) {
    if(janusFeeds[i] != null && janusFeeds[i] != undefined && janusFeeds[i].rfid == feedID) {
      remoteFeed = janusFeeds[i];
      break;
    }
  }
  if(remoteFeed != null) {
    console.log("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
    $('#video-'+remoteFeed.rfindex).fadeOut().remove();
    janusFeeds[remoteFeed.rfindex] = null;
    remoteFeed.detach();
  }
}

function publishOwnFeed() {
  // Publish our stream
  janusMCU.createOffer(
    {
      media: { audioRecv: false, videoRecv: false},	// Publishers are sendonly
      success: function(jsep) {
        console.log("Got publisher SDP!");
        console.log(jsep);
        var publish = { "request": "configure", "audio": true, "video": true };
        janusMCU.send({"message": publish, "jsep": jsep});
      },
      error: function(error) {
        console.log("WebRTC error:");
        console.log(error);
        alert("WebRTC error... " + JSON.stringify(error));
      }
    });
}

