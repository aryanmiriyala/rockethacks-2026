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
│       ├── identify/           # Device identification endpoint
│       ├── session/            # DynamoDB CRUD
│       ├── repair-step/        # Featherless.AI step generation
│       ├── orchestrate/        # Jaseci Lambda proxy
│       └── speak/              # ElevenLabs TTS stream
├── features/                   # Frontend modules grouped by domain
│   ├── camera/
│   ├── repair/
│   └── voice/
├── server/
│   ├── clients/                # Provider and AWS integration clients
│   └── services/               # Backend application logic
└── shared/
    ├── types.ts                # Shared TypeScript contracts
    └── ui/                     # Shared presentational UI components
infra/
└── aws/
    ├── README.md               # AWS deployment/config docs
    └── lambda/orchestrator/    # AWS Lambda handler for Jaseci proxy
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
| `feat/camera-capture` | `features/camera/*`, `repair/new/page.tsx` |
| `feat/repair-walkthrough` | `features/repair/*`, `repair/[sessionId]/page.tsx` |
| `feat/voice` | `features/voice/*`, `api/speak/route.ts`, `server/clients/elevenlabs.ts` |
| `feat/vision-identify` | `server/clients/gemini.ts`, `api/identify/route.ts`, `api/upload/route.ts` |
| `feat/llm-steps` | `server/clients/featherless.ts`, `api/repair-step/route.ts` |
| `feat/session-aws` | `server/clients/aws/*`, `api/session/` routes |
| `feat/jaseci-orchestration` | `server/clients/jaseci.ts`, `api/orchestrate/route.ts`, `infra/aws/lambda/` |

**Start with `src/shared/types.ts`** — all teammates share these interfaces.

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

See [infra/aws/README.md](infra/aws/README.md) for DynamoDB schema, Lambda setup, S3 CORS config, and IAM permissions.
