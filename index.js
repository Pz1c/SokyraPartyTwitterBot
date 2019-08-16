var Twitter = require('twitter');
var fs = require('fs');
var request = require('request');
var md5 = require('md5');
const cheerio = require('cheerio')
const instagram_save = require('instagram-save');
var twitter_check = require('twitter-text')
var utils = require('./utils/parse_utils.js');

const PATH_TO_LOG_FOLDER = '../DemOrdaTwitterBotParams/log/';
const PATH_TO_ACCESS_FILE = '../DemOrdaTwitterBotParams/access.json';
const PATH_TO_PARAM_FILE = '../DemOrdaTwitterBotParams/params.json';
const PATH_TO_IMG_FOLDER = '../DemOrdaTwitterBotParams/img/';
const USER_FB_PAGE_CODE = 'sokyra.party';
const USER_TWITTER_LOGIN = 'sokyra_party';
const FB_PAGE_TO_SCAN = ['https://m.facebook.com/pg/'+USER_FB_PAGE_CODE+'/posts/?t=', 'https://www.facebook.com/pg/'+USER_FB_PAGE_CODE+'/posts/?t='];

var bot_access = JSON.parse(fs.readFileSync(PATH_TO_ACCESS_FILE, "utf8"));
var bot_params = JSON.parse(fs.readFileSync(PATH_TO_PARAM_FILE, "utf8"));
var fb_page_scan_idx = 0;
//var tweet_id = '';
//var idx = 0;
var arr_fb_lnk = [];
var arr_objects_to_post = [];
//var max_scan_count = -1;
var write_log = true;

var client = new Twitter(bot_access.twitter);

var fb_scan_interval = setInterval(scanFB, 10 * 60 * 1000);
scanFB();

var inst_scan_interval = setInterval(scanInstagram, 21 * 60 * 1000);
setTimeout(scanInstagram, 30000);
//scanInstagram();



function sortNumber(a,b) {
    return a - b;
}

function time() {
  return Math.floor(Date.now() / 1000);
}

var skip_scan_idx = 0;

function scanFbInit() {
  if (arr_fb_lnk.length > 0) {
    if (++skip_scan_idx >= 3) {
      console.log('prev scan still working 30 min, clean array');
      arr_fb_lnk = [];
    } else {
      console.log('prev scan still working');
      return;
    }
  }
  skip_scan_idx = 0;
  if (++fb_page_scan_idx >= FB_PAGE_TO_SCAN.length) {
    fb_page_scan_idx = 0;
  }
}

function scanFbSearchFbid(body) {
  var idx1 = 0, idx2;
  while((idx1 = body.indexOf('fbid=', idx1)) != -1) {
    idx1 += 5;
    idx2 = body.indexOf('&', idx1);
    var lnk_id = body.substr(idx1, idx2 - idx1) * 1;
    idx1 = idx2;
    if (isNaN(lnk_id)) {
      continue;
    }
    //arr_lnk.push(lnk);
    console.log('scanFB', 'search1', lnk_id);
    if ((bot_params.fb_ids.indexOf(lnk_id) === -1) && (arr_fb_lnk.indexOf(lnk_id) === -1)) {
      arr_fb_lnk.push(lnk_id);
      console.log('scanFB', 'search1', 'added');
    } else {
      console.log('scanFB', 'search1', 'skipped');
    }
  }
}

function scanFbSearchFtent(body) {
  var idx1 = 0, idx2;
  while((idx1 = body.indexOf('ft_ent_identifier" value="', idx1)) != -1) {
    idx1 += 26;
    idx2 = body.indexOf('"', idx1);
    var lnk_id = body.substr(idx1, idx2 - idx1) * 1;
    idx1 = idx2;
    if (isNaN(lnk_id)) {
      continue;
    }
    //arr_lnk.push(lnk);
    console.log('scanFB', 'search2', lnk_id);
    if ((bot_params.fb_ids.indexOf(lnk_id) === -1) && (arr_fb_lnk.indexOf(lnk_id) === -1)) {
      arr_fb_lnk.push(lnk_id);
      console.log('scanFB', 'search2', 'added');
    } else {
      console.log('scanFB', 'search2', 'skipped');
    }
  }
}

