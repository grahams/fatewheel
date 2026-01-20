const { App, directMention } = require('@slack/bolt');
const dotenv = require('dotenv');
const Database = require('better-sqlite3');
const { roll: rollDice } = require('randsum');

dotenv.config()

let db = new Database(process.env.WHEEL_DB);

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
	socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('fatewheel is running!');
})();

app.message(directMention, async ({ message, say }) => {
    const re = new RegExp(/<@(.*)>\s+(\S+)\s*(.*)?/);

    if(message.text === undefined) {
        return;
    }

    const atId = message.text.replace(re, "$1");
    const command = message.text.replace(re, "$2");
    const text = message.text.replace(re, "$3");
    const sourceUser = message.user;

    switch(command) {
        // fates
        case 'help':
            help(await say)
            break;
        case 'addfate':
            addFate(text, await say);

            break;
        case 'getfate':
            getMessage('fates', text, await say);

            break;
        case 'rmfate':
            rmMessage('fates', text, await say);

            break;
        case 'rmlast':
            rmLastMessage('fates', await say);
            
            break;
        case 'fatewith':
            messageWith('fates', text, await say);

            break;
        case 'last':
        case 'lastadded':
            getRecentlyAdded("fates", await say);

            break;
        case 'lastused':
            getRecentlyUsed("fates", await say);

            break;
        case 'search':
            search("fates", text, await say);

            break

        // beans
        case 'addbean':
            addBean(text, await say);

            break;
        case 'bean':
            throwBean(sourceUser, text, await say);

            break
        case 'beansearch':
            search("beans", text, await say);

            break
        case 'beanlast':
        case 'beanlastadded':
            getRecentlyAdded("beans", await say);

            break;
        case 'beanlastused':
            getRecentlyUsed("beans", await say);

            break;

        case 'getbean':
            getMessage("beans", text, await say);

            break;
        case 'rmbean':
            rmMessage("beans", text, await say);

            break;
        case 'rmbeanlast':
            rmLastMessage('beans', await say);
        
            break;
        case 'coinflip':
            coinFlip(await say);
            
            break;
        case 'roll':
            roll(text, await say);

            break

        default:
            sendFate(await say);
    }
});

function help(say) {
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
    helpMessage += "*rmbeanlast* - delete the most recently shown bean\n";
    helpMessage += "*beanlastused* - return the last 10 beans used\n";
    helpMessage += "*beanlastadded* - return the last 10 beans added\n";
    helpMessage += "*beanwith {text}* - append {text} to a random bean\n";
    helpMessage += "*beansearch {text}* - returns first 10 beans containing {text}\n";

    helpMessage += "\n"

    helpMessage += "*coinflip* - flips a coin (duh)\n"
    helpMessage += "*roll* - rolls dice using the NdN syntax (i.e. 4d20)\n"

    helpMessage += "\n"

    helpMessage += "any other text, spit out a random fate\n";

    say(helpMessage);
}

function coinFlip(say) {
    var coin = Math.floor(Math.random() * (2 - 0) + 0);
    var message = "THE COIN LANDED ON ";

    if(coin === 0) {
        message += "TAILS!"
    }
    else {
        message += "HEADS!"
    }

    say(message);
}

function roll(diceString, say) {
    var message = "Error, check your syntax" 

    try {
        var result = rollDice(diceString);
        var rolls = result.result; // In v9, individual rolls are in result.result array
        var total = result.total;

        if(rolls.length > 1) {
            message = `The total was ${total} and the individual rolls were [${rolls[0]}`;
            for(var x = 1; x < rolls.length; x += 1) {
                message += `, ${rolls[x]}`
            }

            message += '].'
        }
        else {
            message = `The roll was ${total}.`;
        }
    }
    catch(e) {}

    say(message);
}

function addFate(newFate, say) {
    try {
        const rows = db.prepare(`SELECT * FROM fates WHERE message = ?`).all(newFate.toUpperCase());

        if(rows.length > 0) {
            say(`"${newFate.toUpperCase()}" ALREADY EXISTS.\nDEATH IS LISTENING, AND WILL TAKE THE FIRST MAN THAT SCREAMS`);
        }
        else {
            const result = db.prepare(`INSERT INTO fates VALUES(?, ?, ?, ?)`).run(newFate.toUpperCase(), Date.now(), Date.now(), null);
            say(`ADDED NEW FATE "${newFate.toUpperCase()}" WITH ID ${result.lastInsertRowid}.\nCONGRATULATIONS! YOU'RE THE FIRST TO SURVIVE THE AUDITION! `);
        }
    } catch(err) {
        console.error(err.message);
    }
}

