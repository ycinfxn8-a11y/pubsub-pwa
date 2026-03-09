import './style.css'
import { Client, Account, Databases, Functions, ID, Query } from 'appwrite'

// ============================================================
// KONFIGURASI — dari environment variable (Vite: import.meta.env)
// ============================================================
// Stack versi:
//   appwrite web SDK : ^23.0.0  (client-side)
//   @novu/js         : ^3.14.1  (client-side In-App Inbox)
//   node-appwrite    : ^22.1.3  (hanya untuk Appwrite Functions, bukan frontend)
//   vite             : ^7.3.1
//   vite-plugin-pwa  : ^1.2.0
//
// Buat file .env di root project (lihat .env.example):
//   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
//   VITE_APPWRITE_PROJECT_ID=your_project_id
//   VITE_APPWRITE_DATABASE_ID=pubsub_db
//   VITE_APPWRITE_COL_TOPICS=topics
//   VITE_APPWRITE_COL_EVENTS=events
//   VITE_APPWRITE_COL_SUBSCRIPTIONS=subscriptions
//   VITE_APPWRITE_FN_PUBLISH=publish-event
//   VITE_APPWRITE_FN_NOVU_SUBSCRIBE=novu-subscribe
//   VITE_NOVU_APP_ID=your_novu_application_identifier

const APPWRITE_CONFIG = {
  endpoint:   import.meta.env.VITE_APPWRITE_ENDPOINT   || 'https://cloud.appwrite.io/v1',
  projectId:  import.meta.env.VITE_APPWRITE_PROJECT_ID || '',
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || 'pubsub_db',
  collections: {
    topics:        import.meta.env.VITE_APPWRITE_COL_TOPICS        || 'topics',
    events:        import.meta.env.VITE_APPWRITE_COL_EVENTS        || 'events',
    subscriptions: import.meta.env.VITE_APPWRITE_COL_SUBSCRIPTIONS || 'subscriptions',
  },
  functions: {
    publishEvent:    import.meta.env.VITE_APPWRITE_FN_PUBLISH          || 'publish-event',
    novuSubscribe:   import.meta.env.VITE_APPWRITE_FN_NOVU_SUBSCRIBE   || 'novu-subscribe',
  },
}

// applicationIdentifier = Novu App ID (bukan secret API key)
// Dapatkan dari: Novu Dashboard → Settings → API Keys → Application Identifier
const NOVU_CONFIG = {
  applicationIdentifier: import.meta.env.VITE_NOVU_APP_ID || '',
}

// LocalStorage keys
const LS_KEYS = {
  subscriptions: 'pubsub:subscriptions',
  pendingEvents: 'pubsub:pending_events',
  inbox:         'pubsub:inbox',
  unreadCount:   'pubsub:unread_count',
  lastSync:      'pubsub:last_sync',
  novuToken:     'pubsub:novu_token',
  draftEvent:    'pubsub:draft_event',
  currentUser:   'pubsub:current_user',
}


// ============================================================
// ICONS — SVG inline, tanpa emoji
// ============================================================

const icons = {
  logo: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="3.5" fill="currentColor"/>
    <circle cx="4" cy="14" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="24" cy="14" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="14" cy="4" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="14" cy="24" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    <line x1="6.5" y1="14" x2="10.5" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="17.5" y1="14" x2="21.5" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="14" y1="6.5" x2="14" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="14" y1="17.5" x2="14" y2="21.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  dashboard: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <rect x="10.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <rect x="1.5" y="10.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <rect x="10.5" y="10.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  topics: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="9" r="7.25" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="9" cy="9" r="3.25" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="9" cy="9" r="1" fill="currentColor"/>
  </svg>`,
  publish: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M5.5 6.5L9 3L12.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 15H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  inbox: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 11.5H5.5L7 13.5H11L12.5 11.5H16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.2 5L1.5 11.5V14.5C1.5 15.05 1.95 15.5 2.5 15.5H15.5C16.05 15.5 16.5 15.05 16.5 14.5V11.5L14.8 5C14.62 4.4 14.07 4 13.45 4H4.55C3.93 4 3.38 4.4 3.2 5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M9 1.5V3M9 15V16.5M1.5 9H3M15 9H16.5M3.22 3.22L4.28 4.28M13.72 13.72L14.78 14.78M3.22 14.78L4.28 13.72M13.72 4.28L14.78 3.22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  bell: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 1.5C6.51 1.5 4.5 3.51 4.5 6V10.5L3 12H15L13.5 10.5V6C13.5 3.51 11.49 1.5 9 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M7.5 15C7.5 15.83 8.17 16.5 9 16.5C9.83 16.5 10.5 15.83 10.5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2V14M2 8H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  send: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M14 2L9.5 14L7 9L2 6.5L14 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`,
  subscribe: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1C4.13 1 1 4.13 1 8C1 11.87 4.13 15 8 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M8 1C6.34 1 5 4.13 5 8C5 11.87 6.34 15 8 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M1 8H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M11 10L13.5 12.5L15 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="13" cy="11.5" r="3.5" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  unsubscribe: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1C4.13 1 1 4.13 1 8C1 11.87 4.13 15 8 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M1 8H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M11.5 9.5L14.5 12.5M14.5 9.5L11.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="13" cy="11" r="3.5" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  close: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  chevronRight: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  wifi: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 5C3.67 2.67 7.11 1.5 8 1.5C8.89 1.5 12.33 2.67 15 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M3.5 7.5C5.11 6.17 6.67 5.5 8 5.5C9.33 5.5 10.89 6.17 12.5 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M6 10C6.78 9.35 7.39 9 8 9C8.61 9 9.22 9.35 10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="8" cy="13" r="1" fill="currentColor"/>
  </svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
    <path d="M7 4V7L9 8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  zap: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1.5L3 8H7.5L6 12.5L11 6H6.5L8 1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 3.5H12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M5 3.5V2.5C5 2.22 5.22 2 5.5 2H8.5C8.78 2 9 2.22 9 2.5V3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M3.5 3.5L4.5 12H9.5L10.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="5.5" r="3" stroke="currentColor" stroke-width="1.5"/>
    <path d="M2 14C2 11.24 4.69 9 8 9C11.31 9 14 11.24 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  lock: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="7.5" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M5 7.5V5C5 3.34 6.34 2 8 2C9.66 2 11 3.34 11 5V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="8" cy="11" r="1" fill="currentColor"/>
  </svg>`,
  arrowRight: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  info: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
    <path d="M7 6.5V10.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="7" cy="4.5" r="0.75" fill="currentColor"/>
  </svg>`,
  pending: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 2"/>
    <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
  </svg>`,
  signout: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 14H3C2.45 14 2 13.55 2 13V3C2 2.45 2.45 2 3 2H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M10.5 11L14 8L10.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7 8H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
}


// ============================================================
// UTILS — eventBus
// ============================================================

const _listeners = {}

const eventBus = {
  on(event, cb) {
    if (!_listeners[event]) _listeners[event] = []
    _listeners[event].push(cb)
    return () => this.off(event, cb)
  },
  off(event, cb) {
    if (_listeners[event]) _listeners[event] = _listeners[event].filter(fn => fn !== cb)
  },
  emit(event, data) {
    ;(_listeners[event] || []).forEach(cb => cb(data))
  },
  once(event, cb) {
    const unsub = this.on(event, (data) => { cb(data); unsub() })
  },
}


// ============================================================
// UTILS — helpers
// ============================================================

function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 60) return `${diff}d lalu`
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`
  return `${Math.floor(diff / 86400)}h lalu`
}

