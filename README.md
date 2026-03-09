# PubSub PWA

Aplikasi Publish/Subscribe real-time berbasis **Appwrite** + **Novu** + **LocalStorage** dibangun dengan **Vite + Vanilla JS**.

## Versi Dependensi

| Package | Versi | Keterangan |
|---|---|---|
| `appwrite` | ^23.0.0 | Web SDK (client-side) |
| `@novu/js` | ^2.7.0 | Novu In-App Inbox (client-side) |
| `node-appwrite` | ^22.1.3 | Server SDK untuk Appwrite Functions (devDep) |
| `vite` | ^7.3.1 | Build tool |
| `vite-plugin-pwa` | ^1.2.0 | PWA manifest + service worker |

> `node-appwrite` ada di `devDependencies` karena hanya digunakan sebagai referensi
> untuk menulis kode Appwrite Function. Tidak di-bundle ke frontend.

---

## Perubahan API Penting (vs versi lama)

### appwrite Web SDK v23
- Semua named exports (`Client`, `Account`, `Databases`, `Functions`, `ID`, `Query`) tidak berubah
- `client.subscribe()` untuk Realtime tidak berubah
- `functions.createExecution(functionId, body, async, path, method, headers)` — positional args tetap kompatibel

### node-appwrite v22 (untuk Appwrite Functions)
- **Object syntax baru (direkomendasikan):**
  ```js
  // Lama (masih didukung):
  await functions.createExecution('fn-id', body, false, '/', 'POST', {})
  // Baru v22:
  await functions.createExecution({ functionId: 'fn-id', body, method: 'POST' })
  ```
- `ExecutionMethod` enum tersedia: `sdk.ExecutionMethod.POST`

### @novu/js v2
- Bukan lagi `@novu/notification-center` — sudah diganti `@novu/js`
- Init: `new Novu({ subscriberId, applicationIdentifier })`
- Listen event: `novu.on('notifications.notification_received', cb)`
- List notif: `novu.notifications.list({ limit })`

### vite-plugin-pwa v1.x
- Tambah `injectRegister: 'auto'` (baru di v1)
- `devOptions.type: 'module'` untuk dev mode
- `cleanupOutdatedCaches` default `true`

---

## Struktur Proyek

```
pubsub-pwa/
├── public/
│   └── icons/
│       └── icon.svg
├── src/
│   ├── pages/
│   │   ├── login.js
│   │   ├── dashboard.js
│   │   ├── topics.js
│   │   ├── publish.js
│   │   ├── inbox.js
│   │   └── settings.js
│   ├── services/
│   │   ├── appwrite.js   ← Client SDK v23 + @novu/js v2
│   │   └── storage.js    ← LocalStorage service
│   ├── components/
│   │   └── toast.js
│   ├── utils/
│   │   ├── eventBus.js
│   │   └── helpers.js
│   ├── icons.js
│   ├── config.js         ← Isi credentials di sini
│   ├── style.css
│   └── main.js
├── index.html
├── vite.config.js
└── package.json
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Edit `src/config.js`
```js
export const APPWRITE_CONFIG = {
  endpoint: 'https://cloud.appwrite.io/v1',
  projectId: 'YOUR_PROJECT_ID',        // ← ganti
  databaseId: 'pubsub_db',
  collections: {
    topics: 'topics',
    events: 'events',
    subscriptions: 'subscriptions',
  },
  functions: {
    publishEvent: 'publish-event',
    novuSubscribe: 'novu-subscribe',
  },
}

export const NOVU_CONFIG = {
  applicationIdentifier: 'YOUR_NOVU_APP_ID', // ← ganti
}
```

### 3. Jalankan
```bash
npm run dev       # development
npm run build     # production build
npm run preview   # preview build
```

---

## Setup Appwrite

### Database `pubsub_db` — Koleksi:

**`topics`**
| Atribut | Tipe | Wajib |
|---|---|---|
| name | string(128) | ya |
| slug | string(128) | ya |
| description | string(512) | tidak |
| is_public | boolean | tidak |
| subscriber_count | integer | tidak |
| owner_id | string(36) | tidak |
| novu_topic_key | string(128) | tidak |

**`events`**
| Atribut | Tipe | Wajib |
|---|---|---|
| topic_id | string(36) | ya |
| event_type | enum(created,updated,deleted,custom) | ya |
| publisher_id | string(36) | tidak |
| payload | string(65535) | tidak |
| priority | enum(low,normal,high,critical) | tidak |
| ttl | integer | tidak |
| status | enum(pending,delivered,failed) | tidak |
| created_at | string(32) | tidak |

**`subscriptions`**
| Atribut | Tipe | Wajib |
|---|---|---|
| topic_id | string(36) | ya |
| subscriber_id | string(36) | ya |
| channels | string[] | tidak |
| is_active | boolean | tidak |

### Permissions:
- `topics`: read("any"), create("users"), update("users"), delete("users")
- `events`: read("users"), create("users")
- `subscriptions`: read("users"), create("users"), delete("users")

---

## Appwrite Functions

### Function: `publish-event` (Node.js 21+)

```js
// package.json fungsi:
// { "dependencies": { "node-appwrite": "^22.1.3", "@novu/node": "^2.6.0" } }

