# Fix-It-Flow — Your Eco-friendly Agent

> A voice-first, AI-powered diagnostic agent that prevents waste by guiding users through appliance repairs and recycling ideas in real time.

## The Inspiration

50 million tons of e-waste hit landfills every year because of simple, fixable issues. Fix-It-Flow gives every person a master technician in their pocket — hands-free, voice-guided, sustainability-first.

## How It Works

Two flows, one goal: fix it before you bin it.

### Inspection Mode (`/repair/new`)

1. **Describe the problem** — speak naturally while pointing your camera at the item
2. **Gemini Vision** analyzes each live frame and describes what it sees
3. **Featherless AI (Llama 3.1)** reasons over the visual description + your conversation to diagnose the issue
4. Up to **3 clarifying questions** — then the AI commits to a specific sustainable recommendation
5. Recommendations follow sustainability priority: **repair → replace only the broken part → repurpose → donate → recycle**
6. If too complex for home repair, suggests alternatives (repair cafes, manufacturer spare parts)

### Repair Mode (`/repair/[sessionId]`)

1. **AI generates step-by-step repair instructions** tailored to the identified device and part
2. **ElevenLabs TTS** reads each step aloud — truly hands-free
3. **Say "done" or "next"** to advance, **"repeat"** to hear again, **"help"** for navigation tips, **"end session"** to stop early
4. **Ask any question** mid-repair — AI answers in context and resumes the step
5. Session ends naturally when the final step is reached (max 5 steps)

## Tech Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | Next.js 14 PWA | Web-app, mobile-support |
| Voice Input | Web Speech API | Real-time speech-to-text, keyword + question detection |
| Voice Output | ElevenLabs TTS | Streaming text-to-speech — hands-free guidance |
| Vision | Google Gemini Vision | Live frame analysis — describes what is visibly broken |
| LLM | Featherless.AI (Llama 3.1) | Sustainability reasoning, repair step generation, follow-up Q&A |
| Data | AWS DynamoDB | Session + conversation persistence |

## Project Structure

```text
src/
├── app/                          # Next.js App Router pages + API routes
│   ├── page.tsx                  # Landing page
│   ├── repair/
│   │   ├── new/page.tsx          # Inspection flow: live camera + AI conversation
│   │   └── [sessionId]/page.tsx  # Repair walkthrough: step-by-step voice guidance
│   └── api/
│       ├── inspection/
│       │   ├── session/          # Create inspection session
│       │   └── turn/             # Process one conversation turn (vision + reasoning)
│       ├── session/              # DynamoDB CRUD for repair sessions
│       ├── repair-step/          # Generate next repair step via Featherless
│       ├── identify/             # Device identification from photo
│       ├── speak/                # ElevenLabs TTS stream
│       └── chat/                 # In-repair follow-up Q&A
├── features/                     # Frontend modules grouped by domain
│   ├── camera/                   # useCamera hook, CameraCapture component
│   ├── repair/                   # useRepairSession hook, StepCard, StepProgress
│   └── voice/                    # useSpeechRecognition, useSpeech, AudioPlayer, VoiceButton
├── server/
│   ├── clients/                  # External API integrations
│   │   ├── gemini.ts             # Gemini Vision: identify device, inspect live frame
│   │   ├── featherless.ts        # Llama 3.1: repair steps, inspection reasoning
│   │   ├── elevenlabs.ts         # ElevenLabs: streaming TTS
│   │   └── aws/                  # DynamoDB client
│   └── services/                 # Backend business logic
│       ├── inspection.ts         # Turn processing: Gemini vision → Featherless reasoning
│       ├── repair.ts             # Step generation with fallback
│       └── session.ts            # Repair session lifecycle
└── shared/
    ├── types.ts                  # Shared TypeScript interfaces
    └── ui/                       # Spinner, ErrorBanner, shared components
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Fill in all API keys — see table below

# 3. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your browser.

The app requires **camera** and **microphone** permissions in the browser.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `GEMINI_IDENTIFY_MODEL` | No | Defaults to `gemini-2.5-flash-lite` |
| `GEMINI_OBSERVE_MODEL` | No | Defaults to `gemini-2.5-flash-lite` |
| `GEMINI_INSPECT_MODEL` | No | Defaults to `gemini-2.0-flash` |
| `FEATHERLESS_API_KEY` | Yes | Featherless.AI API key |
| `FEATHERLESS_MODEL` | No | Defaults to `meta-llama/Meta-Llama-3.1-8B-Instruct` |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key (requires `text_to_speech` + `voices:read` permissions) |
| `ELEVENLABS_VOICE_ID` | Yes | ElevenLabs voice ID |
| `AWS_REGION` | Yes | AWS region (e.g. `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | Yes | AWS IAM key with DynamoDB access |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS IAM secret |
| `DYNAMODB_TABLE_NAME` | Yes | DynamoDB table name (partition key: `sessionId`) |
| `NEXT_PUBLIC_APP_URL` | No | App base URL (defaults to `http://localhost:3000`) |

## AWS Setup

Only DynamoDB is required to run the app.

**Create the DynamoDB table:**

- Table name: `rockethacks-fix-it-flow-sessions` (or your custom name)
- Partition key: `sessionId` (String)
- No sort key, no GSIs required

**IAM permissions needed:**

- `dynamodb:PutItem`
- `dynamodb:GetItem`
- `dynamodb:UpdateItem`

See [infra/aws/README.md](infra/aws/README.md) for full infrastructure details.
