// ============================================================
// Firebase Messaging Service Worker
// File ini WAJIB bernama firebase-messaging-sw.js dan berada di root.
// Firebase SDK mencari file ini secara otomatis untuk background push.
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

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

// Background push — dipanggil saat tab tertutup / app di background
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message:', payload)

  // Payload dari Novu bisa ada di notification atau data
  const notification = payload.notification || {}
  const data         = payload.data         || {}

  const title = notification.title || data.title || 'PubSub'
  const body  = notification.body  || data.body  || ''
  const icon  = notification.icon  || '/icons/icon.svg'

  self.registration.showNotification(title, {
    body,
    icon,
    badge:   '/icons/icon.svg',
    tag:     data.event_id || data.tag || String(Date.now()),
    data:    { url: data.url || '/' },
    renotify: false,
  })
})

// Klik notifikasi → fokus / buka tab app
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) return c.focus()
      }
      return clients.openWindow(url)
    })
  )
})
