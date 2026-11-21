/* Schluckspecht – Oberfläche. Nutzt SchluckEngine und SchluckDecks. */
(function () {
  'use strict';

  var Engine = window.SchluckEngine;
  var DECKS = window.SchluckDecks;
  var STORAGE_KEY = 'schluckspecht:v1';
  var MAX_PLAYERS = 20;
  var MAX_NAME_LENGTH = 20;
  var LENGTHS = [30, 50, 0];
  var TAP_DEBOUNCE_MS = 250;
  var THEME_COLORS = {
    home: '#17131f',
    aufgabe: '#1f8a8a',
    spiel: '#2f9e5b',
    abstimmung: '#d9731f',
    regel: '#6d4ad8',
    regelende: '#4a4f7c'
  };

  function $(id) { return document.getElementById(id); }

  var el = {
    home: $('screen-home'),
    game: $('screen-game'),
    end: $('screen-end'),
    playerForm: $('player-form'),
    playerInput: $('player-input'),
    playerError: $('player-error'),
    playerList: $('player-list'),
    playerEmpty: $('player-empty'),
    playerCount: $('player-count'),
    deckList: $('deck-list'),
    startBtn: $('start-btn'),
    startHint: $('start-hint'),
    exitBtn: $('exit-btn'),
    cardLabel: $('card-label'),
    cardCounter: $('card-counter'),
    cardStage: $('card-stage'),
    cardText: $('card-text'),
    backBtn: $('back-btn'),
    rulesBtn: $('rules-btn'),
    rulesList: $('rules-list'),
    endSummary: $('end-summary'),
    againBtn: $('again-btn'),
    menuBtn: $('menu-btn'),
    exitDialog: $('exit-dialog'),
    rulesDialog: $('rules-dialog'),
    ageDialog: $('age-dialog'),
    themeColor: document.querySelector('meta[name="theme-color"]')
  };

  /* ---------- Einstellungen & Speicher ---------- */

  var validDeckIds = DECKS.map(function (d) { return d.id; });

  function defaults() {
    return { players: [], decks: ['warmup', 'party'], intensity: 'normal', length: 30, ageConfirmed: false };
  }

  function sanitize(raw) {
    var s = defaults();
    if (!raw || typeof raw !== 'object') return s;
    if (Array.isArray(raw.players)) {
      var seen = {};
      s.players = raw.players
        .map(function (n) { return Engine.normalizeName(n).slice(0, MAX_NAME_LENGTH); })
        .filter(function (n) {
          var key = n.toLowerCase();
          if (!n || seen[key]) return false;
          seen[key] = true;
          return true;
        })
        .slice(0, MAX_PLAYERS);
    }
    if (Array.isArray(raw.decks)) {
      s.decks = raw.decks.filter(function (id, i, arr) {
        return validDeckIds.indexOf(id) >= 0 && arr.indexOf(id) === i;
      });
    }
    if (Engine.INTENSITY[raw.intensity]) s.intensity = raw.intensity;
    if (LENGTHS.indexOf(raw.length) >= 0) s.length = raw.length;
    s.ageConfirmed = raw.ageConfirmed === true;
    return s;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return sanitize(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return defaults();
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      /* Speicher nicht verfügbar (z. B. privater Modus) – das Spiel funktioniert trotzdem. */
    }
  }

  var settings = load();

  /* ---------- Mitspielende ---------- */

  function showPlayerError(msg) {
    el.playerError.textContent = msg;
    el.playerError.hidden = !msg;
  }

  function addPlayer(rawName) {
    var name = Engine.normalizeName(rawName).slice(0, MAX_NAME_LENGTH);
    if (!name) {
      showPlayerError('Bitte gib einen Namen ein.');
      return false;
    }
    if (settings.players.length >= MAX_PLAYERS) {
      showPlayerError('Maximal ' + MAX_PLAYERS + ' Mitspielende möglich.');
      return false;
    }
    var lower = name.toLowerCase();
    var exists = settings.players.some(function (p) { return p.toLowerCase() === lower; });
    if (exists) {
      showPlayerError('„' + name + '“ ist schon dabei.');
      return false;
    }
    settings.players.push(name);
    showPlayerError('');
    save();
    renderPlayers();
    updateStart();
    return true;
  }

  function removePlayer(index) {
    settings.players.splice(index, 1);
    showPlayerError('');
    save();
    renderPlayers();
    updateStart();
  }

  function renderPlayers() {
    el.playerList.textContent = '';
    settings.players.forEach(function (name, i) {
      var li = document.createElement('li');
      li.className = 'chip';
      var span = document.createElement('span');
      span.className = 'chip-name';
      span.textContent = name;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-remove';
      btn.setAttribute('aria-label', name + ' entfernen');
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';
      btn.addEventListener('click', function () { removePlayer(i); });
      li.appendChild(span);
      li.appendChild(btn);
      el.playerList.appendChild(li);
    });
    var n = settings.players.length;
    el.playerCount.textContent = n ? String(n) : '';
    el.playerEmpty.hidden = n > 0;
  }

  /* ---------- Kartenstapel & Optionen ---------- */

  function renderDecks() {
    el.deckList.textContent = '';
    DECKS.forEach(function (deck) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'deck';
      btn.dataset.deck = deck.id;
      btn.setAttribute('aria-pressed', settings.decks.indexOf(deck.id) >= 0 ? 'true' : 'false');

      var emoji = document.createElement('span');
      emoji.className = 'deck-emoji';
      emoji.setAttribute('aria-hidden', 'true');
      emoji.textContent = deck.emoji;
      var name = document.createElement('span');
      name.className = 'deck-name';
      name.textContent = deck.name;
      var desc = document.createElement('span');
      desc.className = 'deck-desc';
      desc.textContent = deck.description + ' (' + deck.cards.length + ' Karten)';

      btn.appendChild(emoji);
      btn.appendChild(name);
      btn.appendChild(desc);
      btn.addEventListener('click', function () { toggleDeck(deck.id); });
      el.deckList.appendChild(btn);
    });
  }

  function toggleDeck(id) {
    var i = settings.decks.indexOf(id);
    if (i >= 0) settings.decks.splice(i, 1);
    else settings.decks.push(id);
    save();
    var btn = el.deckList.querySelector('[data-deck="' + id + '"]');
    if (btn) btn.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
    updateStart();
  }

  function initRadios(name, current, onChange) {
    var inputs = document.querySelectorAll('input[name="' + name + '"]');
    Array.prototype.forEach.call(inputs, function (input) {
      input.checked = input.value === String(current);
      input.addEventListener('change', function () {
        if (input.checked) onChange(input.value);
      });
    });
  }

  function startProblem() {
    if (settings.players.length < Engine.MIN_PLAYERS) {
      var missing = Engine.MIN_PLAYERS - settings.players.length;
      return missing === 1 ? 'Noch 1 Person hinzufügen, dann geht’s los.' : 'Füge mindestens 2 Mitspielende hinzu.';
    }
    if (!settings.decks.length) return 'Wähle mindestens einen Kartenstapel.';
    return '';
  }

  function updateStart() {
    var problem = startProblem();
    el.startBtn.disabled = !!problem;
    el.startHint.textContent = problem;
  }

  /* ---------- Bildschirme ---------- */

  function setThemeColor(key) {
    if (el.themeColor) el.themeColor.setAttribute('content', THEME_COLORS[key] || THEME_COLORS.home);
  }

  function showScreen(name) {
    el.home.hidden = name !== 'home';
    el.game.hidden = name !== 'game';
    el.end.hidden = name !== 'end';
    if (name !== 'game') setThemeColor('home');
    window.scrollTo(0, 0);
  }

  /* ---------- Dialoge (mit Fallback für alte Browser) ---------- */

  function ask(dialog, fallbackText, onResult) {
    if (dialog && typeof dialog.showModal === 'function') {
      if (dialog.open) return;
      dialog.returnValue = '';
      var handler = function () {
        dialog.removeEventListener('close', handler);
        onResult(dialog.returnValue === 'confirm');
      };
      dialog.addEventListener('close', handler);
      dialog.showModal();
    } else {
      onResult(window.confirm(fallbackText));
    }
  }

  function anyDialogOpen() {
    return !!document.querySelector('dialog[open]');
  }

  /* ---------- Spiel ---------- */

  var game = null;
  var history = [];
  var pos = -1;
  var lastTap = 0;
  var wakeLock = null;

  function requestStart() {
    if (startProblem()) { updateStart(); return; }
    if (settings.ageConfirmed) {
      startGame();
      return;
    }
    ask(el.ageDialog, 'Schluckspecht ist ein Trinkspiel für Erwachsene. Sind alle mindestens 18 Jahre alt?', function (ok) {
      if (!ok) return;
      settings.ageConfirmed = true;
      save();
      startGame();
    });
  }

  function startGame() {
    try {
      game = new Engine.Game({
        players: settings.players.slice(),
        cards: Engine.collectCards(DECKS, settings.decks),
        intensity: settings.intensity,
        length: settings.length
      });
    } catch (e) {
      el.startHint.textContent = e.message;
      return;
    }
    history = [];
    pos = -1;
    lastTap = 0;
    showScreen('game');
    advance();
    el.cardStage.focus({ preventScroll: true });
    requestWakeLock();
  }

  function advance() {
    if (!game) return;
    if (pos < history.length - 1) {
      pos += 1;
      renderCard(history[pos]);
      return;
    }
    var card = game.next();
    if (!card) {
      finishGame();
      return;
    }
    history.push(card);
    pos = history.length - 1;
    renderCard(card);
  }

  function goBack() {
    if (pos > 0) {
      pos -= 1;
      renderCard(history[pos]);
    }
  }

  function renderCard(card) {
    el.game.dataset.type = card.type;
    setThemeColor(card.type);
    el.cardLabel.textContent = card.label;

    el.cardText.textContent = '';
    card.parts.forEach(function (part) {
      if (part.kind === 'name' || part.kind === 'sips') {
        var span = document.createElement(part.kind === 'name' ? 'strong' : 'span');
        span.className = part.kind;
        span.textContent = part.text;
        el.cardText.appendChild(span);
      } else {
        el.cardText.appendChild(document.createTextNode(part.text));
      }
    });

    var len = card.text.length;
    el.cardText.classList.remove('len-m', 'len-l', 'enter');
    if (len > 150) el.cardText.classList.add('len-l');
    else if (len > 90) el.cardText.classList.add('len-m');
    void el.cardText.offsetWidth; // Animation neu starten
    el.cardText.classList.add('enter');

    var number = pos + 1;
    el.cardCounter.textContent = card.total > 0 ? Math.min(number, card.total) + '/' + card.total : String(number);
    el.backBtn.disabled = pos <= 0;

    var rules = card.activeRules;
    el.rulesBtn.hidden = rules.length === 0;
    el.rulesBtn.textContent = rules.length === 1 ? '1 Regel aktiv' : rules.length + ' Regeln aktiv';
    el.cardStage.scrollTop = 0;
  }

  function showRules() {
    var card = history[pos];
    if (!card) return;
    el.rulesList.textContent = '';
    card.activeRules.forEach(function (rule) {
      var li = document.createElement('li');
      li.textContent = rule.text;
      el.rulesList.appendChild(li);
    });
    if (typeof el.rulesDialog.showModal === 'function') {
      if (!el.rulesDialog.open) el.rulesDialog.showModal();
    } else {
      window.alert(card.activeRules.map(function (r) { return '• ' + r.text; }).join('\n'));
    }
  }

  function finishGame() {
    var played = history.length;
    el.endSummary.textContent = 'Ihr habt ' + played + (played === 1 ? ' Karte' : ' Karten') +
      ' gespielt. Alle Regeln sind aufgehoben – trinkt noch ein Glas Wasser!';
    game = null;
    releaseWakeLock();
    showScreen('end');
    el.againBtn.focus({ preventScroll: true });
  }

  function leaveGame() {
    game = null;
    history = [];
    pos = -1;
    releaseWakeLock();
    showScreen('home');
    updateStart();
  }

  function onStageTap() {
    var now = Date.now();
    if (now - lastTap < TAP_DEBOUNCE_MS) return;
    lastTap = now;
    advance();
  }

  /* ---------- Bildschirm anlassen (falls unterstützt) ---------- */

  function requestWakeLock() {
    if (!('wakeLock' in navigator) || wakeLock) return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      lock.addEventListener('release', function () {
        if (wakeLock === lock) wakeLock = null;
      });
    }).catch(function () { /* nicht erlaubt – egal */ });
  }

  function releaseWakeLock() {
    if (wakeLock) {
      var lock = wakeLock;
      wakeLock = null;
      lock.release().catch(function () {});
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && game) requestWakeLock();
  });

  /* ---------- Ereignisse ---------- */

  el.playerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (addPlayer(el.playerInput.value)) {
      el.playerInput.value = '';
    }
    el.playerInput.focus();
  });
  el.playerInput.addEventListener('input', function () { showPlayerError(''); });

  el.startBtn.addEventListener('click', requestStart);
  el.cardStage.addEventListener('click', onStageTap);
  el.backBtn.addEventListener('click', goBack);
  el.rulesBtn.addEventListener('click', showRules);
  el.exitBtn.addEventListener('click', function () {
    ask(el.exitDialog, 'Spiel beenden? Der aktuelle Spielstand geht verloren.', function (ok) {
      if (ok) leaveGame();
    });
  });
  el.againBtn.addEventListener('click', startGame);
  el.menuBtn.addEventListener('click', leaveGame);

  document.addEventListener('keydown', function (e) {
    if (el.game.hidden || anyDialogOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
    var target = e.target;
    var onButton = target && target.tagName === 'BUTTON';
    if (e.key === 'ArrowRight' || ((e.key === ' ' || e.key === 'Enter') && !onButton)) {
      e.preventDefault();
      advance();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      el.exitBtn.click();
    }
  });

  /* ---------- Start ---------- */

  renderPlayers();
  renderDecks();
  initRadios('intensity', settings.intensity, function (v) { settings.intensity = v; save(); });
  initRadios('length', settings.length, function (v) { settings.length = parseInt(v, 10); save(); });
  updateStart();

  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline-Modus optional */ });
    });
  }
})();
