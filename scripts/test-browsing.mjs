import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const base = process.env.BASE_URL || "http://localhost:3000/booklist";
const books = JSON.parse(fs.readFileSync("public/data/books-essential.json"));
const people = JSON.parse(fs.readFileSync("public/data/recommenders.json"));
(async () => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || undefined,
    headless: true,
  });
  try {
    const nojs = await browser.newPage({ javaScriptEnabled: false });
    await nojs.goto(base);
    assert.equal(
      await nojs.locator("[data-row-count]").getAttribute("data-row-count"),
      String(books.length),
    );
    assert.ok(
      (await nojs.locator("[data-row-id]").count()) > 10,
      "Real rows in server HTML without JavaScript",
    );
    console.log(
      "PASS SSR:",
      await nojs.locator("[data-row-id]").count(),
      "visible rows; full catalog height",
    );
    await nojs.close();
    // Scroll the server-rendered list while its JavaScript is still in flight.
    const early = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const earlyErrors = [];
    early.on("pageerror", error => earlyErrors.push(error.message));
    let releaseScripts;
    const scriptsReady = new Promise(resolve => { releaseScripts = resolve; });
    await early.route("**/*.js*", async route => {
      await scriptsReady;
      await route.continue();
    });
    try {
      await early.goto(base, { waitUntil: "commit" });
      await early.locator("[data-row-id]").first().waitFor();
      const earlyScroller = early.locator("div.overflow-auto").filter({
        has: early.locator('[data-dropdown="title"]'),
      });
      await earlyScroller.evaluate(element => { element.scrollTop = 600; });
      releaseScripts();
      await early.getByText(`${books.length} books`, { exact: true }).waitFor();
      await early.waitForTimeout(250);
      assert.equal(await earlyScroller.evaluate(element => element.scrollTop), 600,
        "Hydration preserves scrolling through server-rendered rows");
      await earlyScroller.evaluate(element => { element.scrollTop = 5000; });
      await early.waitForTimeout(100);
      const covered = await earlyScroller.evaluate(element => {
        const viewport = element.getBoundingClientRect();
        const rows = [...element.querySelectorAll("[data-row-id]")];
        return rows[0].getBoundingClientRect().top <= viewport.top + 37 &&
          rows.at(-1).getBoundingClientRect().bottom >= viewport.bottom;
      });
      assert.ok(covered, "Virtualization continues after an early scroll");
      assert.deepEqual(earlyErrors, []);
      console.log("PASS early scrolling survives hydration");
    } finally {
      releaseScripts();
      await early.close();
    }
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(base);
    await page.getByText(`${books.length} books`, { exact: true }).waitFor();
    const scroller = page
      .locator("div.overflow-auto")
      .filter({ has: page.locator('[data-dropdown="title"]') });
    assert.equal(
      requests.filter(
        (u) => u.includes("/api/catalog/") || u.includes("/data/"),
      ).length,
      0,
      "No duplicate catalog fetch or full snapshot fetch",
    );
    // Dismiss with both a plain cell and an embedded recommendation button.
    for (const target of [
      scroller.locator("[data-row-id]").nth(8).locator(":scope > div").first(),
      scroller.locator("[data-row-id]").nth(8).getByRole("button").first(),
    ]) {
      await page.locator('[data-dropdown="title"]').click();
      await page.getByPlaceholder("Filter by title").waitFor();
      await target.click();
      await page.getByPlaceholder("Filter by title").waitFor({ state: "hidden" });
      assert.equal(new URL(page.url()).searchParams.get("key"), null,
        "Dismissing a menu must not open the underlying row or recommendation");
      await target.click();
      await page.locator("h1").waitFor();
      assert.ok(new URL(page.url()).searchParams.get("key"),
        "The next click still opens details");
      await page.locator("button.absolute.top-4.right-4").click();
      await page.locator("h1").waitFor({ state: "hidden" });
    }
    // Only count requests from the existing browsing checks below.
    requests.length = 0;
    console.log("PASS filter-menu dismissal does not open details");
    const initialHeight = await scroller.evaluate((e) => e.scrollHeight);
    for (const top of [5000, 100000, 500000, 600000, 50000, 0]) {
      await scroller.evaluate((e, top) => (e.scrollTop = top), top);
      await page.waitForTimeout(60);
      const coverage = await scroller.evaluate((e) => {
        const r = e.getBoundingClientRect();
        const rows = [...e.querySelectorAll("[data-row-id]")];
        return {
          top: rows[0].getBoundingClientRect().top,
          bottom: rows.at(-1).getBoundingClientRect().bottom,
          viewportTop: r.top,
          viewportBottom: r.bottom,
        };
      });
      assert.ok(
        coverage.top <= coverage.viewportTop + 37 &&
          coverage.bottom >= coverage.viewportBottom,
        JSON.stringify({ requested: top, ...coverage }),
      );
      assert.equal(
        await scroller.evaluate((e) => e.scrollHeight),
        initialHeight,
      );
    }
    await scroller.evaluate((e) => (e.scrollTop = e.scrollHeight));
    await page.waitForTimeout(100);
    const lastBook = [...books]
      .sort((a, b) => b.recommendations.length - a.recommendations.length)
      .at(-1);
    assert.ok(
      (await scroller.innerText()).includes(lastBook.title),
      "Last book reachable",
    );
    const originalTop = await scroller.evaluate((e) => e.scrollTop);
    await scroller
      .locator("[data-row-id]")
      .last()
      .locator(":scope > div")
      .first()
      .click();
    await page
      .getByRole("heading", { name: lastBook.title, exact: true })
      .waitFor();
    assert.equal(
      await scroller.evaluate((e) => e.scrollTop),
      originalTop,
      "Open preserves scroll",
    );
    assert.equal(
      requests.filter((u) => u.includes("/api/entities/")).length,
      1,
    );
    await page.locator("button.absolute.top-4.right-4").click();
    assert.equal(
      await scroller.evaluate((e) => e.scrollTop),
      originalTop,
      "Close preserves scroll",
    );
    await page.goBack();
    await page
      .getByRole("heading", { name: lastBook.title, exact: true })
      .waitFor();
    await page.goForward();
    await page
      .getByRole("heading", { name: lastBook.title, exact: true })
      .waitFor({ state: "hidden" });
    await page.locator('[data-dropdown="title"]').click();
    await page.getByPlaceholder("Filter by title").fill("zzzznothing");
    await page.getByText("No matching results found").waitFor();
    await page.getByPlaceholder("Filter by title").fill("pride");
    await page.waitForTimeout(250);
    assert.ok(
      (await scroller.locator("[data-row-id]").allInnerTexts()).every((t) =>
        t.toLowerCase().includes("pride"),
      ),
    );
    await page.getByPlaceholder("Filter by title").fill("");
    await page.getByText("Sort ascending", { exact: true }).click();
    await page.waitForTimeout(250);
    assert.equal(await scroller.evaluate((e) => e.scrollTop), 0);
    const sorted = [...books].sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
    );
    assert.ok(
      (await scroller.locator("[data-row-id]").first().innerText()).startsWith(
        sorted[0].title,
      ),
    );
    await page.locator('[data-dropdown="recommenders"]').click();
    await page
      .getByPlaceholder("Filter by recommenders")
      .fill("charlie munger");
    await page.waitForTimeout(250);
    const expected = books.filter((b) =>
      b.recommendations.some((r) =>
        r.recommender?.full_name.toLowerCase().includes("charlie munger"),
      ),
    );
    assert.equal(
      await page.locator("[data-row-count]").getAttribute("data-row-count"),
      String(expected.length),
      "Filter includes names beyond first recommender",
    );
    await page.getByPlaceholder("Filter by recommenders").fill("");
    await page.locator('[data-dropdown="recommenders"]').click();
    await page.getByRole("link", { name: "People", exact: true }).click();
    await page.locator('[data-dropdown="full_name"]').waitFor();
    assert.equal(
      await page.locator("[data-row-count]").getAttribute("data-row-count"),
      String(people.length),
    );
    assert.equal(
      requests.filter((u) => u.includes("/api/catalog/people")).length,
      1,
      "People fetched on first switch only",
    );
    const personId = await page
      .locator("[data-row-id]")
      .first()
      .getAttribute("data-row-id");
    await page
      .locator("[data-row-id]")
      .first()
      .locator(":scope > div")
      .first()
      .click();
    const person = people.find((p) => p.id === personId);
    await page
      .getByRole("heading", { name: person.full_name, exact: true })
      .waitFor();
    await page.locator("button.absolute.top-4.right-4").click();
    await page.getByRole("link", { name: "Books", exact: true }).click();
    await page.locator('[data-dropdown="title"]').waitFor();
    await page.getByRole("link", { name: "People", exact: true }).click();
    await page.locator('[data-dropdown="full_name"]').waitFor();
    assert.equal(
      requests.filter((u) => u.includes("/api/catalog/people")).length,
      1,
      "Revisit uses cached catalog",
    );
    assert.equal(
      requests.filter(
        (u) => u.includes("_rsc=") && new URL(u).pathname === "/booklist",
      ).length,
      0,
      "Query interactions never request home RSC",
    );
    await page.getByRole("link", { name: "Books", exact: true }).click();
    await page.locator('[data-dropdown="title"]').waitFor();

    await page.setViewportSize({ width: 390, height: 844 });
    await scroller.evaluate((e) => {
      e.scrollTop = 30000;
      e.scrollLeft = 500;
    });
    await page.waitForTimeout(100);
    assert.ok(
      await scroller
        .locator("[data-row-id]")
        .evaluateAll((rows) =>
          rows.every((r) => r.clientHeight === 56 && r.scrollHeight === 56),
        ),
    );

    assert.deepEqual(errors, []);
    console.log(
      "PASS interactions: scrolling, final row, details, history, filters, sorting, lazy people, mobile, no runtime errors.",
    );
    console.log(
      "API requests",
      requests.filter((u) => u.includes("/api/")),
    );
    await page.close();
    const direct = await browser.newPage();
    await direct.goto(base + "?view=people&full_name=paul");
    await direct.getByText(new RegExp(`of ${people.length} people`)).waitFor();
    assert.ok(
      (await direct.locator("[data-row-id]").allInnerTexts()).every((t) =>
        t.toLowerCase().includes("paul"),
      ),
    );
    console.log("PASS direct filtered people URL");
    await direct.close();
    const retries = await browser.newPage();
    await retries.goto(base);
    await retries.getByText(`${books.length} books`, { exact: true }).waitFor();
    await retries.route("**/api/catalog/people", (r) =>
      r.fulfill({ status: 503, body: "Unavailable" }),
    );
    await retries.getByRole("link", { name: "People", exact: true }).click();
    await retries
      .getByRole("alert")
      .filter({ hasText: "Couldn’t load the people." })
      .waitFor();
    await retries.unroute("**/api/catalog/people");
    await retries
      .getByRole("button", { name: "Try again", exact: true })
      .click();
    await retries.locator('[data-dropdown="full_name"]').waitFor();
    await retries.route("**/api/entities/*", (r) =>
      r.fulfill({ status: 503, body: "Unavailable" }),
    );
    await retries
      .locator("[data-row-id]")
      .first()
      .locator(":scope > div")
      .first()
      .click();
    await retries
      .getByRole("alert")
      .filter({ hasText: "Couldn’t load this item." })
      .waitFor();
    await retries.unroute("**/api/entities/*");
    await retries
      .getByRole("button", { name: "Try again", exact: true })
      .click();
    await retries.getByRole("heading", { level: 1 }).waitFor();
    assert.equal(
      (await retries.request.get(base + "/api/entities/missing")).status(),
      404,
    );
    assert.equal(
      (await retries.request.get(base + "/api/catalog/missing")).status(),
      404,
    );
    console.log("PASS catalog/detail retry and unknown-item handling");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
