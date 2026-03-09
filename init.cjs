/**
 * init.cjs — Inisialisasi Skema Database Appwrite
 * =================================================
 * Membuat database, koleksi, atribut, dan indeks
 * untuk aplikasi PubSub PWA.
 *
 * Dependensi : node-appwrite ^22.1.3
 * Runtime    : Node.js 18+
 *
 * Cara pakai:
 *   1. npm install node-appwrite
 *   2. Isi ENDPOINT, PROJECT_ID, API_KEY di bawah
 *   3. node init.cjs
 */

'use strict'

const sdk = require('node-appwrite')

// ── Konfigurasi ────────────────────────────────────────────────────────────
const ENDPOINT   = 'https://cloud.appwrite.io/v1'  // ganti jika self-hosted
const PROJECT_ID = 'YOUR_PROJECT_ID'               // ← ganti
const API_KEY    = 'YOUR_API_KEY'                  // ← ganti (scope: databases.write)

const DATABASE_ID = 'pubsub_db'
const DATABASE_NAME = 'PubSub Database'

// ── Client ─────────────────────────────────────────────────────────────────
const client = new sdk.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY)

const databases = new sdk.Databases(client)

// ── Helpers ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Jalankan satu langkah inisialisasi dengan logging.
 * Jika resource sudah ada (409), lanjut tanpa error.
 */
async function run(label, fn) {
  process.stdout.write(`  ${label}... `)
  try {
    const result = await fn()
    console.log('✓')
    return result
  } catch (err) {
    if (err.code === 409) {
      console.log('sudah ada, dilewati')
    } else {
      console.log('✗')
      console.error(`    → [${err.code}] ${err.message}`)
      throw err
    }
  }
}

/**
 * Appwrite memerlukan jeda singkat antar createAttribute
 * agar tidak kena rate-limit atau race condition.
 */
