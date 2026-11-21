'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/engine.js');
const DECKS = require('../js/cards.js');

/** Deterministischer Zufallsgenerator (mulberry32). */
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALL_DECKS = DECKS.map((d) => d.id);
const NAMES = ['Anna', 'Ben', 'Chris', 'Dana', 'Emre', 'Fiona', 'Gabi', 'Hanna', 'Ilyas', 'Jule'];

function play(game, limit = 10000) {
  const cards = [];
  let c;
  while ((c = game.next()) && cards.length < limit) cards.push(c);
  return cards;
}

test('sipsText verwendet Singular und Plural korrekt', () => {
  assert.equal(Engine.sipsText(1), '1 Schluck');
  assert.equal(Engine.sipsText(2), '2 Schlucke');
  assert.equal(Engine.sipsText(6), '6 Schlucke');
});

test('renderParts ersetzt Namen und Schlucke, {S} ist gedeckelt', () => {
  const parts = Engine.renderParts('{1} gibt {2} {s}, sonst {S}.', ['Anna', 'Ben'], 4);
  assert.equal(Engine.partsToText(parts), 'Anna gibt Ben 4 Schlucke, sonst 6 Schlucke.');
  assert.deepEqual(parts.map((p) => p.kind), ['name', 'text', 'name', 'text', 'sips', 'text', 'sips', 'text']);
  assert.equal(Engine.partsToText(Engine.renderParts('{s} und {S}', [], 1)), '1 Schluck und 2 Schlucke');
});

test('renderParts wirft bei fehlendem Namen', () => {
  assert.throws(() => Engine.renderParts('{2} trinkt', ['Anna'], 1));
});

test('Namen mit Sonderzeichen werden unverändert übernommen (kein Ersetzungsmuster)', () => {
  const parts = Engine.renderParts('{1} trinkt {s}.', ['$& <b>Max</b> $1'], 2);
  assert.equal(Engine.partsToText(parts), '$& <b>Max</b> $1 trinkt 2 Schlucke.');
});

test('playersNeeded und minPlayers', () => {
  assert.equal(Engine.playersNeeded({ text: 'Alle trinken {s}.' }), 0);
  assert.equal(Engine.playersNeeded({ text: '{1} und {3}', end: '{2}' }), 3);
  assert.equal(Engine.minPlayers({ type: 'aufgabe', text: '{1}' }), 2);
  assert.equal(Engine.minPlayers({ type: 'abstimmung', text: 'Wer?' }), 3);
  assert.equal(Engine.minPlayers({ type: 'aufgabe', text: '{1}', min: 4 }), 4);
});

test('Spiel braucht mindestens zwei verschiedene Namen', () => {
  const cards = Engine.collectCards(DECKS, ALL_DECKS);
  assert.throws(() => new Engine.Game({ players: ['Anna'], cards }));
  assert.throws(() => new Engine.Game({ players: ['Anna', ' anna '], cards }));
  assert.throws(() => new Engine.Game({ players: ['Anna', '   '], cards }));
  assert.doesNotThrow(() => new Engine.Game({ players: ['Anna', 'Ben'], cards }));
});

test('Spiel ohne passende Karten wirft eine verständliche Fehlermeldung', () => {
  assert.throws(() => new Engine.Game({ players: ['A', 'B'], cards: [] }), /keine passenden Karten/);
  const onlyRules = [{ id: 'r', type: 'regel', text: 'x', end: 'y' }];
  assert.throws(() => new Engine.Game({ players: ['A', 'B'], cards: onlyRules }), /keine passenden Karten/);
});

