/**
 * Appwrite Setup Script
 * Ensures the `sessions` and `messages` collections (with attributes + indexes)
 * and the storage bucket exist. Safe to run multiple times — skips anything
 * that already exists.
 *
 * Required in your .env:
 *   VITE_APPWRITE_ENDPOINT
 *   VITE_APPWRITE_PROJECT_ID
 *   VITE_APPWRITE_DATABASE_ID
 *   VITE_APPWRITE_SESSIONS_COLLECTION_ID   (desired ID, e.g. "sessions")
 *   VITE_APPWRITE_MESSAGES_COLLECTION_ID   (desired ID, e.g. "messages")
 *   VITE_APPWRITE_BUCKET_ID                (desired ID, e.g. "chat-images")
 *   APPWRITE_API_KEY                       (server API key — never expose in frontend)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  Client,
  Databases,
  Storage,
  Permission,
  Role,
  IndexType,
} from 'node-appwrite';

// ── Load .env manually (no Vite here) ────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env');

try {
  const raw = readFileSync(envPath, 'utf-8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.error('Could not read .env file — make sure it exists at the project root.');
  process.exit(1);
}

const {
  VITE_APPWRITE_ENDPOINT: ENDPOINT,
  VITE_APPWRITE_PROJECT_ID: PROJECT_ID,
  VITE_APPWRITE_DATABASE_ID: DATABASE_ID,
  VITE_APPWRITE_SESSIONS_COLLECTION_ID: SESSIONS_ID,
  VITE_APPWRITE_MESSAGES_COLLECTION_ID: MESSAGES_ID,
  VITE_APPWRITE_BUCKET_ID: BUCKET_ID,
  APPWRITE_API_KEY: API_KEY,
} = process.env;

const missing = [
  ['VITE_APPWRITE_ENDPOINT', ENDPOINT],
  ['VITE_APPWRITE_PROJECT_ID', PROJECT_ID],
  ['VITE_APPWRITE_DATABASE_ID', DATABASE_ID],
  ['VITE_APPWRITE_SESSIONS_COLLECTION_ID', SESSIONS_ID],
  ['VITE_APPWRITE_MESSAGES_COLLECTION_ID', MESSAGES_ID],
  ['VITE_APPWRITE_BUCKET_ID', BUCKET_ID],
  ['APPWRITE_API_KEY', API_KEY],
].filter(([, v]) => !v).map(([k]) => k);

if (missing.length) {
  console.error(`Missing required env vars:\n  ${missing.join('\n  ')}`);
  console.error('\nAdd APPWRITE_API_KEY to your .env (this is a server-only key, never committed).');
  process.exit(1);
}

// ── Appwrite client ───────────────────────────────────────────────────────────
const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);
const storage = new Storage(client);

// ── Helpers ───────────────────────────────────────────────────────────────────
const ok  = (msg) => console.log(`  ✓ ${msg}`);
const skip = (msg) => console.log(`  – ${msg} (already exists)`);
const info = (msg) => console.log(`\n▶ ${msg}`);

async function ensureCollection(colId, colName) {
  let exists = false;
  try {
    await db.getCollection(DATABASE_ID, colId);
    exists = true;
  } catch { /* doesn't exist yet */ }

  const perms = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  if (exists) {
    // Always patch permissions + disable documentSecurity so collection-level
    // permissions apply to every document without needing per-doc permissions.
    await db.updateCollection(DATABASE_ID, colId, colName, perms, false);
    ok(`Patched permissions on collection "${colName}"`);
  } else {
    await db.createCollection(DATABASE_ID, colId, colName, perms, false);
    ok(`Created collection "${colName}"`);
  }
}

async function ensureStringAttr(colId, key, size, required) {
  try {
    await db.getAttribute(DATABASE_ID, colId, key);
    skip(`Attribute "${key}"`);
  } catch {
    await db.createStringAttribute(DATABASE_ID, colId, key, size, required);
    ok(`Created string attribute "${key}" (size ${size}, required=${required})`);
  }
}

async function ensureIntegerAttr(colId, key, required, min = undefined, max = undefined) {
  try {
    await db.getAttribute(DATABASE_ID, colId, key);
    skip(`Attribute "${key}"`);
  } catch {
    await db.createIntegerAttribute(DATABASE_ID, colId, key, required, min, max);
    ok(`Created integer attribute "${key}"`);
  }
}

async function ensureIndex(colId, indexKey, type, attrs) {
  try {
    await db.getIndex(DATABASE_ID, colId, indexKey);
    skip(`Index "${indexKey}"`);
  } catch {
    await db.createIndex(DATABASE_ID, colId, indexKey, type, attrs);
    ok(`Created index "${indexKey}"`);
  }
}

async function ensureBucket(bucketId, bucketName) {
  const perms = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  let exists = false;
  try {
    await storage.getBucket(bucketId);
    exists = true;
  } catch { /* doesn't exist yet */ }

  if (exists) {
    await storage.updateBucket(bucketId, bucketName, perms);
    ok(`Patched permissions on bucket "${bucketName}"`);
  } else {
    await storage.createBucket(bucketId, bucketName, perms);
    ok(`Created bucket "${bucketName}"`);
  }
}

// Appwrite needs a moment after creating attributes before indexes can reference them.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Appwrite Setup — MockClient\n');

  // ── sessions collection ───────────────────────────────────────────────────
  info('sessions collection');
  await ensureCollection(SESSIONS_ID, 'sessions');

  info('sessions → attributes');
  await ensureStringAttr(SESSIONS_ID, 'userId',          36,   true);
  await ensureStringAttr(SESSIONS_ID, 'title',           120,  true);
  await ensureStringAttr(SESSIONS_ID, 'personaSettings', 1000, true);
  await ensureIntegerAttr(SESSIONS_ID, 'messageCount',   true, 0);
  await ensureStringAttr(SESSIONS_ID, 'lastMessageAt',   36,   true);
  await ensureStringAttr(SESSIONS_ID, 'createdAt',       36,   true);

  info('sessions → indexes (waiting 2 s for attributes to be ready...)');
  await sleep(2000);
  await ensureIndex(SESSIONS_ID, 'idx_userId',        IndexType.Key, ['userId']);
  await ensureIndex(SESSIONS_ID, 'idx_lastMessageAt', IndexType.Key, ['lastMessageAt']);

  // ── messages collection ───────────────────────────────────────────────────
  info('messages collection');
  await ensureCollection(MESSAGES_ID, 'messages');

  info('messages → attributes');
  await ensureStringAttr(MESSAGES_ID, 'sessionId',     36,    true);
  await ensureStringAttr(MESSAGES_ID, 'role',          10,    true);
  await ensureStringAttr(MESSAGES_ID, 'content',       65535, true);
  await ensureStringAttr(MESSAGES_ID, 'storageFileId', 36,    false);
  await ensureStringAttr(MESSAGES_ID, 'timestamp',     36,    true);

  info('messages → indexes (waiting 2 s...)');
  await sleep(2000);
  await ensureIndex(MESSAGES_ID, 'idx_sessionId', IndexType.Key, ['sessionId']);
  await ensureIndex(MESSAGES_ID, 'idx_timestamp', IndexType.Key, ['timestamp']);

  // ── storage bucket ────────────────────────────────────────────────────────
  info('storage bucket');
  await ensureBucket(BUCKET_ID, 'chat-images');

  console.log('\nSetup complete.');
}

main().catch((err) => {
  console.error('\nSetup failed:', err.message ?? err);
  process.exit(1);
});
