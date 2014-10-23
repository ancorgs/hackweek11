var dataHandle = null;
var dataFeeds = [];

function openDataChannel(display, callback) {
  // Create session
  janus = new Janus(
    {
      server: janusURL,
      success: function() {
        janus.attach(
          {
            plugin: "janus.plugin.videoroom",
            success: function(pluginHandle) {
              dataHandle = pluginHandle;
              dataLog("Plugin for published/master attached. ( id=" + dataHandle.getId() + ")");
              var register = { "request": "join", "room": janusDataRoom, "ptype": "publisher", "display": display };
              dataHandle.send({"message": register});
            },
            error: function(error) {
              dataLog("  -- Error attaching plugin... " + error);
              alert("Error attaching plugin... " + error);
            },
            consentDialog: function(on) {
              dataLog("Consent dialog should be " + (on ? "on" : "off") + " now");
            },
            onmessage: function(msg, jsep) {
              dataLog(" ::: Got a message (publisher) :::");
              dataLog(JSON.stringify(msg));
              var event = msg["videoroom"];
              dataLog("Event: " + event);
              if(event != undefined && event != null) {
                if(event === "joined") {
                  // Publisher/manager created
                  var janusID = msg["id"];
                  dataLog("Successfully joined room " + msg["room"] + " with ID " + janusID);
                  publishOwnDataFeed();
                  // Any new feed to attach to?
                  if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                    var list = msg["publishers"];
                    dataLog("Got a list of available publishers/Feeds:");
                    dataLog(list);
                    subscribeDataFeeds(list);
                  }
                } else if(event === "destroyed") {
                  // The room has been destroyed
                  dataLog("The room has been destroyed!");
                  alert(error, function() {
                    window.location.reload();
                  });
                } else if(event === "event") {
                  // Any new feed to attach to?
                  if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                    var list = msg["publishers"];
                    dataLog("Got a list of available publishers/feeds:");
                    dataLog(list);
                    subscribeDataFeeds(list);
                  } else if(msg["leaving"] !== undefined && msg["leaving"] !== null) {
                    // One of the publishers has gone away?
                    var leaving = msg["leaving"];
                    dataLog("Publisher left: " + leaving);
                    detachDataRemoteFeed(leaving);
                  } else if(msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                    // One of the publishers has unpublished?
                    var unpublished = msg["unpublished"];
                    dataLog("Publisher left: " + unpublished);
                    detachDataRemoteFeed(unpublished);
                  } else if(msg["error"] !== undefined && msg["error"] !== null) {
                    alert(msg["error"]);
                  }
                }
              }
              if(jsep !== undefined && jsep !== null) {
                dataLog("Handling SDP as well...");
                dataLog(jsep);
                dataHandle.handleRemoteJsep({jsep: jsep});
              }
            },
            ondataopen: function(data) {
              dataLog("The publisher DataChannel is available");
              if (callback)
                callback();
            },
            oncleanup: function() {
              dataLog(" ::: Got a cleanup notification: we are unpublished now :::");
              alert('Data channel disconnected. Panicking', function() {
                window.location.reload();
              });
            }
          });
      },
      error: function(error) {
        dataLog(error);
        alert(error, function() {
          window.location.reload();
        });
      },
      destroyed: function() {
        window.location.reload();
      }
    });
}

