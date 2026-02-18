# MockClient — AI Freelance Client Simulator

> Practice client conversations before you ever sign a contract.

![Stack](https://img.shields.io/badge/stack-Vite%20%7C%20React%2019%20%7C%20TypeScript%20%7C%20Ollama%20%7C%20Appwrite-blueviolet)

MockClient simulates a freelance client powered by a local LLM. Configure a persona, receive a project brief, submit screenshots of your work, and get realistic (sometimes frustrating) feedback — without any real client involved.

---

## Features

- **Configurable personas** — mix clarity (Full / Moderate / Low) and behavior (Accepting / Skeptical / Picky) to simulate different client types
- **Vision-aware AI** — attach screenshots and the model reviews your actual work
- **Persistent chat history** — all sessions and messages are saved per-user in Appwrite
- **Image storage** — uploaded screenshots are stored in Appwrite Storage and shown inline
- **Full auth** — email/password registration and login with cookie-based sessions
- **Drag-and-drop uploads** — window-level drag overlay (ChatGPT-style), compact paperclip icon in the input bar

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| AI | Ollama (local, streaming, vision) |
| Auth / DB / Storage | Appwrite |

---

## Quick Start

See [SETUP.md](SETUP.md) for the full walkthrough.

```bash
npm install
cp .env.example .env   # fill in your values
npm run setup:appwrite # create Appwrite collections + bucket automatically
npm run dev
```

---

## Project Structure

```
src/
 components/
    auth/
       LoginPage.tsx
       RegisterPage.tsx
       ProtectedRoute.tsx
    chat/
       ChatInterface.tsx   # main chat UI, streaming + persistence
       HistorySidebar.tsx  # session list, delete, navigation
       MessageBubble.tsx   # renders a single message with optional image
    features/
       PersonaSelector.tsx # home screen — pick persona + start session
       ImageUploader.tsx   # paperclip icon + drag-and-drop overlay
    ui/                     # Button, Card, Input, Textarea
 context/
    AuthContext.tsx         # React context for auth state
 lib/
    appwrite.ts             # all Appwrite SDK calls (auth, DB, storage)
    chatService.ts          # SessionWriter class + message hydration
    ollama.ts               # streaming Ollama API client
    prompts.ts              # system prompt + project brief generation
    utils.ts
scripts/
 setup-appwrite.mjs          # one-time Appwrite setup script
```

---

## Environment Variables

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_DATABASE_ID=your-database-id
VITE_APPWRITE_SESSIONS_COLLECTION_ID=sessions
VITE_APPWRITE_MESSAGES_COLLECTION_ID=messages
VITE_APPWRITE_BUCKET_ID=chat-images
VITE_OLLAMA_ENDPOINT=http://localhost:11434

# Server-only — used by `npm run setup:appwrite`, never sent to the browser
APPWRITE_API_KEY=your-appwrite-api-key
```

---

## Ollama Model

The app defaults to `gemma3:4b`. To change it, edit the `model` default in `src/lib/ollama.ts`:

```ts
export async function sendStreamingChatMessage(
  messages: OllamaMessage[],
  onChunk: (content: string) => void,
  model: string = 'gemma3:4b',   //  change this
)
```

For image support (screenshots) use a vision model like `llava` or `gemma3`.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run setup:appwrite` | Create Appwrite collections, indexes, and bucket |

---

## Troubleshooting

**"Couldn't connect to the AI"** — Ollama is not running. Run `ollama serve` and make sure a model is installed (`ollama list`).

**Messages not saving / 401 errors** — Run `npm run setup:appwrite` again to patch collection permissions. Make sure `APPWRITE_API_KEY` is set in `.env`.

**TypeScript errors in `main.tsx`** — Check that `tsconfig.app.json` has `"types": ["vite/client", "react", "react-dom"]`.

**Port in use** — `npm run dev -- --port 3000`
