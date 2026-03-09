// ============================================================
// Firebase Messaging Service Worker
// Wajib bernama firebase-messaging-sw.js di root untuk Android FCM.
// Push notification ditangani sepenuhnya oleh Novu + FCM.
// SW ini hanya handle notificationclick.
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

// Inisialisasi messaging tanpa onBackgroundMessage —
// Novu Push step + FCM yang handle tampilan notif di sistem Android.
// onBackgroundMessage TIDAK dipanggil agar notif tidak muncul 2x.
firebase.messaging()

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
