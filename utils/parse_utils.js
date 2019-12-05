const cheerio = require('cheerio');
var twitter_check = require('twitter-text');

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


function parsePostBody(body, fb_post_id) {
    console.log('parsePostBody', fb_post_id);
    //try {
      if (body.length <= 0) {
        console.log('parsePostBody', fb_post_id, 'body is empty');
        return {};
      }
      var post = {post_id:fb_post_id,img:[],twiter_img:[]};
      const $ = cheerio.load(body);
      var href_obj = $('span.fsm a._5pcq')[0];
      if (!href_obj || !href_obj.attribs) {
        console.log('parsePostBody', fb_post_id, 'href not found!');
        return {};
      }
      var url = href_obj.attribs.href;
      post.url = 'fb.com/'+ cleanUrl(url, true);
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
      return post;
  }

  function breakFBPostOnTweets(post, user_twitter_login) {
    var arr_word = post.text.split(' ');
    console.log('breakFBPostOnTweets', arr_word.length, post);
    post.arr_tweet = [];
    post.prev_tweet_id = '';
    var txt_tweet = '#новини #ДемСокира #D7 #Д7';
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
        txt_tweet = '@'+user_twitter_login;
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


exports.cleanUrl = cleanUrl;
exports.parsePostBody = parsePostBody;
exports.breakFBPostOnTweets = breakFBPostOnTweets;