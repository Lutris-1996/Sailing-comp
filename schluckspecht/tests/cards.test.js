'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/engine.js');
const DECKS = require('../js/cards.js');

const ALL = Engine.collectCards(DECKS, DECKS.map((d) => d.id));
const TOKEN = /\{([^}]*)\}/g;

test('Stapel haben eindeutige IDs, Namen und genug Karten', () => {
  const ids = DECKS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const deck of DECKS) {
    assert.ok(deck.name && deck.emoji && deck.description, `Metadaten fehlen: ${deck.id}`);
    assert.ok(deck.cards.length >= 25, `${deck.id} hat zu wenige Karten`);
    const types = new Set(deck.cards.map((c) => c.type));
    for (const t of ['aufgabe', 'spiel', 'abstimmung', 'regel']) {
      assert.ok(types.has(t), `${deck.id} enthält keinen Typ ${t}`);
    }
    // Jeder Stapel muss auch zu zweit spielbar sein.
    const twoPlayer = deck.cards.filter((c) => c.type !== 'regel' && Engine.minPlayers(c) <= 2);
    assert.ok(twoPlayer.length >= 15, `${deck.id} hat zu wenige Karten für 2 Personen`);
  }
});

test('Karten-IDs sind eindeutig', () => {
  const ids = ALL.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('Keine doppelten Kartentexte', () => {
  const texts = ALL.map((c) => c.text);
  const dupes = texts.filter((t, i) => texts.indexOf(t) !== i);
  assert.deepEqual(dupes, []);
});

test('Jede Karte ist gültig aufgebaut', () => {
  for (const card of ALL) {
    const where = `[${card.id}] ${card.text}`;
    assert.ok(Engine.TYPES[card.type] && card.type !== 'regelende', `Typ ungültig: ${where}`);
    assert.equal(typeof card.text, 'string', where);
    assert.ok(card.text.trim() === card.text && card.text.length > 10, `Text ungültig: ${where}`);
    assert.ok(!/\s{2,}/.test(card.text), `doppelte Leerzeichen: ${where}`);
    assert.ok(/[.!?]$/.test(card.text), `kein Satzende: ${where}`);
    assert.ok(!/^\{[sS]\}/.test(card.text), `darf nicht mit Schlucken beginnen: ${where}`);
    assert.ok(!/["']/.test(card.text), `gerade Anführungszeichen/Apostroph: ${where}`);
    assert.ok(!/\b(er|sie)\/(sie|er)\b/i.test(card.text), `Pronomen vermeiden: ${where}`);

    const tokens = [...card.text.matchAll(TOKEN), ...(card.end ? [...card.end.matchAll(TOKEN)] : [])].map((m) => m[1]);
    tokens.forEach((t) => assert.ok(/^([1-3]|s|S)$/.test(t), `unbekannter Platzhalter {${t}}: ${where}`));
    assert.equal((card.text.match(/[{}]/g) || []).length % 2, 0, `Klammern unausgeglichen: ${where}`);

    // Platzhalter lückenlos: {2} nur, wenn auch {1} vorkommt usw.
    const n = Engine.playersNeeded(card);
    for (let i = 1; i <= n; i++) {
      assert.ok(card.text.includes(`{${i}}`), `{${i}} fehlt im Text: ${where}`);
    }

    if (card.type === 'regel') {
      assert.equal(typeof card.end, 'string', `Regel ohne Endtext: ${where}`);
      assert.ok(/[.!?]$/.test(card.end), `Endtext ohne Satzende: ${where}`);
      assert.ok(!/\{[sS]\}/.test(card.end), `Endtext sollte keine Schlucke enthalten: ${where}`);
      // Namen im Endtext müssen im Regeltext vorkommen.
      for (const m of card.end.matchAll(/\{([1-9])\}/g)) {
        assert.ok(card.text.includes(m[0]), `Endtext nennt ${m[0]}, Regel nicht: ${where}`);
      }
    } else {
      assert.equal(card.end, undefined, `Nur Regeln haben einen Endtext: ${where}`);
    }

    if (card.type === 'abstimmung') {
      assert.ok(card.text.includes('Auf drei zeigen alle'), `Abstimmung ohne Anleitung: ${where}`);
    }
  }
});

test('Jede Karte lässt sich mit jeder passenden Personenzahl und jeder Schluckzahl fehlerfrei darstellen', () => {
  const names = ['Anna', 'Ben', 'Chris', 'Dana', 'Emre'];
  for (const card of ALL) {
    for (let sips = 1; sips <= 4; sips++) {
      const parts = Engine.renderParts(card.text, names, sips);
      const text = Engine.partsToText(parts);
      assert.ok(!/[{}]/.test(text), text);
      assert.ok(!/\b1 Schlucke\b/.test(text) && !/\b([2-9]|\d{2,}) Schluck\b/.test(text), `Grammatik: ${text}`);
      if (card.end) assert.ok(!/[{}]/.test(Engine.partsToText(Engine.renderParts(card.end, names, sips))));
    }
  }
});
