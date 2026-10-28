
# DocAI — Testing Strategy

## Overview

DocAI uses Vitest and React Testing Library
to verify important user interactions.

The testing approach focuses on document
upload, chat behavior, streaming, citations,
error handling and accessibility.

## 1. Component Tests

### ChatInput

Tests cover:
- Typing and sending a question
- Enter to send
- Shift+Enter for a new line
- Disabling send when no document is selected
- Disabling input during streaming
- Automated accessibility checks

### ChatMessage

Tests cover:
- Rendering user messages
- Rendering clickable source citations
- Displaying streaming indicators
- Showing errors
- Component snapshots
- Automated accessibility checks

## 2. Integration Testing

The upload-to-query integration test uses
the actual Next.js document and chat route
handlers.

The test:
1. Uploads a temporary TXT document.
2. Receives the uploaded document ID.
3. Sends a question about that document.
4. Verifies SSE streaming and source citations.
5. Checks for a completion event.
6. Deletes the temporary document.

The test uses OPENAI_MOCK_MODE=true,
so it does not require an external AI API key.

It verifies the API and retrieval flow,
not the quality of a real AI-generated answer.

## 3. Accessibility Testing

jest-axe is used to detect common
accessibility problems in selected
React components.

These checks supplement manual testing.

The application's accessibility target
is WCAG 2.1 AA.

Automated tests alone do not establish
full WCAG 2.1 AA compliance.

## 4. Snapshot Testing

ChatMessage has a saved component snapshot
to help identify unexpected markup changes.

Snapshots are reviewed when component
structure changes intentionally.

## 5. Running Tests

Install dependencies:

    npm ci

Run all tests:

    npm test

Run tests in watch mode:

    npm run test:watch

Update snapshots after reviewing changes:

    npm run test:update

TypeScript validation:

    npx tsc --noEmit

ESLint validation:

    npm run lint

Production build:

    npm run build

## 6. CI/CD

GitHub Actions runs:
- npm ci
- ESLint
- TypeScript validation
- Automated tests
- Production build

## 7. Results

Record the actual results after running
the test suite locally and in GitHub Actions.

Do not report a test as passing until
the command has completed successfully.

## 8. Known Gaps

Current automated tests do not yet cover:

- Full browser upload-to-answer interactions
- Real Gemini or OpenAI answer quality
- Visual regression across screen sizes
- Complete keyboard-only navigation
- Screen-reader behavior
- Colour contrast in a real browser
- Rate-limit and timeout recovery
- Stop and Retry chat controls

These can be added as the application develops.