test('Spiellänge wird eingehalten (plus höchstens nachgereichte Regel-Enden)', () => {
  for (const length of [1, 5, 30, 50]) {
    for (let seed = 1; seed <= 40; seed++) {
      const game = new Engine.Game({
        players: NAMES.slice(0, 4),
        cards: Engine.collectCards(DECKS, ALL_DECKS),
        length,
        rng: seeded(seed)
      });
      const cards = play(game);
      assert.ok(cards.length >= length, `zu wenige Karten (${cards.length}/${length})`);
      const extra = cards.slice(length);
      assert.ok(extra.every((c) => c.type === 'regelende'), 'nach dem Ende dürfen nur Regel-Enden kommen');
      assert.ok(game.isOver());
      assert.equal(game.next(), null);
      assert.equal(cards[cards.length - 1].activeRules.length, 0, 'am Ende sind alle Regeln aufgehoben');
    }
  }
});

test('Jede Regel endet genau einmal, mit denselben Namen und in der richtigen Reihenfolge', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const game = new Engine.Game({
      players: NAMES.slice(0, 3 + (seed % 6)),
      cards: Engine.collectCards(DECKS, ALL_DECKS),
      length: [30, 50][seed % 2],
      rng: seeded(seed)
    });
    const cards = play(game);
    const open = new Map();
    for (const c of cards) {
      if (c.type === 'regel') {
        assert.ok(!open.has(c.ruleKey));
        open.set(c.ruleKey, c);
        assert.ok(c.activeRules.some((r) => r.key === c.ruleKey));
      } else if (c.type === 'regelende') {
        assert.ok(open.has(c.ruleKey), 'Regel-Ende ohne Regel');
        const start = open.get(c.ruleKey);
        const startNames = start.parts.filter((p) => p.kind === 'name').map((p) => p.text);
        const endNames = c.parts.filter((p) => p.kind === 'name').map((p) => p.text);
        endNames.forEach((n) => assert.ok(startNames.includes(n), `Name ${n} passt nicht zur Regel`));
        assert.ok(!c.activeRules.some((r) => r.key === c.ruleKey));
        open.delete(c.ruleKey);
      }
      assert.ok(c.activeRules.length <= 2, 'höchstens zwei Regeln gleichzeitig');
    }
    assert.equal(open.size, 0, 'alle Regeln wurden beendet');
  }
});

test('Gezeigte aktive Regeln stimmen mit dem Spielverlauf überein', () => {
  const game = new Engine.Game({
    players: NAMES.slice(0, 5),
    cards: Engine.collectCards(DECKS, ALL_DECKS),
    length: 0,
    rng: seeded(99)
  });
  const active = new Set();
  for (let i = 0; i < 500; i++) {
    const c = game.next();
    if (c.type === 'regel') active.add(c.ruleKey);
    if (c.type === 'regelende') active.delete(c.ruleKey);
    assert.deepEqual(new Set(c.activeRules.map((r) => r.key)), active);
  }
});

test('Pro Karte verschiedene Namen, alle Platzhalter ersetzt, faire Verteilung', () => {
  for (let n = 2; n <= NAMES.length; n++) {
    const players = NAMES.slice(0, n);
    const game = new Engine.Game({
      players,
      cards: Engine.collectCards(DECKS, ALL_DECKS),
      length: 0,
      rng: seeded(n * 7)
    });
    const seen = Object.fromEntries(players.map((p) => [p, 0]));
    for (let i = 0; i < 400; i++) {
      const c = game.next();
      assert.ok(!/[{}]/.test(c.text), `unersetzter Platzhalter: ${c.text}`);
      assert.ok(!/undefined|NaN|null/.test(c.text), `kaputter Text: ${c.text}`);
      const names = c.parts.filter((p) => p.kind === 'name').map((p) => p.text);
      if (c.type !== 'regelende') {
        const unique = new Set(names);
        assert.ok(unique.size <= n);
        unique.forEach((name) => { seen[name] += 1; });
      }
      names.forEach((name) => assert.ok(players.includes(name)));
    }
    const counts = Object.values(seen);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 3, `unfaire Verteilung bei ${n}: ${counts}`);
  }
});