function formatDate(dateStr) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function priorityColor(priority) {
  return { low: '#9ca3af', normal: '#3b82f6', high: '#f59e0b', critical: '#ef4444' }[priority] || '#9ca3af'
}

function priorityLabel(priority) {
  return { low: 'Rendah', normal: 'Normal', high: 'Tinggi', critical: 'Kritis' }[priority] || priority
}

function eventTypeLabel(type) {
  return { created: 'Dibuat', updated: 'Diperbarui', deleted: 'Dihapus', custom: 'Kustom' }[type] || type
}

function safeJSON(str) {
  try { return JSON.parse(str) } catch { return null }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Hapus semua HTML tag dari string (untuk tampilan plain text)
function stripHtml(str) {
  return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Tampilkan browser notification jika permission granted
function showBrowserNotif(event) {
  if (Notification.permission !== 'granted') return
  const p = _parsePayload(event.payload)
  const title = p.title
    ? stripHtml(String(p.title))
    : `[${event.event_type}] ${event.topic_id}`
  const body = p.body
    ? stripHtml(String(p.body))
    : (typeof event.payload === 'string' ? event.payload : '')
  try {
    new Notification(title, {
      body: body.slice(0, 120),
      icon: '/icons/icon.svg',
      tag:  event.$id || event._localId || Date.now().toString(),
      renotify: false,
    })
  } catch { /* notification blocked */ }
}

function truncatePayload(payload) {
  if (!payload) return '—'
  const str = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return str.length > 60 ? str.slice(0, 60) + '…' : str
}


// ============================================================
// SERVICE — storage (LocalStorage)
// ============================================================

const storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key)
      return v !== null ? JSON.parse(v) : fallback
    } catch { return fallback }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true }
    catch { return false }
  },
  remove(key) {
    try { localStorage.removeItem(key); return true }
    catch { return false }
  },

  // Subscriptions
  getSubscriptions()      { return this.get(LS_KEYS.subscriptions, []) },
  addSubscription(id)     {
    const s = this.getSubscriptions()
    if (!s.includes(id)) { s.push(id); this.set(LS_KEYS.subscriptions, s) }
  },
  removeSubscription(id)  { this.set(LS_KEYS.subscriptions, this.getSubscriptions().filter(x => x !== id)) },
  isSubscribed(id)        { return this.getSubscriptions().includes(id) },

  // Pending events
  getPendingEvents()      { return this.get(LS_KEYS.pendingEvents, []) },
  addPendingEvent(event)  {
    const list = this.getPendingEvents()
    list.push({ ...event, _localId: Date.now().toString(36), _retries: 0, status: 'pending' })
    this.set(LS_KEYS.pendingEvents, list)
  },
  removePendingEvent(lid) { this.set(LS_KEYS.pendingEvents, this.getPendingEvents().filter(e => e._localId !== lid)) },
  clearPendingEvents()    { this.set(LS_KEYS.pendingEvents, []) },

  // Inbox
  getInbox() { return this.get(LS_KEYS.inbox, []) },
  addToInbox(event) {
    const inbox = this.getInbox()
    inbox.unshift({ ...event, _receivedAt: new Date().toISOString(), _read: false })
    if (inbox.length > 100) inbox.pop()
    this.set(LS_KEYS.inbox, inbox)
    this.incrementUnread()
  },
  markAllRead() {
    this.set(LS_KEYS.inbox, this.getInbox().map(e => ({ ...e, _read: true })))
    this.set(LS_KEYS.unreadCount, 0)
  },
  markRead(eventId) {
    const inbox = this.getInbox().map(e =>
      (e.$id === eventId || e._localId === eventId) ? { ...e, _read: true } : e
    )
    this.set(LS_KEYS.inbox, inbox)
    this.set(LS_KEYS.unreadCount, inbox.filter(e => !e._read).length)
  },
  clearInbox()        { this.set(LS_KEYS.inbox, []); this.set(LS_KEYS.unreadCount, 0) },

  // Unread
  getUnreadCount()    { return this.get(LS_KEYS.unreadCount, 0) },
  incrementUnread()   { this.set(LS_KEYS.unreadCount, this.getUnreadCount() + 1) },

  // Draft
  getDraft()          { return this.get(LS_KEYS.draftEvent, null) },
  saveDraft(data)     { this.set(LS_KEYS.draftEvent, data) },
  clearDraft()        { this.remove(LS_KEYS.draftEvent) },

  // User session
  getUser()           { return this.get(LS_KEYS.currentUser, null) },
  setUser(user)       { this.set(LS_KEYS.currentUser, user) },
  clearUser()         { this.remove(LS_KEYS.currentUser) },

  // Sync
  getLastSync()       { return this.get(LS_KEYS.lastSync, null) },
  updateLastSync()    { this.set(LS_KEYS.lastSync, new Date().toISOString()) },
}


// ============================================================
// SERVICE — Appwrite (auth, db, functions, realtime) + Novu
// ============================================================

const _client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId)

const _account   = new Account(_client)
const _databases = new Databases(_client)
const _functions = new Functions(_client)

let _realtimeUnsub = null
let _novu = null

// Novu @novu/js v3 — lazy init
// HANYA dipanggil setelah subscriber sudah terdaftar di Novu (via novu-subscribe function).
// POST /inbox/session akan return 400 jika subscriberId belum ada di Novu.
async function initNovu(subscriberId) {
  if (_novu) return _novu
  if (!NOVU_CONFIG.applicationIdentifier) return null
  try {
    const { Novu } = await import('@novu/js')
    _novu = new Novu({
      subscriberId,
      applicationIdentifier: NOVU_CONFIG.applicationIdentifier,
    })
    _novu.on('notifications.notification_received', ({ result }) => {
      eventBus.emit('novu:notification', result)
    })
  } catch { /* @novu/js opsional */ }
  return _novu
}

// ── Auth ──────────────────────────────────────────────────────
const auth = {
  async login(email, password) {
    await _account.createEmailPasswordSession(email, password)
    const user = await _account.get()
    storage.setUser(user)
    return user
  },
  async register(name, email, password) {
    await _account.create(ID.unique(), email, password, name)
    return this.login(email, password)
  },
  async logout() {
    await _account.deleteSession('current')
    storage.clearUser()
    _novu = null
    eventBus.emit('auth:logout')
  },
  async getUser() {
    try {
      const user = await _account.get()
      storage.setUser(user)
      return user
    } catch { return null }
  },
}

// ── Topics ────────────────────────────────────────────────────
const topicsService = {
  async list() {
    const res = await _databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.topics,
      [Query.orderDesc('$createdAt'), Query.limit(50)]
    )
    return res.documents
  },
  async create(data) {
    return _databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.topics,
      ID.unique(), data
    )
  },
  async delete(id) {
    return _databases.deleteDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.topics, id
    )
  },
}

