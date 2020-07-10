const SlackBot = require('slackbots');
const axios = require('axios')
const dotenv = require('dotenv')

dotenv.config()

const bot = new SlackBot({
    token: `${process.env.BOT_TOKEN}`,
    name: 'Fate Wheel'
})


bot.on('start', () => {
    const params = {
        icon_emoji: ':robot_face:'
    }

    bot.postMessageToChannel(
        'workshop',
        'Mothafuckin @fatewheel',
        params
    );
})

function handleMessage(message) {
    bot.postMessageToChannel(
        'workshop',
        'Responding',
        params
    );
}

