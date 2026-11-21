'use strict';
/*
 * Browser-Test: bedient die App wie ein Mensch auf einem Handy.
 * Benötigt Playwright mit Chromium. Fehlt Playwright, werden die Tests übersprungen.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('./server.js');

let chromium = null;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  chromium = null;
}

const skip = chromium ? false : 'Playwright ist nicht installiert';

test.describe('Schluckspecht im Browser', { skip }, () => {
  let server;
  let browser;
  let base;

  test.before(async () => {
    server = createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}/`;
    browser = await chromium.launch();
  });

  test.after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  async function newPage() {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      serviceWorkers: 'block'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(base);
    return { page, context, errors };
  }

  async function visible(page, selector) {
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
    return true;
  }

  async function addPlayers(page, names) {
    for (const name of names) {
      await page.fill('#player-input', name);
      await page.press('#player-input', 'Enter');
    }
  }

  test('kompletter Spielablauf mit 30 Karten', async () => {
    const { page, context, errors } = await newPage();

    assert.equal(await page.isDisabled('#start-btn'), true);
    assert.match(await page.textContent('#start-hint'), /mindestens 2/);

    await addPlayers(page, ['Anna', 'Ben', 'Chris']);
    assert.equal(await page.locator('#player-list .chip').count(), 3);
    assert.equal(await page.isDisabled('#start-btn'), false);

    // Doppelter Name wird abgelehnt, leerer Name auch.
    await addPlayers(page, ['anna']);
    assert.equal(await page.locator('#player-list .chip').count(), 3);
    assert.equal(await page.isVisible('#player-error'), true);
    await addPlayers(page, ['   ']);
    assert.equal(await page.locator('#player-list .chip').count(), 3);

    // Altersabfrage beim ersten Start.
    await page.click('#start-btn');
    assert.equal(await page.isVisible('#age-dialog'), true);
    await page.click('#age-dialog button[value="confirm"]');
    assert.equal(await visible(page, '#screen-game'), true);

    const first = await page.textContent('#card-text');
    assert.ok(first.length > 5);
    assert.equal(await page.textContent('#card-counter'), '1/30');
    assert.equal(await page.isDisabled('#back-btn'), true);

    // Weiter und zurück.
    await page.waitForTimeout(300);
    await page.click('#card-stage');
    assert.equal(await page.textContent('#card-counter'), '2/30');
    const second = await page.textContent('#card-text');
    await page.click('#back-btn');
    assert.equal(await page.textContent('#card-counter'), '1/30');
    assert.equal(await page.textContent('#card-text'), first);
    await page.waitForTimeout(300);
    await page.click('#card-stage');
    assert.equal(await page.textContent('#card-text'), second, 'Vorwärts nach Zurück zeigt dieselbe Karte');

    // Durchspielen per Tastatur bis zum Ende.
    for (let i = 0; i < 60 && (await page.isVisible('#screen-game')); i++) {
      const text = await page.textContent('#card-text');
      assert.ok(!/[{}]|undefined|NaN/.test(text), `kaputte Karte: ${text}`);
      const rulesVisible = await page.isVisible('#rules-btn');
      if (rulesVisible && i % 5 === 0) {
        await page.click('#rules-btn');
        assert.ok((await page.locator('#rules-list li').count()) >= 1);
        await page.click('#rules-dialog button[value="close"]');
        await page.waitForSelector('#rules-dialog', { state: 'hidden' });
      }
      await page.keyboard.press('ArrowRight');
    }
    assert.equal(await page.isVisible('#screen-end'), true);
    assert.match(await page.textContent('#end-summary'), /Ihr habt \d+ Karten gespielt/);

    // Nochmal spielen fragt nicht erneut nach dem Alter.
    await page.click('#again-btn');
    assert.equal(await visible(page, '#screen-game'), true);
    assert.equal(await page.textContent('#card-counter'), '1/30');

    // Beenden mit Abbrechen und dann Bestätigen.
    await page.click('#exit-btn');
    await page.click('#exit-dialog button[value="cancel"]');
    await page.waitForSelector('#exit-dialog', { state: 'hidden' });
    assert.equal(await page.isVisible('#screen-game'), true);
    await page.click('#exit-btn');
    await page.click('#exit-dialog button[value="confirm"]');
    assert.equal(await visible(page, '#screen-home'), true);

    assert.deepEqual(errors, []);
    await context.close();
  });

  test('Einstellungen und Namen bleiben nach dem Neuladen erhalten', async () => {
    const { page, context, errors } = await newPage();
    await addPlayers(page, ['Lea', 'Mo']);
    await page.click('#deck-list [data-deck="truth"]');
    await page.click('#deck-list [data-deck="party"]');
    await page.click('label:has(input[name="intensity"][value="sanft"])');
    await page.click('label:has(input[name="length"][value="0"])');
    await page.reload();

    const names = await page.locator('#player-list .chip-name').allTextContents();
    assert.deepEqual(names, ['Lea', 'Mo']);
    assert.equal(await page.getAttribute('[data-deck="truth"]', 'aria-pressed'), 'true');
    assert.equal(await page.getAttribute('[data-deck="party"]', 'aria-pressed'), 'false');
    assert.equal(await page.isChecked('input[name="intensity"][value="sanft"]'), true);
    assert.equal(await page.isChecked('input[name="length"][value="0"]'), true);

    // Person entfernen.
    await page.click('#player-list .chip-remove >> nth=0');
    assert.deepEqual(await page.locator('#player-list .chip-name').allTextContents(), ['Mo']);
    assert.equal(await page.isDisabled('#start-btn'), true);

    // Ohne Stapel kein Start.
    await addPlayers(page, ['Nia']);
    await page.click('#deck-list [data-deck="truth"]');
    await page.click('#deck-list [data-deck="warmup"]');
    assert.equal(await page.isDisabled('#start-btn'), true);
    assert.match(await page.textContent('#start-hint'), /Kartenstapel/);

    assert.deepEqual(errors, []);
    await context.close();
  });

  test('Endlosmodus zu zweit, Namen werden als Text und nicht als HTML eingefügt', async () => {
    const { page, context, errors } = await newPage();
    await addPlayers(page, ['<b>X</b>', 'Ölf']);
    await page.click('label:has(input[name="length"][value="0"])');
    await page.click('#start-btn');
    await page.click('#age-dialog button[value="confirm"]');
    await visible(page, '#screen-game');

    for (let i = 0; i < 150; i++) {
      assert.equal(await page.locator('#card-text b').count(), 0, 'kein HTML aus Namen');
      const counter = await page.textContent('#card-counter');
      assert.equal(counter, String(i + 1));
      assert.notEqual(await page.getAttribute('#screen-game', 'data-type'), 'abstimmung', 'zu zweit keine Abstimmungen');
      await page.keyboard.press('ArrowRight');
    }
    assert.equal(await page.isVisible('#screen-game'), true);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test('Altersabfrage abgelehnt: Spiel startet nicht', async () => {
    const { page, context, errors } = await newPage();
    await addPlayers(page, ['A', 'B']);
    await page.click('#start-btn');
    await page.click('#age-dialog button[value="cancel"]');
    await page.waitForSelector('#age-dialog', { state: 'hidden' });
    await page.waitForTimeout(200);
    assert.equal(await page.isVisible('#screen-home'), true);
    assert.equal(await page.isVisible('#screen-game'), false);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test('Kein horizontales Scrollen auf schmalen Bildschirmen', async () => {
    for (const width of [320, 390, 768]) {
      const context = await browser.newContext({ viewport: { width, height: 700 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      await page.goto(base);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `horizontaler Überlauf bei ${width}px: ${overflow}`);
      await context.close();
    }
  });

  test('Service Worker registriert sich und die App lädt offline', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(base);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Warten, bis der Service Worker die Seite kontrolliert.
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    assert.equal(await page.textContent('h1'), 'Schluckspecht');
    assert.equal(await page.locator('#deck-list .deck').count(), 4);
    await context.setOffline(false);
    assert.deepEqual(errors, []);
    await context.close();
  });
});