// ── Publish ───────────────────────────────────────────────────
const publishService = {
  async publish(eventData) {
    storage.addPendingEvent(eventData)
    try {
      const exec = await _functions.createExecution(
        APPWRITE_CONFIG.functions.publishEvent,
        JSON.stringify(eventData),
        false, '/', 'POST',
        { 'Content-Type': 'application/json' }
      )
      const statusOk = exec.responseStatusCode >= 200 && exec.responseStatusCode < 300
      let result = {}
      try { result = JSON.parse(exec.responseBody || '{}') } catch { /* non-JSON body */ }

      if (statusOk || result.success) {
        storage.removePendingEvent(eventData._localId)
        eventBus.emit('publish:success', result)
      } else {
        const errMsg = result.error || result.message || `Function error ${exec.responseStatusCode}`
        throw new Error(errMsg)
      }
      return result
    } catch (err) {
      eventBus.emit('publish:error', err)
      throw err
    }
  },
  async retryPending() {
    const pending = storage.getPendingEvents()
    for (const event of pending) {
      if (event._retries >= 3) continue
      try { await this.publish(event) } catch { /* retry next time */ }
    }
  },
}

// ── Subscribe ─────────────────────────────────────────────────
const subscribeService = {
  async subscribe(topicId) {
    storage.addSubscription(topicId)
    // 1. Daftarkan subscriber ke Novu topic via Appwrite Function (server-side)
    //    Function akan: upsert subscriber → buat topic → assign subscriber ke topic
    const user = storage.getUser()
    try {
      await _functions.createExecution(
        APPWRITE_CONFIG.functions.novuSubscribe,
        JSON.stringify({
          topic_id:      topicId,
          subscriber_id: user?.$id || '',
          email:         user?.email || '',
        }),
        false, '/', 'POST',
        { 'Content-Type': 'application/json' }
      )
      // 2. Baru init Novu client SDK — subscriber sudah terdaftar di Novu server
      if (user) await initNovu(user.$id)
    } catch { /* Novu subscribe opsional */ }
    eventBus.emit('subscription:changed')
  },
  async unsubscribe(topicId) {
    storage.removeSubscription(topicId)
    eventBus.emit('subscription:changed')
  },
}

// ── Inbox service ─────────────────────────────────────────────
const inboxService = {
  async fetchRecent() {
    const subs = storage.getSubscriptions()
    if (!subs.length) return []
    try {
      const res = await _databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.events,
        [Query.equal('topic_id', subs), Query.orderDesc('$createdAt'), Query.limit(50)]
      )
      return res.documents
    } catch { return [] }
  },
  async fetchNovuInbox() {
    if (!_novu) return []
    try {
      const { data } = await _novu.notifications.list({ limit: 20 })
      return data || []
    } catch { return [] }
  },
}

// ── Realtime ──────────────────────────────────────────────────
const realtimeService = {
  connect() {
    if (_realtimeUnsub) _realtimeUnsub()
    const channel = `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.collections.events}.documents`
    _realtimeUnsub = _client.subscribe(channel, (response) => {
      const isCreate = response.events.some(e => e.includes('.create'))
      if (!isCreate) return
      const event = response.payload
      if (!storage.getSubscriptions().includes(event.topic_id)) return
      storage.addToInbox(event)
      eventBus.emit('inbox:new', event)
    })
    eventBus.emit('realtime:connected')
  },
  disconnect() {
    if (_realtimeUnsub) { _realtimeUnsub(); _realtimeUnsub = null }
    eventBus.emit('realtime:disconnected')
  },
}


// ============================================================
// COMPONENT — Toast
// ============================================================

let _toastContainer = null

function _getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div')
    _toastContainer.className = 'toast-container'
    document.body.appendChild(_toastContainer)
  }
  return _toastContainer
}

function _dismissToast(el) {
  clearTimeout(el._timer)
  el.classList.add('toast--out')
  el.addEventListener('transitionend', () => el.remove(), { once: true })
}

function toast(message, type = 'info', duration = 3500) {
  const el = document.createElement('div')
  el.className = `toast toast--${type}`
  const iconMap = { success: icons.check, error: icons.close, info: icons.info, warning: icons.zap }
  el.innerHTML = `
    <span class="toast__icon">${iconMap[type] || icons.info}</span>
    <span class="toast__msg">${message}</span>
    <button class="toast__close">${icons.close}</button>`
  el.querySelector('.toast__close').addEventListener('click', () => _dismissToast(el))
  _getToastContainer().appendChild(el)
  requestAnimationFrame(() => el.classList.add('toast--in'))
  el._timer = setTimeout(() => _dismissToast(el), duration)
}

// Inject toast CSS
const _toastStyle = document.createElement('style')
_toastStyle.textContent = `
.toast-container{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.toast{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 14px;min-width:260px;max-width:360px;box-shadow:0 4px 20px rgba(0,0,0,.08);pointer-events:all;opacity:0;transform:translateY(8px) scale(.97);transition:opacity .22s ease,transform .22s ease;font-size:13px;color:var(--text-primary)}
.toast--in{opacity:1;transform:translateY(0) scale(1)}.toast--out{opacity:0;transform:translateY(4px) scale(.97)}
.toast--success .toast__icon{color:#16a34a}.toast--error .toast__icon{color:#dc2626}.toast--info .toast__icon{color:#2563eb}.toast--warning .toast__icon{color:#d97706}
.toast--success{border-left:3px solid #16a34a}.toast--error{border-left:3px solid #dc2626}.toast--info{border-left:3px solid #2563eb}.toast--warning{border-left:3px solid #d97706}
.toast__icon{flex-shrink:0;display:flex}.toast__msg{flex:1;line-height:1.4}
.toast__close{background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;border-radius:4px;transition:background .15s}
.toast__close:hover{background:var(--bg-hover)}
@media(max-width:480px){.toast-container{right:12px;left:12px;bottom:80px}.toast{min-width:auto}}`
document.head.appendChild(_toastStyle)


// ============================================================
// PAGE — Login
// ============================================================

function renderLogin() {
  return `
  <div class="auth-screen">
    <div class="auth-card">
      <div class="auth-logo">
        <span class="auth-logo__icon">${icons.logo}</span>
        <span class="auth-logo__name">PubSub</span>
      </div>
      <div class="auth-tabs" id="authTabs">
        <button class="auth-tab auth-tab--active" data-tab="login">Masuk</button>
        <button class="auth-tab" data-tab="register">Daftar</button>
      </div>
      <form id="loginForm" class="auth-form">
        <div class="field">
          <label class="field__label">Email</label>
          <input class="field__input" type="email" id="loginEmail" placeholder="nama@email.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label class="field__label">Password</label>
          <input class="field__input" type="password" id="loginPassword" placeholder="••••••••" autocomplete="current-password" required />
        </div>
        <button class="btn btn--primary btn--full" type="submit" id="loginBtn">
          <span class="btn__icon">${icons.arrowRight}</span> Masuk
        </button>
      </form>
      <form id="registerForm" class="auth-form" style="display:none">
        <div class="field">
          <label class="field__label">Nama Lengkap</label>
          <input class="field__input" type="text" id="regName" placeholder="Nama Anda" required />
        </div>
        <div class="field">
          <label class="field__label">Email</label>
          <input class="field__input" type="email" id="regEmail" placeholder="nama@email.com" required />
        </div>
        <div class="field">
          <label class="field__label">Password</label>
          <input class="field__input" type="password" id="regPassword" placeholder="Min. 8 karakter" minlength="8" required />
        </div>
        <button class="btn btn--primary btn--full" type="submit" id="regBtn">
          <span class="btn__icon">${icons.user}</span> Buat Akun
        </button>
      </form>
      <p class="auth-note">Platform pub/sub real-time berbasis Appwrite + Novu</p>
    </div>
  </div>`
}

