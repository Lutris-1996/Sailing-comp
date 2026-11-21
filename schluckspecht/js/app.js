/* Schluckspecht – Oberfläche. Nutzt SchluckEngine, SchluckDecks und SchluckDuelCards. */
(function () {
  'use strict';

  var Engine = window.SchluckEngine;
  var DECKS = window.SchluckDecks;
  var DUEL_CARDS = (window.SchluckDuelCards || []).map(function (card, i) {
    return { id: 'duel-' + i, type: card.type, text: card.text, min: card.min };
  });
  var STORAGE_KEY = 'schluckspecht:v1';
  var MAX_PLAYERS = 20;
  var MAX_NAME_LENGTH = 20;
  var LENGTHS = [30, 50, 0];
  var MODES = ['classic', 'duel'];
  var TAP_DEBOUNCE_MS = 250;
  var THEME_COLORS = {
    home: '#17131f',
    aufgabe: '#1f8a8a',
    spiel: '#2f9e5b',
    abstimmung: '#d9731f',
    regel: '#6d4ad8',
    regelende: '#4a4f7c',
    duell: '#a3366a',
    'duellergebnis-0': '#d9473b',
    'duellergebnis-1': '#2f6bd1',
    'duellergebnis--1': '#4a4f7c'
  };
  var SVG_CLOSE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';
  var SVG_SWAP = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 8h14l-4-4M20 16H6l4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

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
    teams: $('teams'),
    teamLists: [$('team-list-0'), $('team-list-1')],
    teamNames: [$('team-name-0'), $('team-name-1')],
    shuffleBtn: $('shuffle-btn'),
    decksPanel: $('decks-panel'),
    deckList: $('deck-list'),
    lengthGroup: $('length-group'),
    targetGroup: $('target-group'),
    startBtn: $('start-btn'),
    startHint: $('start-hint'),
    exitBtn: $('exit-btn'),
    cardLabel: $('card-label'),
    cardCounter: $('card-counter'),
    cardStage: $('card-stage'),
    cardText: $('card-text'),
    cardNote: $('card-note'),
    scoreboard: $('scoreboard'),
    scoreNames: [$('score-name-0'), $('score-name-1')],
    scores: [$('score-0'), $('score-1')],
    duelActions: $('duel-actions'),
    duelQuestion: $('duel-question'),
    winBtns: [$('win-0'), $('win-1')],
    drawBtn: $('win-draw'),
    gameBottom: $('game-bottom'),
    backBtn: $('back-btn'),
    undoBtn: $('undo-btn'),
    rulesBtn: $('rules-btn'),
    rulesList: $('rules-list'),
    endEmoji: $('end-emoji'),
    endTitle: $('end-title'),
    endSummary: $('end-summary'),
    againBtn: $('again-btn'),
    menuBtn: $('menu-btn'),
    exitDialog: $('exit-dialog'),
    rulesDialog: $('rules-dialog'),
    ageDialog: $('age-dialog'),
    exitText: $('exit-text'),
    themeColor: document.querySelector('meta[name="theme-color"]')
  };

  /* ---------- Einstellungen & Speicher ---------- */

  var validDeckIds = DECKS.map(function (d) { return d.id; });

  function defaults() {
    return {
      mode: 'classic',
      players: [],
      playerTeams: [],
      teamNames: Engine.DEFAULT_TEAM_NAMES.slice(),
      decks: ['warmup', 'party'],
      intensity: 'normal',
      length: 30,
      duelTarget: 5,
      ageConfirmed: false
    };
  }

  function sanitize(raw) {
    var s = defaults();
    if (!raw || typeof raw !== 'object') return s;
    if (Array.isArray(raw.players)) {
      var seen = {};
      var rawTeams = Array.isArray(raw.playerTeams) ? raw.playerTeams : [];
      raw.players.forEach(function (n, i) {
        var name = Engine.normalizeName(n).slice(0, MAX_NAME_LENGTH);
        var key = name.toLowerCase();
        if (!name || seen[key] || s.players.length >= MAX_PLAYERS) return;
        seen[key] = true;
        s.players.push(name);
        s.playerTeams.push(rawTeams[i] === 0 || rawTeams[i] === 1 ? rawTeams[i] : null);
      });
    }
    if (Array.isArray(raw.teamNames)) {
      s.teamNames = [0, 1].map(function (i) {
        return typeof raw.teamNames[i] === 'string' ? raw.teamNames[i].slice(0, MAX_NAME_LENGTH) : s.teamNames[i];
      });
    }
    if (Array.isArray(raw.decks)) {
      s.decks = raw.decks.filter(function (id, i, arr) {
        return validDeckIds.indexOf(id) >= 0 && arr.indexOf(id) === i;
      });
    }
    if (MODES.indexOf(raw.mode) >= 0) s.mode = raw.mode;
    if (Engine.INTENSITY[raw.intensity]) s.intensity = raw.intensity;
    if (LENGTHS.indexOf(raw.length) >= 0) s.length = raw.length;
    if (Engine.DUEL_TARGETS.indexOf(raw.duelTarget) >= 0) s.duelTarget = raw.duelTarget;
    s.ageConfirmed = raw.ageConfirmed === true;
    fillTeams(s);
    return s;
  }

  /** Personen ohne Team kommen ins kleinere Team. */
  function fillTeams(s) {
    s.players.forEach(function (_, i) {
      if (s.playerTeams[i] !== 0 && s.playerTeams[i] !== 1) {
        var sizes = teamSizes(s);
        s.playerTeams[i] = sizes[0] <= sizes[1] ? 0 : 1;
      }
    });
  }

  function teamSizes(s) {
    var sizes = [0, 0];
    s.playerTeams.forEach(function (t) { if (t === 0 || t === 1) sizes[t] += 1; });
    return sizes;
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

  function teamName(i) {
    return Engine.teamDisplayName(settings.teamNames[i], i);
  }

  /* ---------- Mitspielende & Teams ---------- */

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
    var sizes = teamSizes(settings);
    settings.players.push(name);
    settings.playerTeams.push(sizes[0] <= sizes[1] ? 0 : 1);
    showPlayerError('');
    save();
    renderPlayers();
    updateStart();
    return true;
  }

  function removePlayer(index) {
    settings.players.splice(index, 1);
    settings.playerTeams.splice(index, 1);
    showPlayerError('');
    save();
    renderPlayers();
    updateStart();
  }

  function switchTeam(index) {
    settings.playerTeams[index] = settings.playerTeams[index] === 0 ? 1 : 0;
    save();
    renderPlayers();
    updateStart();
  }

  function shuffleTeams() {
    var order = Engine.shuffle(settings.players.map(function (_, i) { return i; }), Math.random);
    var first = Math.random() < 0.5 ? 0 : 1; // bei ungerader Anzahl bekommt ein zufälliges Team die Extraperson
    order.forEach(function (playerIndex, k) {
      settings.playerTeams[playerIndex] = k % 2 === 0 ? first : 1 - first;
    });
    save();
    renderPlayers();
    updateStart();
  }

  function iconButton(className, label, svg, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = svg;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function playerChip(name, index, withSwitch) {
    var li = document.createElement('li');
    li.className = 'chip';
    var span = document.createElement('span');
    span.className = 'chip-name';
    span.textContent = name;
    li.appendChild(span);
    if (withSwitch) {
      var other = settings.playerTeams[index] === 0 ? 1 : 0;
      li.appendChild(iconButton('chip-remove chip-switch', name + ' zu ' + Engine.teamLabel(teamName(other)) + ' verschieben',
        SVG_SWAP, function () { switchTeam(index); }));
    }
    li.appendChild(iconButton('chip-remove', name + ' entfernen', SVG_CLOSE, function () { removePlayer(index); }));
    return li;
  }

  function renderPlayers() {
    var duel = settings.mode === 'duel';
    var n = settings.players.length;
    el.playerCount.textContent = n ? String(n) : '';
    el.playerEmpty.hidden = n > 0;
    el.playerList.hidden = duel;
    el.teams.hidden = !duel || n === 0;

    el.playerList.textContent = '';
    el.teamLists[0].textContent = '';
    el.teamLists[1].textContent = '';

    settings.players.forEach(function (name, i) {
      if (duel) el.teamLists[settings.playerTeams[i]].appendChild(playerChip(name, i, true));
      else el.playerList.appendChild(playerChip(name, i, false));
    });

    if (duel) {
      [0, 1].forEach(function (t) {
        el.teamLists[t].setAttribute('aria-label', 'Personen in ' + Engine.teamLabel(teamName(t)));
        if (!el.teamLists[t].children.length) {
          var li = document.createElement('li');
          li.className = 'team-empty';
          li.textContent = 'Noch niemand im Team.';
          el.teamLists[t].appendChild(li);
        }
      });
    }
  }

  /* ---------- Modus, Kartenstapel & Optionen ---------- */

  function renderMode() {
    var duel = settings.mode === 'duel';
    el.decksPanel.hidden = duel;
    el.lengthGroup.hidden = duel;
    el.targetGroup.hidden = !duel;
    renderPlayers();
    updateStart();
  }

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
    if (settings.mode === 'duel') {
      var sizes = teamSizes(settings);
      if (!sizes[0] || !sizes[1]) return 'Jedes Team braucht mindestens eine Person.';
      if (teamName(0).toLowerCase() === teamName(1).toLowerCase()) return 'Die Teams brauchen unterschiedliche Namen.';
      return '';
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

  /* ---------- Gemeinsame Kartendarstellung ---------- */

  var game = null;
  var mode = 'classic';
  var lastTap = 0;
  var wakeLock = null;

  // Klassisch
  var history = [];
  var pos = -1;

  // Duell: {kind: 'card'|'result', entry}
  var duelView = null;

  function paintCard(entry, note) {
    el.game.dataset.type = entry.type;
    if (entry.type === 'duellergebnis') {
      el.game.dataset.winner = String(entry.winner);
      setThemeColor('duellergebnis-' + entry.winner);
    } else {
      delete el.game.dataset.winner;
      setThemeColor(entry.type);
    }
    el.cardLabel.textContent = entry.label;

    el.cardText.textContent = '';
    entry.parts.forEach(function (part) {
      if (part.kind === 'name' || part.kind === 'sips' || part.kind === 'team') {
        var span = document.createElement(part.kind === 'name' ? 'strong' : 'span');
        span.className = part.kind + (part.kind === 'team' ? ' team-' + part.team : '');
        span.textContent = part.text;
        el.cardText.appendChild(span);
      } else {
        el.cardText.appendChild(document.createTextNode(part.text));
      }
    });

    var len = entry.text.length;
    el.cardText.classList.remove('len-m', 'len-l', 'enter');
    if (len > 150) el.cardText.classList.add('len-l');
    else if (len > 90) el.cardText.classList.add('len-m');
    void el.cardText.offsetWidth; // Animation neu starten
    el.cardText.classList.add('enter');

    el.cardNote.textContent = note || '';
    el.cardNote.hidden = !note;
    el.cardStage.scrollTop = 0;
  }

  /* ---------- Spielstart ---------- */

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
    var nextMode = settings.mode;
    try {
      if (nextMode === 'duel') {
        game = new Engine.DuelGame({
          teams: [0, 1].map(function (t) {
            return {
              name: settings.teamNames[t],
              players: settings.players.filter(function (_, i) { return settings.playerTeams[i] === t; })
            };
          }),
          cards: DUEL_CARDS,
          intensity: settings.intensity,
          target: settings.duelTarget
        });
      } else {
        game = new Engine.Game({
          players: settings.players.slice(),
          cards: Engine.collectCards(DECKS, settings.decks),
          intensity: settings.intensity,
          length: settings.length
        });
      }
    } catch (e) {
      game = null;
      showScreen('home');
      el.startHint.textContent = e.message;
      return;
    }
    mode = nextMode;
    el.game.dataset.mode = mode;
    history = [];
    pos = -1;
    duelView = null;
    lastTap = 0;
    showScreen('game');

    var duel = mode === 'duel';
    el.scoreboard.hidden = !duel;
    el.backBtn.hidden = duel;
    el.rulesBtn.hidden = true;
    el.undoBtn.hidden = true;
    if (duel) {
      [0, 1].forEach(function (t) {
        var label = Engine.teamLabel(game.teams[t].name);
        el.scoreNames[t].textContent = label;
        el.winBtns[t].textContent = label;
        el.winBtns[t].setAttribute('aria-label', label + ' hat gewonnen');
      });
      showDuelCard(game.next());
    } else {
      el.duelActions.hidden = true;
      el.gameBottom.hidden = false;
      advance();
    }
    el.cardStage.focus({ preventScroll: true });
    requestWakeLock();
  }

  /* ---------- Klassischer Modus ---------- */

  function advance() {
    if (!game) return;
    if (pos < history.length - 1) {
      pos += 1;
      renderClassic(history[pos]);
      return;
    }
    var card = game.next();
    if (!card) {
      finishGame();
      return;
    }
    history.push(card);
    pos = history.length - 1;
    renderClassic(card);
  }

  function goBack() {
    if (pos > 0) {
      pos -= 1;
      renderClassic(history[pos]);
    }
  }

  function renderClassic(card) {
    paintCard(card, '');
    var number = pos + 1;
    el.cardCounter.textContent = card.total > 0 ? Math.min(number, card.total) + '/' + card.total : String(number);
    el.backBtn.disabled = pos <= 0;
    var rules = card.activeRules;
    el.rulesBtn.hidden = rules.length === 0;
    el.rulesBtn.textContent = rules.length === 1 ? '1 Regel aktiv' : rules.length + ' Regeln aktiv';
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

  /* ---------- Team-Duell ---------- */

  function renderScores(scores) {
    el.scores[0].textContent = String(scores[0]);
    el.scores[1].textContent = String(scores[1]);
  }

  function targetText() {
    return game.target > 0 ? ' · Ziel: ' + game.target + ' Punkte' : '';
  }

  function showDuelCard(card) {
    if (!card) { finishGame(); return; }
    duelView = { kind: 'card', entry: card };
    paintCard(card, 'Einsatz: ' + card.stake + ' für jede Person im Verliererteam' + targetText());
    el.cardCounter.textContent = 'Runde ' + card.round;
    renderScores(card.scores);
    el.duelActions.hidden = false;
    el.gameBottom.hidden = true;
    el.cardStage.setAttribute('aria-label', 'Duell-Karte. Wählt unten, wer gewonnen hat.');
  }

  function decideDuel(winner) {
    if (!game || mode !== 'duel' || !duelView || duelView.kind !== 'card') return;
    var result = game.decide(winner);
    duelView = { kind: 'result', entry: result };
    var note = result.over ? 'Das war der entscheidende Punkt!' : 'Stand: ' + result.scores[0] + ' : ' + result.scores[1] + targetText();
    paintCard(result, note);
    el.cardCounter.textContent = 'Runde ' + result.round;
    renderScores(result.scores);
    el.duelActions.hidden = true;
    el.gameBottom.hidden = false;
    el.undoBtn.hidden = false;
    el.cardStage.setAttribute('aria-label', 'Weiter zum nächsten Duell');
    lastTap = Date.now(); // verhindert, dass ein Doppeltipp das Ergebnis überspringt
  }

  function undoDuel() {
    if (!game || mode !== 'duel' || !duelView || duelView.kind !== 'result') return;
    var card = game.undo();
    if (card) showDuelCard(card);
    el.undoBtn.hidden = true;
  }

  function advanceDuel() {
    if (!game || !duelView) return;
    if (duelView.kind === 'card') {
      // Erst muss feststehen, wer gewonnen hat.
      el.duelQuestion.classList.remove('nudge');
      void el.duelQuestion.offsetWidth;
      el.duelQuestion.classList.add('nudge');
      return;
    }
    if (game.isOver()) {
      finishGame();
      return;
    }
    el.undoBtn.hidden = true;
    showDuelCard(game.next());
  }

  /* ---------- Spielende ---------- */

  function finishGame() {
    if (mode === 'duel' && game) {
      var s = game.scores;
      var leader = game.leader();
      var rounds = game.decisions.length;
      var roundsText = rounds + (rounds === 1 ? ' Duell' : ' Duellen');
      if (leader === -1) {
        el.endEmoji.textContent = '🤝';
        el.endTitle.textContent = 'Unentschieden!';
        el.endSummary.textContent = 'Endstand ' + s[0] + ' : ' + s[1] + ' nach ' + roundsText + '. Stoßt alle zusammen an – und trinkt noch ein Glas Wasser!';
      } else {
        var winner = Engine.teamLabel(game.teams[leader].name);
        var loser = Engine.teamLabel(game.teams[1 - leader].name);
        el.endEmoji.textContent = '🏆';
        el.endTitle.textContent = 'Sieg für ' + winner + '!';
        el.endSummary.textContent = 'Endstand ' + s[0] + ' : ' + s[1] + ' nach ' + roundsText + '. ' + loser +
          ' holt dem Siegerteam die nächste Runde Getränke – Wasser zählt auch.';
      }
    } else {
      var played = history.length;
      el.endEmoji.textContent = '🎉';
      el.endTitle.textContent = 'Das war’s!';
      el.endSummary.textContent = 'Ihr habt ' + played + (played === 1 ? ' Karte' : ' Karten') +
        ' gespielt. Alle Regeln sind aufgehoben – trinkt noch ein Glas Wasser!';
    }
    game = null;
    releaseWakeLock();
    showScreen('end');
    el.againBtn.focus({ preventScroll: true });
  }

  function leaveGame() {
    game = null;
    history = [];
    pos = -1;
    duelView = null;
    releaseWakeLock();
    showScreen('home');
    updateStart();
  }

  function onStageTap() {
    var now = Date.now();
    if (now - lastTap < TAP_DEBOUNCE_MS) return;
    lastTap = now;
    if (mode === 'duel') advanceDuel();
    else advance();
  }

  function onExit() {
    var duelRunning = mode === 'duel' && game && game.target === 0;
    if (duelRunning && game.decisions.length > 0) {
      // Im Endlos-Duell zeigt „Beenden“ das Endergebnis.
      el.exitText.textContent = 'Danach seht ihr den Endstand.';
      ask(el.exitDialog, 'Spiel beenden?', function (ok) { if (ok) finishGame(); });
      return;
    }
    el.exitText.textContent = 'Der aktuelle Spielstand geht dabei verloren.';
    ask(el.exitDialog, 'Spiel beenden? Der aktuelle Spielstand geht verloren.', function (ok) {
      if (ok) leaveGame();
    });
  }

  /* ---------- Bildschirm anlassen (falls unterstützt) ---------- */

  function requestWakeLock() {
    if (!('wakeLock' in navigator) || wakeLock) return;
    try {
      navigator.wakeLock.request('screen').then(function (lock) {
        wakeLock = lock;
        lock.addEventListener('release', function () {
          if (wakeLock === lock) wakeLock = null;
        });
      }).catch(function () { /* nicht erlaubt – egal */ });
    } catch (e) {
      /* In manchen eingebetteten Ansichten nicht verfügbar. */
    }
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

  [0, 1].forEach(function (t) {
    el.teamNames[t].value = settings.teamNames[t];
    el.teamNames[t].placeholder = Engine.DEFAULT_TEAM_NAMES[t];
    el.teamNames[t].addEventListener('input', function () {
      settings.teamNames[t] = el.teamNames[t].value.slice(0, MAX_NAME_LENGTH);
      save();
      renderPlayers();
      updateStart();
    });
    el.winBtns[t].addEventListener('click', function () { decideDuel(t); });
  });
  el.drawBtn.addEventListener('click', function () { decideDuel(-1); });
  el.shuffleBtn.addEventListener('click', shuffleTeams);

  el.startBtn.addEventListener('click', requestStart);
  el.cardStage.addEventListener('click', onStageTap);
  el.backBtn.addEventListener('click', goBack);
  el.undoBtn.addEventListener('click', undoDuel);
  el.rulesBtn.addEventListener('click', showRules);
  el.exitBtn.addEventListener('click', onExit);
  el.againBtn.addEventListener('click', startGame);
  el.menuBtn.addEventListener('click', leaveGame);

  document.addEventListener('keydown', function (e) {
    if (el.game.hidden || anyDialogOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
    var target = e.target;
    var onButton = target && target.tagName === 'BUTTON';
    if (e.key === 'ArrowRight' || ((e.key === ' ' || e.key === 'Enter') && !onButton)) {
      e.preventDefault();
      if (mode === 'duel') advanceDuel();
      else advance();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (mode === 'duel') undoDuel();
      else goBack();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onExit();
    }
  });

  /* ---------- Start ---------- */

  renderDecks();
  initRadios('mode', settings.mode, function (v) { settings.mode = v; save(); renderMode(); });
  initRadios('intensity', settings.intensity, function (v) { settings.intensity = v; save(); });
  initRadios('length', settings.length, function (v) { settings.length = parseInt(v, 10); save(); });
  initRadios('target', settings.duelTarget, function (v) { settings.duelTarget = parseInt(v, 10); save(); });
  renderMode();

  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', function () {
      try {
        navigator.serviceWorker.register('sw.js').catch(function () { /* offline-Modus optional */ });
      } catch (e) {
        /* z. B. in einer abgeschotteten Einbettung – das Spiel läuft auch ohne. */
      }
    });
  }
})();