import { Client, Databases, ID } from 'node-appwrite'
import { Novu } from '@novu/node'

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY)
  const databases = new Databases(client)

  let event
  try {
    event = JSON.parse(req.body)
  } catch {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  // node-appwrite v22: object syntax (atau positional masih OK)
  const saved = await databases.createDocument({
    databaseId: 'pubsub_db',
    collectionId: 'events',
    documentId: ID.unique(),
    data: {
      ...event,
      payload: typeof event.payload === 'string'
        ? event.payload
        : JSON.stringify(event.payload),
      status: 'delivered',
    },
  })

  // Trigger Novu push ke semua subscriber topik
  if (process.env.NOVU_API_KEY) {
    try {
      const novu = new Novu(process.env.NOVU_API_KEY)
      await novu.trigger('pubsub-event', {
        to: { type: 'Topic', topicKey: event.topic_id },
        payload: {
          title: `[${event.event_type}] ${event.topic_id}`,
          body: typeof event.payload === 'object'
            ? JSON.stringify(event.payload)
            : String(event.payload || ''),
          event_id: saved.$id,
        },
        transactionId: saved.$id,
      })
    } catch (e) {
      error('Novu trigger failed: ' + e.message)
    }
  }

  // Appwrite Realtime otomatis broadcast saat createDocument
  return res.json({ success: true, event_id: saved.$id })
}
```

### Function: `novu-subscribe` (Node.js 21+)

```js
// { "dependencies": { "@novu/node": "^2.6.0" } }

import { Novu } from '@novu/node'

export default async ({ req, res, error }) => {
  if (!process.env.NOVU_API_KEY) {
    return res.json({ success: false, error: 'NOVU_API_KEY not set' }, 500)
  }

  let body
  try { body = JSON.parse(req.body) } catch {
    return res.json({ success: false, error: 'Invalid JSON' }, 400)
  }

  const { topic_id, subscriber_id, email } = body
  const novu = new Novu(process.env.NOVU_API_KEY)

  // Upsert subscriber di Novu
  await novu.subscribers.identify(subscriber_id, { email: email || '' })

  // Buat topic jika belum ada, lalu tambahkan subscriber
  try {
    await novu.topics.create({ key: topic_id, name: topic_id })
  } catch { /* topic mungkin sudah ada */ }

  await novu.topics.addSubscribers(topic_id, {
    subscribers: [subscriber_id],
  })

  return res.json({ success: true })
}
```

### Environment Variables Functions:
```
NOVU_API_KEY=your_novu_secret_api_key
```
> `APPWRITE_FUNCTION_API_ENDPOINT`, `APPWRITE_FUNCTION_PROJECT_ID`, `APPWRITE_FUNCTION_API_KEY`
> sudah tersedia otomatis di runtime Appwrite Functions.

---

## Setup Novu

1. Daftar di [novu.co](https://novu.co)
2. Buat **Workflow** baru bernama `pubsub-event`
3. Tambahkan step: **In-App** channel
4. Template: gunakan variabel `{{title}}` dan `{{body}}`
5. Salin **Application Identifier** (bukan API Key) ke `src/config.js → NOVU_CONFIG.applicationIdentifier`
6. API Key rahasia masukkan ke environment variable Function `NOVU_API_KEY`

---

## LocalStorage Keys

| Key | Isi |
|---|---|
| `pubsub:subscriptions` | `string[]` — topic_id yang di-subscribe |
| `pubsub:pending_events` | `EventMessage[]` — event antri (offline) |
| `pubsub:inbox` | `EventMessage[]` — max 100 event diterima |
| `pubsub:unread_count` | `number` |
| `pubsub:last_sync` | ISO timestamp |
| `pubsub:novu_token` | Novu session token |
| `pubsub:draft_event` | Draft event belum dipublish |
| `pubsub:current_user` | Appwrite user object |