function scanFB() {
  console.log('scanFB');
  scanFbInit();

  request({url: FB_PAGE_TO_SCAN[fb_page_scan_idx]  + time(),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0'
  },
  proxy: 'http://localhost:4128'
  }, function (error, response, body) {
    if (error) {
      console.log('error:', error); // Print the error if one occurred
      return;
    }
    console.log('statusCode:', response && response.statusCode, body.length); // Print the response status code if a response was received
    if (write_log) {
      fs.writeFile(PATH_TO_LOG_FOLDER + 'list.html', /*JSON.stringify(response) + "\n\n\n\n\n" + */body, function(err) {
        if(err) {
            return console.log(err);
        }
      });
    }
    
    scanFbSearchFbid(body);
    scanFbSearchFtent(body);
    
    arr_fb_lnk.sort(sortNumber);
    console.log(arr_fb_lnk);
    
    scanFBPost();

    storeParams();
  });
  
  
}

function scanFBPost() {
  if ((arr_fb_lnk.length === 0)) {// || ((max_scan_count === -999) || (--max_scan_count < 0))) {
    if (arr_objects_to_post.length > 0) {
      arr_objects_to_post.sort(sortFbPost);
      console.log(arr_objects_to_post);
      postFBtoTwitter();
    }
    return;
  }
  var fb_post_id = arr_fb_lnk.shift();
  
  console.log('scanFBPost', fb_post_id);
  request({url: 'https://www.facebook.com/'+USER_FB_PAGE_CODE+'/posts/' + fb_post_id + '?_fb_noscript=1',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0'
  }
  }, function (error, response, body) {
    if (error) {
      console.log('error:', error); // Print the error if one occurred
      return;
    }
    console.log('statusCode:', response && response.statusCode, body.length); // Print the response status code if a response was received
    
    var idx1 = 0, idx2;
    if (write_log) {
      fs.writeFile(PATH_TO_LOG_FOLDER + 'post_'+fb_post_id+'.html', body, function(err) {
        if(err) {
            return console.log(err);
        }
      });
    }
    if (response.statusCode === 200) {
      parsePostBody(body, fb_post_id);
    } else if (fb_post_id) {
      bot_params.fb_ids.push(fb_post_id);
    }
    storeParams();
    scanFBPost();
  });
}

function checkDuplicated(post) {
  var str = post.text;
  for(var i =0, Ln = post.img.length; i < Ln; ++i) {
    str += post.img[i];
  }
  post.hash = md5(str);
  
  if (bot_params.fb_hash.indexOf(post.hash) != -1) {
    if (post.post_id) {
      bot_params.fb_ids.push(post.post_id);
    }
    return false;
  }
  
  for (var i = 0, Ln = arr_objects_to_post.length; i < Ln; ++i) {
    if (arr_objects_to_post[i].hash === post.hash) {
      return false;
    }
  }
  
  return true;
}

function parsePostBody(body, fb_post_id) {
  console.log('parsePostBody', fb_post_id);
  if (body.length <= 0) {
    console.log('parsePostBody', fb_post_id, 'body is empty');
    return;
  }
  var post = utils.parsePostBody(body, fb_post_id);
  addFbPostToQueue(post);
}

function addFbPostToQueue(post) {
  console.log('addFbPostToQueue', post);
  if (checkDuplicated(post)) {
    arr_objects_to_post.push(post);
    console.log('addFbPostToQueue', 'added');
  } else {
    console.log('addFbPostToQueue', 'duplicate found');
  }
}

var current_fb_post;

function sortFbPost(a, b) {
  return a.time - b.time;
}

function postCurrentFBpost() {
  if (current_fb_post.img.length > 0) {
    postFBImage();
  } else {
    postFbToTweet();
  }
}

function postFBtoTwitter() {
  if (arr_objects_to_post.length === 0) {
    return;
  }
  
  current_fb_post = arr_objects_to_post.shift();
  current_fb_post.prev_tweet_id = '';
  postCurrentFBpost();
}

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};


