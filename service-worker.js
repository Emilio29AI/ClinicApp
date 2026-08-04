const CACHE_VERSION = "clinicapp-v5-turnos-disponibilidad";

const APP_SHELL = [
    "./",
    "./index.html",
    "./login.html",
    "./restablecer-password.html",
    "./style.css",
    "./config.js",
    "./database.js",
    "./auth.js",
    "./app.js",
    "./components/modal.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", event => {

    event.waitUntil(
        caches
            .open(CACHE_VERSION)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );

});

self.addEventListener("activate", event => {

    event.waitUntil(
        caches
            .keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_VERSION)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );

});

self.addEventListener("fetch", event => {

     const url = new URL(event.request.url);

    if(
        event.request.method !== "GET" ||
        url.protocol !== "https:" ||
        url.origin !== self.location.origin
    ){
        return;
    }

    const request = event.request;

    if(
        request.method !== "GET" ||
        url.hostname.endsWith("supabase.co")
    ){
        return;
    }

    if(request.mode === "navigate"){

        event.respondWith(
            fetch(request)
                .then(response => {

                    const copy = response.clone();

                    caches
                        .open(CACHE_VERSION)
                        .then(cache => cache.put(request, copy));

                    return response;
                })
                .catch(() => caches.match(request))
        );

        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {

            if(cached) return cached;

            return fetch(request).then(response => {

                if(!response || response.status !== 200){
                    return response;
                }

                const copy = response.clone();

                caches
                    .open(CACHE_VERSION)
                    .then(cache => cache.put(request, copy));

                return response;
            });

        })
    );

});
