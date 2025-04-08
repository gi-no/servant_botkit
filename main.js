import bolt from '@slack/bolt';

if (!process.env.TOKEN || !process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_TEAM ) {
  console.log('Error: Specify TOKEN in environment');
  console.log('or Error: Specify SLACK_SIGNING_SECRET in environment');
  console.log('or Error: Specify SLACK_TEAM in environment');
  process.exit(1);
}

const app = new bolt.App({
  token: process.env.TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.message(async ({ message, client }) => {
  console.log(message);
  
  // 自分のメッセージには反応しない
  if (message.subtype === 'bot_message' || message.bot_id) {
    return;
  }

  const channelId = message.channel;
  const eventTs = message.ts;
  const chatGetPermalinkResponse = await app.client.chat.getPermalink({
    channel: channelId,
    message_ts: eventTs
  });
  const postLink = chatGetPermalinkResponse.permalink;

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
  
  repostTo(`#exceptions_${repostToTargetChannelPostfix}`, client, postLink, message);
}

// アプリの起動
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();