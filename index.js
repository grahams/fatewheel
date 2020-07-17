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
    const re = new RegExp(/<@(.*)> (\S+) ?(.*)?/);

    if(data.text === undefined) {
        return;
    }

    const atId = data.text.replace(re, "$1");
    const command = data.text.replace(re, "$2");
    const text = data.text.replace(re, "$3");

    if(atId === bot.self.id) {
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
            case 'last':
                getLast10(data.channel);

                break;
            case 'fatewith':
                fateWith(text, data.channel);

                break;
            default:
                sendFate(data.channel);
        }
    }
}

function help(channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    var helpMessage = "*help* - this message \n";
    helpMessage += "*addfate {text}* - add a fate containing {text}\n";
    helpMessage += "*getfate {id}* - retrieve fate #{id}\n";
    helpMessage += "*rmfate {id}* - delete fate #{id}\n";
    helpMessage += "*last* - return the last 10 fates\n";
    helpMessage += "*fatewith {text}* - append {text} to a random fate\n";
    helpMessage += "any other text, spit out a random fate\n";

    bot.postMessage(channel, helpMessage, params);
}

function addFate(newFate, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.all(`SELECT * FROM fates WHERE fateText="${newFate.toUpperCase()}"`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        if(rows.length > 0) {
            bot.postMessage(channel, `${newFate.toUpperCase()} already exists`, params);
        }
        else {
            db.run(`INSERT INTO fates VALUES(?, ?, ?, ?)`, [newFate.toUpperCase(), Date.now(), Date.now(), null], 
                function(err) {
                    if (err) {
                        return console.log(err.message);
                    }

                    bot.postMessage(channel, `Added new fate "${newFate.toUpperCase()}" with id ${this.lastID}`, params);
                }
            );
        }
    });
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

function getLast10(channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.all(`SELECT rowid,fateText FROM fates ORDER BY ROWID DESC LIMIT 10;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        var responseMessage = "";

        for(var x = 0; x < rows.length; x += 1) {
            responseMessage += `${rows[x].rowid}: ${rows[x].fateText}\n`;
        }

        bot.postMessage(channel, responseMessage, params);
    });
}

function fateWith(text, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.get("SELECT * FROM fates ORDER BY RANDOM() LIMIT 1;", (error, row) => {
        bot.postMessage(channel, `${row.fateText} ${text}`.toUpperCase(), params);
    });
}

function sendFate(channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.get("SELECT * FROM fates ORDER BY RANDOM() LIMIT 1;", (error, row) => {
        bot.postMessage(channel, row.fateText.toUpperCase(), params);
    });
}