function postFBImage() {
  var img_url = current_fb_post.img.shift();
  var img_file = PATH_TO_IMG_FOLDER + 'i_' + current_fb_post.post_id + '_' + md5(img_url) + '.jpg';
  download(img_url, img_file, function () {
      var data = fs.readFileSync(img_file);
      //data = Buffer.from(data).toString('base64');

      // Make post request on media endpoint. Pass file data as media parameter
      client.post('media/upload', {media: data}, function(error, media, response) {
        if (!error) {
          // If successful, a media object will be returned.
          console.log('postFBImage', 'after img upload', media);
          current_fb_post.twiter_img.push(media.media_id_string);
          postCurrentFBpost();
        } else {
          console.log(error);
        }
        //postCurrentFBpost();
      });
    });
}

function postCurrentFbToTweet() {
  if (!current_fb_post || !current_fb_post.arr_tweet) {
    console.log('postCurrentFbToTweet', current_fb_post);
  }
  if (!current_fb_post.arr_tweet) {
    utils.breakFBPostOnTweets(current_fb_post, USER_TWITTER_LOGIN);
  }
  if (current_fb_post.arr_tweet.length === 0) {
    postFBtoTwitter();
    return;
  }
  var str = current_fb_post.arr_tweet.shift();
  var idx = 4;
  var img_ids = [];
  while((current_fb_post.twiter_img.length > 0) && (--idx >= 0)) {
    img_ids.push(current_fb_post.twiter_img.shift());
  }
  var img_ids_str = img_ids.join(',');
  postTweet(str, current_fb_post.prev_tweet_id, img_ids_str);
}

function postFbToTweet() {
  postCurrentFbToTweet();
}

function postTweet(str, reply_to, img_ids) {
  var txt = str;
  var tweet_req = {status: txt, in_reply_to_status_id: reply_to === '' ? null : reply_to, media_ids: img_ids};
  console.log('postTweet', tweet_req);
  client.post('statuses/update', tweet_req,  function(error, tweet, response) {
    if(error) {
      console.log(JSON.stringify(error));
      postFBtoTwitter();
      return;
    }//throw error;
    //console.log(tweet_req, tweet);  // Tweet body.
    //console.log(response);  // Raw response object.
    
    if ((bot_params.fb_ids.indexOf(current_fb_post.post_id) === -1) && current_fb_post.post_id) {
      bot_params.fb_ids.push(current_fb_post.post_id);
    }
    if (bot_params.fb_hash.indexOf(current_fb_post.hash) === -1) {
      bot_params.fb_hash.push(current_fb_post.hash);
      if (current_fb_post.post_id) {
        bot_params.fb_ids.push(current_fb_post.post_id);
      }
    }
    current_fb_post.prev_tweet_id = tweet.id_str;
    postCurrentFbToTweet();
    storeParams();
    /*if (++idx <= 3) {
      postTweet(str + idx);
    }*/
  });
}

function storeParams() {
  fs.writeFile(PATH_TO_PARAM_FILE, JSON.stringify(bot_params), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("storeParams complete");
  }); 
}


