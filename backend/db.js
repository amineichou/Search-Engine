const Database = require('better-sqlite3');

// Use environment variable for database path (Docker-friendly)
const DBSOURCE = process.env.DB_PATH || "../crawler/build/crawler_data.db";

console.log(`Attempting to connect to database at: ${DBSOURCE}`);

let db;
try {
    db = new Database(DBSOURCE, { readonly: false, fileMustExist: true });
    console.log('Connected to the SQLite database.');
} catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
}

// Set pragmas for better performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

module.exports = db;