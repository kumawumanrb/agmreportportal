// Basic cache of app shell + PDFs you host on Pages
const CACHE = "krb-agm-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./reports.json",
  "./assets/logo.png",
  // Optionally list specific PDFs to guarantee offline access once visited:
  "./assets/KRB_2024_AGM_REPORTS.pdf"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  e.respondWith(
    caches.match(request).then(cached => {
      const fetcher = fetch(request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return resp;
        })
        .catch(() => cached || Promise.reject("offline"));
      return cached || fetcher;
    })
  );
});
