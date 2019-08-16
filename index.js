var Twitter = require('twitter');
var fs = require('fs');
var request = require('request');
var md5 = require('md5');
const cheerio = require('cheerio')
const instagram_save = require('instagram-save');
var twitter_check = require('twitter-text')

var client = new Twitter({
  consumer_key: 'Bj1BSuh5KzuOO4KlItxZ862We',
  consumer_secret: '41Og2NHY93hdJWrgvJAe1qA1ip7WAwJFCj2M1EFVjzwQSzlvHf',
  access_token_key: '992730495736799232-9uMkWEaeRrHKhXhW3EjMppKOu0zsiXn',
  access_token_secret: 'kf2E6Ljbl4dN1UtX7cLEZZAxkQgKIpAjPM3kIVWHvbmme'
});

const PATH_TO_LOG_FOLDER = '../DemOrdaTwitterBotParams/log/';
const PATH_TO_PARAM_FILE = '../DemOrdaTwitterBotParams/params.json';
const PATH_TO_IMG_FOLDER = '../DemOrdaTwitterBotParams/img/';

const USER_FB_PAGE_CODE = 'sokyra.party';
const USER_TWITTER_LOGIN = 'sokyra_party';
var fb_page_scan_idx = 0;
const FB_PAGE_TO_SCAN = ['https://m.facebook.com/pg/'+USER_FB_PAGE_CODE+'/posts/?t=', 'https://www.facebook.com/pg/'+USER_FB_PAGE_CODE+'/posts/?t='];


var bot_params = JSON.parse(fs.readFileSync(PATH_TO_PARAM_FILE, "utf8"));
var tweet_id = '';
var idx = 0;
var arr_fb_lnk = [];
var arr_objects_to_post = [];
var max_scan_count = -1;
var write_log = true;

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
function scanFB() {
  console.log('scanFB');
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
  request({url: FB_PAGE_TO_SCAN[fb_page_scan_idx]  + time(),
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
      fs.writeFile(PATH_TO_LOG_FOLDER + 'list.html', /*JSON.stringify(response) + "\n\n\n\n\n" + */body, function(err) {
        if(err) {
            return console.log(err);
        }
      });
    }
    
    //return;
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
    arr_fb_lnk.sort(sortNumber);
    console.log(arr_fb_lnk);
    //return;
    //if (arr_fb_lnk.length > 0) {
      scanFBPost();
    //}
    //var $ = cheerio.load(body);
    //var arr_lnk = $()
  });
  
  storeParams();
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
  /*if ((fb_post_id === 125896374935752) || (fb_post_id === 431131864018765) || (fb_post_id === 431493690649249)) {
    ++max_scan_count;
    scanFBPost();
    return;
  }*/
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

function cleanUrl(url, clean_site) {
  if (url.indexOf('?') !== -1) {
    url = url.substr(0, url.indexOf('?'));
  }
  if (url.indexOf('://') !== -1) {
    url = url.substr(url.indexOf('://') + 3);
  }
  
  if (clean_site && (url.indexOf('/') !== -1)) {
    url = url.substr(url.indexOf('/') + 1);
  }
  
  return url;
}

function parsePostType(post, $) {
  console.log('parsePostType');
  if (post.url.indexOf('/events/') != -1) {
    post.type = 'event';
    return;
  }
  if (post.url.indexOf('/videos/') != -1) {
    post.type = 'video';
    return;
  }
  if (post.url.indexOf('/photos/') != -1) {
    post.type = 'photo';
    return;
  }
  
  post.type = 'post';
  
  var arr = $('div.clearfix span.fwn span.fcg a');
  var last_url = $(arr[arr.length - 1]).attr('href');
  //console.log('parsePostType', last_url, arr);
  if (last_url.toLowerCase().indexOf('/'+USER_FB_PAGE_CODE+'/') === -1) {
    post.type = 'share';
  }
}

function parsePostImgs(post, $, body) {
  console.log('parsePostImgs');
  var arr = $('div.fbStoryAttachmentImage img.scaledImageFitWidth');
  //console.log('parsePostImgs', arr.length, arr);
  var Ln = arr.length;
  if (Ln > 0) {
    for(var i = 0; i < Ln; ++i) {
      post.img.push(arr[i].attribs.src);//.replace(/&amp;/g, '&'));
    }
  } else {  
    var idx1 = body.indexOf('<meta property="og:image" content="');
    if (idx1 === -1) {
      return;
    }
    idx1 += 35;
    var idx2 = body.indexOf('"', idx1);
    var src = body.substr(idx1, idx2 - idx1).replace(/&amp;/g, '&');
    if (post.img.indexOf(src) === -1) {
      post.img.push(src);
    }
  }
}