var arr_instragram_post = [];
function scanInstagram() {
  request({url: 'https://www.instagram.com/demsokyra.party/',
  //encoding: 'binary',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0'
    //,'Cookie':'_ouid=55b2824040064c99; country=ua; _ga=GA1.2.1293143853.1529357309; _gid=GA1.2.32282381.1529357309; __atuvc=4%7C25; ca=1; tz=-180; lang=uk; _gat=1; __atuvs=5b296655307241af000'
  }
  }, function (error, response, body) {
    if (error) {
      console.log('error:', error); // Print the error if one occurred

      fs.writeFile(PATH_TO_LOG_FOLDER + 'inst_err1.txt', error, function(err) {
        if(err) {
            return console.log(err);
        }
      });
      return;
    }
    
    if (write_log) {
     fs.writeFile(PATH_TO_LOG_FOLDER + 'list_inst.html', body, function(err) {
        if(err) {
            return console.log(err);
        }
      });
    }
    var idx1 = body.indexOf('<script type="text/javascript">window._sharedData = '); 
    if (idx1 === -1) {
      return;
    }
    idx1 += 52;
    var idx2 = body.indexOf(';</script>');
    var inst_json = body.substr(idx1, idx2 - idx1);
    var injs;
    try {
      injs = JSON.parse(inst_json);
    } catch(err) {
      console.log(err.message, inst_json);
      return;
    }
    var arr = injs.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges;
    var new_last_instr_post; 
    for (var i = 0, Ln = arr.length; i < Ln; ++i) {
        var node = arr[i].node;
        if (i === 0) {
          new_last_instr_post = node.shortcode;
        }        
        if (node.shortcode === bot_params.last_instr_post) {
          bot_params.last_instr_post = new_last_instr_post;
          break;
        }
        console.log('parseList', node.shortcode, node.__typename);
        var post_txt = '';
        if (!node || !node.edge_media_to_caption || !node.edge_media_to_caption.edges[0] || !node.edge_media_to_caption.edges[0].node) {
          console.log('node.edge_media_to_caption.edges[0].node undefined');
          post_txt = '#instagram ' + (node.__typename === 'GraphVideo' ? '#video' : '#photo');
        } else {
          post_txt = node.edge_media_to_caption.edges[0].node.text;
        }
        //console.log(node.edge_media_to_caption.edges[0].node.text);
        arr_instragram_post.push({post_short_code:node.shortcode,post_type:node.__typename,post_text:post_txt});
        //break;
    }
    if (new_last_instr_post) {
      bot_params.last_instr_post = new_last_instr_post;
    }
    storeParams();
    copyPostFromInstToTwitter();
  });
}

function copyPostFromInstToTwitter() {
  if (arr_instragram_post.length === 0) {
    if (arr_objects_to_post.length > 0) {
      postFBtoTwitter();
    }
    return;
  }
  var object = arr_instragram_post.shift();
  instagram_save(object.post_short_code, PATH_TO_LOG_FOLDER).then(res => {
          console.log(object.post_short_code, object.post_type, res.file);
          tweetFromInst(object.post_short_code, res.file, object.post_text, object.post_type === 'GraphVideo' ? 'video/mp4' : 'image/jpeg');
        });
}

function tweetFromInst(post_short_code, path_to_video, tweet_text, post_media_type) {
    client.post('media/upload', {
        command: 'INIT',
        total_bytes: require('fs').statSync(path_to_video).size,
        media_type: post_media_type,
    }, (error, data, response) => {
        console.log('tweetFromInst', data);
        if (!data) {
          console.log('tweetFromInst', 'wrong data response');
          copyPostFromInstToTwitter();
          return;
        }
        var media_id_string = data.media_id_string;
        if (error) {
            console.log('tweetFromInst', post_short_code, media_id_string, 'INIT', error);
            copyPostFromInstToTwitter();
            return;
        }

        client.post('media/upload', {
            command: 'APPEND',
            media_id: media_id_string,
            media: require('fs').readFileSync(path_to_video),
            segment_index: 0
        }, (error, data, response) => {
            if (error) {
                console.log('tweetFromInst', post_short_code, 'APPEND', media_id_string, error);
                copyPostFromInstToTwitter();
                return;
            }

            client.post('media/upload', {
                command: 'FINALIZE',
                media_id: media_id_string
            }, (error, data, response) => {
                if (error) {
                    console.log('tweetFromInst', post_short_code, 'FINALIZE', media_id_string, error);
                    copyPostFromInstToTwitter();
                    return;
                }
                
                addFbPostToQueue({post_id:post_short_code,url:'',time:'',text:tweet_text,twiter_img:[media_id_string],img:[],arr_tweet:[]});
                copyPostFromInstToTwitter();
                /*var tweet_req = {
                    status: (tweet_text + ' #новини').substr(0, 220),
                    media_ids: media_id_string
                };
                client.post('statuses/update', tweet_req, function(error, tweet, response) {
                    if (error) {
                        console.log('post video', JSON.stringify(error));
                        //return;
                    }
                    copyPostFromInstToTwitter();
                });*/


            });

        });

    });
}
