const { App, directMention } = require('@slack/bolt');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3');

dotenv.config()

let db = new sqlite3.Database(process.env.WHEEL_DB, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
});

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

app.message(directMention(), async ({ message, say }) => {
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

    helpMessage += "any other text, spit out a random fate\n";

    say(helpMessage);
}

function addFate(newFate, say) {
    db.all(`SELECT * FROM fates WHERE message="${newFate.toUpperCase()}"`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        if(rows.length > 0) {
            say(`"${newFate.toUpperCase()}" ALREADY EXISTS.\nDEATH IS LISTENING, AND WILL TAKE THE FIRST MAN THAT SCREAMS`);
        }
        else {
            db.run(`INSERT INTO fates VALUES(?, ?, ?, ?)`, [newFate.toUpperCase(), Date.now(), Date.now(), null], 
                function(err) {
                    if (err) {
                        return console.log(err.message);
                    }

                    say(`ADDED NEW FATE "${newFate.toUpperCase()}" WITH ID ${this.lastID}.\nCONGRATULATIONS! YOU'RE THE FIRST TO SURVIVE THE AUDITION! `);
                }
            );
        }
    });
}

function rmMessage(table, rowId, say) {
    db.run(`DELETE FROM ${table} WHERE ROWID = ${rowId}`, err => {
        if (err) {
            return console.log(err.message);
        }

        say(`REMOVED FATE WITH ID ${rowId}\nONE DAY, COCK OF THE WALK. NEXT, A FEATHER DUSTER.`);}
    );
}

function rmLastMessage(table, say) {
    db.all(`SELECT rowid,message,epochDateLastUsed 
                FROM ${table} 
                WHERE epochDateLastUsed IS NOT NULL
                ORDER BY epochDateLastUsed 
                DESC 
                LIMIT 1;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        rmMessage(table, rows[0].rowid, say);
    })
}

function getMessage(table, rowId, say) {
    db.get(`SELECT * FROM ${table} WHERE ROWID = ${rowId}`, (err, row) => {
        if (err) {
            return console.log(err.message);
        }

        say(`${rowId}: ${row.message}`);
    });
}

function search(table, term, say) {
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

        say(responseMessage);
    });
}

function getRecentlyAdded(table, say) {
    db.all(`SELECT rowid,message FROM ${table} ORDER BY ROWID DESC LIMIT 10;`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        let responseMessage = "";

        for(let row of rows) {
            responseMessage += `${row.rowid}: ${row.message}\n`;
        }

        say(responseMessage);
    });
}

function getRecentlyUsed(table, say) {
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

        say(responseMessage);
    });
}

function messageWith(table, text, say) {
    db.get(`SELECT message,rowId FROM ${table} ORDER BY RANDOM() LIMIT 1;`, (error, row) => {
        say(`${row.message} ${text}`.toUpperCase());
        updateUsedDate(table, row.rowid);
    });
}

function throwBean(sourceUser, target, say) {
    db.get("SELECT message,rowId FROM beans ORDER BY RANDOM() LIMIT 1;", (error, row) => {
        let message = `<@${sourceUser}> gives ${target} an Every Flavour Bean to munch on.  It is ${row.message} flavoured!`
        say(message);
        updateUsedDate('beans', row.rowid);
    });
}

function addBean(newBean, say) {
    db.all(`SELECT * FROM beans WHERE message="${newBean}"`, (err, rows) => {
        if (err) {
            return console.log(err.message);
        }

        if(rows.length > 0) {
            say(`"${newBean}" ALREADY EXISTS.\nDEATH IS LISTENING, AND WILL TAKE THE FIRST MAN THAT SCREAMS`);
        }
        else {
            db.run(`INSERT INTO beans VALUES(?, ?, ?, ?)`, [newBean, Date.now(), Date.now(), null], 
                function(err) {
                    if (err) {
                        return console.log(err.message);
                    }

                    say(`Added new bean "${newBean}" with id ${this.lastID}.`);
                }
            );
        }
    });
}

function sendFate(say) {
    db.get("SELECT message,rowId FROM fates ORDER BY RANDOM() LIMIT 1;", (error, row) => {
        say(row.message.toUpperCase());
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
