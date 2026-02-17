# MockClient: The AI Freelance Simulator

> **Master the art of dealing with clients before you ever sign a contract.**

![Tech Stack](https://img.shields.io/badge/stack-Vite%20%7C%20React%20%7C%20Ollama%20%7C%20Appwrite-blueviolet)

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** with a vision model installed
3. **Appwrite** instance (optional - for saving chat history)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Ollama:
```bash
# Install Ollama from https://ollama.com/
# Pull a vision-capable model
ollama pull llava
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Appwrite credentials (optional)
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## 📖 How It Works

1. **Configure Your Client** - Choose clarity level, behavior type, and your role
2. **Receive a Project Brief** - Get a realistic project description based on settings
3. **Build Your Project** - Work on your localhost as you normally would
4. **Submit Screenshots** - Drag & drop screenshots of your work
5. **Get Feedback** - The AI "client" reviews your work using vision capabilities

## 🎯 Features

### Client Personas

**Clarity Levels:**
- **Full** - Detailed specs with color codes and tech requirements
- **Moderate** - General goals, you ask for specifics
- **Low** - Vague requests like "make it pop"

**Behavior Types:**
- **Accepting** - Easy-going, minimal revisions
- **Skeptical** - Questions your choices, wants proof
- **Picky** - Obsesses over pixel-perfect details

### Supported Roles
- Frontend Developer
- Backend Developer
- UI Designer

## 🛠️ Technology Stack

- **Frontend:** Vite + React + TypeScript
- **Styling:** Tailwind CSS
- **AI:** Ollama (Local LLM with vision)
- **Backend:** Appwrite (Optional)

## 📁 Project Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   └── MessageBubble.tsx
│   ├── features/
│   │   ├── PersonaSelector.tsx
│   │   └── ImageUploader.tsx
│   └── ui/               # Reusable UI components
├── lib/
│   ├── appwrite.ts      # Appwrite integration
│   ├── ollama.ts        # Ollama API service
│   ├── prompts.ts       # AI prompt engineering
│   └── utils.ts         # Utility functions
└── App.tsx
```

## 🔧 Configuration

### Environment Variables

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_DATABASE_ID=your-database-id
VITE_APPWRITE_COLLECTION_ID=your-collection-id
VITE_APPWRITE_BUCKET_ID=your-bucket-id
VITE_OLLAMA_ENDPOINT=http://localhost:11434
```

### Ollama Setup

Ensure Ollama is running with a vision model:

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not installed, download from https://ollama.com/
# Pull LLaVA (vision + language model)
ollama pull llava
```
   **Note:** To use a different model, update the default model name in `src/lib/ollama.ts`:
   ```typescript
   export async function sendStreamingChatMessage(
     messages: OllamaMessage[],
     onChunk: (content: string) => void,
     model: string = 'gemma3:4b'  // Change this to your preferred model
```

## 📝 Usage Tips

1. **Start Simple** - Begin with "Full" clarity and "Accepting" behavior
2. **Practice Communication** - Ask clarifying questions with vague clients
3. **Submit Quality Screenshots** - Clear, full-page captures work best
4. **Iterate** - The AI can detect errors and crashes in your screenshots

## ⚠️ Troubleshooting

### "Couldn't connect to AI"
- Ensure Ollama is running: `ollama serve`
- Check if LLaVA is installed: `ollama list`
- Verify endpoint in `.env`: `VITE_OLLAMA_ENDPOINT=http://localhost:11434`

### TypeScript Errors
- Run `npm install` again
- Check that `@types/node` is installed
- Verify path aliases in `tsconfig.app.json`

### Image Upload Not Working
- Check browser console for errors
- Ensure file is an image format (PNG, JPG, etc.)
- Try smaller file sizes (< 5MB recommended)

## 🎓 Learning Outcomes

This simulator helps you practice:
- **Client communication skills**
- **Requirement gathering**
- **Managing expectations**
- **Handling vague feedback**
- **Iterative development**
- **Professional presentation**

---

**Built with ❤️ for developers learning to freelance**
