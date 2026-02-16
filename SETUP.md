# Setup Guide for MockClient

This guide will help you get MockClient up and running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **Git** - [Download](https://git-scm.com/)
3. **Ollama** - [Download](https://ollama.com/)

## Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React & TypeScript
- Vite (build tool)
- Tailwind CSS
- Appwrite SDK
- React Markdown

## Step 2: Set Up Ollama (Required)

Ollama is required for the AI client functionality. It runs locally on your machine.

### Installation

1. Download and install Ollama from [https://ollama.com/](https://ollama.com/)
2. After installation, verify it's running:

**Windows:**
```powershell
curl http://localhost:11434/api/tags
```

**Linux/Mac:**
```bash
curl http://localhost:11434/api/tags
```

### Pull a Vision Model

The app requires a vision-capable model to analyze screenshots:

```bash
ollama pull llava
```

This will download the LLaVA model (~4GB). Once complete, verify it's available:

```bash
ollama list
```

You should see `llava` in the list.

## Step 3: Configure Environment Variables (Optional)

Appwrite is optional and only needed if you want to save chat history.

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` with your Appwrite credentials:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id-here
VITE_APPWRITE_DATABASE_ID=your-database-id-here
VITE_APPWRITE_COLLECTION_ID=your-collection-id-here
VITE_APPWRITE_BUCKET_ID=your-bucket-id-here
VITE_OLLAMA_ENDPOINT=http://localhost:11434
```

**Note:** The Ollama endpoint should always be `http://localhost:11434` unless you've configured it differently.

## Step 4: Run the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173)

## Step 5: Test the Application

1. Open [http://localhost:5173](http://localhost:5173) in your browser
2. Select a client persona (clarity level and behavior type)
3. Choose your role (Frontend, Backend, or UI Designer)
4. Click "Start Session"
5. You should receive a project brief from the AI client
6. Build your project locally, take screenshots, and upload them for feedback

## Troubleshooting

### "Couldn't connect to AI" Error

This means the app can't reach Ollama. Try:

1. Ensure Ollama is running:
   ```bash
   ollama serve
   ```

2. Check if the model is installed:
   ```bash
   ollama list
   ```

3. Test the Ollama API:
   ```bash
   curl http://localhost:11434/api/tags
   ```

4. Verify your `.env` file has the correct endpoint:
   ```env
   VITE_OLLAMA_ENDPOINT=http://localhost:11434
   ```

### Build Errors

If you encounter TypeScript or build errors:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Port Already in Use

If port 5173 is already in use:

```bash
npm run dev -- --port 3000
```

This will run the app on port 3000 instead.

### Slow AI Responses

LLaVA is a large model. Depending on your hardware:
- First response may take 30-60 seconds
- Subsequent responses should be faster (10-20 seconds)
- Consider using a GPU for faster inference

### Image Upload Not Working

Ensure:
- File is a valid image format (PNG, JPG, JPEG, WebP)
- File size is reasonable (< 10MB recommended)
- Browser has permission to access files

## Next Steps

Once everything is working:

1. **Start Simple** - Try "Full" clarity with "Accepting" behavior
2. **Practice Communication** - Graduate to "Moderate" and "Low" clarity
3. **Challenge Yourself** - Try "Picky" or "Skeptical" clients
4. **Experiment** - Try different roles (Frontend, Backend, UI Designer)

## Optional: Set Up Appwrite

If you want to save chat history:

1. Sign up at [appwrite.io](https://appwrite.io/)
2. Create a new project
3. Create a database and collection with these attributes:
   - `userId` (string)
   - `messages` (string)
   - `personaSettings` (string)
   - `createdAt` (datetime)
4. Create a storage bucket for screenshots
5. Update your `.env` file with the IDs

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` folder. You can deploy this folder to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

**Important:** Ollama must be running on the machine accessing the app, as it runs locally.

## Getting Help

If you encounter issues:

1. Check the browser console for errors (F12)
2. Check the Ollama logs
3. Verify all prerequisites are installed
4. Review this setup guide again

---

Happy freelancing! 🚀