function newRemoteDataFeed(id, display) {
  // A new feed has been published, create a new plugin handle and attach to it as a listener
  var remoteFeed = null;
  janus.attach(
    {
      plugin: "janus.plugin.videoroom",
      success: function(pluginHandle) {
        remoteFeed = pluginHandle;
        dataLog("Plugin for subscriber attached. ( id=" + dataHandle.getId() + ")");
        // We wait for the plugin to send us an offer
        var listen = { "request": "join", "room": janusDataRoom, "ptype": "listener", "feed": id };
        remoteFeed.send({"message": listen});
      },
      error: function(error) {
        dataLog("  -- Error attaching plugin... " + error);
        alert("Error attaching plugin... " + error);
      },
      onmessage: function(msg, jsep) {
        dataLog(" ::: Got a message (listener) :::");
        dataLog(JSON.stringify(msg));
        var event = msg["videoroom"];
        dataLog("Event: " + event);
        if(event != undefined && event != null) {
          if(event === "attached") {
            // Subscriber created and attached
            for(var i=1;i<10;i++) {
              if(dataFeeds[i] === undefined || dataFeeds[i] === null) {
                dataFeeds[i] = remoteFeed;
                remoteFeed.rfindex = i;
                break;
              }
            }
            remoteFeed.rfid = msg["id"];
            remoteFeed.rfdisplay = msg["display"];
            dataLog("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
            uiAddPeer(remoteFeed.rfdisplay);
          } else {
            // What has just happened?
          }
        }
        if(jsep !== undefined && jsep !== null) {
          dataLog("Handling SDP as well...");
          dataLog(jsep);
          // Answer and attach
          remoteFeed.createAnswer(
            {
              jsep: jsep,
              media: { audio: false, video: false, data: true },	// Data only
              success: function(jsep) {
                dataLog("Got SDP!");
                dataLog(jsep);
                var body = { "request": "start", "room": janusDataRoom };
                remoteFeed.send({"message": body, "jsep": jsep});
              },
              error: function(error) {
                dataLog("WebRTC error:");
                dataLog(error);
                alert("WebRTC error... " + JSON.stringify(error));
              }
            });
        }
      },
      ondataopen: function(data) {
        dataLog("The subscriber DataChannel is available");
      },
      ondata: function(data) {
        dataLog(" ::: Got info in the data channel (subscriber) :::");
        var msg = JSON.parse(data);
        var type = msg["type"];
        var content = msg["content"];
        dataLog(type);
        if(type === "updateUser") {
          uiUpdatePeer(content);
        } else if (type === "videoCall" && content === username) {
          openVideoChannel();
        } else {
          // Sorry, but I don't understand you
        }
      },
      oncleanup: function() {
        dataLog(" ::: Got a cleanup notification (remote feed " + id + ") :::");
        uiRemovePeer(remoteFeed.rfdisplay);
      }
    });
}

function subscribeDataFeeds(list) {
  for(var f in list) {
    var id = list[f]["id"];
    var display = list[f]["display"];
    dataLog("  >> [" + id + "] " + display);
    newRemoteDataFeed(id, display)
  }
}

function detachDataRemoteFeed(feedID) {
  var remoteFeed = null;
  for(var i=1; i<6; i++) {
    if(dataFeeds[i] != null && dataFeeds[i] != undefined && dataFeeds[i].rfid == feedID) {
      remoteFeed = dataFeeds[i];
      break;
    }
  }
  if(remoteFeed != null) {
    dataLog("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
    uiRemovePeer(remoteFeed.rfdisplay);
    dataFeeds[remoteFeed.rfindex] = null;
    remoteFeed.detach();
  }
}

function publishOwnDataFeed() {
  // Publish our stream
  dataHandle.createOffer(
    {
      media: { audio: false, video: false, data: true},	// Data only
      success: function(jsep) {
        dataLog("Got publisher SDP!");
        dataLog(jsep);
        var publish = { "request": "configure", "audio": true, "video": true };
        dataHandle.send({"message": publish, "jsep": jsep});
      },
      error: function(error) {
        dataLog("WebRTC error:");
        dataLog(error);
        alert("WebRTC error... " + JSON.stringify(error));
      }
    });
}

function dataLog(message) {
  console.log("[DATA] " + message);
}

function sendData(type, content) {
  var text = JSON.stringify({
    type: type,
    content: content
  });
  dataHandle.data({
    text: text,
    error: function(reason) { alert(reason); },
    success: function() { dataLog("Data sent: "+type) }
  });
}
