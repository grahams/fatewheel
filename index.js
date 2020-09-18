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
    const re = new RegExp(/<@(.*)>\s+(\S+)\s*(.*)?/);

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
            case 'rmlast':
                rmLastFate(data.channel);
                
                break;
            case 'fatewith':
                fateWith(text, data.channel);

                break;
            case 'last':
            case 'lastadded':
                getRecentlyAdded(data.channel);

                break;
            case 'lastused':
                getRecentlyUsed(data.channel);

                break;
            case 'search':
                searchFates(text, data.channel);

                break
            case 'bean':
                throwBean(data.user, text, data.channel);

                break
            default:
                sendFate(data.channel);
        }
    }
}

function help(channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    let helpMessage = "*help* - this message \n";
    helpMessage += "*addfate {text}* - add a fate containing {text}\n";
    helpMessage += "*getfate {id}* - retrieve fate #{id}\n";
    helpMessage += "*rmfate {id}* - delete fate #{id}\n";
    helpMessage += "*rmlast* - delete the most recently shown fate\n";
    helpMessage += "*lastused* - return the last 10 fates used\n";
    helpMessage += "*lastadded* - return the last 10 fates added\n";
    helpMessage += "*fatewith {text}* - append {text} to a random fate\n";
    helpMessage += "*search {text}* - returns first 10 fates containing {text}\n";
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
            bot.postMessage(channel, `"${newFate.toUpperCase()}" ALREADY EXISTS.\nDEATH IS LISTENING, AND WILL TAKE THE FIRST MAN THAT SCREAMS`, params);
        }
        else {
            db.run(`INSERT INTO fates VALUES(?, ?, ?, ?)`, [newFate.toUpperCase(), Date.now(), Date.now(), null], 
                function(err) {
                    if (err) {
                        return console.log(err.message);
                    }

                    bot.postMessage(channel, `ADDED NEW FATE "${newFate.toUpperCase()}" WITH ID ${this.lastID}.\nCONGRATULATIONS! YOU'RE THE FIRST TO SURVIVE THE AUDITION! `, params);
                }
            );
        }
    });
}

function rmFate(rowId, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.run(`DELETE FROM fates WHERE ROWID = ${rowId}`, err => {
        if (err) {
            return console.log(err.message);
        }

        bot.postMessage(channel, `REMOVED FATE WITH ID ${rowId}\nONE DAY, COCK OF THE WALK. NEXT, A FEATHER DUSTER.`, params);}
    );
}

function rmLastFate(channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }
    db.all(`SELECT rowid,fateText,epochDateLastUsed 
                FROM fates 
                WHERE epochDateLastUsed IS NOT NULL
                ORDER BY epochDateLastUsed 
                DESC 
                LIMIT 1;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        rmFate(rows[0].rowid, channel);
    })
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

function searchFates(term, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.all(`SELECT rowid,fateText FROM fates WHERE fateText LIKE "%${term}%" LIMIT 10;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        let responseMessage = "";

        if(rows.length === 0) {
            responseMessage = "NO RESULTS.  GOODBYE, SOLDIER.";
        }

        for(let row of rows) {
            responseMessage += `${row.rowid}: ${row.fateText}\n`;
        }

        bot.postMessage(channel, responseMessage, params);
    });
}

function getRecentlyAdded(channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.all(`SELECT rowid,fateText FROM fates ORDER BY ROWID DESC LIMIT 10;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        let responseMessage = "";

        for(let row of rows) {
            responseMessage += `${row.rowid}: ${row.fateText}\n`;
        }

        bot.postMessage(channel, responseMessage, params);
    });
}

function getRecentlyUsed(channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.all(`SELECT rowid,fateText,epochDateLastUsed 
                FROM fates 
                WHERE epochDateLastUsed IS NOT NULL
                ORDER BY epochDateLastUsed 
                DESC 
                LIMIT 10;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        let responseMessage = "";

        for(let row of rows) {
            responseMessage += `${row.rowid}: ${row.fateText}\n`;
        }

        bot.postMessage(channel, responseMessage, params);
    });
}

function fateWith(text, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.get("SELECT fateText,rowId FROM fates ORDER BY RANDOM() LIMIT 1;", (error, row) => {
        bot.postMessage(channel, `${row.fateText} ${text}`.toUpperCase(), params);
        updateUsedDate('fates', row.rowid);
    });
}

function throwBean(sourceUser, target, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.get("SELECT beanText,rowId FROM beans ORDER BY RANDOM() LIMIT 1;", (error, row) => {
        let message = `<@${sourceUser}> gives ${target} an Every Flavour Bean to munch on.  It is ${row.beanText} flavoured!`
        bot.postMessage(channel, message, params);
        updateUsedDate('fates', row.rowid);
    });
}



function sendFate(channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.get("SELECT fateText,rowId FROM fates ORDER BY RANDOM() LIMIT 1;", (error, row) => {
        bot.postMessage(channel, row.fateText.toUpperCase(), params);
        updateUsedDate('fates', row.rowid);
    });
}

function updateUsedDate(table, rowId) {
    let newDate = Date.now();

    db.run(`UPDATE ${table} 
                SET epochDateLastUsed = ?
                WHERE ROWID = ?`, [newDate, rowId], err => {
        if (err) {
            return console.log(err.message);
        }
    });
}
