const SlackBot = require('slackbots');
const axios = require('axios');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3');

let db = new sqlite3.Database('./db/fates.sqlite', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
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
    if( (data.subtype && (data.subtype === 'bot_message' || data.subtype === 'message_replied')) || (data.message && data.data && data.data.subtype && data.data.subtype === 'bot_message')) {
		return
    }

    if(data.type !== 'message') {
        return;
    }

    handleMessage(data);

	return;
})

function handleMessage(data) {
    const re = new RegExp(/(<@.*>).(\S+).(.*)/);

    const atId = data.text.replace(re, "$1");
    const command = data.text.replace(re, "$2");
    const text = data.text.replace(re, "$3");

    if(atId === `<@${bot.self.id}>`) {
        switch(command) {
            case 'help':
                help(data.channel);
                break;
            case 'addfate':
                addFate(text, data.channel);

                break;
            case 'getfate':
                getFate(text, data.channel);

                break;
            case 'rmfate':
                rmFate(text, data.channel);

                break;
            default:
                sendFate(data.text, data.channel);
        }
    }
}

function help(channel) {
	const params = {
		icon_emoji: ':fate_wheel_avatar:'
	}

    bot.postMessage(channel, "Fuckin help yourself dipshit", params);
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

function rmFate(rowId, channel) {
	const params = {
		icon_emoji: ':fate_wheel_avatar:'
	}

    console.log("rowId: " + rowId);

	db.run(`DELETE FROM fates WHERE ROWID = ${rowId}`, function(err) {
		if (err) {
			return console.log(err.message);
		}

		bot.postMessage(channel, `Removed fate with id ${rowId}`, params);}
	);
}

function getFate(rowId, channel) {
	const params = {
		icon_emoji: ':fate_wheel_avatar:'
	}

    db.get(`SELECT * FROM fates WHERE ROWID = ${rowId}`, (err, row) => {
		if (err) {
			return console.log(err.message);
		}

        bot.postMessage(channel, `${rowId}: ${row.fateText}`, params);
    });
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
