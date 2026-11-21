/* Schluckspecht – Service Worker: macht das Spiel offline spielbar. */
'use strict';

var CACHE = 'schluckspecht-v2';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/engine.js',
  './js/cards.js',
  './js/duel-cards.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* Stale-while-revalidate: sofort aus dem Cache antworten, im Hintergrund aktualisieren. */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      var lookup = req.mode === 'navigate' ? cache.match('./index.html') : cache.match(req, { ignoreSearch: true });
      return lookup.then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') {
            cache.put(req.mode === 'navigate' ? './index.html' : req, res.clone());
          }
          return res;
        });
        if (cached) {
          event.waitUntil(network.catch(function () {}));
          return cached;
        }
        return network.catch(function () {
          return req.mode === 'navigate' ? cache.match('./index.html') : Response.error();
        });
      });
    })
  );
});
