const sqlite3 = require('sqlite3').verbose();


const DBSOURCE = "../crawler/build/crawler_data.db";


let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');
    }
});

module.exports = db;