function parseEvent(post, $) {
  console.log('parseEvent');
  var htm_title = $('div._fwx a').html();
  if (!htm_title) {
    htm_title = $('div._6m6 a').html();
  }
  post.title = $("<textarea/>").html(htm_title).text();
  console.log('title', post.title);
  var htm_date = $('div._fwr span').attr('title');
  if (!htm_date) {
    htm_date = $('div._6lz div').html();
  }
  post.dt_str = $("<textarea/>").html(htm_date).text();
  console.log('date', post.dt_str);
  post.time_str = $('div._fwy span:last-child').html();
  console.log('time', post.time_str);
  if (!post.time_str) {
    post.time_str = '';
  }
  var arr = $('div._fwy div.fsm span');
  //console.log('arr', arr);
  if (!arr || !(arr.length > 0)) {
    htm_addr = $('div._6m7 div').text();
  } else {
    htm_addr = $(arr[arr.length - 1]).html();
  }
  post.addr = $("<textarea/>").html(htm_addr).text();
  console.log('addr', post.addr);
  post.text = 'додає подію ' + post.title + '\n' + 'Коли: ' + post.dt_str + ' ' + post.time_str + '\nДе: ' + post.addr;
}

function parseTitle(post, $) {
  console.log('parseTitle');
  post.text = ($("<textarea/>").html($('div.clearfix._42ef span.fwn span.fcg').text()).text() + ' ' + post.text).trim();
}

function parsePost(post, $) {
  console.log('parsePoste');
  post.text = $("<textarea/>").html($('div.userContent').html()).text();
}

function parseShare(post, $) {
  console.log('parseShare');
  var html = $('div.clearfix.mts div.mtm').html();
  if (html) {
    post.text = $("<textarea/>").html(html).text();
  }
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
  //try {
    if (body.length <= 0) {
      console.log('parsePostBody', fb_post_id, 'body is empty');
      return;
    }
    var post = {post_id:fb_post_id,img:[],twiter_img:[]};
    const $ = cheerio.load(body);
    var href_obj = $('span.fsm a._5pcq')[0];
    if (!href_obj || !href_obj.attribs) {
      console.log('parsePostBody', fb_post_id, 'href not found!');
      return;
    }
    var url = href_obj.attribs.href;
    post.url = 'fb.com/'+cleanUrl(url, true);
    post.time = $('span.fsm a._5pcq abbr').attr('data-utime') * 1;
    parsePostType(post, $);
    parsePostImgs(post, $, body);
    switch(post.type) {
      case 'event':
        parseEvent(post, $);
        break;
      case 'share':
        parseShare(post, $);
        //break; this is fine
      default:
        parsePost(post, $);
        if (post.type !== 'post') {
          parseTitle(post, $);
        }
        break;
    }
    addFbPostToQueue(post);
    /*console.log('parsePostBody', post);
    if (checkDuplicated(post)) {
      arr_objects_to_post.push(post);
    }*/
  /*} catch (err) {
    console.log(post);
    console.log(err.message);
    console.trace();
    return;
  }*/
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

function breakFBPostOnTweets(post) {
  var arr_word = post.text.split(' ');
  console.log('breakFBPostOnTweets', arr_word.length, post);
  post.arr_tweet = [];
  post.prev_tweet_id = '';
  var txt_tweet = '#новини #ДемСокира';
  for (var i = 0, Ln = arr_word.length; i < Ln; ++i) {
    var word = arr_word[i].replace(/\r?\n|\r/g, "").trim();
    if (word.length === 0) {
      continue;
    }
    var check_text = txt_tweet + ' ' + word;
    if ((post.arr_tweet.length === 0) && current_fb_post.url) {
      check_text += ' ' + current_fb_post.url;
    }
    var twt_res = twitter_check.parseTweet(check_text);
    if (!twt_res.valid) {
      if ((post.arr_tweet.length === 0) && current_fb_post.url) {
        txt_tweet += ' ' + current_fb_post.url;
      }
      post.arr_tweet.push(txt_tweet);
      txt_tweet = '@'+USER_TWITTER_LOGIN;
    }
    txt_tweet += ' ' + word;
  }
  if (txt_tweet.length > 0) {
    if (post.arr_tweet.length === 0) {
      txt_tweet += ' ' + current_fb_post.url;
    }
    post.arr_tweet.push(txt_tweet);
  }
  console.log('breakFBPostOnTweets', post.arr_tweet);
}

function postCurrentFbToTweet() {
  if (!current_fb_post || !current_fb_post.arr_tweet) {
    console.log('postCurrentFbToTweet', current_fb_post);
  }
  if (!current_fb_post.arr_tweet) {
    breakFBPostOnTweets(current_fb_post);
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
  //return ;
  var txt = str;//(reply_to != '' ? '@'+USER_TWITTER_LOGIN+' ' : '') + str;
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
  //bot_params.last_instr_post = '';
/*if (!bot_params.last_instr_post) {
  //bot_params.last_instr_post = 'BpW6-Jpgzr8';
}*/

  
request({url: 'https://www.instagram.com/demsokyra.party/',
  //encoding: 'binary',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0'
    //,'Cookie':'_ouid=55b2824040064c99; country=ua; _ga=GA1.2.1293143853.1529357309; _gid=GA1.2.32282381.1529357309; __atuvc=4%7C25; ca=1; tz=-180; lang=uk; _gat=1; __atuvs=5b296655307241af000'
  }
  }, function (error, response, body) {
    if (error) {
      console.log('error:', error); // Print the error if one occurred
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

//postTweet('test tweet #');