async function attr(label, fn) {
  await run(label, fn)
  await sleep(500)
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║  PubSub PWA — Appwrite Schema Init          ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // ── 1. Database ───────────────────────────────────────────────────────────
  console.log('▶ Database')
  await run(`Buat database "${DATABASE_ID}"`, () =>
    databases.create({
      databaseId: DATABASE_ID,
      name: DATABASE_NAME,
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Koleksi: topics
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Koleksi: topics')

  await run('Buat koleksi', () =>
    databases.createCollection({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      name: 'Topics',
      permissions: [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ],
      documentSecurity: false,
    })
  )

  await attr('  Atribut: name (string, required)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      key: 'name',
      size: 128,
      required: true,
    })
  )

  await attr('  Atribut: slug (string, required)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      key: 'slug',
      size: 128,
      required: true,
    })
  )

  await attr('  Atribut: description (string)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      key: 'description',
      size: 512,
      required: false,
      default: '',
    })
  )

  await attr('  Atribut: is_public (boolean)', () =>
    databases.createBooleanAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      key: 'is_public',
      required: false,
      default: true,
    })
  )

  await attr('  Atribut: subscriber_count (integer)', () =>
    databases.createIntegerAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      key: 'subscriber_count',
      required: false,
      min: 0,
      default: 0,
    })
  )

  await attr('  Atribut: owner_id (string)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      key: 'owner_id',
      size: 36,
      required: false,
      default: '',
    })
  )

  await attr('  Atribut: novu_topic_key (string)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      key: 'novu_topic_key',
      size: 128,
      required: false,
      default: '',
    })
  )

  // Tunggu atribut selesai dibuat sebelum buat indeks
  await sleep(1500)

  await run('  Indeks: slug (unique)', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      key: 'idx_slug',
      type: sdk.IndexType.Unique,
      attributes: ['slug'],
    })
  )

  await run('  Indeks: owner_id', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      key: 'idx_owner_id',
      type: sdk.IndexType.Key,
      attributes: ['owner_id'],
    })
  )

  await run('  Indeks: is_public', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'topics',
      key: 'idx_is_public',
      type: sdk.IndexType.Key,
      attributes: ['is_public'],
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Koleksi: events
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Koleksi: events')

  await run('Buat koleksi', () =>
    databases.createCollection({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      name: 'Events',
      permissions: [
        sdk.Permission.read(sdk.Role.users()),
        // create("any") diperlukan agar Appwrite Function (server/API key)
        // bisa insert document — Function tidak berjalan sebagai "users"
        sdk.Permission.create(sdk.Role.any()),
      ],
      documentSecurity: false,
    })
  )

  await attr('  Atribut: topic_id (string, required)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'topic_id',
      size: 36,
      required: true,
    })
  )

  await attr('  Atribut: event_type (enum, required)', () =>
    databases.createEnumAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'event_type',
      elements: ['created', 'updated', 'deleted', 'custom'],
      required: true,
      default: 'custom',
    })
  )

  await attr('  Atribut: publisher_id (string)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'publisher_id',
      size: 36,
      required: false,
      default: '',
    })
  )

  await attr('  Atribut: payload (string, JSON)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'payload',
      size: 65535,
      required: false,
      default: '{}',
    })
  )

  await attr('  Atribut: priority (enum)', () =>
    databases.createEnumAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'priority',
      elements: ['low', 'normal', 'high', 'critical'],
      required: false,
      default: 'normal',
    })
  )

  await attr('  Atribut: ttl (integer, detik)', () =>
    databases.createIntegerAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'ttl',
      required: false,
      min: 0,
    })
  )

  await attr('  Atribut: status (enum)', () =>
    databases.createEnumAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'status',
      elements: ['pending', 'delivered', 'failed'],
      required: false,
      default: 'pending',
    })
  )

  await attr('  Atribut: created_at (string, ISO 8601)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'created_at',
      size: 32,
      required: false,
      default: '',
    })
  )

  await sleep(1500)

  await run('  Indeks: topic_id', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'idx_topic_id',
      type: sdk.IndexType.Key,
      attributes: ['topic_id'],
    })
  )

  await run('  Indeks: publisher_id', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'idx_publisher_id',
      type: sdk.IndexType.Key,
      attributes: ['publisher_id'],
    })
  )

  await run('  Indeks: status', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'idx_status',
      type: sdk.IndexType.Key,
      attributes: ['status'],
    })
  )

  await run('  Indeks: priority', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'idx_priority',
      type: sdk.IndexType.Key,
      attributes: ['priority'],
    })
  )

  await run('  Indeks: topic_id + $createdAt (query utama)', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'events',
      key: 'idx_topic_created',
      type: sdk.IndexType.Key,
      attributes: ['topic_id', '$createdAt'],
      orders: ['ASC', 'DESC'],
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Koleksi: subscriptions
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Koleksi: subscriptions')

  await run('Buat koleksi', () =>
    databases.createCollection({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      name: 'Subscriptions',
      permissions: [
        sdk.Permission.read(sdk.Role.users()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ],
      documentSecurity: true, // setiap user hanya lihat miliknya
    })
  )

  await attr('  Atribut: topic_id (string, required)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'topic_id',
      size: 36,
      required: true,
    })
  )

  await attr('  Atribut: subscriber_id (string, required)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'subscriber_id',
      size: 36,
      required: true,
    })
  )

  await attr('  Atribut: novu_subscriber_id (string)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'novu_subscriber_id',
      size: 36,
      required: false,
      default: '',
    })
  )

  await attr('  Atribut: channels (string[], array)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'channels',
      size: 32,
      required: false,
      array: true,
    })
  )

  await attr('  Atribut: filter (string, JSON)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'filter',
      size: 1024,
      required: false,
      default: '{}',
    })
  )

  await attr('  Atribut: is_active (boolean)', () =>
    databases.createBooleanAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'is_active',
      required: false,
      default: true,
    })
  )

  await attr('  Atribut: subscribed_at (string, ISO 8601)', () =>
    databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'subscribed_at',
      size: 32,
      required: false,
      default: '',
    })
  )

  await sleep(1500)

  await run('  Indeks: subscriber_id', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'idx_subscriber_id',
      type: sdk.IndexType.Key,
      attributes: ['subscriber_id'],
    })
  )

  await run('  Indeks: topic_id', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'idx_topic_id',
      type: sdk.IndexType.Key,
      attributes: ['topic_id'],
    })
  )

  await run('  Indeks: subscriber_id + topic_id (unique per user)', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'idx_sub_topic_unique',
      type: sdk.IndexType.Unique,
      attributes: ['subscriber_id', 'topic_id'],
    })
  )

  await run('  Indeks: is_active', () =>
    databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: 'subscriptions',
      key: 'idx_is_active',
      type: sdk.IndexType.Key,
      attributes: ['is_active'],
    })
  )

  // ── Selesai ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║  Selesai! Skema berhasil dibuat.            ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log('\nKoleksi yang dibuat:')
  console.log('  • topics         — data topik pub/sub')
  console.log('  • events         — event yang dipublish')
  console.log('  • subscriptions  — langganan subscriber per topik')
  console.log('\nLangkah selanjutnya:')
  console.log('  1. Isi PROJECT_ID di src/config.js')
  console.log('  2. Deploy Appwrite Functions (publish-event, novu-subscribe)')
  console.log('  3. npm run dev\n')
}

main().catch((err) => {
  console.error('\n✗ Init gagal:', err.message)
  process.exit(1)
})
