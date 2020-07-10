const SlackBot = require('slackbots');
const axios = require('axios');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3');

let db = new sqlite3.Database('./db/fates.sqlite', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }

    console.log('Connected to the fates database.');
});

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
    if(data == undefined) {
        return;
    }

    // Only read messages that are not other bot messages
    if( (data.subtype && (data.subtype === 'bot_message' || data.subtype === 'message_replied')) || (data.message && data.data.subtype && data.data.subtype === 'bot_message')) {
		return
    }

    if(data.type !== 'message') {
        return;
    }

    handleMessage(data);

	return;
})

function handleMessage(data) {
	const params = {
		icon_emoji: ':fate_wheel_avatar:'
	}

	if(data.text.startsWith(`<@${bot.self.id}> help`)) {
		bot.postMessage(data.channel, "Fuckin help yourself dipshit", params);
	}
	else if(data.text.startsWith(`<@${bot.self.id}> addfate `)) {
		var i = data.text.indexOf(" addfate ");
		var f = data.text.substring(i+9);
		addFate(f, data.channel);
	}
	else {
		sendFate(data.text, data.channel);
	}
}

function addFate(newFate, channel) {
	const params = {
		icon_emoji: ':fate_wheel_avatar:'
	}

	db.run(`INSERT INTO fates VALUES(?, ?, ?)`, [newFate, Date.now(), Date.now()], function(err) {
		if (err) {
			return console.log(err.message);
		}

		bot.postMessage(channel, `Added new fate "${newFate}" with id ${this.lastID}`, params);}
	);
}

function sendFate(message, channel) {
	if(message.startsWith(`<@${bot.self.id}> `) ) {
		const params = {
			icon_emoji: ':fate_wheel_avatar:'
		}

		db.get("SELECT * FROM fates ORDER BY RANDOM() LIMIT 1;", (error, row) => {
			bot.postMessage(channel, row.fateText, params);
		});

	}
}
