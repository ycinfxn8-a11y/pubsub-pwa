// ============================================================
// Firebase Messaging Service Worker
// Wajib bernama firebase-messaging-sw.js di root untuk Android FCM
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

// Parse nilai — jika string JSON, ambil field di dalamnya
function parseField(val) {
  if (!val) return null
  if (typeof val !== 'string') return val
  try {
    const parsed = JSON.parse(val)
    return typeof parsed === 'object' ? parsed : val
  } catch { return val }
}

messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Raw payload:', JSON.stringify(payload))

  const n    = payload.notification || {}
  const data = payload.data         || {}

  // data.title / data.body bisa berupa string JSON dari Novu
  // contoh: data.title = '{"title":"judul","body":"isi"}'
  // Coba parse dulu, lalu ambil field yang tepat
  const parsedTitle = parseField(data.title)
  const parsedBody  = parseField(data.body)

  let title, body

  if (parsedTitle && typeof parsedTitle === 'object') {
    // Seluruh payload ternyata ada di data.title sebagai JSON object
    title = parsedTitle.title || parsedTitle.subject || 'PubSub'
    body  = parsedTitle.body  || parsedTitle.content || ''
  } else if (parsedBody && typeof parsedBody === 'object') {
    title = parsedBody.title || n.title || data.title || 'PubSub'
    body  = parsedBody.body  || parsedBody.content   || ''
  } else {
    // Format normal — field terpisah
    title = n.title || data.title || 'PubSub'
    body  = n.body  || data.body  || ''
  }

  // Strip HTML tag jika ada
  title = title.replace(/<[^>]*>/g, '').trim()
  body  = body.replace(/<[^>]*>/g, '').trim()

  console.log('[FCM SW] Showing notification:', title, '|', body)

  return self.registration.showNotification(title, {
    body,
    icon:    '/icons/icon.svg',
    badge:   '/icons/icon.svg',
    tag:     data.event_id || data.tag || String(Date.now()),
    data:    { url: '/' },
    vibrate: [200, 100, 200],
    renotify: true,
  })
})

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
