import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedImageHosts,
  createFixedWindowRateLimiter,
  handleBroadcastRequest,
  parseBearerToken,
  parseBroadcastPayload,
} from "../src/lib/broadcastSecurity.mjs";

const COMPLETE_ENV = {
  TELEGRAM_BOT_TOKEN: "test-token",
  TELEGRAM_CHAT_ID: "test-chat",
  FACEBOOK_PAGE_TOKEN: "test-token",
  FACEBOOK_PAGE_ID: "test-page",
  INSTAGRAM_ACCESS_TOKEN: "test-token",
  INSTAGRAM_BUSINESS_ID: "test-account",
  TWITTER_API_KEY: "test-key",
  TWITTER_API_SECRET: "test-secret",
  TWITTER_ACCESS_TOKEN: "test-token",
  TWITTER_ACCESS_SECRET: "test-secret",
  WHATSAPP_ACCESS_TOKEN: "test-token",
  WHATSAPP_PHONE_NUMBER_ID: "test-phone",
  WHATSAPP_BROADCAST_NUMBERS: "15550000000",
};

function fixture(overrides = {}) {
  const calls = [];
  const senders = Object.fromEntries(
    ["telegram", "facebook", "instagram", "twitter", "whatsapp"].map((platform) => [
      platform,
      async () => {
        calls.push(platform);
        return { ok: true, data: { secretProviderPayload: true } };
      },
    ]),
  );

  return {
    calls,
    options: {
      enabled: true,
      authorizationHeader: "Bearer valid-test-token",
      body: { message: "Approved announcement", platforms: ["telegram"] },
      authorize: async () => ({ ok: true, userId: "staff-user" }),
      env: { ...COMPLETE_ENV },
      limiter: createFixedWindowRateLimiter(),
      senders,
      imageHosts: allowedImageHosts(),
      ...overrides,
    },
  };
}

test("bearer parsing rejects missing, malformed, and whitespace-bearing tokens", () => {
  assert.equal(parseBearerToken(null), null);
  assert.equal(parseBearerToken("Basic abc"), null);
  assert.equal(parseBearerToken("Bearer two tokens"), null);
  assert.equal(parseBearerToken("Bearer valid-token"), "valid-token");
});

test("payload validation rejects unknown platforms, oversized X posts, and unsafe image URLs", () => {
  assert.equal(parseBroadcastPayload({ message: "x", platforms: ["unknown"] }).errorCode, "INVALID_PLATFORMS");
  assert.equal(parseBroadcastPayload({ message: "x".repeat(281), platforms: ["twitter"] }).errorCode, "TWITTER_MESSAGE_TOO_LONG");
  assert.equal(parseBroadcastPayload({
    message: "x",
    imageUrl: "http://heartbeatofgod.ca/image.jpg",
    platforms: ["telegram"],
  }).errorCode, "INVALID_IMAGE_URL");
  assert.equal(parseBroadcastPayload({
    message: "x",
    imageUrl: "https://attacker.example/image.jpg",
    platforms: ["telegram"],
  }).errorCode, "INVALID_IMAGE_URL");
  assert.equal(parseBroadcastPayload({ message: "x", platforms: ["instagram"] }).errorCode, "INSTAGRAM_IMAGE_REQUIRED");
});

test("disabled broadcasting fails before authorization or provider calls", async () => {
  let authorizeCalls = 0;
  const { calls, options } = fixture({
    enabled: false,
    authorize: async () => {
      authorizeCalls += 1;
      return { ok: true, userId: "staff-user" };
    },
  });
  const result = await handleBroadcastRequest(options);
  assert.deepEqual(result, { ok: false, status: 503, errorCode: "BROADCASTS_DISABLED" });
  assert.equal(authorizeCalls, 0);
  assert.deepEqual(calls, []);
});

test("missing authentication fails before authorization or provider calls", async () => {
  let authorizeCalls = 0;
  const { calls, options } = fixture({
    authorizationHeader: null,
    authorize: async () => {
      authorizeCalls += 1;
      return { ok: true, userId: "staff-user" };
    },
  });
  const result = await handleBroadcastRequest(options);
  assert.equal(result.status, 401);
  assert.equal(authorizeCalls, 0);
  assert.deepEqual(calls, []);
});

test("non-staff authorization fails before provider calls", async () => {
  const { calls, options } = fixture({
    authorize: async () => ({ ok: false, status: 403, errorCode: "FORBIDDEN" }),
  });
  const result = await handleBroadcastRequest(options);
  assert.equal(result.status, 403);
  assert.deepEqual(calls, []);
});

test("invalid payload and missing credentials each produce zero provider calls", async () => {
  const invalid = fixture({ body: { message: "", platforms: ["telegram"] } });
  assert.equal((await handleBroadcastRequest(invalid.options)).status, 400);
  assert.deepEqual(invalid.calls, []);

  const missing = fixture({ env: { ...COMPLETE_ENV, TELEGRAM_BOT_TOKEN: "" } });
  const result = await handleBroadcastRequest(missing.options);
  assert.equal(result.status, 503);
  assert.deepEqual(result.unavailablePlatforms, ["telegram"]);
  assert.deepEqual(missing.calls, []);
});

test("rate limiting blocks provider calls and returns a retry interval", async () => {
  let now = 1000;
  const limiter = createFixedWindowRateLimiter({ limit: 1, windowMs: 10_000, now: () => now });
  const first = fixture({ limiter });
  assert.equal((await handleBroadcastRequest(first.options)).status, 200);
  assert.deepEqual(first.calls, ["telegram"]);

  const second = fixture({ limiter });
  const blocked = await handleBroadcastRequest(second.options);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.retryAfterSeconds, 10);
  assert.deepEqual(second.calls, []);

  now = 11_000;
  const reset = fixture({ limiter });
  assert.equal((await handleBroadcastRequest(reset.options)).status, 200);
});

test("valid requests call each deduplicated selected sender once and sanitize results", async () => {
  const { calls, options } = fixture({
    body: { message: "Approved", platforms: ["telegram", "facebook", "telegram"] },
  });
  const result = await handleBroadcastRequest(options);
  assert.equal(result.status, 200);
  assert.deepEqual(calls, ["telegram", "facebook"]);
  assert.deepEqual(result.body, {
    success: true,
    results: [
      { platform: "telegram", ok: true },
      { platform: "facebook", ok: true },
    ],
  });
  assert.equal(JSON.stringify(result).includes("secretProviderPayload"), false);
});

test("provider rejection and thrown errors are sanitized and never retried", async () => {
  let telegramCalls = 0;
  let facebookCalls = 0;
  const { options } = fixture({
    body: { message: "Approved", platforms: ["telegram", "facebook"] },
    senders: {
      telegram: async () => {
        telegramCalls += 1;
        return { ok: false, data: { providerSecret: "do-not-return" } };
      },
      facebook: async () => {
        facebookCalls += 1;
        throw new Error("provider response with sensitive details");
      },
    },
  });
  const result = await handleBroadcastRequest(options);
  assert.equal(result.status, 207);
  assert.equal(telegramCalls, 1);
  assert.equal(facebookCalls, 1);
  assert.deepEqual(result.body.results, [
    { platform: "telegram", ok: false, errorCode: "PROVIDER_REJECTED" },
    { platform: "facebook", ok: false, errorCode: "PROVIDER_UNAVAILABLE" },
  ]);
  assert.equal(JSON.stringify(result).includes("sensitive"), false);
  assert.equal(JSON.stringify(result).includes("providerSecret"), false);
});
