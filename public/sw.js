// ============================================================
// PubSub PWA — Service Worker
// Handle FCM background push via Firebase + Novu
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Firebase config — harus sama dengan yang di main.js
// Nilai ini di-hardcode karena SW tidak bisa akses import.meta.env
const firebaseConfig = {
  apiKey:            'AIzaSyDsVh4TG4TKHKyfWeOtYxJfhfFbAy5KrY0',
  authDomain:        'jajan-antar.firebaseapp.com',
  projectId:         'jajan-antar',
  storageBucket:     'jajan-antar.firebasestorage.app',
  messagingSenderId: '990059754140',
  appId:             '1:990059754140:web:112ee8f733e4895348b359',
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

// ── Background push dari FCM (via Novu) ────────────────────────
// Dipanggil ketika tab tertutup / app di background
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {}
  const data = payload.data || {}

  self.registration.showNotification(title || 'PubSub', {
    body:    body || data.body || '',
    icon:    icon || '/icons/icon.svg',
    badge:   '/icons/icon.svg',
    tag:     data.event_id || data.tag || String(Date.now()),
    data:    { url: '/' },
    renotify: false,
  })
})

// ── Install & Activate ─────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// ── Fetch: offline fallback ────────────────────────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  if (!e.request.url.startsWith(self.location.origin)) return
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)))
})

// ── Klik notifikasi → fokus / buka tab ────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) return c.focus()
      }
      return clients.openWindow('/')
    })
  )
})
