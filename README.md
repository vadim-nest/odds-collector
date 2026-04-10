# Matchweek Odds Scraper

A lightweight Node.js scraper that extracts Premier League match odds and persists them to a local SQLite database.

## Technical Decisions

- **Puppeteer:** Selected for reliable headless browser control. I implemented `page.waitForSelector` with a 15s timeout and a custom User-Agent to handle asynchronous rendering and basic bot-detection.
- **Data Normalisation:** Since bookmakers often provide fractional odds (e.g., "11/4"), I implemented a `toDecimal` utility to convert these into `REAL` values, facilitating easier quantitative analysis.
- **Better-sqlite3:** Chosen for its synchronous API and performance. It allows the project to remain self-contained without the overhead of Docker or external database services.
- **Idempotency & Schema Design:** - Used a `UNIQUE INDEX` on `(match_name, DATE(scraped_at))` combined with `INSERT OR IGNORE`. This ensures that multiple runs on the same day do not create duplicate records for the same fixture.
  - Preserved both "raw" strings and "decimal" values to maintain a clear data lineage (Audit Trail).
- **SQL Transactions:** Used to ensure all matches from a single scrape are committed atomically.

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
The matches will be stored in `odds.db`.
