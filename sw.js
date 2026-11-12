/* TaskMaster Calendar Pro_v 3.7.0 | medbasha */
const CACHE_NAME = 'taskmaster-v3-7-0';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './icon.svg',
    './icon-192.png',
    './icon-152.png',
    './icon-512.png'
];

// 1. INSTALACIÓN Y PRE-CACHÉ CON RUTAS RELATIVAS PURAS
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                ASSETS_TO_CACHE.map((url) =>
                    cache.add(url).catch((err) => {
                        console.warn('[SW v3.7.0] Recurso opcional omitido en caché:', url, err);
                    })
                )
            );
        })
    );
});

// 2. ACTIVACIÓN Y ELIMINACIÓN INMEDIATA DE VERSIONES ANTERIORES
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. INTERCEPCIÓN DE RED: NETWORK-FIRST PARA CÓDIGO Y CACHE-FIRST PARA ESTÁTICOS
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const reqUrl = new URL(event.request.url);

    // No interceptar peticiones externas a Firebase Auth, Realtime Database o APIs
    if (
        reqUrl.hostname.includes('firebaseio.com') ||
        reqUrl.hostname.includes('firebasedatabase.app') ||
        reqUrl.hostname.includes('googleapis.com') ||
        reqUrl.hostname.includes('firebaseapp.com')
    ) {
        return;
    }

    // Estrategia Network-First para HTML y JS para garantizar siempre la v3.7.0
    if (
        event.request.mode === 'navigate' ||
        reqUrl.pathname.endsWith('.html') ||
        reqUrl.pathname.endsWith('.js')
    ) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Estrategia Cache-First con actualización silenciosa para iconos y manifest
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && reqUrl.origin === self.location.origin) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            });
        })
    );
});

// 4. NOTIFICACIONES PUSH EN SEGUNDO PLANO (FIREBASE CLOUD MESSAGING)
try {
    importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

    firebase.initializeApp({
        apiKey: "AIzaSyAelzQOy8KFQ5OZkctKJS2DZUaxvaLMfRE",
        authDomain: "taskmastercalendar-a779e.firebaseapp.com",
        databaseURL: "https://taskmastercalendar-a779e-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "taskmastercalendar-a779e",
        storageBucket: "taskmastercalendar-a779e.firebasestorage.app",
        messagingSenderId: "628005433300",
        appId: "1:628005433300:web:b6a39ed06922a34de07041"
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        const title = (payload.notification && payload.notification.title) || 'TaskMaster Alerta';
        const body = (payload.notification && payload.notification.body) || 'Tienes un aviso programado.';

        return self.registration.showNotification(title, {
            body: body,
            icon: './icon-192.png',
            badge: './icon-192.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            renotify: true,
            tag: 'taskmaster-push-' + Date.now()
        });
    });
} catch (err) {
    console.warn('[SW v3.7.0] Modo offline sin scripts externos FCM:', err);
}

// 5. ACCIÓN AL TOCAR LA NOTIFICACIÓN EN EL MÓVIL
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});
