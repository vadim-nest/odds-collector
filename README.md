# Matchweek Odds Scraper

A lightweight Node.js scraper. It extracts Premier League match odds and persists them to a local SQLite database.

## Technical Decisions

- **Puppeteer:** Selected for its reliable headless browser control. I implemented `page.waitForSelector` and a custom User-Agent to handle the asynchronous rendering of the betting markets.
- **Better-sqlite3:** I chose this over standard `sqlite3` for its synchronous API, which significantly simplifies the control flow in a script of this size, and its superior performance with transactions.
- **SQL Transactions:** All matches are inserted within a single transaction to ensure data integrity and maximize write speed.
- **Data Integrity:** Used named parameters in SQL queries to prevent injection and handled potential `undefined` DOM elements by normalizing to `null`.

## How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Execute the scraper:**

    ```bash
    node index.js
    ```

Verify data:
The matches will be stored in odds.db.
