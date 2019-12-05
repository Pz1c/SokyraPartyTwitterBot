const {google} = require('googleapis');
var fs = require('fs');

const PATH_TO_ACCESS_FILE = '../DemOrdaTwitterBotParams/access.json';
var bot_access = JSON.parse(fs.readFileSync(PATH_TO_ACCESS_FILE, "utf8"));

// initialize the Youtube API library
const youtube = google.youtube({
  version: 'v3',
  access_token: bot_access.youtube.access_token
  
});

youtube.playlistItems.list({
    "part": "id,snippet",
    "maxResults": 50,
    "playlistId": "UUmjfQjsQAWGtSYzD7UQbLmg",
    "access_token": bot_access.youtube.access_token
  }).then(function(response) {
              // Handle the results here (response.result has the parsed body).
              console.log("Response", response);
            },
            function(err) { console.error("Execute error", err); });


  //console.log('Status code: ' + res.status);
