// feat/voice — demo data for voice loop test
// These mock steps stand in for Jaseci graph nodes until JASECI_LAMBDA_URL is wired up.
// The test page will swap triggerRepairGraph() in once the Lambda is live.

export interface RepairStep {
  id: number;
  instruction: string; // spoken by ElevenLabs
  hint?: string;        // shown on screen only
}

export const MOCK_STEPS: RepairStep[] = [
  {
    id: 1,
    instruction:
      "I see you're working on a basic floor lamp. First, let's check the socket tab. Use a screwdriver to pull it up slightly. Tell me when you're done.",
    hint: "The socket tab is the small metal piece inside the bulb socket. It should be slightly raised to make good contact.",
  },
  {
    id: 2,
    instruction:
      "Good. Now remove the bulb and inspect it. Look for a dark spot or broken filament inside the glass. Tell me when you're done.",
    hint: "A healthy incandescent bulb has an intact thin wire filament. A dark spot or snapped filament means it's blown.",
  },
  {
    id: 3,
    instruction:
      "Check the power cord for any visible damage — fraying, cuts, or burn marks near the plug. Tell me when you're done.",
    hint: "Run your fingers gently along the full cord. Pay extra attention to where it enters the lamp base.",
  },
  {
    id: 4,
    instruction:
      "Last check — test the outlet by plugging in another device. Tell me when you're done.",
    hint: "If the other device also doesn't work, the outlet is the problem, not the lamp.",
  },
  {
    id: 5,
    instruction:
      "Great work! You've completed all diagnostic steps. If the lamp still doesn't work, the internal wiring may need replacing — that's a job for a licensed electrician.",
  },
];

export const HELP_TEXT =
  "Say 'done' or 'next' to move to the next step, 'repeat' to hear the current step again, or ask me any question about what you're doing.";
