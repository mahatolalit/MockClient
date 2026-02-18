# MockClient — Setup Guide

This guide walks you through getting MockClient fully running from scratch.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| Ollama | latest | [ollama.com](https://ollama.com/) |
| Appwrite | Cloud or self-hosted | [appwrite.io](https://appwrite.io/) |

---

## Step 1 — Install Dependencies

```bash
npm install
```

---

## Step 2 — Set Up Ollama

Ollama runs the AI locally. It is **required**.

1. Download and install from [https://ollama.com/](https://ollama.com/)
2. Pull a vision-capable model:

```bash
ollama pull gemma3       # recommended — vision + text
# or
ollama pull llava        # alternative vision model
```

3. Verify Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

You should see a JSON list of installed models.

> The default model in `src/lib/ollama.ts` is `gemma3:4b`. Change the `model` default in `sendStreamingChatMessage` if you use a different model name.

---

## Step 3 — Set Up Appwrite

Appwrite handles **authentication**, **chat history**, and **image storage**. It is **required**.

### 3a. Create an Appwrite project

1. Sign up at [cloud.appwrite.io](https://cloud.appwrite.io/) (free tier works)
2. Create a new project — note the **Project ID**
3. Create a new **Database** — note the **Database ID**
4. Go to **Settings  API Keys  Create API Key**
   - Grant these scopes: `databases.read`, `databases.write`, `collections.read`, `collections.write`, `attributes.read`, `attributes.write`, `indexes.read`, `indexes.write`, `buckets.read`, `buckets.write`, `files.read`, `files.write`
   - Note the **API Key**

### 3b. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_DATABASE_ID=your-database-id
VITE_APPWRITE_SESSIONS_COLLECTION_ID=sessions
VITE_APPWRITE_MESSAGES_COLLECTION_ID=messages
VITE_APPWRITE_BUCKET_ID=chat-images
VITE_OLLAMA_ENDPOINT=http://localhost:11434

# Server-only key — never committed, never sent to the browser
APPWRITE_API_KEY=your-appwrite-api-key
```

> The collection/bucket ID values (`sessions`, `messages`, `chat-images`) are the IDs that will be created for you in the next step. You can use any string you like.

### 3c. Run the automated setup script

```bash
npm run setup:appwrite
```

This script will:
- Create the `sessions` collection with all required attributes and indexes
- Create the `messages` collection with all required attributes and indexes
- Create the `chat-images` storage bucket
- Patch permissions on existing collections if they already exist

It is **safe to run multiple times** — it skips anything that already exists and patches what needs updating.

Expected output:
```
Appwrite Setup — MockClient

 sessions collection
   Created collection "sessions"
 sessions  attributes
   Created string attribute "userId" ...
  ...
 messages collection
   Created collection "messages"
  ...
 storage bucket
   Created bucket "chat-images"

Setup complete.
```

### 3d. Add your domain to Appwrite's allowed platforms

In the Appwrite console: **Project  Settings  Platforms  Add Platform  Web**

- For local dev: add `http://localhost:5173`
- For production: add your deployed domain

---

## Step 4 — Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

You will be shown a **login screen**. Register a new account, then log in.

---

## Step 5 — Start a Chat

1. On the home screen, choose a **clarity level**, **behavior**, and **your role**
2. Click **Generate Brief** — the AI client will introduce itself with a project description
3. Reply as you would with a real client
4. Attach screenshots by clicking the paperclip icon or dragging a file anywhere onto the window
5. All messages are automatically saved and appear in the **Chat History** sidebar

---

## Appwrite Collections Reference

The setup script creates these automatically. Listed here for reference.

### `sessions` collection

| Attribute | Type | Size | Required | Index |
|---|---|---|---|---|
| `userId` | String | 36 | Yes | Key |
| `title` | String | 120 | Yes | — |
| `personaSettings` | String | 1000 | Yes | — |
| `messageCount` | Integer | — | Yes | — |
| `lastMessageAt` | String | 36 | Yes | Key |
| `createdAt` | String | 36 | Yes | — |

### `messages` collection

| Attribute | Type | Size | Required | Index |
|---|---|---|---|---|
| `sessionId` | String | 36 | Yes | Key |
| `role` | String | 10 | Yes | — |
| `content` | String | 65535 | Yes | — |
| `storageFileId` | String | 36 | No | — |
| `timestamp` | String | 36 | Yes | Key |

---

## Troubleshooting

### "Couldn't connect to the AI"

Ollama is not running or the model is missing.

```bash
ollama serve          # start Ollama
ollama list           # check installed models
ollama pull gemma3    # install if missing
```

### Messages not saving / 401 Unauthorized

Collection permissions were not set correctly.

```bash
npm run setup:appwrite   # re-run — it will patch permissions
```

Make sure `APPWRITE_API_KEY` is present in `.env` and has the required scopes.

### Sessions show up but messages don't load

Check that `VITE_APPWRITE_MESSAGES_COLLECTION_ID` matches the actual collection ID in your Appwrite dashboard.

### Build errors / TypeScript errors

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Check that `tsconfig.app.json` contains:
```json
"types": ["vite/client", "react", "react-dom"]
```

### Port already in use

```bash
npm run dev -- --port 3000
```

---

## Production Build

```bash
npm run build
```

Output goes to `dist/`. Deploy to any static host (Vercel, Netlify, Cloudflare Pages).

**Important:** Ollama must be running on the same machine as the browser, since it runs locally on `localhost:11434`. For a hosted deployment you would need to expose Ollama or swap to a hosted model API.
