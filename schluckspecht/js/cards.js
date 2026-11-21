/*
 * Schluckspecht – Kartenstapel.
 *
 * Platzhalter:
 *   {1}, {2}, {3} – zufällig gewählte, verschiedene Mitspielende
 *   {s}           – Schlucke laut Intensität, inkl. Wort („1 Schluck“, „3 Schlucke“)
 *   {S}           – doppelte Menge (gedeckelt)
 * Typen: aufgabe, spiel, abstimmung, regel (mit „end“-Text, wenn die Regel endet).
 */
(function (root, factory) {
  'use strict';
  var decks = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = decks;
  } else {
    root.SchluckDecks = decks;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function A(text, extra) { return withExtra({ type: 'aufgabe', text: text }, extra); }
  function G(text, extra) { return withExtra({ type: 'spiel', text: text }, extra); }
  function V(text, extra) { return withExtra({ type: 'abstimmung', text: text }, extra); }
  function R(text, end, extra) { return withExtra({ type: 'regel', text: text, end: end }, extra); }

  function withExtra(card, extra) {
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) card[k] = extra[k];
      }
    }
    return card;
  }

  var VOTE = ' Auf drei zeigen alle auf eine Person. Wer die meisten Stimmen bekommt, ';
  var NEVER = ' Alle, die es doch getan haben, trinken {s}.';

  return [
    {
      id: 'warmup',
      name: 'Vorglühen',
      emoji: '🍹',
      description: 'Locker reinkommen – passt in jede Runde.',
      cards: [
        A('{1}, nenne in zehn Sekunden fünf Dinge, die man in einer Küche findet. Schaffst du es nicht, trinkst du {s}.'),
        A('Wer zuletzt im Urlaub war, verteilt {s}.'),
        A('{1} und {2} spielen Schere, Stein, Papier. Wer verliert, trinkt {s}.'),
        A('Alle, die heute schon Kaffee getrunken haben, trinken {s}.'),
        A('{1}, mach dein bestes Tiergeräusch. Errät niemand das Tier, trinkst du {s}.'),
        A('{1} bestimmt eine Person, die {s} trinkt.'),
        A('Die Person mit dem ältesten Handy trinkt {s}.'),
        A('{1}, erzähl von deinem peinlichsten Moment in der Schule – oder trink {s}.'),
        A('{1}, imitiere eine Person aus der Runde. Wer sie zuerst errät, verteilt {s}.'),
        A('Wer als Letztes die Hand auf den Kopf legt, trinkt {s}.'),
        A('{1}, nenne in zehn Sekunden fünf Automarken – oder trink {s}.'),
        A('Wer schon einmal eine Zimmerpflanze auf dem Gewissen hatte, trinkt {s}.'),
        A('{1} und {2} tauschen die Plätze.'),
        A('Die größte Person in der Runde verteilt {s}.'),
        A('Die jüngste Person in der Runde trinkt {s}.'),
        A('Wasserpause! Alle trinken einen Schluck Wasser.'),
        A('{1}, zeig der Runde das letzte Foto in deiner Galerie – oder trink {S}.'),
        A('Wer Geschwister hat, trinkt {s}.'),
        A('{1}, buchstabiere deinen Vornamen rückwärts, ohne zu stocken. Klappt es nicht, trinkst du {s}.'),
        A('{1}, such dir eine Person aus, mit der du anstößt. Ihr trinkt beide {s}.'),
        A('{1}, summe die Melodie eines bekannten Liedes. Wer den Titel zuerst errät, verteilt {s}.'),
        A('Wer heute am weitesten angereist ist, verteilt {s}.'),
        A('{1}, sag der Person rechts von dir etwas Nettes. Danach verteilt ihr beide je {s}.'),
        A('{1} gegen {2}: Wer zuerst auf den Tisch klopft, gewinnt. Die langsamere Person trinkt {s}.'),
        G('Kategorie: Eissorten! {1} beginnt, dann geht es reihum weiter. Wer nichts mehr weiß oder etwas wiederholt, trinkt {s}.'),
        G('Kategorie: Dinge, die man im Supermarkt findet. {1} beginnt, dann geht es reihum. Wer zögert, trinkt {s}.'),
        G('Kategorie: Hauptstädte in Europa. {1} beginnt, dann geht es reihum. Wer nichts mehr weiß, trinkt {s}.'),
        G('Reimkette! {1} sagt ein Wort, danach muss reihum jede Person ein Reimwort finden. Wer keins findet, trinkt {s}.'),
        G('Zählrunde! {1} beginnt bei 1, dann wird reihum weitergezählt. Statt jeder Zahl, die eine 7 enthält oder durch 7 teilbar ist, wird geklatscht. Wer patzt, trinkt {s}.'),
        G('Ich hab noch nie einen Flug verpasst.' + NEVER),
        G('Ich hab noch nie eine komplette Serie an einem Wochenende geschaut.' + NEVER),
        G('Ich hab noch nie beim Spielen geschummelt.' + NEVER),
        G('Ich hab noch nie etwas so anbrennen lassen, dass der Rauchmelder losging.' + NEVER),
        V('Wer würde am ehesten eine Quizshow gewinnen?' + VOTE + 'verteilt {s}.'),
        V('Wer würde am ehesten auf der eigenen Party einschlafen?' + VOTE + 'trinkt {s}.'),
        V('Wer hat den besten Musikgeschmack?' + VOTE + 'wählt das nächste Lied aus.'),
        V('Wer kommt am häufigsten zu spät?' + VOTE + 'trinkt {s}.'),
        R('Niemand darf mehr das Wort „trinken“ sagen. Wer es doch tut, trinkt {s}.',
          'Das Wort „trinken“ ist wieder erlaubt.'),
        R('{1} hat jetzt die Fragen-Macht: Wer eine Frage von {1} beantwortet, trinkt {s}.',
          'Die Fragen-Macht von {1} ist vorbei.'),
        R('Vor jedem Schluck muss man „Prost!“ rufen. Wer es vergisst, trinkt {s} extra.',
          'Ihr müsst nicht mehr „Prost!“ rufen.'),
        R('{1} und {2} sind jetzt Spiegel: Trinkt eine Person von beiden, trinkt die andere mit.',
          '{1} und {2} sind keine Spiegel mehr.')
      ]
    },
    {
      id: 'party',
      name: 'Eskalation',
      emoji: '🔥',
      description: 'Mehr Schlucke, mehr Chaos.',
      cards: [
        A('{1} verteilt {S}.'),
        A('{1}, trink {s} oder mach zehn Kniebeugen.'),
        A('{1} und {2} trinken jeweils {s}. Einfach so.'),
        A('{1}, ruf eine Person aus deinen Kontakten an und sag ihr, dass du sie vermisst – oder trink {S}.'),
        A('{1}, lass {2} eine harmlose Nachricht an die Person schreiben, mit der du zuletzt gechattet hast – oder trink {S}.'),
        A('{1} gegen {2}: Wer zuerst blinzelt, trinkt {s}.'),
        A('{1}, mach jeder Person in der Runde ein ehrliches Kompliment. Fällt dir zu jemandem nichts ein, trinkst du {s}.'),
        A('{1}, erzähl einen Witz. Lacht niemand, trinkst du {s}. Lachen alle, verteilst du {S}.'),
        A('{1}, du hast 30 Sekunden für eine Comedy-Show. Alle, die lachen, trinken {s}.'),
        A('Die Person rechts von {1} trinkt {s}.'),
        A('Die Person links von {1} verteilt {s}.'),
        A('{1} und {2} machen Armdrücken. Wer verliert, trinkt {s}.'),
        A('{1}, tausche ein Kleidungsstück mit {2} – oder ihr trinkt beide {s}.'),
        A('Alle trinken {s}. Prost!'),
        A('{1}, stell {2} eine beliebige Frage. Will {2} nicht antworten, trinkt {2} {S}.'),
        A('Wasserpause! Alle trinken ein Glas Wasser, bevor es weitergeht.'),
        A('Wer gerade das Handy in der Hand hat, trinkt {s}.'),
        A('{1}, sag dreimal schnell hintereinander: „Fischers Fritz fischt frische Fische.“ Verhaspelst du dich, trinkst du {s}.'),
        A('{1} entscheidet: Entweder trinken alle mit Brille {s} oder alle ohne Brille.'),
        A('{1}, mach ein Selfie mit {2} und {3} – mit euren besten Grimassen. Wer sich weigert, trinkt {s}.'),
        A('{1}, {2} und {3}: Schaut euch ernst an. Wer als Erstes lacht, trinkt {S}.'),
        A('{1}, zeig zehn Sekunden lang deinen besten Tanzmove. Gefällt er der Runde nicht, trinkst du {s}.'),
        A('Alle, die heute noch nicht getanzt haben, trinken {s}.'),
        G('Kategorie: Cocktails. {1} beginnt, dann geht es reihum. Wer nichts mehr weiß, trinkt {s}.'),
        G('Kategorie: Dinge, die man auf einer Party sagt. {1} beginnt, dann geht es reihum. Wer zögert, trinkt {s}.'),
        G('Ich hab noch nie auf einer Party geweint.' + NEVER),
        G('Ich hab noch nie jemandem einen falschen Namen genannt.' + NEVER),
        G('Ich hab noch nie eine Nachricht an die falsche Person geschickt.' + NEVER),
        G('Ich hab noch nie in einem Club meine Freunde verloren.' + NEVER),
        V('Wer verliert heute Abend als Erstes etwas?' + VOTE + 'trinkt {s}.'),
        V('Wer würde am ehesten eine Nacht im Gefängnis verbringen?' + VOTE + 'trinkt {s}.'),
        V('Wer hat die meisten Geheimnisse?' + VOTE + 'trinkt {s}.'),
        V('Wer ist heute am besten angezogen?' + VOTE + 'verteilt {S}.'),
        R('{1} ist jetzt für den Nachschub zuständig und schenkt allen auf Zuruf nach.',
          '{1} ist nicht mehr für den Nachschub zuständig.'),
        R('Niemand darf mit der rechten Hand trinken. Wer erwischt wird, trinkt {s}.',
          'Ihr dürft wieder mit rechts trinken.'),
        R('Alle müssen jeden Satz mit „…, Käpt’n!“ beenden. Wer es vergisst, trinkt {s}.',
          'Ihr müsst eure Sätze nicht mehr mit „Käpt’n“ beenden.'),
        R('{1} hat die Daumen-Macht: Legt {1} den Daumen auf den Tisch, müssen alle nachziehen. Wer als Letztes dran ist, trinkt {s}.',
          'Die Daumen-Macht von {1} ist vorbei.'),
        R('Keine Namen mehr! Wer jemanden beim Namen nennt, trinkt {s}.',
          'Ihr dürft euch wieder beim Namen nennen.'),
        R('{1} ist jetzt der Schatten von {2}: Immer wenn {2} trinkt, trinkt {1} mit.',
          '{1} ist nicht mehr der Schatten von {2}.')
      ]
    },
    {
      id: 'truth',
      name: 'Ehrlich gesagt',
      emoji: '💬',
      description: 'Fragen, Geständnisse und Geschichten.',
      cards: [
        A('{1}, was war die größte Lüge, die du deinen Eltern je erzählt hast? Antworte oder trink {S}.'),
        A('{1}, wen aus der Runde würdest du auf eine einsame Insel mitnehmen – und warum?'),
        A('{1}, was ist deine merkwürdigste Angewohnheit? Antworte oder trink {s}.'),
        A('{1}, wann hast du zuletzt geweint? Antworte oder trink {s}.'),
        A('{1}, was würdest du tun, wenn du einen Tag lang unsichtbar wärst?'),
        A('{1}, welchen Song hörst du heimlich, obwohl er dir peinlich ist? Verrate ihn oder trink {s}.'),
        A('{1}, hast du schon einmal das Profil von jemandem aus der Runde durchstöbert? Falls ja, trink {s}.'),
        A('{1}, was ist das Mutigste, das du je getan hast?'),
        A('{1}, welchen Rat würdest du deinem 15-jährigen Ich geben?'),
        A('{1}, worüber könntest du stundenlang reden? Du hast 30 Sekunden, um die Runde dafür zu begeistern.'),
        A('{1} und {2}: Was war euer erster Eindruck voneinander? Wer nicht antwortet, trinkt {s}.'),
        A('{1}, verrate eine unpopuläre Meinung, die du hast – oder trink {s}.'),
        A('{1}, wer aus der Runde hat dich schon einmal richtig genervt? Antworte oder trink {S}.'),
        A('{1}, wofür bist du gerade am dankbarsten?'),
        A('{1}, erzähl zwei Wahrheiten und eine Lüge über dich. Alle, die die Lüge nicht erkennen, trinken {s}.'),
        A('{1}, was war dein schlimmstes Date? Erzähl davon oder trink {S}.'),
        A('{1}, was ist das Peinlichste in deinem Suchverlauf? Verrate es oder trink {S}.'),
        A('{1}, welches Talent hast du, von dem hier niemand weiß?'),
        A('{1}, mit wem aus der Runde würdest du für einen Tag das Leben tauschen?'),
        A('{1}, was hast du zuletzt gegoogelt? Zeig es oder trink {s}.'),
        A('{1}, was magst du an {2} am meisten?'),
        A('{1}, was hat dich in letzter Zeit richtig glücklich gemacht?'),
        A('{1}, erzähl von einem Moment, in dem du dich so richtig blamiert hast – oder trink {S}.'),
        G('Ich hab noch nie gelogen, um früher von einer Feier gehen zu können.' + NEVER),
        G('Ich hab noch nie heimlich das Handy einer anderen Person durchsucht.' + NEVER),
        G('Ich hab noch nie so getan, als hätte ich jemanden nicht gesehen, um nicht reden zu müssen.' + NEVER),
        G('Ich hab noch nie ein Geschenk weiterverschenkt.' + NEVER),
        G('Ich hab noch nie über jemanden aus dieser Runde gelästert.' + NEVER),
        V('Wer aus der Runde kann am besten Geheimnisse bewahren?' + VOTE + 'verteilt {s}.'),
        V('Wer wird als Erstes heiraten?' + VOTE + 'trinkt {s}.'),
        V('Wer ist heimlich ein Genie?' + VOTE + 'verteilt {s}.'),
        V('Wer würde am ehesten berühmt werden?' + VOTE + 'trinkt {s}.'),
        R('Wer spricht, muss der angesprochenen Person in die Augen schauen. Wer wegschaut, trinkt {s}.',
          'Ihr dürft beim Reden wieder wegschauen.'),
        R('{1} ist jetzt Lügendetektor: Glaubt {1}, dass jemand lügt, trinkt diese Person {s}.',
          '{1} ist kein Lügendetektor mehr.')
      ]
    },
    {
      id: 'spicy',
      name: 'Heiß & Wild',
      emoji: '💋',
      description: 'Flirten, Dates und gewagte Fragen.',
      cards: [
        A('{1}, wer aus der Runde hat das schönste Lächeln? Sag es laut oder trink {S}.'),
        A('{1}, beschreibe deinen perfekten ersten Kuss in drei Worten.'),
        A('{1}, wann hattest du dein letztes Date? Antworte oder trink {s}.'),
        A('{1}, mach {2} ein Kompliment mit Flirtfaktor. Wird {2} rot, verteilst du {s}.'),
        A('{1}, welche Eigenschaft findest du bei anderen sofort anziehend?'),
        A('{1}, schreib deinem letzten Schwarm „Hey :)“ – oder trink {S}.'),
        A('{1}, flüstere {2} ein Geheimnis ins Ohr. Findet {2} es langweilig, trinkst du {s}.'),
        A('{1}, wie viele Personen hast du schon geküsst? Antworte oder trink {S}.'),
        A('{1}, erzähl von deinem schlechtesten Anmachspruch – oder trink {s}.'),
        A('{1}, probier deinen besten Anmachspruch an {2} aus. Muss {2} lachen, trinkt {2} {s}.'),
        A('{1}, wer aus der Runde wäre das beste Date? Sag es laut oder trink {S}.'),
        A('{1} und {2}: Plant in 30 Sekunden ein Traum-Date für euch beide. Findet die Runde es langweilig, trinkt ihr beide {s}.'),
        A('{1}, was ist für dich ein absolutes No-Go beim Daten?'),
        A('{1}, gib {2} eine kurze Schultermassage, wenn {2} einverstanden ist – sonst trinkst du {s}.'),
        A('{1}, verrate, wer aus deinem Freundeskreis am meisten flirtet – oder trink {s}.'),
        A('{1}, zeig der Runde deinen besten Verführungsblick. Lacht jemand, trinkst du {s}.'),
        A('{1}, was war das Romantischste, das jemand je für dich getan hat?'),
        A('{1}, gib {2} einen Handkuss wie im Film, wenn {2} es erlaubt – sonst trinkst du {s}.'),
        G('Ich hab noch nie jemanden auf einer Party geküsst.' + NEVER),
        G('Ich hab noch nie ein Date vorzeitig verlassen.' + NEVER),
        G('Ich hab noch nie eine Dating-App benutzt.' + NEVER),
        G('Ich hab noch nie jemanden aus dieser Runde attraktiv gefunden.' + NEVER),
        G('Ich hab noch nie jemanden geghostet.' + NEVER),
        V('Wer flirtet in der Runde am meisten?' + VOTE + 'trinkt {s}.'),
        V('Wer hat die meisten Dating-Apps auf dem Handy?' + VOTE + 'trinkt {s}.'),
        V('Wer ist in der Runde am romantischsten?' + VOTE + 'verteilt {s}.'),
        R('{1} und {2} sind jetzt verlobt und nennen sich nur noch „Schatz“. Wer es vergisst, trinkt {s}.',
          'Die Verlobung von {1} und {2} ist aufgelöst.'),
        R('Beim Anstoßen müssen sich alle tief in die Augen schauen. Wer wegschaut, trinkt {s}.',
          'Beim Anstoßen dürft ihr wieder wegschauen.')
      ]
    }
  ];
});
