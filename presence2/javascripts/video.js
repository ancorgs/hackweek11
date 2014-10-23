var videoHandle = null;
var videoFeeds = [];

function openVideoChannel() {
  if (videoHandle != null)
    return;
  // Create session
  janus.attach(
    {
      plugin: "janus.plugin.videoroom",
      success: function(pluginHandle) {
        videoHandle = pluginHandle;
        videoLog("Plugin for published/master attached. ( id=" + videoHandle.getId() + ")");
        var register = { "request": "join", "room": janusVideoRoom, "ptype": "publisher", "display": username };
        videoHandle.send({"message": register});
      },
      error: function(error) {
        videoLog("  -- Error attaching plugin... " + error);
        alert("Error attaching plugin... " + error);
      },
      consentDialog: function(on) {
        videoLog("Consent dialog should be " + (on ? "on" : "off") + " now");
      },
      onmessage: function(msg, jsep) {
        videoLog(" ::: Got a message (publisher) :::");
        videoLog(JSON.stringify(msg));
        var event = msg["videoroom"];
        videoLog("Event: " + event);
        if(event != undefined && event != null) {
          if(event === "joined") {
            // Publisher/manager created
            var janusID = msg["id"];
            videoLog("Successfully joined room " + msg["room"] + " with ID " + janusID);
            publishOwnVideoFeed();
            // Any new feed to attach to?
            if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
              var list = msg["publishers"];
              videoLog("Got a list of available publishers/Feeds:");
              videoLog(list);
              subscribeVideoFeeds(list);
            }
          } else if(event === "destroyed") {
            // The room has been destroyed
            videoLog("The room has been destroyed!");
            alert(error, function() {
              window.location.reload();
            });
          } else if(event === "event") {
            // Any new feed to attach to?
            if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
              var list = msg["publishers"];
              videoLog("Got a list of available publishers/feeds:");
              videoLog(list);
              subscribeVideoFeeds(list);
            } else if(msg["leaving"] !== undefined && msg["leaving"] !== null) {
              // One of the publishers has gone away?
              var leaving = msg["leaving"];
              videoLog("Publisher left: " + leaving);
              detachVideoRemoteFeed(leaving);
            } else if(msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
              // One of the publishers has unpublished?
              var unpublished = msg["unpublished"];
              videoLog("Publisher left: " + unpublished);
              detachVideoRemoteFeed(unpublished);
            } else if(msg["error"] !== undefined && msg["error"] !== null) {
              alert(msg["error"]);
            }
          }
        }
        if(jsep !== undefined && jsep !== null) {
          videoLog("Handling SDP as well...");
          videoLog(jsep);
          videoHandle.handleRemoteJsep({jsep: jsep});
        }
      },
      onlocalstream: function(stream) {
        videoLog(" ::: Got a local stream :::");
        videoLog(JSON.stringify(stream));
        uiLocalVideo(stream);
      },
      oncleanup: function() {
        videoLog(" ::: Got a cleanup notification: we are unpublished now :::");
        videoHandle = null;
        uiStopVideo();
      }
    });
}

function newRemoteVideoFeed(id, display) {
  // A new feed has been published, create a new plugin handle and attach to it as a listener
  var remoteFeed = null;
  janus.attach(
    {
      plugin: "janus.plugin.videoroom",
      success: function(pluginHandle) {
        remoteFeed = pluginHandle;
        videoLog("Plugin for subscriber attached. ( id=" + videoHandle.getId() + ")");
        // We wait for the plugin to send us an offer
        var listen = { "request": "join", "room": janusVideoRoom, "ptype": "listener", "feed": id };
        remoteFeed.send({"message": listen});
      },
      error: function(error) {
        videoLog("  -- Error attaching plugin... " + error);
        alert("Error attaching plugin... " + error);
      },
      onmessage: function(msg, jsep) {
        videoLog(" ::: Got a message (listener) :::");
        videoLog(JSON.stringify(msg));
        var event = msg["videoroom"];
        videoLog("Event: " + event);
        if(event != undefined && event != null) {
          if(event === "attached") {
            // Subscriber created and attached
            for(var i=1;i<10;i++) {
              if(videoFeeds[i] === undefined || videoFeeds[i] === null) {
                videoFeeds[i] = remoteFeed;
                remoteFeed.rfindex = i;
                break;
              }
            }
            remoteFeed.rfid = msg["id"];
            remoteFeed.rfdisplay = msg["display"];
            videoLog("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
          } else {
            // What has just happened?
          }
        }
        if(jsep !== undefined && jsep !== null) {
          videoLog("Handling SDP as well...");
          videoLog(jsep);
          // Answer and attach
          remoteFeed.createAnswer(
            {
              jsep: jsep,
              media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
              success: function(jsep) {
                videoLog("Got SDP!");
                videoLog(jsep);
                var body = { "request": "start", "room": janusVideoRoom };
                remoteFeed.send({"message": body, "jsep": jsep});
              },
              error: function(error) {
                videoLog("WebRTC error:");
                videoLog(error);
                alert("WebRTC error... " + JSON.stringify(error));
              }
            });
        }
      },
      onremotestream: function(stream) {
        videoLog("Remote feed #" + remoteFeed.rfindex);
        uiPeerVideo(remoteFeed.rfdisplay, stream);
      },
      oncleanup: function() {
        videoLog(" ::: Got a cleanup notification (remote feed " + id + ") :::");
        uiStopPeerVideo(remoteFeed.rfdisplay);
      }
    });
}

function subscribeVideoFeeds(list) {
  for(var f in list) {
    var id = list[f]["id"];
    var display = list[f]["display"];
    videoLog("  >> [" + id + "] " + display);
    newRemoteVideoFeed(id, display)
  }
}

function detachVideoRemoteFeed(feedID) {
  var remoteFeed = null;
  for(var i=1; i<10; i++) {
    if(videoFeeds[i] != null && videoFeeds[i] != undefined && videoFeeds[i].rfid == feedID) {
      remoteFeed = videoFeeds[i];
      break;
    }
  }
  if(remoteFeed != null) {
    videoLog("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
    uiStopPeerVideo(remoteFeed.rfdisplay);
    videoFeeds[remoteFeed.rfindex] = null;
    remoteFeed.detach();
  }
}

function publishOwnVideoFeed() {
  // Publish our stream
  videoHandle.createOffer(
    {
      media: { audioRecv: false, videoRecv: false, stream: mediaStream},	// Publishers are sendonly
      success: function(jsep) {
        videoLog("Got publisher SDP!");
        videoLog(jsep);
        var publish = { "request": "configure", "audio": true, "video": true };
        videoHandle.send({"message": publish, "jsep": jsep});
      },
      error: function(error) {
        videoLog("WebRTC error:");
        videoLog(error);
        alert("WebRTC error... " + JSON.stringify(error));
      }
    });
}

function closeVideoChannel() {
  var remoteFeed = null;
  for(var i=1; i<10; i++) {
    if(videoFeeds[i] != null && videoFeeds[i] != undefined) {
      remoteFeed = videoFeeds[i];
      videoFeeds[i] = null;
      remoteFeed.detach();
    }
  }
  videoHandle.detach();
  videoHandle = null;
  uiStopVideo();
}


function videoLog(message) {
  console.log("[VIDEO] " + message);
}