function mountLogin(navigate) {
  document.getElementById('authTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]')
    if (!tab) return
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('auth-tab--active'))
    tab.classList.add('auth-tab--active')
    const isLogin = tab.dataset.tab === 'login'
    document.getElementById('loginForm').style.display = isLogin ? '' : 'none'
    document.getElementById('registerForm').style.display = isLogin ? 'none' : ''
  })
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('loginBtn')
    btn.disabled = true; btn.textContent = 'Memproses...'
    try {
      await auth.login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value)
      navigate('dashboard')
    } catch (err) {
      toast(err.message || 'Login gagal', 'error')
      btn.disabled = false
      btn.innerHTML = `<span class="btn__icon">${icons.arrowRight}</span>Masuk`
    }
  })
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('regBtn')
    btn.disabled = true; btn.textContent = 'Memproses...'
    try {
      await auth.register(document.getElementById('regName').value, document.getElementById('regEmail').value, document.getElementById('regPassword').value)
      navigate('dashboard')
    } catch (err) {
      toast(err.message || 'Registrasi gagal', 'error')
      btn.disabled = false
      btn.innerHTML = `<span class="btn__icon">${icons.user}</span>Buat Akun`
    }
  })
}


// ============================================================
// PAGE — Dashboard
// ============================================================

function renderDashboard() {
  const user    = storage.getUser()
  const inbox   = storage.getInbox()
  const subs    = storage.getSubscriptions()
  const pending = storage.getPendingEvents()
  const unread  = storage.getUnreadCount()
  const lastSync = storage.getLastSync()
  const recent  = inbox.slice(0, 5)

  return `
  <div class="page page--dashboard">
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-sub">Selamat datang, ${user?.name || 'Pengguna'}</p>
      </div>
      <div class="header-meta">
        ${lastSync ? `<span class="sync-badge">${icons.clock} Sync ${timeAgo(lastSync)}</span>` : ''}
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--blue">${icons.topics}</div>
        <div class="stat-card__body"><div class="stat-card__value">${subs.length}</div><div class="stat-card__label">Langganan Aktif</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--green">${icons.inbox}</div>
        <div class="stat-card__body"><div class="stat-card__value">${inbox.length}</div><div class="stat-card__label">Total Event Diterima</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--amber">${icons.bell}</div>
        <div class="stat-card__body"><div class="stat-card__value">${unread}</div><div class="stat-card__label">Belum Dibaca</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--red">${icons.pending}</div>
        <div class="stat-card__body"><div class="stat-card__value">${pending.length}</div><div class="stat-card__label">Event Pending</div></div>
      </div>
    </div>
    <div class="section-row">
      <div class="section-block">
        <div class="section-head">
          <h2 class="section-title">Event Terbaru</h2>
          <button class="link-btn" id="goInbox">${icons.arrowRight} Semua</button>
        </div>
        <div class="event-list">
          ${recent.length === 0
            ? `<div class="empty-state"><div class="empty-state__icon">${icons.inbox}</div><p>Belum ada event masuk</p><span>Subscribe ke topik untuk mulai menerima event</span></div>`
            : recent.map(e => _eventRow(e)).join('')}
        </div>
      </div>
      <div class="section-block">
        <div class="section-head">
          <h2 class="section-title">Topik Saya</h2>
          <button class="link-btn" id="goTopics">${icons.arrowRight} Kelola</button>
        </div>
        <div class="topic-chips">
          ${subs.length === 0
            ? `<div class="empty-state"><div class="empty-state__icon">${icons.topics}</div><p>Belum ada langganan</p><span>Buka halaman Topik untuk subscribe</span></div>`
            : subs.map(id => `<div class="topic-chip"><span class="topic-chip__dot"></span><span class="topic-chip__id">${id}</span></div>`).join('')}
        </div>
      </div>
    </div>
    ${pending.length > 0 ? `
    <div class="pending-banner">
      <span class="pending-banner__icon">${icons.pending}</span>
      <div class="pending-banner__body">
        <strong>${pending.length} event menunggu pengiriman</strong>
        <span>Akan dikirim ulang saat koneksi tersedia</span>
      </div>
      <button class="btn btn--ghost btn--sm" id="retryPending">Coba Kirim</button>
    </div>` : ''}
  </div>`
}

function _eventRow(e) {
  const color = priorityColor(e.priority)
  return `
  <div class="event-row ${!e._read ? 'event-row--unread' : ''}" data-id="${e.$id || e._localId}">
    <div class="event-row__dot" style="background:${color}"></div>
    <div class="event-row__body">
      <div class="event-row__top">
        <span class="event-row__type">${e.event_type || 'event'}</span>
        <span class="event-row__topic">${e.topic_id || ''}</span>
      </div>
      <div class="event-row__payload">${truncatePayload(e.payload)}</div>
    </div>
    <div class="event-row__time">${timeAgo(e._receivedAt || e.$createdAt || e.created_at)}</div>
  </div>`
}

function mountDashboard(navigate) {
  document.getElementById('goInbox')?.addEventListener('click', () => navigate('inbox'))
  document.getElementById('goTopics')?.addEventListener('click', () => navigate('topics'))
  document.getElementById('retryPending')?.addEventListener('click', () => publishService.retryPending())
  document.querySelectorAll('.event-row').forEach(row => {
    row.addEventListener('click', () => { storage.markRead(row.dataset.id); row.classList.remove('event-row--unread') })
  })
  const unsub = eventBus.on('inbox:new', () => {
    const cnt = document.querySelector('#navInboxBadge')
    if (cnt) cnt.textContent = storage.getUnreadCount()
  })
  return unsub
}


// ============================================================
// PAGE — Topics
// ============================================================

function renderTopics() {
  return `
  <div class="page page--topics">
    <div class="page-header">
      <div>
        <h1 class="page-title">Topik</h1>
        <p class="page-sub">Kelola dan subscribe ke topik event</p>
      </div>
      <button class="btn btn--primary btn--sm" id="openCreateTopic">
        <span class="btn__icon">${icons.plus}</span> Buat Topik
      </button>
    </div>
    <div class="collapsible" id="createTopicForm" style="display:none">
      <div class="card">
        <div class="card__head">
          <h3 class="card__title">Buat Topik Baru</h3>
          <button class="icon-btn" id="closeCreateTopic">${icons.close}</button>
        </div>
        <div class="card__body">
          <div class="fields-row">
            <div class="field">
              <label class="field__label">Nama Topik</label>
              <input class="field__input" type="text" id="topicName" placeholder="mis. Pesanan Baru" />
            </div>
            <div class="field">
              <label class="field__label">Slug (otomatis)</label>
              <input class="field__input field__input--mono" type="text" id="topicSlug" placeholder="orders.new" />
            </div>
          </div>
          <div class="field">
            <label class="field__label">Deskripsi</label>
            <input class="field__input" type="text" id="topicDesc" placeholder="Opsional — jelaskan topik ini" />
          </div>
          <div class="field-row-check">
            <label class="check-label">
              <input type="checkbox" id="topicPublic" checked />
              <span class="check-custom"></span>
              Publik (semua user dapat subscribe)
            </label>
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" id="cancelCreateTopic">Batal</button>
            <button class="btn btn--primary" id="submitCreateTopic">
              <span class="btn__icon">${icons.plus}</span> Buat
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="topics-grid" id="topicsGrid">
      <div class="loading-state"><div class="spinner"></div><span>Memuat topik...</span></div>
    </div>
  </div>`
}

