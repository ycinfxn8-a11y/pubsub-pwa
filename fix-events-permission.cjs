/**
 * fix-events-permission.cjs
 * ─────────────────────────
 * Update permission koleksi `events` agar Appwrite Function
 * (server/API key) bisa melakukan createDocument.
 *
 * Cara pakai:
 *   node fix-events-permission.cjs
 */

'use strict'

const sdk = require('node-appwrite')

// ── Konfigurasi — sama dengan init.cjs ────────────────────────
const ENDPOINT    = 'https://cloud.appwrite.io/v1'
const PROJECT_ID  = 'YOUR_PROJECT_ID'   // ← ganti
const API_KEY     = 'YOUR_API_KEY'      // ← ganti (scope: collections.write)
const DATABASE_ID = 'pubsub_db'

const client = new sdk.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY)

const databases = new sdk.Databases(client)

async function main() {
  console.log('\n▶ Update permission koleksi: events')
  console.log('  Menambahkan Permission.create(Role.any())')
  console.log('  agar Appwrite Function bisa insert document...\n')

  try {
    await databases.updateCollection(
      DATABASE_ID,
      'events',
      'Events',
      // Permission baru:
      // - read   → users (hanya user login yang bisa baca)
      // - create → any   (Function/server bisa insert, user juga bisa)
      [
        sdk.Permission.read(sdk.Role.users()),
        sdk.Permission.create(sdk.Role.any()),
      ],
      false // documentSecurity
    )
    console.log('✓ Permission berhasil diupdate\n')
    console.log('Permission sekarang:')
    console.log('  read   : users (hanya user yang login)')
    console.log('  create : any   (Appwrite Function + users)')
    console.log('\nSekarang coba publish event lagi.')
  } catch (err) {
    console.error('✗ Gagal update permission:', err.message)
    process.exit(1)
  }
}

main()
