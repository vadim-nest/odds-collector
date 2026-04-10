const puppeteer = require("puppeteer");
const Database = require("better-sqlite3");

const db = new Database("odds.db");
db.prepare(
  `
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
`,
).run();

async function scrape() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );

  try {
    console.log("Navigating to BoyleSports...");
    await page.goto(
      "https://www.boylesports.com/sports/football/competition/england-premier-league",
      {
        waitUntil: "networkidle2",
      },
    );

    await page.waitForSelector(".sports-row.minimenu-list-event");

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
              match: teams.join(" v "),
              home_team: teams[0] || null,
              away_team: teams[1] || null,
              home_odds:
                oddsButtons
                  .find((b) => b.getAttribute("data-name") === teams[0])
                  ?.innerText.trim() || null,
              draw_odds:
                oddsButtons
                  .find((b) => b.getAttribute("data-name") === "Draw")
                  ?.innerText.trim() || null,
              away_odds:
                oddsButtons
                  .find((b) => b.getAttribute("data-name") === teams[1])
                  ?.innerText.trim() || null,
            };
          })
          .filter((m) => m.match && m.home_odds);
      },
    );

    console.log(`Scraped ${matches.length} matches. Saving to database...`);

    const insert = db.prepare(`
      INSERT INTO premier_league_odds (match_name, home_team, away_team, home_odds, draw_odds, away_odds)
      VALUES (@match, @home_team, @away_team, @home_odds, @draw_odds, @away_odds)
    `);

    const insertMany = db.transaction((data) => {
      for (const row of data) insert.run(row);
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