function rmMessage(table, rowId, say) {
    try {
        db.prepare(`DELETE FROM ${table} WHERE ROWID = ?`).run(rowId);
        say(`REMOVED FATE WITH ID ${rowId}\nONE DAY, COCK OF THE WALK. NEXT, A FEATHER DUSTER.`);
    } catch(err) {
        console.error(err.message);
    }
}

function rmLastMessage(table, say) {
    try {
        const rows = db.prepare(`SELECT rowid,message,epochDateLastUsed 
                FROM ${table} 
                WHERE epochDateLastUsed IS NOT NULL
                ORDER BY epochDateLastUsed 
                DESC 
                LIMIT 1`).all();
        
        if(rows.length > 0) {
            rmMessage(table, rows[0].rowid, say);
        }
    } catch(err) {
        console.error(err.message);
    }
}

function getMessage(table, rowId, say) {
    try {
        const row = db.prepare(`SELECT * FROM ${table} WHERE ROWID = ?`).get(rowId);
        if (row) {
            say(`${rowId}: ${row.message}`);
        }
    } catch(err) {
        console.error(err.message);
    }
}

function search(table, term, say) {
    try {
        const rows = db.prepare(`SELECT rowid,message FROM ${table} WHERE message LIKE ? LIMIT 15`).all(`%${term}%`);

        let responseMessage = "";

        if(rows.length === 0) {
            responseMessage = "NO RESULTS.  GOODBYE, SOLDIER.";
        }

        for(let row of rows) {
            responseMessage += `${row.rowid}: ${row.message}\n`;
        }

        say(responseMessage);
    } catch(err) {
        console.error(err.message);
    }
}

function getRecentlyAdded(table, say) {
    try {
        const rows = db.prepare(`SELECT rowid,message FROM ${table} ORDER BY ROWID DESC LIMIT 10`).all();

        let responseMessage = "";

        for(let row of rows) {
            responseMessage += `${row.rowid}: ${row.message}\n`;
        }

        say(responseMessage);
    } catch(err) {
        console.error(err.message);
    }
}

function getRecentlyUsed(table, say) {
    try {
        const rows = db.prepare(`SELECT rowid,message,epochDateLastUsed 
                FROM ${table} 
                WHERE epochDateLastUsed IS NOT NULL
                ORDER BY epochDateLastUsed 
                DESC 
                LIMIT 10`).all();

        let responseMessage = "";

        for(let row of rows) {
            responseMessage += `${row.rowid}: ${row.message}\n`;
        }

        say(responseMessage);
    } catch(err) {
        console.error(err.message);
    }
}

function messageWith(table, text, say) {
    try {
        const row = db.prepare(`SELECT message,rowid FROM ${table} ORDER BY RANDOM() LIMIT 1`).get();
        if (row) {
            say(`${row.message} ${text}`.toUpperCase());
            updateUsedDate(table, row.rowid);
        }
    } catch(err) {
        console.error(err.message);
    }
}

function throwBean(sourceUser, target, say) {
    try {
        const row = db.prepare("SELECT message,rowid FROM beans ORDER BY RANDOM() LIMIT 1").get();
        if (row) {
            let message = `<@${sourceUser}> gives ${target} an Every Flavour Bean to munch on.  It is ${row.message} flavoured!`
            say(message);
            updateUsedDate('beans', row.rowid);
        }
    } catch(err) {
        console.error(err.message);
    }
}

function addBean(newBean, say) {
    try {
        const rows = db.prepare(`SELECT * FROM beans WHERE message = ?`).all(newBean);

        if(rows.length > 0) {
            say(`"${newBean}" ALREADY EXISTS.\nDEATH IS LISTENING, AND WILL TAKE THE FIRST MAN THAT SCREAMS`);
        }
        else {
            const result = db.prepare(`INSERT INTO beans VALUES(?, ?, ?, ?)`).run(newBean, Date.now(), Date.now(), null);
            say(`Added new bean "${newBean}" with id ${result.lastInsertRowid}.`);
        }
    } catch(err) {
        console.error(err.message);
    }
}

function sendFate(say) {
    try {
        const row = db.prepare("SELECT message,rowid FROM fates ORDER BY RANDOM() LIMIT 1").get();
        if (row) {
            say(row.message.toUpperCase());
            updateUsedDate('fates', row.rowid);
        }
    } catch(err) {
        console.error(err.message);
    }
}

function updateUsedDate(table, rowId) {
    try {
        let newDate = Date.now();
        db.prepare(`UPDATE ${table} 
                SET epochDateLastUsed = ?
                WHERE ROWID = ?`).run(newDate, rowId);
    } catch(err) {
        console.error(err.message);
    }
}
