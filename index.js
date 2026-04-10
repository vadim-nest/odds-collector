const puppeteer = require("puppeteer");
const Database = require("better-sqlite3");

const db = new Database("odds.db");

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS premier_league_odds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_name TEXT NOT NULL,
    home_team TEXT,
    away_team TEXT,
    home_odds_raw TEXT,
    draw_odds_raw TEXT,
    away_odds_raw TEXT,
    home_odds_decimal REAL,
    draw_odds_decimal REAL,
    away_odds_decimal REAL,
    scraped_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  )
`,
).run();

db.prepare(
  `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_match_date
  ON premier_league_odds(match_name, DATE(scraped_at))
`,
).run();

// Convert fractional odds (e.g. "11/4") or decimal strings to a REAL value.
// Returns null if the value cannot be parsed.
function toDecimal(raw) {
  if (!raw) return null;
  if (raw.includes("/")) {
    const [num, den] = raw.split("/").map(Number);
    return den ? parseFloat((num / den + 1).toFixed(4)) : null;
  }
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? null : parsed;
}

async function scrape() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );

  try {
    console.log("Navigating to BoyleSports...");
    await page.goto(
      "https://www.boylesports.com/sports/football/competition/england-premier-league",
      { waitUntil: "networkidle2" },
    );

    await page.waitForSelector(".sports-row.minimenu-list-event", {
      timeout: 15000,
    });

    console.log("Extracting odds...");
    const matches = await page.$$eval(
      ".sports-row.minimenu-list-event",
      (rows) => {
        return rows
          .map((row) => {
            const teams = Array.from(row.querySelectorAll(".player-name")).map(
              (span) => span.innerText.trim(),
            );
            const oddsButtons = Array.from(row.querySelectorAll(".odds"));

            return {
              match_name: teams.join(" v "),
              home_team: teams[0] || null,
              away_team: teams[1] || null,
              home_odds_raw:
                oddsButtons
                  .find((b) => b.getAttribute("data-name") === teams[0])
                  ?.innerText.trim() || null,
              draw_odds_raw:
                oddsButtons
                  .find((b) => b.getAttribute("data-name") === "Draw")
                  ?.innerText.trim() || null,
              away_odds_raw:
                oddsButtons
                  .find((b) => b.getAttribute("data-name") === teams[1])
                  ?.innerText.trim() || null,
            };
          })
          .filter((m) => m.match_name && m.home_odds_raw);
      },
    );

    if (matches.length === 0) {
      console.warn(
        "No matches found — the page may have blocked the request or the selector has changed.",
      );
      return;
    }

    console.log(`Scraped ${matches.length} matches. Saving to database...`);

    const insert = db.prepare(`
      INSERT OR IGNORE INTO premier_league_odds
        (match_name, home_team, away_team,
         home_odds_raw, draw_odds_raw, away_odds_raw,
         home_odds_decimal, draw_odds_decimal, away_odds_decimal)
      VALUES
        (@match_name, @home_team, @away_team,
         @home_odds_raw, @draw_odds_raw, @away_odds_raw,
         @home_odds_decimal, @draw_odds_decimal, @away_odds_decimal)
    `);

    const insertMany = db.transaction((data) => {
      for (const row of data) {
        insert.run({
          ...row,
          home_odds_decimal: toDecimal(row.home_odds_raw),
          draw_odds_decimal: toDecimal(row.draw_odds_raw),
          away_odds_decimal: toDecimal(row.away_odds_raw),
        });
      }
    });

    insertMany(matches);
    console.log("Data successfully persisted to SQLite.");
  } catch (error) {
    console.error("Scraping error:", error);
  } finally {
    await browser.close();
    db.close();
  }
}

scrape();
