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
                getMessage('fates', text, data.channel);

                break;
            case 'rmfate':
                rmMessage('fates', text, data.channel);

                break;
            case 'rmlast':
                rmLastMessage('fates', data.channel);
                
                break;
            case 'fatewith':
                messageWith('fates', text, data.channel);

                break;
            case 'last':
            case 'lastadded':
                getRecentlyAdded("fates", data.channel);

                break;
            case 'lastused':
                getRecentlyUsed("fates", data.channel);

                break;
            case 'search':
                search("fates", text, data.channel);

                break




            case 'addbean':
                addBean(text, data.channel);

                break;

            case 'bean':
                throwBean(data.user, text, data.channel);

                break
            case 'beansearch':
                search("beans", text, data.channel);

                break
            case 'beanlast':
            case 'beanlastadded':
                getRecentlyAdded("beans", data.channel);

                break;
            case 'beanlastused':
                getRecentlyUsed("beans", data.channel);

                break;

            case 'getbean':
                getMessage("beans", text, data.channel);

                break;
            case 'rmbean':
                rmMessage("beans", text, data.channel);

                break;
            case 'rmbeanlast':
                rmLastMessage('beans', data.channel);
                
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

    let helpMessage = "*help* - this message \n";
    helpMessage += "*addfate {text}* - add a fate containing {text}\n";
    helpMessage += "*getfate {id}* - retrieve fate #{id}\n";
    helpMessage += "*rmfate {id}* - delete fate #{id}\n";
    helpMessage += "*rmlast* - delete the most recently shown fate\n";
    helpMessage += "*lastused* - return the last 10 fates used\n";
    helpMessage += "*lastadded* - return the last 10 fates added\n";
    helpMessage += "*fatewith {text}* - append {text} to a random fate\n";
    helpMessage += "*search {text}* - returns first 10 fates containing {text}\n";

    helpMessage += "\n"

    helpMessage += "*bean {target}* - throw a random bean at {target}\n"
    helpMessage += "*addbean {text}* - add a bean containing {text}\n";
    helpMessage += "*getbean {id}* - retrieve bean #{id}\n";
    helpMessage += "*rmbean {id}* - delete bean #{id}\n";
    helpMessage += "*rmlast* - delete the most recently shown bean\n";
    helpMessage += "*lastused* - return the last 10 beans used\n";
    helpMessage += "*lastadded* - return the last 10 beans added\n";
    helpMessage += "*beanwith {text}* - append {text} to a random bean\n";
    helpMessage += "*search {text}* - returns first 10 beans containing {text}\n";

    helpMessage += "\n"

    helpMessage += "any other text, spit out a random fate\n";

    bot.postMessage(channel, helpMessage, params);
}

function addFate(newFate, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.all(`SELECT * FROM fates WHERE message="${newFate.toUpperCase()}"`, (err, rows) => {
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

function rmMessage(table, rowId, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.run(`DELETE FROM ${table} WHERE ROWID = ${rowId}`, err => {
        if (err) {
            return console.log(err.message);
        }

        bot.postMessage(channel, `REMOVED FATE WITH ID ${rowId}\nONE DAY, COCK OF THE WALK. NEXT, A FEATHER DUSTER.`, params);}
    );
}

function rmLastMessage(table, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }
    db.all(`SELECT rowid,message,epochDateLastUsed 
                FROM ${table} 
                WHERE epochDateLastUsed IS NOT NULL
                ORDER BY epochDateLastUsed 
                DESC 
                LIMIT 1;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        rmMessage(table, rows[0].rowid, channel);
    })
}

function getMessage(table, rowId, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.get(`SELECT * FROM ${table} WHERE ROWID = ${rowId}`, (err, row) => {
        if (err) {
            return console.log(err.message);
        }

        bot.postMessage(channel, `${rowId}: ${row.message}`, params);
    });
}

function search(table, term, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.all(`SELECT rowid,message FROM ${table} WHERE message LIKE "%${term}%" LIMIT 15;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        let responseMessage = "";

        if(rows.length === 0) {
            responseMessage = "NO RESULTS.  GOODBYE, SOLDIER.";
        }

        for(let row of rows) {
            responseMessage += `${row.rowid}: ${row.message}\n`;
        }

        bot.postMessage(channel, responseMessage, params);
    });
}

function getRecentlyAdded(table, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.all(`SELECT rowid,message FROM ${table} ORDER BY ROWID DESC LIMIT 10;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        let responseMessage = "";

        for(let row of rows) {
            responseMessage += `${row.rowid}: ${row.message}\n`;
        }

        bot.postMessage(channel, responseMessage, params);
    });
}

function getRecentlyUsed(table, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.all(`SELECT rowid,message,epochDateLastUsed 
                FROM ${table} 
                WHERE epochDateLastUsed IS NOT NULL
                ORDER BY epochDateLastUsed 
                DESC 
                LIMIT 10;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        let responseMessage = "";

        for(let row of rows) {
            responseMessage += `${row.rowid}: ${row.message}\n`;
        }

        bot.postMessage(channel, responseMessage, params);
    });
}

function messageWith(table, text, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.get(`SELECT message,rowId FROM ${table} ORDER BY RANDOM() LIMIT 1;`, (error, row) => {
        bot.postMessage(channel, `${row.message} ${text}`.toUpperCase(), params);
        updateUsedDate(table, row.rowid);
    });
}

function throwBean(sourceUser, target, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.get("SELECT message,rowId FROM beans ORDER BY RANDOM() LIMIT 1;", (error, row) => {
        let message = `<@${sourceUser}> gives ${target} an Every Flavour Bean to munch on.  It is ${row.message} flavoured!`
        bot.postMessage(channel, message, params);
        updateUsedDate('beans', row.rowid);
    });
}

function addBean(newBean, channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.all(`SELECT * FROM beans WHERE message="${newBean}"`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        if(rows.length > 0) {
            bot.postMessage(channel, `"${newBean}" ALREADY EXISTS.\nDEATH IS LISTENING, AND WILL TAKE THE FIRST MAN THAT SCREAMS`, params);
        }
        else {
            db.run(`INSERT INTO beans VALUES(?, ?, ?, ?)`, [newBean, Date.now(), Date.now(), null], 
                function(err) {
                    if (err) {
                        return console.log(err.message);
                    }

                    bot.postMessage(channel, `Added new bean "${newBean}" with id ${this.lastID}.`, params);
                }
            );
        }
    });
}

function sendFate(channel) {
    const params = {
        icon_emoji: ':fate_wheel_avatar:'
    }

    db.get("SELECT message,rowId FROM fates ORDER BY RANDOM() LIMIT 1;", (error, row) => {
        bot.postMessage(channel, row.message.toUpperCase(), params);
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
