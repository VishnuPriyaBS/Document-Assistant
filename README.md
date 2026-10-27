
# DocAI — AI-Powered Document Assistant

DocAI is a document-based AI assistant built with Next.js, React, TypeScript, and Redux Toolkit.

It allows users to upload PDF and text documents, select specific documents for a conversation, ask questions in natural language, and receive answers with references to the original document pages.

## Features

- Upload PDF and TXT documents.
- Validate document format and file size (maximum 10 MB).
- Display real-time upload progress.
- Manage uploaded documents.
- Preview extracted document content.
- Select documents for each chat session.
- Ask questions about selected documents.
- Receive streaming AI responses.
- View source citations and open referenced PDF pages.
- Create multiple chat conversations.
- Handle upload, retrieval, and AI errors.
- Use Gemini or OpenAI as the AI provider.
- Use a mock streaming mode for development without API credits.

## Technology Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Redux Toolkit
- React Redux
- Tailwind CSS
- Lucide React

### Backend
- Next.js Route Handlers
- Node.js
- Server-Sent Events (SSE)
- unpdf for PDF text extraction

### AI Integration
- Google Gemini
- OpenAI
- Keyword-based document retrieval

### DevOps
- Docker
- Docker Compose
- GitHub Actions
- ESLint
- TypeScript

## Prerequisites

Before running the application, install:

- Node.js 22
- npm
- Git

Docker Desktop is optional for container-based execution.

An API key is required only when using a real AI provider.

## Installation

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Document-Assistant-main
```

Replace the GitHub URL with your actual repository URL.

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment variables

Create a `.env.local` file in the project root.

You can copy the provided example:

```bash
cp .env.example .env.local
```

**Do not overwrite an existing `.env.local` containing working configuration.**

Example configuration for Gemini:

```dotenv
AI_PROVIDER=gemini
OPENAI_MOCK_MODE=false

GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=your_supported_gemini_model
```

For OpenAI:

```dotenv
AI_PROVIDER=openai
OPENAI_MOCK_MODE=false

OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5-mini
```

Use a model available to your API account.

### 4. Run the application

```bash
npm run dev
```

Open:

http://localhost:3000

If port 3000 is already occupied:

```bash
npm run dev -- -p 3001
```

Then visit http://localhost:3001.

## How to Use

### Upload Documents

1. Open the Documents page or AI Chat.
2. Select Upload.
3. Choose a PDF or TXT file.
4. Wait for upload and processing to complete.

### Ask Questions

1. Open AI Chat.
2. Select the documents relevant to your conversation.
3. Type a question.
4. Send the question.
5. Review the AI-generated response.
6. Click source references to verify information.

### Example Questions

- Summarize the main points of this document.
- What technologies are mentioned in the document?
- What are the candidate's React and TypeScript skills?
- Explain the Micro Frontend experience described in the resume.
- Compare the experience described in the selected resumes.

## How Document Retrieval Works

1. The user uploads a document.
2. The backend stores the file and its metadata.
3. Text is extracted from the PDF or TXT document.
4. Document content is divided into smaller text sections.
5. When a user asks a question, relevant sections are found using keyword-based retrieval.
6. Selected passages are passed to the configured AI provider.
7. The answer is streamed to the frontend.
8. Source references allow users to check the original document.

The current implementation uses keyword-based search rather than an embedding-based vector database.

## State Management

Redux Toolkit manages application-wide state.

### documentsSlice
Manages:
- Uploaded document metadata
- Upload progress
- Document loading and errors

### chatSlice
Manages:
- Chat conversations
- Active conversation
- Selected documents
- Messages
- Streaming status
- Chat errors

Currently, conversation history is held in Redux memory and is not preserved after a browser refresh.

Persistent conversation storage is a planned improvement.

## AI Streaming

The application uses Server-Sent Events (SSE) to return responses progressively.

Event types include:

- sources
- delta
- done
- error

The frontend updates the assistant's message as new response content arrives.

## Mock Mode

To use DocAI without calling an AI provider:

```dotenv
OPENAI_MOCK_MODE=true
```

Mock mode streams retrieved document excerpts for testing.

Mock responses are not real LLM-generated answers or summaries.

To enable real AI responses:

```dotenv
OPENAI_MOCK_MODE=false
```

Configure the appropriate provider API key and model, then restart the application.

## Local Quality Checks

Run ESLint:

```bash
npm run lint
```

Run TypeScript validation:

```bash
npx tsc --noEmit
```

Build the application:

```bash
npm run build
```

Start the production application:

```bash
npm run start
```

## Run with Docker

Ensure Docker Desktop is installed and running.

Make sure `.env.local` exists.

Build and start:

```bash
docker compose up --build -d
```

View logs:

```bash
docker compose logs -f docai
```

Open:

http://localhost:3000

If port 3000 is occupied:

```bash
DOCAI_PORT=3002 docker compose up --build -d
```

Open http://localhost:3002.

Stop the containers:

```bash
docker compose down
```

Uploaded documents are stored in a Docker named volume so normal restarts do not remove them.

Do not use `docker compose down -v` unless you intend to remove the stored document volume.

## CI/CD

The GitHub Actions workflow is located at:

`.github/workflows/ci.yml`

The workflow performs:

1. Dependency installation
2. ESLint validation
3. TypeScript checking
4. Production build

Automated unit, integration, and accessibility tests are planned for a later development stage.

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   └── documents/
│   ├── chat/
│   ├── documents/
│   ├── settings/
│   └── page.tsx
│
├── components/
│   ├── chat/
│   ├── documents/
│   └── layout/
│
├── lib/
│   ├── redux/
│   │   └── slices/
│   └── server/
│
└── types/
```

## Security and Privacy

This project is currently intended for local technical-assessment use.

Uploaded documents are stored in a shared local server directory without user authentication or per-user access controls.

Do not deploy the application publicly with confidential or personal documents.

Before production deployment, improvements would include:

- User authentication
- Document-level authorization
- Secure document storage
- Data retention and deletion policies
- Upload security checks
- Protection of AI provider credentials

## Known Limitations

- Retrieval is based on keyword matching and may miss semantic matches.
- Chat sessions are not persisted after a browser refresh.
- PDF citations open source pages rather than highlighting exact passages.
- There is no user authentication or document-level access control.
- Automated tests and persistent light/dark theme controls are not yet implemented.

## Future Improvements

- Semantic or hybrid document search
- Side-by-side multi-document comparison
- Persistent conversation history
- Better citation highlighting
- Expanded accessibility support
- User-controlled themes
- Automated testing
- Secure collaborative workspaces

## Project Purpose

Developed as part of a Frontend Engineer (Gen AI) technical assessment to demonstrate React architecture, TypeScript, state management, document processing, LLM integration, and streaming AI responses.
