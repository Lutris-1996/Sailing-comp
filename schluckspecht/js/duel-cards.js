/*
 * Schluckspecht – Karten für den Team-Duell-Modus.
 *
 * Platzhalter:
 *   {A}, {A2}   – Personen aus der einen Seite
 *   {B}, {B2}   – Personen aus der anderen Seite
 *   {TA}, {TB}  – die beiden Teams („Team Rot“). Nur als Satzsubjekt oder nach „für“ verwenden.
 * Welches echte Team Seite A oder B ist, wird pro Karte zufällig festgelegt.
 * Der Einsatz (Schlucke für das Verliererteam) wird von der App unter der Karte angezeigt.
 * min: Mindestanzahl Personen pro Team (Standard: so viele, wie Platzhalter pro Seite vorkommen).
 */
(function (root, factory) {
  'use strict';
  var cards = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = cards;
  } else {
    root.SchluckDuelCards = cards;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function D(text, extra) {
    var card = { type: 'duell', text: text };
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) card[k] = extra[k];
      }
    }
    return card;
  }

  var LAST = ' Das Team, das zuerst nichts mehr weiß oder etwas wiederholt, verliert.';

  return [
    // Eins gegen eins
    D('{A} gegen {B}: Wer länger auf einem Bein stehen kann, holt den Punkt.'),
    D('{A} gegen {B}: Starrduell! Wer zuerst blinzelt oder lacht, verliert.'),
    D('{A} gegen {B}: Schere, Stein, Papier – wer zuerst zwei Runden gewinnt, holt den Punkt.'),
    D('{A} gegen {B}: Wer nennt in 15 Sekunden mehr Tiere, die mit H beginnen? Die anderen zählen mit.'),
    D('{A} gegen {B}: Wer schafft mehr Liegestütze am Stück? Auf den Knien zählt auch.'),
    D('{A} gegen {B}: Sagt abwechselnd „Blaukraut bleibt Blaukraut und Brautkleid bleibt Brautkleid.“ Wer sich zuerst verhaspelt, verliert.'),
    D('{A} gegen {B}: Wer sagt das Alphabet schneller rückwärts auf? Das jeweils andere Team stoppt die Zeit.'),
    D('{A} gegen {B}: Daumencatchen! Wer den Daumen der anderen Person drei Sekunden lang festhält, gewinnt.'),
    D('{A} gegen {B}: Wer zuerst lacht, verliert. Grimassen sind erlaubt, Berühren nicht.'),
    D('{A} gegen {B}: Wer kann einen Ton länger halten?'),
    D('{A} gegen {B}: Nennt abwechselnd Wörter, die sich auf „Haus“ reimen. Wer zuerst nichts mehr weiß, verliert.'),
    D('{A} gegen {B}: Wer balanciert einen Bierdeckel oder ein Handy länger auf dem Kopf?'),
    D('{A} gegen {B}: Augen zu und still bis 30 zählen. Wer glaubt, dass 30 Sekunden um sind, ruft „Jetzt!“. Wer näher dran ist, gewinnt.'),
    D('{A} gegen {B}: Schätzt, wie viele Schritte es von hier bis zur Tür sind. Dann wird nachgezählt – wer näher dran ist, gewinnt.'),
    D('{A} gegen {B}: Wer schafft mehr Hampelmänner in 20 Sekunden?'),
    D('{A} gegen {B}: Armdrücken!'),
    D('{A} gegen {B}: Wer hält mit geschlossenen Augen länger das Gleichgewicht auf einem Bein?'),
    D('{A} gegen {B}: Erzählt nacheinander je einen Witz. Wer mehr Lacher bekommt, gewinnt.'),
    D('{A} gegen {B}: Macht euch abwechselnd Komplimente. Wer zögert oder sich wiederholt, verliert.'),
    D('{A} gegen {B}: Macht abwechselnd Tiergeräusche. Wer kein neues Tier mehr findet, verliert.'),
    D('{A} gegen {B}: Ihr habt je 30 Sekunden, um der Runde einen Gegenstand vom Tisch zu verkaufen. Wer überzeugender ist, gewinnt.'),
    D('{A} gegen {B}: Denkt euch je eine Zahl von 1 bis 5 aus und ruft sie auf drei. Bei gleicher Zahl gewinnt {TA}, sonst {TB}.'),
    D('{A} gegen {B}: Dreht euch um. Das jeweils andere Team stellt euch drei Fragen dazu, was die Leute in der Runde anhaben. Mehr richtige Antworten gewinnen.'),
    D('{A} gegen {B}: Wer zuerst fünf Dinge in diesem Raum nennt, die blau sind, holt den Punkt.'),

    // Team gegen Team
    D('Kategorie-Duell: Obstsorten. {TA} beginnt, dann geht es abwechselnd weiter.' + LAST),
    D('Kategorie-Duell: Automarken. {TB} beginnt, dann geht es abwechselnd weiter.' + LAST),
    D('Kategorie-Duell: Länder der Welt. {TA} beginnt, dann geht es abwechselnd weiter.' + LAST),
    D('Kategorie-Duell: Dinge, die man im Badezimmer findet. {TB} beginnt, dann geht es abwechselnd weiter.' + LAST),
    D('Kategorie-Duell: Sportarten. {TA} beginnt, dann geht es abwechselnd weiter.' + LAST),
    D('Kategorie-Duell: Berufe. {TB} beginnt, dann geht es abwechselnd weiter.' + LAST),
    D('Kategorie-Duell: Vornamen, die mit M beginnen. {TA} beginnt, dann geht es abwechselnd weiter.' + LAST),
    D('Kategorie-Duell: Dinge, die rot sind. {TB} beginnt, dann geht es abwechselnd weiter.' + LAST),
    D('Kategorie-Duell: Süßigkeiten. {TA} beginnt, dann geht es abwechselnd weiter.' + LAST),
    D('Wortketten-Duell: {TA} sagt ein Wort, {TB} antwortet mit einem Wort, das mit dessen letztem Buchstaben beginnt, und so weiter. Das Team, das zuerst zögert, verliert.'),
    D('Buchstaben-Duell: Beide Teams haben nacheinander je 30 Sekunden, um Dinge im Raum zu nennen, die mit S beginnen. {TA} startet. Mehr Treffer gewinnen.'),
    D('Stille-Duell: Ab jetzt sind alle ruhig. Das Team, aus dem zuerst jemand spricht oder lacht, verliert. Nach 60 Sekunden ist es unentschieden.'),
    D('Turm-Duell: Jedes Team baut in 60 Sekunden aus Gegenständen vom Tisch einen Turm. Der höchste stehende Turm gewinnt.'),
    D('Reihen-Duell: Jedes Team stellt sich ohne zu reden nach Größe auf. {TA} beginnt, dann ist {TB} dran. Das schnellere Team gewinnt.', { min: 2 }),
    D('Geburtstags-Duell: Jedes Team stellt sich ohne zu reden nach Geburtstag im Jahr auf. Beide Teams gleichzeitig – das schnellere Team mit richtiger Reihenfolge gewinnt.', { min: 2 }),

    // Ratespiele im Team
    D('Summ-Duell: {A} summt ein Lied für {TA}, danach summt {B} eins für {TB}. Das Team, das den Titel schneller errät, holt den Punkt.', { min: 2 }),
    D('Pantomime-Duell: {A} stellt für {TA} einen Film dar, danach {B} für {TB}. Den Film flüstert jeweils das andere Team zu. Schneller erraten gewinnt.', { min: 2 }),
    D('Erklär-Duell: {A} erklärt dem eigenen Team „Zahnbürste“, ohne „Zähne“, „putzen“ oder „Bad“ zu sagen. Danach erklärt {B} „Kopfkissen“, ohne „Bett“, „schlafen“ oder „Kopf“ zu sagen. Schneller erraten gewinnt.', { min: 2 }),
    D('Erklär-Duell: {A} erklärt dem eigenen Team „Fahrrad“, ohne „fahren“, „Rad“ oder „treten“ zu sagen. Danach erklärt {B} „Sonnenbrille“, ohne „Sonne“, „Augen“ oder „Brille“ zu sagen. Schneller erraten gewinnt.', { min: 2 }),
    D('Erklär-Duell: {A} erklärt dem eigenen Team „Kühlschrank“, ohne „kalt“, „Küche“ oder „Essen“ zu sagen. Danach erklärt {B} „Regenschirm“, ohne „Regen“, „nass“ oder „Schirm“ zu sagen. Schneller erraten gewinnt.', { min: 2 }),
    D('Zeichen-Duell: {A} zeichnet für {TA} ein Tier, das {TB} aussucht. Danach zeichnet {B} für {TB} ein Tier, das {TA} aussucht. Buchstaben sind verboten. Schneller erraten gewinnt.', { min: 2 }),
    D('Geräusch-Duell: {A} macht für {TA} ein Geräusch aus dem Alltag vor, danach {B} für {TB}. Schneller erraten gewinnt.', { min: 2 }),

    // Paare
    D('{A} und {A2} gegen {B} und {B2}: Spiegel-Duell! In jedem Paar macht eine Person Bewegungen vor, die andere spiegelt sie. Die Runde entscheidet, welches Paar synchroner war.'),
    D('{A} und {A2} gegen {B} und {B2}: Jedes Paar hat 30 Sekunden, um möglichst viele Gemeinsamkeiten zu finden. Mehr Gemeinsamkeiten gewinnen.'),
    D('{A} und {A2} gegen {B} und {B2}: In jedem Paar erzählt ihr abwechselnd Wort für Wort eine Geschichte. Das Paar, das zuerst stockt, verliert.')
  ];
});