test('Verschiedene Platzhalter bekommen immer verschiedene Personen', () => {
  const cards = [{ id: 'x', type: 'aufgabe', text: '{1}|{2}|{3}' }];
  const game = new Engine.Game({ players: ['A', 'B', 'C'], cards, length: 0, rng: seeded(5) });
  for (let i = 0; i < 200; i++) {
    const names = game.next().text.split('|');
    assert.equal(new Set(names).size, 3);
  }
});

test('Karten mit zu vielen Platzhaltern und Abstimmungen werden bei zu wenigen Personen ausgefiltert', () => {
  const cards = Engine.collectCards(DECKS, ALL_DECKS);
  const game = new Engine.Game({ players: ['Anna', 'Ben'], cards, length: 0, rng: seeded(3) });
  assert.ok(game.pool.every((c) => Engine.playersNeeded(c) <= 2));
  assert.ok(game.pool.every((c) => c.type !== 'abstimmung'));
  for (let i = 0; i < 1000; i++) {
    const c = game.next();
    assert.notEqual(c.type, 'abstimmung');
  }
});

test('Innerhalb eines Spiels wiederholt sich keine Karte, solange der Stapel reicht', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const cards = Engine.collectCards(DECKS, ALL_DECKS);
    const game = new Engine.Game({ players: NAMES.slice(0, 6), cards, length: 50, rng: seeded(seed) });
    const ids = play(game).filter((c) => c.cardId).map((c) => c.cardId);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('Endlosspiel mischt neu und zeigt nie zweimal direkt hintereinander dieselbe Karte', () => {
  const cards = Engine.collectCards(DECKS, ['warmup']);
  const game = new Engine.Game({ players: NAMES.slice(0, 4), cards, length: 0, rng: seeded(11) });
  let prev = null;
  for (let i = 0; i < 2000; i++) {
    const c = game.next();
    assert.ok(c);
    if (c.cardId) {
      assert.notEqual(c.cardId, prev);
      prev = c.cardId;
    }
  }
});

test('Kleiner Stapel mit wenigen Karten läuft endlos ohne Fehler', () => {
  const cards = [
    { id: 'a', type: 'aufgabe', text: '{1} trinkt {s}.' },
    { id: 'r', type: 'regel', text: '{1} ist Chef.', end: '{1} ist kein Chef mehr.' }
  ];
  const game = new Engine.Game({ players: ['A', 'B'], cards, length: 0, rng: seeded(2) });
  for (let i = 0; i < 500; i++) assert.ok(game.next());
});

test('Schlucke liegen im Bereich der gewählten Intensität', () => {
  const cards = [{ id: 'a', type: 'aufgabe', text: '{s}|{S}' }];
  for (const [key, { range }] of Object.entries(Engine.INTENSITY)) {
    const game = new Engine.Game({ players: ['A', 'B'], cards, intensity: key, length: 0, rng: seeded(1) });
    const seen = new Set();
    for (let i = 0; i < 300; i++) {
      const [single, double] = game.next().text.split('|').map((t) => parseInt(t, 10));
      assert.ok(single >= range[0] && single <= range[1]);
      assert.equal(double, Math.min(single * 2, Engine.MAX_DOUBLE_SIPS));
      seen.add(single);
    }
    assert.equal(seen.size, range[1] - range[0] + 1, `nicht alle Werte für ${key} kommen vor`);
  }
});

test('Unbekannte Intensität und ungültige Länge fallen auf sichere Standardwerte zurück', () => {
  const cards = Engine.collectCards(DECKS, ALL_DECKS);
  const game = new Engine.Game({ players: ['A', 'B'], cards, intensity: 'xyz', length: -5 });
  assert.equal(game.intensity, 'normal');
  assert.equal(game.length, 0);
});

test('Positionen laufen lückenlos hoch', () => {
  const game = new Engine.Game({
    players: NAMES.slice(0, 4),
    cards: Engine.collectCards(DECKS, ALL_DECKS),
    length: 30,
    rng: seeded(8)
  });
  play(game).forEach((c, i) => assert.equal(c.position, i + 1));
});
