const Botkit    = require('botkit');
const request   = require('request');
require('date-utils');

if (!process.env.TOKEN) {
  console.log('Error: Specify TOKEN in environment');
  process.exit(1);
}

if (!process.env.SLACK_TEAM) {
  console.log('Error: Specify SLACK_TEAM in environment');
  process.exit(1);
}

const controller = Botkit.slackbot({
  debug: false,
  retry: 3,
});

controller.spawn({
  token: process.env.TOKEN

}).startRTM( function(err) {
  if (err) {
    throw new Error(err);
  }

});

const hearing_event_all            = ['ambient'];
// const hearing_event_mention        = ['direct_mention', 'mention'];
// const hearing_event_direct_message = ['direct_message'];

controller.hears('', hearing_event_all, function(bot,message) {
  // console.log(bot);
  console.log(message);
  var id = message.client_msg_id;
  var slack_team = process.env.SLACK_TEAM;
  var channel_id = message.channel;
  var event_ts = message.event_ts;
  event_ts = event_ts.replace('.','')
  var url_parameter = `?thread_ts=${message.thread_ts}&cid=${channel_id}`
  var post_link = `https://${slack_team}.slack.com/archives/${channel_id}/p${event_ts}`
  var URL = `https://slack.com/api/conversations.info?token=${process.env.TOKEN}&channel=${channel_id}`
  request(URL, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      let channel_info = JSON.parse(body);
      // console.log(channel_info);
      var channel_name =  channel_info.channel.name;

      if(channel_name.match('^times_.+')) {
        repost_to('#timeline', bot, post_link, message);
      }

      if(channel_name.match('^exceptions$')) {
        sort_exception_into_appropriate_channel(bot, post_link, message)
      }

      if (channel_name.match('^日報_(.*)$') && channel_name.match('_').length === 1/* && username !== 'slackbot'*/) {
        repost_to('#日報_all', bot, post_link, message);
      }

      if (channel_name.match('^日報_(.*)_.+')) {
        matcher = channel_name.match('^日報_(.*)_.+');
        repost_to(`#日報_${matcher[1]}`, bot, post_link, message);
        repost_to('#日報_all', bot, post_link, message);
      }

      const key         = process.env.TRELLO_KEY;
      const token       = process.env.TRELLO_TOKEN;
      const ui_note     = process.env.TRELLO_UI_NOTE;
      const list_new_id = process.env.TRELLO_LIST_NEW_ID;
      const bot_room         = 'ui_notes'
      const key_word_matcher = '^title:.*'
      const title_matcher    = '^title:([^\n]*)'
      const dt               = new Date();
      const posted_at        = '### 投稿日\n'+dt.toFormat("YYYY/MM/DD/ HH24:MI")+'\n';
      const msg_url          = '### Slack URL\nhttps://paiza.slack.com/archives/C8RRSA2CS/p'+message['event_ts']+'\n'
      const msg              = message["text"]
      const trello_body      = '###概要\n'+message["text"].replace( /^title:/g, '')+'\n';
      var img_url            = ''

      var desc = encodeURIComponent(msg+msg_url+posted_at+img_url);
      if (channel_name.match(bot_room)){
        if(msg.match(key_word_matcher)){
          if(message["files"]){
            img_url = '### 画像URL\n' + message["files"][0]["url_private"]+'\n'
          }
          var hashtag   = '#' + dt.toFormat("YYYY年MM月") + '報告分';
          var title     = encodeURIComponent(msg.match(title_matcher)[1] + hashtag);
          var desc      = encodeURIComponent(trello_body+msg_url+posted_at+img_url);
          var url       = `https://trello.com/1/cards?key=${key}&token=${token}&idList=${list_new_id}&name=${title}&desc=${desc}`;
          var webclient = require("request");

          webclient.post({
            url: url,
            headers: {
              "content-type": "application/json"
            }
          }, function (error, response, body){});

          bot.reply(message,"uiチームのタスクに登録されました。随時取り掛かります。" +'\n' + "https://trello.com/b/jrmkblAB/uinotes")
        };
      };
    }
  });
});


function repost_to(channel, bot, post_link, message) {
  console.log(message);
  bot.api.chat.postMessage({
    text: `${post_link}`,
    channel: channel,
    as_user: true,
    unfurl_links: true
  }, function(err, message){
    if(err) { console.log("err: ", err); return; }
  });
}

function sort_exception_into_appropriate_channel(bot, post_link, message) {
  repost_to_target_channel_postfix = 'others'
  if ( message.text.match(/\/manage\//)) {
    repost_to_target_channel_postfix = 'manage'
  } else if ( message.text.match(/\/business\//)) {
    repost_to_target_channel_postfix = 'business'
  } else if ( message.text.match(/\/for_team_manage\//)) {
    repost_to_target_channel_postfix = 'for_team_manage'
  } else if ( message.text.match(/\/works\//)) {
    repost_to_target_channel_postfix = 'works'
  } else if ( message.text.match(/\/cgc\//)) {
    repost_to_target_channel_postfix = 'games'
  } else if ( message.text.match(/\/poh\//)) {
    repost_to_target_channel_postfix = 'games'
  } else if ( message.text.match(/\/codechronicle\//)) {
    repost_to_target_channel_postfix = 'games'
  }
  repost_to(`#exceptions_${repost_to_target_channel_postfix}`, bot, post_link, message);
}

