# servant_botkit
なんでもかんでもやるbotです。

## Setup
yarn

## Usage
### local
```
export SLACK_TEAM=<your slack team name here>
export TOKEN=<your slack team name here>
export SLACK_SIGNING_SECRET=<your slack signing secret>
node main.js
```

### Required environment variables
```
# SLACK_TEAM for generate post link
SLACK_TEAM
# SLACK_API_TOKEN
TOEKN
# SLACK_SIGNING_SECRET
SLACK_SIGNING_SECRET
```

## Deploy to heroku

### heroku setup
```
heroku login
heroku create servant-botkit
heroku config:set SLACK_TEAM=[your team name]
heroku config:set TOKEN=[your token]
heroku config:set SLACK_SIGNING_SECRET=[your slack signing secret>]
```

### heroku config
#### step1
![System Structure](https://raw.githubusercontent.com/yukimura1227/servant_botkit/master/docs/change_dyno_setting_step1.png)
#### step2
![System Structure](https://raw.githubusercontent.com/yukimura1227/servant_botkit/master/docs/change_dyno_setting_step2.gif)
