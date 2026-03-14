# Fix-It-Flow — The Repair Mentor

> A voice-first, AI-powered diagnostic agent that prevents e-waste by guiding users through appliance repairs in real time.

## RocketHacks 2026 — Sustainability Track

---

## The Hook

50 million tons of e-waste hit landfills every year because of simple, fixable issues. Fix-It-Flow gives every person a master technician in their pocket — hands-free, voice-guided, step by step.

---

## How It Works

1. **Take a photo** of your broken device (toaster, lamp, coffee maker...)
2. **AI identifies** the device and the broken part using Gemini Vision
3. **Voice guidance** walks you through the repair step by step (ElevenLabs TTS)
4. **Say "Done"** after each step — Web Speech API captures your voice
5. **Jaseci tracks state** so you never lose your place

---

## Tech Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | Next.js 14 PWA | Mobile-first, installable app |
| Orchestration | Jaseci Labs | Stateful repair graph (the "brain") |
| Voice | ElevenLabs | Streaming TTS — hands-free guidance |
| Vision | Gemini Vision | Identifies device + broken part from photo |
| LLM | Featherless.AI (Llama 3.1) | Generates repair step instructions |
| Infra | AWS (5 services) | Amplify, Lambda, S3, DynamoDB, Rekognition |

---

## Project Structure

```text
src/
├── app/                        # Next.js App Router pages + API routes
│   ├── page.tsx                # Landing page
│   ├── repair/
│   │   ├── new/page.tsx        # Camera capture + device identification
│   │   └── [sessionId]/        # Repair walkthrough
│   └── api/
│       ├── upload/             # S3 presigned URL
│       ├── identify/           # Gemini Vision + Rekognition
│       ├── session/            # DynamoDB CRUD
│       ├── repair-step/        # Featherless.AI step generation
│       ├── orchestrate/        # Jaseci Lambda proxy
│       └── speak/              # ElevenLabs TTS stream
├── lib/
│   ├── types.ts                # Shared TypeScript interfaces
│   ├── services/               # Third-party integrations (server-side)
│   └── hooks/                  # React hooks (client-side)
└── components/
    ├── camera/                 # CameraCapture, PhotoPreview
    ├── repair/                 # StepCard, StepProgress, RepairComplete
    ├── voice/                  # VoiceButton, AudioPlayer
    └── ui/                     # Button, Spinner, ErrorBanner
infra/
└── lambda/orchestrator/        # AWS Lambda handler for Jaseci proxy
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Fill in all API keys in .env.local

# 3. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on mobile or use Chrome DevTools mobile mode.

---

## Team Branching Guide

| Branch | Owns |
| --- | --- |
| `feat/camera-capture` | `useCamera`, `CameraCapture`, `PhotoPreview`, `repair/new/page.tsx` |
| `feat/repair-walkthrough` | `useRepairSession`, `StepCard`, `StepProgress`, `repair/[sessionId]/page.tsx` |
| `feat/voice` | `useSpeech`, `VoiceButton`, `AudioPlayer`, `api/speak/route.ts`, `elevenlabs.ts` |
| `feat/vision-identify` | `gemini.ts`, `rekognition.ts`, `api/identify/route.ts`, `api/upload/route.ts` |
| `feat/llm-steps` | `featherless.ts`, `api/repair-step/route.ts` |
| `feat/session-aws` | `dynamodb.ts`, `s3.ts`, `api/session/` routes |
| `feat/jaseci-orchestration` | `jaseci.ts`, `api/orchestrate/route.ts`, `infra/lambda/` |

**Start with `src/lib/types.ts`** — all teammates share these interfaces.

---

## Environment Variables

See [`.env.local.example`](.env.local.example) for all required keys.

Required services:

- [Gemini API](https://aistudio.google.com/app/apikey)
- [ElevenLabs](https://elevenlabs.io)
- [Featherless.AI](https://featherless.ai)
- [Jaseci Labs](https://jaseci.org)
- AWS account with Amplify, Lambda, S3, DynamoDB, Rekognition enabled

---

## AWS Infrastructure

See [infra/README.md](infra/README.md) for DynamoDB schema, Lambda setup, S3 CORS config, and IAM permissions.