function _topicCard(topic, isSubscribed) {
  return `
  <div class="topic-card ${isSubscribed ? 'topic-card--subscribed' : ''}">
    <div class="topic-card__head">
      <div class="topic-card__meta">
        <div class="topic-card__indicator ${isSubscribed ? 'topic-card__indicator--on' : ''}"></div>
        <span class="topic-card__slug">${topic.slug}</span>
        ${topic.is_public ? '' : `<span class="topic-badge topic-badge--private">${icons.lock} Privat</span>`}
      </div>
      <button class="icon-btn icon-btn--danger" data-delete-topic data-delete-topic-id="${topic.$id}" title="Hapus">${icons.trash}</button>
    </div>
    <h3 class="topic-card__name">${topic.name}</h3>
    ${topic.description ? `<p class="topic-card__desc">${topic.description}</p>` : ''}
    <div class="topic-card__footer">
      <span class="topic-card__count">${icons.user} ${topic.subscriber_count || 0} subscriber</span>
      <button class="btn ${isSubscribed ? 'btn--ghost' : 'btn--primary'} btn--sm"
        data-subscribe="${topic.$id}" data-subbed="${isSubscribed}">
        <span class="btn__icon">${isSubscribed ? icons.unsubscribe : icons.subscribe}</span>
        ${isSubscribed ? 'Berhenti' : 'Subscribe'}
      </button>
    </div>
  </div>`
}

