/*
 * Schluckspecht – Spiellogik.
 * Läuft im Browser (window.SchluckEngine) und in Node (module.exports),
 * ohne Abhängigkeiten. Enthält keinerlei DOM-Code, damit sie testbar bleibt.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SchluckEngine = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TYPES = {
    aufgabe: { label: 'Aufgabe' },
    spiel: { label: 'Spiel' },
    abstimmung: { label: 'Abstimmung' },
    regel: { label: 'Neue Regel' },
    regelende: { label: 'Regel vorbei' }
  };

  /** Schluck-Spannen je Intensität: [min, max] für {s}. {S} ist das Doppelte (gedeckelt). */
  var INTENSITY = {
    sanft: { label: 'Sanft', range: [1, 2] },
    normal: { label: 'Normal', range: [1, 3] },
    kraeftig: { label: 'Kräftig', range: [2, 4] }
  };

  var MAX_DOUBLE_SIPS = 6;
  var MIN_PLAYERS = 2;
  var MAX_ACTIVE_RULES = 2;
  /** Regeln werden nur gezogen, wenn noch mindestens so viele Karten übrig sind. */
  var RULE_MIN_REMAINING = 6;
  var RULE_DURATION = [6, 12];

  var TOKEN = /\{([1-9]|s|S)\}/g;

  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function shuffle(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function sipsText(n) {
    return n + (n === 1 ? ' Schluck' : ' Schlucke');
  }

  /** Höchster Spieler-Platzhalter ({1}, {2}, …) in Text und Endtext einer Karte. */
  function playersNeeded(card) {
    var max = 0;
    var source = card.text + ' ' + (card.end || '');
    source.replace(TOKEN, function (_, key) {
      var n = parseInt(key, 10);
      if (!isNaN(n) && n > max) max = n;
      return _;
    });
    return max;
  }

  function minPlayers(card) {
    var min = Math.max(MIN_PLAYERS, playersNeeded(card), card.min || 0);
    // Abstimmungen ergeben erst ab drei Personen Sinn (sonst ständig Gleichstand).
    if (card.type === 'abstimmung') min = Math.max(min, 3);
    return min;
  }

  /**
   * Zerlegt eine Vorlage in Teile: {kind: 'text'|'name'|'sips', text}.
   * names[0] ersetzt {1}, names[1] ersetzt {2} usw.
   */
  function renderParts(template, names, sips) {
    var parts = [];
    var last = 0;
    var doubled = Math.min(sips * 2, MAX_DOUBLE_SIPS);
    template.replace(TOKEN, function (match, key, offset) {
      if (offset > last) parts.push({ kind: 'text', text: template.slice(last, offset) });
      if (key === 's') {
        parts.push({ kind: 'sips', text: sipsText(sips) });
      } else if (key === 'S') {
        parts.push({ kind: 'sips', text: sipsText(doubled) });
      } else {
        var name = names[parseInt(key, 10) - 1];
        if (typeof name !== 'string') {
          throw new Error('Kein Name für Platzhalter ' + match + ' vorhanden.');
        }
        parts.push({ kind: 'name', text: name });
      }
      last = offset + match.length;
      return match;
    });
    if (last < template.length) parts.push({ kind: 'text', text: template.slice(last) });
    return parts;
  }

  function partsToText(parts) {
    return parts.map(function (p) { return p.text; }).join('');
  }

  function normalizeName(name) {
    return String(name == null ? '' : name).replace(/\s+/g, ' ').trim();
  }

  /** Sammelt die Karten der gewählten Stapel und versieht sie mit stabilen IDs. */
  function collectCards(decks, deckIds) {
    var wanted = {};
    (deckIds || []).forEach(function (id) { wanted[id] = true; });
    var out = [];
    decks.forEach(function (deck) {
      if (!wanted[deck.id]) return;
      deck.cards.forEach(function (card, i) {
        out.push({
          id: card.id || deck.id + '-' + i,
          deck: deck.id,
          type: card.type,
          text: card.text,
          end: card.end,
          min: card.min,
          duration: card.duration
        });
      });
    });
    return out;
  }

  /**
   * Ein Spiel. Optionen:
   *  players   – Namen (mind. 2, eindeutig)
   *  cards     – Karten (siehe collectCards)
   *  intensity – Schlüssel aus INTENSITY (Standard: normal)
   *  length    – Anzahl Karten, 0 = endlos
   *  rng       – Zufallsfunktion wie Math.random (für Tests austauschbar)
   */
  function Game(options) {
    var opts = options || {};
    this.rng = typeof opts.rng === 'function' ? opts.rng : Math.random;

    var seen = {};
    var players = (opts.players || []).map(normalizeName).filter(function (n) {
      var key = n.toLowerCase();
      if (!n || seen[key]) return false;
      seen[key] = true;
      return true;
    });
    if (players.length < MIN_PLAYERS) {
      throw new Error('Es werden mindestens ' + MIN_PLAYERS + ' Mitspielende benötigt.');
    }
    this.players = players;

    this.intensity = INTENSITY[opts.intensity] ? opts.intensity : 'normal';
    var length = parseInt(opts.length, 10);
    this.length = isNaN(length) || length < 0 ? 0 : length;
    this.maxActiveRules = typeof opts.maxActiveRules === 'number' ? opts.maxActiveRules : MAX_ACTIVE_RULES;

    var count = players.length;
    this.pool = (opts.cards || []).filter(function (card) {
      return TYPES[card.type] && card.type !== 'regelende' && minPlayers(card) <= count;
    });
    var hasPlain = this.pool.some(function (card) { return card.type !== 'regel'; });
    if (!hasPlain) {
      throw new Error('Für diese Auswahl gibt es keine passenden Karten. Wähle einen anderen Kartenstapel.');
    }

    this.drawPile = shuffle(this.pool, this.rng);
    this.discard = [];
    this.index = 0;
    this.lastId = null;
    this.ruleSeq = 0;
    this.active = [];
    this.pending = [];
    this.counts = {};
    var self = this;
    players.forEach(function (p) { self.counts[p] = 0; });
  }

  Game.prototype.isOver = function () {
    return this.length > 0 && this.index >= this.length && this.pending.length === 0;
  };

  Game.prototype.remaining = function () {
    return this.length > 0 ? Math.max(0, this.length - this.index) : Infinity;
  };

  Game.prototype._ruleAllowed = function () {
    return this.active.length < this.maxActiveRules && this.remaining() >= RULE_MIN_REMAINING;
  };

  Game.prototype._pickIndex = function (pile, avoidId) {
    var allowRule = this._ruleAllowed();
    var fallback = -1;
    for (var i = 0; i < pile.length; i++) {
      var card = pile[i];
      if (card.type === 'regel' && !allowRule) continue;
      if (card.id === avoidId) {
        if (fallback < 0) fallback = i;
        continue;
      }
      return i;
    }
    return fallback;
  };

  Game.prototype._draw = function () {
    var i = this._pickIndex(this.drawPile, this.lastId);
    if (i < 0) {
      // Stapel aufgebraucht oder nur gesperrte Regeln übrig: alles neu mischen.
      this.drawPile = shuffle(this.drawPile.concat(this.discard), this.rng);
      this.discard = [];
      i = this._pickIndex(this.drawPile, this.lastId);
    }
    // Der Pool enthält immer mindestens eine Nicht-Regel-Karte, daher ist i hier >= 0.
    var card = this.drawPile.splice(i, 1)[0];
    this.discard.push(card);
    this.lastId = card.id;
    return card;
  };

  /** Wählt n verschiedene Personen, bevorzugt diejenigen, die bisher seltener dran waren. */
  Game.prototype._pickPlayers = function (n) {
    var counts = this.counts;
    var order = shuffle(this.players, this.rng).map(function (name, i) {
      return { name: name, i: i };
    });
    order.sort(function (a, b) {
      return (counts[a.name] - counts[b.name]) || (a.i - b.i);
    });
    var picked = order.slice(0, n).map(function (o) { return o.name; });
    picked.forEach(function (name) { counts[name] += 1; });
    return picked;
  };

  Game.prototype._snapshot = function () {
    return this.active.map(function (r) {
      return { key: r.key, text: r.text, parts: r.parts.slice() };
    });
  };

  Game.prototype._emit = function (type, parts, extra) {
    this.index += 1;
    var out = {
      type: type,
      label: TYPES[type].label,
      parts: parts,
      text: partsToText(parts),
      position: this.index,
      total: this.length,
      activeRules: this._snapshot()
    };
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
      }
    }
    return out;
  };

  /** Liefert die nächste Karte oder null, wenn das Spiel vorbei ist. */
  Game.prototype.next = function () {
    if (this.isOver()) return null;

    var gameEnding = this.length > 0 && this.index >= this.length;
    var dueIdx = -1;
    for (var i = 0; i < this.pending.length; i++) {
      var p = this.pending[i];
      if ((p.dueAt <= this.index || gameEnding) && (dueIdx < 0 || p.dueAt < this.pending[dueIdx].dueAt)) {
        dueIdx = i;
      }
    }
    if (dueIdx >= 0) {
      var ending = this.pending.splice(dueIdx, 1)[0];
      this.active = this.active.filter(function (r) { return r.key !== ending.key; });
      return this._emit('regelende', ending.parts, { ruleKey: ending.key });
    }

    var card = this._draw();
    var names = this._pickPlayers(playersNeeded(card));
    var range = INTENSITY[this.intensity].range;
    var sips = randInt(this.rng, range[0], range[1]);
    var parts = renderParts(card.text, names, sips);

    if (card.type === 'regel') {
      var key = ++this.ruleSeq;
      var duration = card.duration || randInt(this.rng, RULE_DURATION[0], RULE_DURATION[1]);
      var position = this.index; // 0-basierte Position dieser Regelkarte
      var dueAt = position + duration;
      if (this.length > 0) dueAt = Math.min(dueAt, this.length - 1);
      this.active.push({ key: key, text: partsToText(parts), parts: parts });
      this.pending.push({ key: key, dueAt: dueAt, parts: renderParts(card.end, names, sips) });
      return this._emit('regel', parts, { cardId: card.id, ruleKey: key });
    }

    return this._emit(card.type, parts, { cardId: card.id });
  };

  return {
    TYPES: TYPES,
    INTENSITY: INTENSITY,
    MIN_PLAYERS: MIN_PLAYERS,
    MAX_DOUBLE_SIPS: MAX_DOUBLE_SIPS,
    TOKEN: TOKEN,
    Game: Game,
    collectCards: collectCards,
    renderParts: renderParts,
    partsToText: partsToText,
    playersNeeded: playersNeeded,
    minPlayers: minPlayers,
    normalizeName: normalizeName,
    sipsText: sipsText,
    shuffle: shuffle
  };
});
