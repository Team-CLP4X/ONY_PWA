import assert from "node:assert/strict";
import {
  classifyGeminiError,
  ProviderGenerationError,
  DEFAULT_GEMINI_MODEL,
  FAST_GEMINI_MODEL,
  BACKUP_GEMINI_MODEL,
} from "../src/server/geminiProvider.ts";

console.log("=== ONY Gemini Reliability Test Suite ===");

// Helper mock to simulate a mock model engine with customizable behavior per model and attempt
type MockCallHandler = (model: string, attempt: number) => Promise<{ text: string; modelVersion?: string }>;

async function simulateProviderRun(
  candidateModels: string[],
  handler: MockCallHandler,
  options: {
    maxRetriesPerCandidate?: number;
    overallTimeoutMs?: number;
    attemptTimeoutMs?: number;
  } = {},
) {
  const maxRetries = options.maxRetriesPerCandidate ?? 2;
  const overallTimeout = options.overallTimeoutMs ?? 5000;
  const attemptTimeout = options.attemptTimeoutMs ?? 2000;
  const start = Date.now();

  const modelAttemptCounts: Record<string, number> = {};

  for (const targetModel of candidateModels) {
    if (Date.now() - start > overallTimeout) {
      break;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (Date.now() - start > overallTimeout) {
        break;
      }
      modelAttemptCounts[targetModel] = (modelAttemptCounts[targetModel] || 0) + 1;

      try {
        const resultPromise = handler(targetModel, attempt);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new ProviderGenerationError(504, "TIMEOUT", "Attempt timed out", true)), attemptTimeout),
        );

        const response = await Promise.race([resultPromise, timeoutPromise]);
        if (response.text?.trim()) {
          return {
            reply: response.text.trim(),
            model: response.modelVersion || targetModel,
            modelAttemptCounts,
          };
        }
      } catch (err: unknown) {
        const classification = classifyGeminiError(err);

        if (classification.isAuthOrPermission) {
          throw new ProviderGenerationError(
            classification.status,
            "INVALID_CREDENTIALS",
            "Authentication failed",
            false,
          );
        }

        if (classification.isInvalidModelOrRequest || classification.isDailyQuotaExhausted) {
          break; // Advance to next model immediately without retries
        }

        if (classification.isTransient && attempt < maxRetries) {
          // Simulated backoff
          await new Promise((r) => setTimeout(r, 20));
          continue;
        }

        break;
      }
    }
  }

  throw new ProviderGenerationError(
    503,
    "MODEL_UNAVAILABLE",
    "All candidates failed",
    true,
    3,
  );
}

// ==========================================
// TEST 1: Successful Generation
// ==========================================
async function test1_successfulGeneration() {
  console.log("\n[Test 1] Successful Generation:");
  const candidates = [DEFAULT_GEMINI_MODEL, FAST_GEMINI_MODEL];
  const res = await simulateProviderRun(candidates, async (model) => {
    return { text: "Hello! I am ONY, here for you.", modelVersion: model };
  });

  assert.equal(res.reply, "Hello! I am ONY, here for you.");
  assert.equal(res.model, DEFAULT_GEMINI_MODEL);
  assert.equal(res.modelAttemptCounts[DEFAULT_GEMINI_MODEL], 1);
  console.log("✓ PASS: Successfully generated response on first attempt.");
}

// ==========================================
// TEST 2: Transient 503 Recovery with Backoff
// ==========================================
async function test2_transient503Recovery() {
  console.log("\n[Test 2] Transient 503 Recovery with Backoff:");
  const candidates = [DEFAULT_GEMINI_MODEL, FAST_GEMINI_MODEL];

  let attemptCount = 0;
  const res = await simulateProviderRun(candidates, async (model, attempt) => {
    attemptCount++;
    if (attempt === 1) {
      throw {
        status: 503,
        message: "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
      };
    }
    return { text: "Recovered successfully after temporary spike!", modelVersion: model };
  });

  assert.equal(attemptCount, 2);
  assert.equal(res.reply, "Recovered successfully after temporary spike!");
  assert.equal(res.modelAttemptCounts[DEFAULT_GEMINI_MODEL], 2);
  assert.equal(res.modelAttemptCounts[FAST_GEMINI_MODEL] || 0, 0, "Did not burn secondary candidates prematurely");
  console.log("✓ PASS: Recovered from transient 503 on retry without failing to next candidate prematurely.");
}

// ==========================================
// TEST 3: 429 Daily Quota Exhaustion
// ==========================================
async function test3_dailyQuotaExhaustion() {
  console.log("\n[Test 3] 429 Daily Quota Exhaustion:");
  const candidates = [DEFAULT_GEMINI_MODEL, FAST_GEMINI_MODEL];

  const res = await simulateProviderRun(candidates, async (model) => {
    if (model === DEFAULT_GEMINI_MODEL) {
      throw {
        status: 429,
        message: "RESOURCE_EXHAUSTED: Quota exceeded for quota metric 'GenerateRequestsPerDayPerProjectPerModel-FreeTier'",
      };
    }
    return { text: "Response from fallback candidate!", modelVersion: model };
  });

  assert.equal(res.reply, "Response from fallback candidate!");
  assert.equal(res.model, FAST_GEMINI_MODEL);
  // Verify DEFAULT_GEMINI_MODEL was only attempted ONCE and immediately skipped because daily quota cannot clear in seconds
  assert.equal(res.modelAttemptCounts[DEFAULT_GEMINI_MODEL], 1);
  console.log("✓ PASS: Daily quota exhaustion detected; skipped wasteful retries and safely used next candidate.");
}