async function mountTopics(navigate) {
  const grid = document.getElementById('topicsGrid')

  async function loadTopics() {
    grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Memuat topik...</span></div>`
    try {
      const topics = await topicsService.list()
      renderGrid(topics)
    } catch {
      grid.innerHTML = `<div class="empty-state"><div class="empty-state__icon">${icons.topics}</div><p>Gagal memuat topik</p></div>`
    }
  }

  function renderGrid(topics) {
    const subs = storage.getSubscriptions()
    if (!topics.length) {
      grid.innerHTML = `<div class="empty-state empty-state--full"><div class="empty-state__icon">${icons.topics}</div><p>Belum ada topik</p><span>Buat topik pertama Anda di atas</span></div>`
      return
    }
    grid.innerHTML = topics.map(t => _topicCard(t, subs.includes(t.$id))).join('')
    grid.querySelectorAll('[data-subscribe]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.subscribe
        const subbed = btn.dataset.subbed === 'true'
        btn.disabled = true
        try {
          if (subbed) { await subscribeService.unsubscribe(id); toast('Berhenti berlangganan', 'info') }
          else        { await subscribeService.subscribe(id);   toast('Berlangganan berhasil', 'success') }
          loadTopics()
        } catch { toast('Gagal mengubah langganan', 'error'); btn.disabled = false }
      })
    })
    grid.querySelectorAll('[data-delete-topic]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus topik ini?')) return
        try { await topicsService.delete(btn.dataset.deleteTopicId); toast('Topik dihapus', 'info'); loadTopics() }
        catch { toast('Gagal menghapus topik', 'error') }
      })
    })
  }

  document.getElementById('openCreateTopic').addEventListener('click',  () => { document.getElementById('createTopicForm').style.display = '' })
  document.getElementById('closeCreateTopic').addEventListener('click', () => { document.getElementById('createTopicForm').style.display = 'none' })
  document.getElementById('cancelCreateTopic').addEventListener('click',() => { document.getElementById('createTopicForm').style.display = 'none' })
  document.getElementById('topicName').addEventListener('input', (e) => { document.getElementById('topicSlug').value = slugify(e.target.value) })
  document.getElementById('submitCreateTopic').addEventListener('click', async () => {
    const name = document.getElementById('topicName').value.trim()
    const slug = document.getElementById('topicSlug').value.trim()
    if (!name || !slug) return toast('Nama dan slug wajib diisi', 'warning')
    const btn = document.getElementById('submitCreateTopic')
    btn.disabled = true
    try {
      await topicsService.create({
        name, slug, description: document.getElementById('topicDesc').value,
        is_public: document.getElementById('topicPublic').checked,
        subscriber_count: 0, owner_id: storage.getUser()?.$id || '', novu_topic_key: slug,
      })
      toast('Topik berhasil dibuat', 'success')
      document.getElementById('createTopicForm').style.display = 'none'
      loadTopics()
    } catch (err) { toast(err.message || 'Gagal membuat topik', 'error') }
    finally { btn.disabled = false }
  })
  loadTopics()
}


// ============================================================
// PAGE — Publish
// ============================================================

function renderPublish() {
  const draft = storage.getDraft()
  return `
  <div class="page page--publish">
    <div class="page-header">
      <div><h1 class="page-title">Publish Event</h1><p class="page-sub">Kirim event ke topik yang tersedia</p></div>
    </div>
    <div class="publish-layout">
      <div class="card publish-card">
        <div class="card__body">
          <div class="field">
            <label class="field__label">Topik <span class="field__req">*</span></label>
            <select class="field__input" id="pubTopic"><option value="">Pilih topik...</option></select>
          </div>
          <div class="fields-row">
            <div class="field">
              <label class="field__label">Tipe Event <span class="field__req">*</span></label>
              <select class="field__input" id="pubType">
                <option value="created">created</option><option value="updated">updated</option>
                <option value="deleted">deleted</option><option value="custom">custom</option>
              </select>
            </div>
            <div class="field">
              <label class="field__label">Prioritas</label>
              <select class="field__input" id="pubPriority">
                <option value="normal">Normal</option><option value="low">Rendah</option>
                <option value="high">Tinggi</option><option value="critical">Kritis</option>
              </select>
            </div>
          </div>
          <div class="field">
            <div class="field__labelrow">
              <label class="field__label">Payload (JSON)</label>
              <button class="field__hint-btn" id="fillSample">Contoh JSON</button>
            </div>
            <textarea class="field__input field__input--mono field__input--textarea" id="pubPayload" rows="6"
              placeholder='{"key": "value"}'>${draft?.payload ? JSON.stringify(draft.payload, null, 2) : ''}</textarea>
            <span class="field__hint" id="jsonStatus"></span>
          </div>
          <div class="field">
            <label class="field__label">TTL (detik, opsional)</label>
            <input class="field__input" type="number" id="pubTtl" placeholder="3600" min="0" value="${draft?.ttl || ''}" />
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" id="saveDraft">
              <span class="btn__icon">${icons.clock}</span> Simpan Draft
            </button>
            <button class="btn btn--primary" id="submitPublish">
              <span class="btn__icon">${icons.send}</span> Publish Event
            </button>
          </div>
        </div>
      </div>
      <div class="publish-sidebar">
        <div class="card">
          <div class="card__head"><h3 class="card__title">Pending Events</h3></div>
          <div id="pendingList" class="pending-list"></div>
        </div>
        <div class="card">
          <div class="card__head"><h3 class="card__title">Panduan</h3></div>
          <div class="card__body">
            <div class="guide-step"><span class="guide-step__num">1</span><span>Pilih topik tujuan event</span></div>
            <div class="guide-step"><span class="guide-step__num">2</span><span>Tentukan tipe dan prioritas</span></div>
            <div class="guide-step"><span class="guide-step__num">3</span><span>Isi payload dalam format JSON</span></div>
            <div class="guide-step"><span class="guide-step__num">4</span><span>Klik Publish — Appwrite Function akan memproses</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>`
}

async function mountPublish(navigate) {
  try {
    const topics = await topicsService.list()
    const sel = document.getElementById('pubTopic')
    topics.forEach(t => {
      const opt = document.createElement('option')
      opt.value = t.$id; opt.textContent = `${t.name} — ${t.slug}`
      sel.appendChild(opt)
    })
    const draft = storage.getDraft()
    if (draft?.topic_id) sel.value = draft.topic_id
  } catch { /* offline */ }

  function renderPending() {
    const list = document.getElementById('pendingList')
    const pending = storage.getPendingEvents()
    if (!pending.length) { list.innerHTML = `<div class="empty-mini">${icons.check} Tidak ada pending</div>`; return }
    list.innerHTML = pending.map(e => `
      <div class="pending-item">
        <div class="pending-item__body">
          <span class="pending-item__type">${e.event_type}</span>
          <span class="pending-item__topic">${e.topic_id}</span>
        </div>
        <button class="icon-btn icon-btn--danger" data-remove="${e._localId}">${icons.trash}</button>
      </div>`).join('')
    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => { storage.removePendingEvent(btn.dataset.remove); renderPending() })
    })
  }
  renderPending()

  document.getElementById('pubPayload').addEventListener('input', (e) => {
    const s = document.getElementById('jsonStatus')
    try { JSON.parse(e.target.value); s.textContent = 'JSON valid'; s.className = 'field__hint field__hint--ok' }
    catch { s.textContent = 'JSON tidak valid'; s.className = 'field__hint field__hint--err' }
  })
  document.getElementById('fillSample').addEventListener('click', () => {
    document.getElementById('pubPayload').value = JSON.stringify({ id: 'item-001', name: 'Contoh Item', amount: 75000, status: 'active' }, null, 2)
    document.getElementById('jsonStatus').textContent = 'JSON valid'
    document.getElementById('jsonStatus').className = 'field__hint field__hint--ok'
  })
  document.getElementById('saveDraft').addEventListener('click', () => {
    storage.saveDraft({
      topic_id:   document.getElementById('pubTopic').value,
      event_type: document.getElementById('pubType').value,
      priority:   document.getElementById('pubPriority').value,
      payload:    safeJSON(document.getElementById('pubPayload').value),
      ttl:        +document.getElementById('pubTtl').value || null,
    })
    toast('Draft tersimpan', 'info')
  })
  document.getElementById('submitPublish').addEventListener('click', async () => {
    const topic_id = document.getElementById('pubTopic').value
    if (!topic_id) return toast('Pilih topik terlebih dahulu', 'warning')
    const payloadRaw = document.getElementById('pubPayload').value
    const payload = safeJSON(payloadRaw)
    if (payloadRaw && !payload) return toast('Payload JSON tidak valid', 'error')
    const eventData = {
      topic_id,
      event_type:   document.getElementById('pubType').value,
      priority:     document.getElementById('pubPriority').value,
      payload:      payload || {},
      ttl:          +document.getElementById('pubTtl').value || null,
      publisher_id: storage.getUser()?.$id || '',
      created_at:   new Date().toISOString(),
      status:       'pending',
    }
    const btn = document.getElementById('submitPublish')
    btn.disabled = true; btn.innerHTML = `<span class="spinner spinner--sm"></span> Mengirim...`
    try {
      await publishService.publish(eventData)
      storage.clearDraft()
      toast('Event berhasil dipublish', 'success')
      document.getElementById('pubPayload').value = ''
      renderPending()
    } catch {
      toast('Disimpan ke pending (offline)', 'warning')
      renderPending()
    }
    btn.disabled = false
    btn.innerHTML = `<span class="btn__icon">${icons.send}</span> Publish Event`
  })
}


// ============================================================
// PAGE — Inbox
// ============================================================

function renderInbox() {
  const inbox  = storage.getInbox()
  const unread = storage.getUnreadCount()
  return `
  <div class="page page--inbox">
    <div class="page-header">
      <div>
        <h1 class="page-title">Inbox ${unread > 0 ? `<span class="title-badge">${unread}</span>` : ''}</h1>
        <p class="page-sub">Event yang diterima dari topik langganan Anda</p>
      </div>
      <div class="header-actions">
        <button class="btn btn--ghost btn--sm" id="syncInbox"><span class="btn__icon">${icons.wifi}</span> Sync</button>
        <button class="btn btn--ghost btn--sm" id="markAllRead"><span class="btn__icon">${icons.check}</span> Baca Semua</button>
        <button class="btn btn--ghost btn--sm btn--danger" id="clearInbox"><span class="btn__icon">${icons.trash}</span> Hapus</button>
      </div>
    </div>
    <div class="inbox-filters" id="inboxFilters">
      <button class="filter-btn filter-btn--active" data-filter="all">Semua</button>
      <button class="filter-btn" data-filter="unread">Belum Dibaca</button>
      <button class="filter-btn" data-filter="created">created</button>
      <button class="filter-btn" data-filter="updated">updated</button>
      <button class="filter-btn" data-filter="deleted">deleted</button>
      <button class="filter-btn" data-filter="custom">custom</button>
    </div>
    <div id="inboxList" class="inbox-list">${_renderInboxList(inbox, 'all')}</div>
  </div>`
}

function _renderInboxList(inbox, filter) {
  let list = inbox
  if (filter === 'unread') list = inbox.filter(e => !e._read)
  else if (filter !== 'all') list = inbox.filter(e => e.event_type === filter)
  if (!list.length) return `
    <div class="empty-state">
      <div class="empty-state__icon">${icons.inbox}</div>
      <p>${filter === 'unread' ? 'Semua sudah dibaca' : 'Tidak ada event'}</p>
      <span>Event dari topik langganan akan muncul di sini</span>
    </div>`
  return list.map(e => _inboxItem(e)).join('')
}

function _parsePayload(raw) {
  let parsed = null
  try {
    parsed = typeof raw === 'object' ? raw : JSON.parse(raw)
  } catch { /* bukan JSON */ }

  if (parsed && typeof parsed === 'object') {
    return {
      title: parsed.title != null ? String(parsed.title) : null,
      body:  parsed.body  != null ? String(parsed.body)  : null,
      extra: Object.keys(parsed)
        .filter(k => k !== 'title' && k !== 'body')
        .reduce((acc, k) => { acc[k] = parsed[k]; return acc }, {}),
      isJson: true,
    }
  }
  // Raw string — tampilkan apa adanya sebagai body
  return { title: null, body: raw ? String(raw) : null, extra: {}, isJson: false }
}

function _inboxItem(e) {
  const color   = priorityColor(e.priority)
  const p       = _parsePayload(e.payload)
  const hasExtra = Object.keys(p.extra).length > 0

  const contentHtml = p.title || p.body
    ? `<div class="inbox-item__content">
        ${p.title ? `<div class="inbox-item__title">${escapeHtml(stripHtml(p.title))}</div>` : ''}
        ${p.body  ? `<div class="inbox-item__msg">${escapeHtml(stripHtml(p.body))}</div>`   : ''}
        ${hasExtra ? `<details class="inbox-item__detail">
          <summary>Detail payload</summary>
          <pre class="payload-pre">${escapeHtml(JSON.stringify(p.extra, null, 2))}</pre>
        </details>` : ''}
      </div>`
    : `<div class="inbox-item__content">
        <span class="inbox-item__empty">— tidak ada konten —</span>
      </div>`

  return `
  <div class="inbox-item ${!e._read ? 'inbox-item--unread' : ''}" data-id="${e.$id || e._localId}">
    <div class="inbox-item__accent" style="background:${color}"></div>
    <div class="inbox-item__body">
      <div class="inbox-item__header">
        <div class="inbox-item__tags">
          <span class="etag etag--type">${eventTypeLabel(e.event_type)}</span>
          <span class="etag etag--topic">${e.topic_id}</span>
          <span class="etag" style="color:${color};border-color:${color}20;background:${color}10">${priorityLabel(e.priority)}</span>
        </div>
        <span class="inbox-item__time">${icons.clock} ${timeAgo(e._receivedAt || e.$createdAt)}</span>
      </div>
      ${contentHtml}
      <div class="inbox-item__footer">
        <span class="inbox-meta">${icons.info} ${formatDate(e._receivedAt || e.$createdAt)}</span>
        ${!e._read
          ? `<button class="link-btn link-btn--sm" data-mark="${e.$id || e._localId}">Tandai Dibaca</button>`
          : `<span class="read-badge">${icons.check} Dibaca</span>`}
      </div>
    </div>
  </div>`
}

async function mountInbox(navigate) {
  let currentFilter = 'all'

  function refresh() {
    document.getElementById('inboxList').innerHTML = _renderInboxList(storage.getInbox(), currentFilter)
    bindItemActions()
  }

  function bindItemActions() {
    document.querySelectorAll('[data-mark]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); storage.markRead(btn.dataset.mark); refresh() })
    })
    document.querySelectorAll('.inbox-item').forEach(item => {
      item.addEventListener('click', () => {
        storage.markRead(item.dataset.id)
        item.classList.remove('inbox-item--unread')
        const markBtn = item.querySelector('[data-mark]')
        if (markBtn) markBtn.replaceWith(Object.assign(document.createElement('span'), {
          className: 'read-badge', innerHTML: `${icons.check} Dibaca`,
        }))
      })
    })
  }
  bindItemActions()

  document.getElementById('inboxFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]')
    if (!btn) return
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'))
    btn.classList.add('filter-btn--active')
    currentFilter = btn.dataset.filter
    refresh()
  })
  document.getElementById('markAllRead').addEventListener('click', () => { storage.markAllRead(); refresh(); toast('Semua ditandai dibaca', 'success') })
  document.getElementById('clearInbox').addEventListener('click', () => {
    if (!confirm('Hapus semua inbox?')) return
    storage.clearInbox(); refresh(); toast('Inbox dikosongkan', 'info')
  })
  document.getElementById('syncInbox').addEventListener('click', async () => {
    const btn = document.getElementById('syncInbox')
    btn.disabled = true; btn.innerHTML = `<span class="spinner spinner--sm"></span> Syncing...`
    try {
      const events = await inboxService.fetchRecent()
      events.forEach(e => storage.addToInbox(e))
      storage.updateLastSync()
      refresh(); toast(`${events.length} event disinkronkan`, 'success')
    } catch { toast('Gagal sync', 'error') }
    finally { btn.disabled = false; btn.innerHTML = `<span class="btn__icon">${icons.wifi}</span> Sync` }
  })

  const unsub = eventBus.on('inbox:new', () => refresh())
  return unsub
}


// ============================================================
// PAGE — Settings
// ============================================================

function renderSettings() {
  const user    = storage.getUser()
  const subs    = storage.getSubscriptions()
  const inbox   = storage.getInbox()
  const pending = storage.getPendingEvents()
  const lastSync = storage.getLastSync()
  return `
  <div class="page page--settings">
    <div class="page-header">
      <div><h1 class="page-title">Pengaturan</h1><p class="page-sub">Kelola akun dan preferensi aplikasi</p></div>
    </div>
    <div class="settings-grid">
      <div class="card">
        <div class="card__head"><h3 class="card__title">${icons.user} Profil</h3></div>
        <div class="card__body">
          <div class="profile-row">
            <div class="avatar">${(user?.name || 'U').charAt(0).toUpperCase()}</div>
            <div class="profile-info">
              <strong>${user?.name || '—'}</strong>
              <span>${user?.email || '—'}</span>
              <span class="profile-id">ID: ${user?.$id?.slice(0, 12) || '—'}...</span>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card__head"><h3 class="card__title">${icons.inbox} Data Lokal</h3></div>
        <div class="card__body">
          <div class="stat-rows">
            <div class="stat-row"><span>Inbox tersimpan</span><strong>${inbox.length} event</strong></div>
            <div class="stat-row"><span>Topik dilanggani</span><strong>${subs.length} topik</strong></div>
            <div class="stat-row"><span>Pending terkirim</span><strong>${pending.length} event</strong></div>
            <div class="stat-row"><span>Sync terakhir</span><strong>${lastSync ? formatDate(lastSync) : 'Belum pernah'}</strong></div>
          </div>
          <div class="settings-actions">
            <button class="btn btn--ghost btn--sm btn--danger" id="clearAllLocal">
              <span class="btn__icon">${icons.trash}</span> Hapus Data Lokal
            </button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card__head"><h3 class="card__title">${icons.bell} Notifikasi</h3></div>
        <div class="card__body">
          <div class="setting-row">
            <div><strong>Push Notification Browser</strong><span id="notifPermStatus">Status: ${Notification.permission}</span></div>
            <button class="btn btn--primary btn--sm" id="reqNotifPerm">
              <span class="btn__icon">${icons.bell}</span> Aktifkan
            </button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card__head"><h3 class="card__title">${icons.wifi} Koneksi Realtime</h3></div>
        <div class="card__body">
          <div class="setting-row">
            <div><strong>Appwrite Realtime</strong><span id="realtimeStatus">WebSocket aktif</span></div>
            <div class="conn-actions">
              <button class="btn btn--ghost btn--sm" id="connectRealtime">Hubungkan</button>
              <button class="btn btn--ghost btn--sm" id="disconnectRealtime">Putuskan</button>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card__head"><h3 class="card__title">${icons.info} Tentang</h3></div>
        <div class="card__body">
          <div class="stat-rows">
            <div class="stat-row"><span>Aplikasi</span><strong>PubSub PWA</strong></div>
            <div class="stat-row"><span>Versi</span><strong>1.0.0</strong></div>
            <div class="stat-row"><span>Backend</span><strong>Appwrite Cloud</strong></div>
            <div class="stat-row"><span>Push</span><strong>Novu</strong></div>
            <div class="stat-row"><span>Stack</span><strong>Vite + Vanilla JS</strong></div>
          </div>
        </div>
      </div>
      <div class="card card--danger">
        <div class="card__body">
          <div class="setting-row">
            <div><strong>Keluar dari Akun</strong><span>Sesi aktif akan dihapus</span></div>
            <button class="btn btn--danger btn--sm" id="logoutBtn">
              <span class="btn__icon">${icons.signout}</span> Keluar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>`
}

function mountSettings(navigate) {
  document.getElementById('reqNotifPerm').addEventListener('click', async () => {
    const perm = await Notification.requestPermission()
    document.getElementById('notifPermStatus').textContent = `Status: ${perm}`
    toast(perm === 'granted' ? 'Notifikasi diaktifkan' : 'Izin ditolak', perm === 'granted' ? 'success' : 'error')
  })
  document.getElementById('clearAllLocal').addEventListener('click', () => {
    if (!confirm('Hapus semua data lokal? Ini tidak menghapus data di server.')) return
    storage.clearInbox(); storage.clearPendingEvents(); storage.clearDraft()
    toast('Data lokal dihapus', 'info'); navigate('settings')
  })
  document.getElementById('connectRealtime').addEventListener('click', () => {
    realtimeService.connect()
    document.getElementById('realtimeStatus').textContent = 'Terhubung'
    toast('Realtime terhubung', 'success')
  })
  document.getElementById('disconnectRealtime').addEventListener('click', () => {
    realtimeService.disconnect()
    document.getElementById('realtimeStatus').textContent = 'Terputus'
    toast('Realtime diputus', 'info')
  })
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await auth.logout(); navigate('login') }
    catch (err) { toast(err.message || 'Gagal logout', 'error') }
  })
}


// ============================================================
// APP SHELL — Router & Navigation
// ============================================================

let _currentPage = ''
let _pageUnsub   = null
let _isOnline    = navigator.onLine

const _routes = {
  login:     { render: renderLogin,     mount: mountLogin },
  dashboard: { render: renderDashboard, mount: mountDashboard },
  topics:    { render: renderTopics,    mount: mountTopics },
  publish:   { render: renderPublish,   mount: mountPublish },
  inbox:     { render: renderInbox,     mount: mountInbox },
  settings:  { render: renderSettings,  mount: mountSettings },
}

async function navigate(page, force = false) {
  if (page === _currentPage && !force) return
  if (typeof _pageUnsub === 'function') _pageUnsub()
  _pageUnsub = null
  _currentPage = page

  const route = _routes[page]
  if (!route) return navigate('dashboard')

  const container = document.getElementById('pageContent')
  if (!container) return

  container.innerHTML = route.render(navigate)
  const result = await route.mount(navigate)
  if (typeof result === 'function') _pageUnsub = result
  _updateNavActive(page)
}

function _navLink(page, icon, label) {
  return `<button class="nav-link" data-nav="${page}">${icon}<span>${label}</span></button>`
}

function _navLinkBadge(page, icon, label, count) {
  return `<button class="nav-link" data-nav="${page}" style="position:relative">
    ${icon}<span>${label}</span>
    ${count > 0 ? `<span style="position:absolute;top:4px;right:4px;background:var(--red);color:#fff;font-size:9px;font-weight:700;min-width:14px;height:14px;padding:0 3px;border-radius:7px;display:flex;align-items:center;justify-content:center;">${count}</span>` : ''}
  </button>`
}

function _bottomNavItem(page, icon, label) {
  return `<button class="bottom-nav-item" data-nav="${page}" title="${label}">
    <span class="bnav-icon">${icon}</span>
    <span class="bnav-label">${label}</span>
  </button>`
}

function _bottomNavItemBadge(page, icon, label, count) {
  return `<button class="bottom-nav-item" data-nav="${page}" title="${label}">
    ${count > 0 ? `<span class="bnav-badge">${count}</span>` : ''}
    <span class="bnav-icon">${icon}</span>
    <span class="bnav-label">${label}</span>
  </button>`
}

function _updateNavActive(page) {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('nav-link--active',       el.dataset.nav === page)
    el.classList.toggle('bottom-nav-item--active', el.dataset.nav === page)
  })
}

function _updateUnreadBadge() {
  const count = storage.getUnreadCount()
  const badge = document.getElementById('navInboxBadge')
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none' }
}

function _renderShell() {
  const unread = storage.getUnreadCount()
  return `
  <div class="app-shell">
    <nav class="top-nav">
      <div class="nav-logo">
        <span class="nav-logo__icon">${icons.logo}</span>
        PubSub
      </div>
      <div class="nav-links">
        ${_navLink('dashboard', icons.dashboard, 'Dashboard')}
        ${_navLink('topics',    icons.topics,    'Topik')}
        ${_navLink('publish',   icons.publish,   'Publish')}
        ${_navLinkBadge('inbox', icons.inbox, 'Inbox', unread)}
        ${_navLink('settings',  icons.settings,  'Pengaturan')}
      </div>
      <div class="nav-right">
        <div class="conn-dot ${_isOnline ? '' : 'conn-dot--off'}" id="connDot" title="${_isOnline ? 'Online' : 'Offline'}"></div>
        <div class="nav-badge-wrap">
          <button class="icon-btn" id="navInboxBtn" title="Inbox">${icons.bell}</button>
          <span class="nav-inbox-badge" id="navInboxBadge" style="${unread > 0 ? '' : 'display:none'}">${unread}</span>
        </div>
      </div>
    </nav>
    <main class="main-content"><div id="pageContent"></div></main>
    <nav class="bottom-nav">
      <div class="bottom-nav-inner">
        ${_bottomNavItem('dashboard', icons.dashboard, 'Dashboard')}
        ${_bottomNavItem('topics',    icons.topics,    'Topik')}
        ${_bottomNavItem('publish',   icons.publish,   'Publish')}
        ${_bottomNavItemBadge('inbox', icons.inbox, 'Inbox', unread)}
        ${_bottomNavItem('settings',  icons.settings,  'Lainnya')}
      </div>
    </nav>
  </div>`
}


// ============================================================
// BOOT
// ============================================================

// Render shell + setup semua listener — dipanggil setelah user terautentikasi
function _bootShell() {
  const app = document.getElementById('app')
  app.innerHTML = _renderShell()

  // Navigasi
  app.addEventListener('click', (e) => {
    const el = e.target.closest('[data-nav]')
    if (el) navigate(el.dataset.nav)
  })
  document.getElementById('navInboxBtn')?.addEventListener('click', () => navigate('inbox'))

  // Online / offline
  window.addEventListener('online', () => {
    _isOnline = true
    document.getElementById('connDot')?.classList.remove('conn-dot--off')
    realtimeService.connect()
  })
  window.addEventListener('offline', () => {
    _isOnline = false
    document.getElementById('connDot')?.classList.add('conn-dot--off')
  })

  // Event bus listeners (gunakan once-guard agar tidak dobel saat re-login)
  eventBus.on('inbox:new', (event) => {
    _updateUnreadBadge()
    showBrowserNotif(event)
  })
  eventBus.on('auth:logout', () => {
    _currentPage = ''
    _novu = null
    const appEl = document.getElementById('app')
    appEl.innerHTML = renderLogin(navigate)
    mountLogin(navigate)
  })

  // Realtime
  try { realtimeService.connect() } catch { /* offline */ }

  // Halaman awal
  navigate('dashboard')
}

async function boot() {
  const app = document.getElementById('app')

  // Cek session yang sudah ada
  const cachedUser = storage.getUser()
  if (cachedUser) {
    _bootShell()
    return
  }

  // Coba ambil session dari Appwrite
  const user = await auth.getUser()
  if (user) {
    _bootShell()
    return
  }

  // Belum login — tampilkan halaman login
  // navigate() override agar setelah login langsung boot shell
  app.innerHTML = renderLogin(_navigateFromLogin)
  mountLogin(_navigateFromLogin)
}

// navigate khusus dari halaman login — render shell dulu baru navigate
async function _navigateFromLogin(page) {
  if (page !== 'dashboard') return
  _bootShell()
}

boot()

// ── PWA service worker ────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
