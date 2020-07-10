const SlackBot = require('slackbots');
const axios = require('axios')
const dotenv = require('dotenv')
const fs = require('fs');

const lines = fs.readFileSync('better-fates.txt').toString().split("\n")

dotenv.config()

const bot = new SlackBot({
    token: `${process.env.BOT_TOKEN}`,
    name: 'Fate Wheel'
})

// Error Handler
bot.on('error', (err) => {
    console.log(err);
})

// Message Handler
bot.on('message', (data) => {
    // Only read messages that are not other bot messages
    if( (data.subtype && (data.subtype === 'bot_message' || data.subtype === 'message_replied')) || (data.message && data.data.subtype && data.data.subtype === 'bot_message')) {
		return
    }

    if(data.type !== 'message') {
        return;
    }

    handleMessage(data.text, data.channel);

	return;
})

function handleMessage(message, channel) {
	if(message.startsWith(`<@${bot.self.id}> `) ) {
		var random = Math.floor(Math.random() * lines.length);

		const params = {
			icon_emoji: ':robot_face:'
		}


		bot.postMessage(channel, lines[random], params);
	}
}

