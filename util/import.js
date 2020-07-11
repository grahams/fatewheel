const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// I'm sure there's a better way to do this.  right now idgaf

const lines = fs.readFileSync('better-fates.txt').toString().split("\n")

let db = new sqlite3.Database('./fates.sqlite', sqlite3.OPEN_READWRITE, (err) => {
	if (err) {
		console.error(err.message);
	}
	console.log('Connected to the fates database.');

	db.run('DELETE FROM fates');

	for(var x = 0; x < (lines.length - 1); x += 1) {
		db.run('INSERT INTO fates (fateText, epochDateAdded, epochDateModified) VALUES (?, ?, ?)', [lines[x], Date.now(), Date.now()]);
	}
});
