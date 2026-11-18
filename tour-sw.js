const CACHE = 'advot-tour-v4';
const CORE = [
  'tour.html',
  'assets/tour/ms-golden-haggadah.webp', 'assets/tour/ms-lisbon-bible.webp', 'assets/tour/ms-kaifeng-torah.webp',
  'assets/tour/st-courtyard.webp', 'assets/tour/st-hall.webp', 'assets/tour/st-kings.webp', 'assets/tour/st-magna.webp',
  'assets/tour/st-folio.webp', 'assets/tour/st-leonardo.webp', 'assets/tour/st-austen.webp', 'assets/tour/st-declaration.webp', 'assets/tour/st-tablet.webp'
];
const SHARED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('advot-tour-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // the page: always try the network first so an update is never stuck behind the cache
  if (req.mode === 'navigate') {
    const net = fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put('tour.html', copy)); return res;
    });
    // on a weak signal, fall back to the cached page after 3 seconds instead of hanging
    const slow = new Promise(r => setTimeout(r, 3000)).then(() => caches.match('tour.html'));
    e.respondWith(Promise.race([net.catch(() => caches.match('tour.html')), slow.then(hit => hit || net)]));
    return;
  }

  if (url.origin === location.origin && url.pathname.includes('/assets/tour/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
    return;
  }

  if (SHARED_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
