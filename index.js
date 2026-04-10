const Database = require('better-sqlite3');
const db = new Database('odds.db');

// Create the table to match your working scrape logic
db.prepare(`
  CREATE TABLE IF NOT EXISTS premier_league_odds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_name TEXT,
    home_team TEXT,
    away_team TEXT,
    home_odds TEXT,
    draw_odds TEXT,
    away_odds TEXT,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log("Project initialized with SQLite schema.");