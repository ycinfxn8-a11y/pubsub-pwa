# PubSub PWA

Aplikasi Publish/Subscribe real-time berbasis **Appwrite** + **Novu** + **Firebase (FCM)** dibangun dengan **Vite + Vanilla JS**.

## Stack & Dependensi

| Package | Versi | Keterangan |
|---|---|---|
| `appwrite` | ^23.0.0 | Web SDK (client-side) |
| `@novu/js` | ^3.14.1 | Novu In-App Inbox (client-side) |
| `node-appwrite` | ^22.1.3 | Server SDK — hanya untuk Appwrite Functions (devDep) |
| `vite` | ^7.3.1 | Build tool |
| `vite-plugin-pwa` | ^1.2.0 | PWA manifest + service worker |

> `node-appwrite` ada di `devDependencies` — hanya referensi untuk menulis kode Function, tidak di-bundle ke frontend.

---

## Struktur Proyek

```
pubsub-pwa/
├── public/
│   ├── icons/
│   │   └── icon.svg
│   └── sw.js                  ← Service worker (push notification)
├── src/
│   ├── main.js                ← Semua JS dalam satu file
│   └── style.css
├── .env.example
├── index.html
├── init.cjs                   ← Script init schema Appwrite DB
├── fix-events-permission.cjs  ← Script perbaiki permission koleksi events
├── vite.config.js
└── package.json
```

---

## Setup

### 1. Clone & install

```bash
npm install
```

### 2. Buat file `.env`

```bash
cp .env.example .env
```

Isi nilai berikut di `.env`:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=pubsub_db
VITE_APPWRITE_COL_TOPICS=topics
VITE_APPWRITE_COL_EVENTS=events
VITE_APPWRITE_COL_SUBSCRIPTIONS=subscriptions
VITE_APPWRITE_FN_PUBLISH=publish-event
VITE_APPWRITE_FN_NOVU_SUBSCRIBE=novu-subscribe
VITE_NOVU_APP_ID=your_novu_application_identifier
```

### 3. Init database Appwrite

Edit `init.cjs` — isi `PROJECT_ID` dan `API_KEY`, lalu jalankan:

```bash
node init.cjs
```

Script ini membuat database `pubsub_db` beserta tiga koleksi: `topics`, `events`, `subscriptions`.

### 4. Jalankan

```bash
npm run dev       # development
npm run build     # production build
npm run preview   # preview build
```

---

## Setup Appwrite

### Database: `pubsub_db`

**Koleksi `topics`**

| Atribut | Tipe | Wajib |
|---|---|---|
| name | string(128) | ya |
| slug | string(128) | ya |
| description | string(512) | tidak |
| is_public | boolean | tidak |
| subscriber_count | integer | tidak |
| owner_id | string(36) | tidak |
| novu_topic_key | string(128) | tidak |

**Koleksi `events`**

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

**Koleksi `subscriptions`**

| Atribut | Tipe | Wajib |
|---|---|---|
| topic_id | string(36) | ya |
| subscriber_id | string(36) | ya |
| channels | string[] | tidak |
| is_active | boolean | tidak |

### Permissions

| Koleksi | Permission |
|---|---|
| `topics` | read(any), create(users), update(users), delete(users) |
| `events` | read(users), **create(any)** — diperlukan agar Appwrite Function bisa insert |
| `subscriptions` | read(users), create(users), delete(users), documentSecurity(true) |

> Permission `events.create(any)` wajib karena Function berjalan sebagai server (API key), bukan sebagai authenticated user. Jika perlu diperbaiki setelah DB sudah dibuat, jalankan `fix-events-permission.cjs`.

### API Key untuk Function

Buat API Key di Appwrite Console → **Settings** → **API Keys** dengan scope:
- `databases.read`, `databases.write`, `documents.read`, `documents.write`

Tambahkan sebagai environment variable `APPWRITE_API_KEY` di setiap Function.

---

## Appwrite Functions

### `publish-event` (Node.js 21)

Menyimpan event ke database dan mentrigger Novu untuk mengirim notifikasi ke seluruh subscriber topik.

**`package.json`:**
```json
{
  "type": "module",
  "dependencies": {
    "node-appwrite": "^22.1.3"
  }
}
```

**Environment variables:**
```
APPWRITE_API_KEY=your_appwrite_api_key
DATABASE_ID=pubsub_db
NOVU_API_KEY=your_novu_secret_api_key
```

**Alur:**
1. Parse body — `req.body` bisa berupa object atau string tergantung runtime, ditangani keduanya
2. Validasi `topic_id` dan `event_type`
3. `databases.createDocument()` ke koleksi `events`
4. Trigger Novu via `POST https://api.novu.co/v1/events/trigger` menggunakan native `fetch`

