/**
 * init-push.cjs
 * Buat koleksi push_subscriptions di Appwrite
 * Jalankan: node init-push.cjs
 */
'use strict'
const sdk = require('node-appwrite')

const ENDPOINT    = 'https://cloud.appwrite.io/v1'
const PROJECT_ID  = 'YOUR_PROJECT_ID'   // ← ganti
const API_KEY     = 'YOUR_API_KEY'      // ← ganti
const DATABASE_ID = 'pubsub_db'

const client = new sdk.Client()
  .setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY)
const databases = new sdk.Databases(client)

const delay = ms => new Promise(r => setTimeout(r, ms))

async function attr(label, fn) {
  try { await fn(); console.log('  ✓ ' + label) }
  catch (e) { if (e.code === 409) console.log('  — ' + label + ' (skip)'); else throw e }
  await delay(500)
}

async function main() {
  console.log('\n▶ Koleksi: push_subscriptions')
  await attr('Collection', () => databases.createCollection(
    DATABASE_ID, 'push_subscriptions', 'Push Subscriptions',
    [sdk.Permission.read(sdk.Role.any()), sdk.Permission.create(sdk.Role.any()),
     sdk.Permission.update(sdk.Role.any()), sdk.Permission.delete(sdk.Role.any())],
    false
  ))
  await attr('subscriber_id (string)', () => databases.createStringAttribute(
    DATABASE_ID, 'push_subscriptions', 'subscriber_id', 128, true))
  await attr('subscription (string/JSON)', () => databases.createStringAttribute(
    DATABASE_ID, 'push_subscriptions', 'subscription', 4096, true))
  await attr('created_at (string)', () => databases.createStringAttribute(
    DATABASE_ID, 'push_subscriptions', 'created_at', 32, false))
  await attr('updated_at (string)', () => databases.createStringAttribute(
    DATABASE_ID, 'push_subscriptions', 'updated_at', 32, false))
  await delay(2000)
  await attr('Index: subscriber_id', () => databases.createIndex(
    DATABASE_ID, 'push_subscriptions', 'idx_subscriber', 'key', ['subscriber_id']))
  console.log('\n✓ Selesai')
}

main().catch(e => { console.error(e.message); process.exit(1) })
