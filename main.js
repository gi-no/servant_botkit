import { App } from '@slack/bolt';
import http from 'http';

const { request } = http;

if (!process.env.TOKEN || !process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_TEAM ) {
  console.log('Error: Specify TOKEN in environment');
  console.log('or Error: Specify SLACK_SIGNING_SECRET in environment');
  console.log('or Error: Specify SLACK_TEAM in environment');
  process.exit(1);
}

const app = new App({
  token: process.env.TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.message(async ({ message, client }) => {
  console.log(message);
  
  // 自分のメッセージには反応しない
  if (message.subtype === 'bot_message' || message.bot_id) {
    return;
  }

  const slackTeam = process.env.SLACK_TEAM;
  const channelId = message.channel;
  const eventTs = message.ts;
  const formattedTs = eventTs.replace('.', '');
  const postLink = `https://${slackTeam}.slack.com/archives/${channelId}/p${formattedTs}`;

  try {
    // チャンネル情報の取得
    const channelInfo = await client.conversations.info({
      channel: channelId
    });

    const channelName = channelInfo.channel.name;

    // times_チャンネルの処理
    if (channelName.match('^times_.+')) {
      repostTo('#timeline', client, postLink, message);
    }

    // exceptionsチャンネルの処理
    if (channelName.match('^exceptions$')) {
        sortExceptionIntoAppropriateChannel(client, postLink, message);
    }

    // 日報チャンネルの処理
    if (channelName.match('^日報_(.*)$') && (channelName.match(/_/g) || []).length === 1) {
      repostTo('#日報_all', client, postLink, message);
    }
    if (channelName.match('^日報_(.*)_.+')) {
      const matcher = channelName.match('^日報_(.*)_.+');
      repostTo(`#日報_${matcher[1]}`, client, postLink, message);
      repostTo('#日報_all', client, postLink, message);
    }

    // ui_notesチャンネルの処理
    if (channelName.match('ui_notes')) {
      await handleUiNotes(client, message);
    }
  } catch (error) {
    console.error(`Error processing message: ${error}`);
  }
});

// 特定のチャンネルに再投稿する関数
async function repostTo(channel, client, postLink, message) {
  console.log(message);
  try {
    await client.chat.postMessage({
      text: `${postLink}`,
      channel: channel,
      unfurl_links: true
    });
  } catch (error) {
    console.error(`Error reposting message: ${error}`);
  }
}

// exceptionsチャンネルの内容を適切なチャンネルに振り分ける関数
async function sortExceptionIntoAppropriateChannel(client, postLink, message) {
  let repostToTargetChannelPostfix = 'others';
  
  if (message.text.match(/\/manage\//)) {
    repostToTargetChannelPostfix = 'manage';
  } else if (message.text.match(/\/business\//)) {
    repostToTargetChannelPostfix = 'business';
  } else if (message.text.match(/\/for_team_manage\//)) {
    repostToTargetChannelPostfix = 'for_team_manage';
  } else if (message.text.match(/\/works\//)) {
    repostToTargetChannelPostfix = 'works';
  } else if (message.text.match(/\/cgc\//) || message.text.match(/\/poh\//) || message.text.match(/\/codechronicle\//)) {
    repostToTargetChannelPostfix = 'games';
  }
  
  repostTo(`#exceptions_${repost_to_target_channel_postfix}`, client, postLink, message);
}

// ui_notesチャンネルの処理
async function handleUiNotes(client, message) {
  const key = process.env.TRELLO_KEY;
  const token = process.env.TRELLO_TOKEN;
  // const ui_note = process.env.TRELLO_UI_NOTE;
  const listNewId = process.env.TRELLO_LIST_NEW_ID;
  
  const keywordMatcher = '^title:.*';
  const titleMatcher = '^title:([^\n]*)';
  const dt = new Date();
  const postedAt = '### 投稿日\n' + dt.toFormat("YYYY/MM/DD/ HH24:MI") + '\n';
  const msgUrl = '### Slack URL\nhttps://paiza.slack.com/archives/' + message.channel + '/p' + message.ts.replace('.', '') + '\n';
  const msg = message.text;
  const trelloBody = '###概要\n' + message.text.replace(/^title:/g, '') + '\n';
  let imgUrl = '';

  if (msg.match(keywordMatcher)) {
    if (message.files && message.files.length > 0) {
      imgUrl = '### 画像URL\n' + message.files[0].url_private + '\n';
    }

    const hashtag = '#' + dt.toFormat("YYYY年MM月") + '報告分';
    const title = encodeURIComponent(msg.match(titleMatcher)[1] + hashtag);
    const desc = encodeURIComponent(trelloBody + msgUrl + postedAt + imgUrl);
    const url = `https://trello.com/1/cards?key=${key}&token=${token}&idList=${listNewId}&name=${title}&desc=${desc}`;

    try {
      request.post({
        url: url,
        headers: {
          "content-type": "application/json"
        }
      }, function (error, response, body) {
        if (error) {
          console.error(`Error posting to Trello: ${error}`);
        }
      });

      await client.chat.postMessage({
        text: "uiチームのタスクに登録されました。随時取り掛かります。\nhttps://trello.com/b/jrmkblAB/uinotes",
        channel: message.channel,
        thread_ts: message.ts
      });
    } catch (error) {
      console.error(`Error handling UI notes: ${error}`);
    }
  }
}

// アプリの起動
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();