---

### `novu-subscribe` (Node.js 21)

Mendaftarkan user sebagai subscriber Novu dan menambahkannya ke topic.

**`package.json`:**
```json
{
  "type": "module"
}
```

**Environment variables:**
```
NOVU_API_KEY=your_novu_secret_api_key
```

**Alur:**
1. `POST /v1/subscribers` — upsert subscriber
2. `POST /v1/topics` — buat topic (skip 409 jika sudah ada)
3. `POST /v1/topics/:topicKey/subscribers` — assign subscriber ke topic

> Kedua function menggunakan **native `fetch`** langsung ke Novu REST API tanpa SDK `@novu/api`, untuk menghindari masalah version mismatch dan response validation error di SDK.

---

## Setup Novu

### 1. Buat Workflow

Novu Dashboard → **Workflows** → **Create Workflow** → beri nama `pubsub-event`.

Tambahkan dua step:

| Step | Channel | Template |
|---|---|---|
| 1 | **In-App** | Title: `{{title}}`, Body: `{{body}}` |
| 2 | **Push** | Title: `{{title}}`, Body: `{{body}}` |

### 2. Hubungkan Firebase (FCM) untuk Push

Novu Dashboard → **Integrations** → **Add Integration** → pilih **Firebase (FCM)** → isi **Server Key** dari Firebase Console.

### 3. Konfigurasi di aplikasi

Salin **Application Identifier** (bukan API Key) ke `.env`:

```env
VITE_NOVU_APP_ID=your_application_identifier
```

API Key rahasia masukkan ke environment variable Function `NOVU_API_KEY`.

---

## Setup Firebase (FCM)

### 1. Tambah env vars Firebase ke `.env`

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-id
VITE_FIREBASE_STORAGE_BUCKET=project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxx
VITE_FIREBASE_VAPID_KEY=BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXX
```

`VITE_FIREBASE_VAPID_KEY` diambil dari:
**Firebase Console** → Project Settings → **Cloud Messaging** → Web Push certificates → **Generate key pair** → salin Key pair-nya.

### 2. Aktifkan push di browser

Buka aplikasi → **Pengaturan** → **Notifikasi** → klik **Aktifkan** → setujui izin browser.

Setelah izin diberikan:
- Firebase SDK (`firebase/messaging`) diinisialisasi secara lazy
- `getToken()` dipanggil untuk mendapatkan FCM token
- Token diteruskan ke Novu subscriber agar Novu bisa push via FCM
- `sw.js` menangkap push saat app di background menggunakan `firebase-messaging-compat.js`

### 3. Catatan `sw.js`

Firebase config di-hardcode langsung di `public/sw.js` karena service worker tidak bisa mengakses `import.meta.env`. Jika project Firebase berubah, update nilai di `sw.js` secara manual.

---

## Alur Push Notification (Background)

```
User publish event
       │
publish-event (Function)
       ├── simpan ke Appwrite DB
       ├── Realtime broadcast → subscriber yang sedang online
       └── POST /v1/events/trigger → Novu Cloud
                                          │
                              ┌───────────┴───────────┐
                         In-App                      Push (FCM)
                    (inbox saat online)                   │
                                                    Browser sw.js
                                                          │
                                                  showNotification()
                                             (muncul meski tab tertutup)
```

---

## LocalStorage Keys

| Key | Isi |
|---|---|
| `pubsub:current_user` | Appwrite user object |
| `pubsub:subscriptions` | `string[]` — topic_id yang di-subscribe |
| `pubsub:inbox` | `EventMessage[]` — maks 100 event diterima |
| `pubsub:unread_count` | `number` |
| `pubsub:pending_events` | `EventMessage[]` — antrian event saat offline |
| `pubsub:draft_event` | Draft event belum dipublish |
| `pubsub:last_sync` | ISO timestamp terakhir sync |
| `pubsub:novu_token` | Novu session token |