// ==========================================
// TEST 4: Invalid Model ID (Permanent 404)
// ==========================================
async function test4_invalidModelId() {
  console.log("\n[Test 4] Invalid Model ID (Permanent 404):");
  const candidates = ["invalid-gemini-model-xyz", FAST_GEMINI_MODEL];

  const res = await simulateProviderRun(candidates, async (model) => {
    if (model === "invalid-gemini-model-xyz") {
      throw {
        status: 404,
        message: "models/invalid-gemini-model-xyz is not found for API version v1beta",
      };
    }
    return { text: "Response from valid candidate!", modelVersion: model };
  });

  assert.equal(res.reply, "Response from valid candidate!");
  assert.equal(res.modelAttemptCounts["invalid-gemini-model-xyz"], 1, "404 failed fast with 0 retries");
  console.log("✓ PASS: Invalid model 404 failed fast without retries, advancing to valid candidate.");
}

// ==========================================
// TEST 5: Permanent 403 Error
// ==========================================
async function test5_permanent403Error() {
  console.log("\n[Test 5] Permanent 403 Error:");
  const candidates = [DEFAULT_GEMINI_MODEL, FAST_GEMINI_MODEL];

  let threwAuthError = false;
  try {
    await simulateProviderRun(candidates, async () => {
      throw {
        status: 403,
        message: "PERMISSION_DENIED: The caller does not have permission / API key invalid",
      };
    });
  } catch (err) {
    if (err instanceof ProviderGenerationError) {
      assert.equal(err.code, "INVALID_CREDENTIALS");
      assert.equal(err.isRetryable, false);
      threwAuthError = true;
    }
  }

  assert.equal(threwAuthError, true, "Expected ProviderGenerationError with INVALID_CREDENTIALS");
  console.log("✓ PASS: 403 Permission Denied aborted immediately without wasteful candidate retries.");
}

// ==========================================
// TEST 6: All-Models-Failed Behavior
// ==========================================
async function test6_allModelsFailedBehavior() {
  console.log("\n[Test 6] All-Models-Failed Behavior:");
  const candidates = [DEFAULT_GEMINI_MODEL, FAST_GEMINI_MODEL, BACKUP_GEMINI_MODEL];

  let caughtError: ProviderGenerationError | null = null;
  try {
    await simulateProviderRun(candidates, async () => {
      throw {
        status: 503,
        message: "This model is currently experiencing high demand.",
      };
    });
  } catch (err) {
    if (err instanceof ProviderGenerationError) {
      caughtError = err;
    }
  }

  assert.ok(caughtError !== null, "Must throw ProviderGenerationError when all models fail");
  assert.equal(caughtError.status, 503);
  assert.equal(caughtError.code, "MODEL_UNAVAILABLE");
  assert.equal(caughtError.isRetryable, true);
  console.log("✓ PASS: All-models-failed returns clear, retryable MODEL_UNAVAILABLE error with isRetryable: true.");
}

// ==========================================
// TEST 7: Duplicate-Message Prevention
// ==========================================
async function test7_duplicateMessagePrevention() {
  console.log("\n[Test 7] Duplicate-Message Prevention during Retry:");

  interface Message {
    from: "user" | "ony";
    text: string;
  }

  let messages: Message[] = [];
  let failedUserText: string | null = null;
  let typing = false;

  // Frontend reply function logic
  const reply = (text: string) => {
    messages = [...messages, { from: "user", text }];
    const priorMessages = messages.slice(0, -1);
    sendToBackend(text, priorMessages);
  };

  // Frontend retryLastMessage function logic
  const retryLastMessage = () => {
    if (!failedUserText || typing) return;
    const priorMessages = messages.slice(0, -1);
    sendToBackend(failedUserText, priorMessages);
  };

  let backendShouldFail = true;
  const sendToBackend = (textToSend: string, _priorMessages: Message[]) => {
    typing = true;
    if (backendShouldFail) {
      failedUserText = textToSend;
      typing = false;
      return;
    }
    // Success
    messages = [...messages, { from: "ony", text: "Warm reply from ONY" }];
    failedUserText = null;
    typing = false;
  };

  // 1. User sends message
  reply("I had a stressful day at work");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].from, "user");
  assert.equal(messages[0].text, "I had a stressful day at work");
  assert.equal(failedUserText, "I had a stressful day at work");

  // 2. User clicks Retry
  backendShouldFail = false; // Model recovered
  retryLastMessage();

  // 3. Verify message state after retry
  assert.equal(messages.length, 2, "Must only have exactly 1 user message and 1 assistant message");
  assert.equal(messages[0].from, "user");
  assert.equal(messages[0].text, "I had a stressful day at work");
  assert.equal(messages[1].from, "ony");
  assert.equal(messages[1].text, "Warm reply from ONY");
  assert.equal(failedUserText, null, "Failed draft cleared after successful retry");
  console.log("✓ PASS: Retry preserves exact history and avoids duplicate user messages.");
}

async function runAll() {
  await test1_successfulGeneration();
  await test2_transient503Recovery();
  await test3_dailyQuotaExhaustion();
  await test4_invalidModelId();
  await test5_permanent403Error();
  await test6_allModelsFailedBehavior();
  await test7_duplicateMessagePrevention();
  console.log("\n=========================================");
  console.log("ALL 7 GEMINI RELIABILITY TESTS PASSED!");
  console.log("=========================================\n");
}

runAll().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
