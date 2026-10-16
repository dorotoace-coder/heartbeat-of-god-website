export const BROADCAST_PLATFORMS = Object.freeze([
  "telegram",
  "facebook",
  "instagram",
  "twitter",
  "whatsapp",
]);

const PLATFORM_SET = new Set(BROADCAST_PLATFORMS);
const DEFAULT_IMAGE_HOSTS = Object.freeze([
  "heartbeatofgod.ca",
  "www.heartbeatofgod.ca",
]);

const REQUIRED_ENV = Object.freeze({
  telegram: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
  facebook: ["FACEBOOK_PAGE_TOKEN", "FACEBOOK_PAGE_ID"],
  instagram: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ID"],
  twitter: [
    "TWITTER_API_KEY",
    "TWITTER_API_SECRET",
    "TWITTER_ACCESS_TOKEN",
    "TWITTER_ACCESS_SECRET",
  ],
  whatsapp: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_BROADCAST_NUMBERS"],
});

function failure(status, errorCode) {
  return { ok: false, status, errorCode };
}

export function parseBearerToken(header) {
  if (typeof header !== "string") return null;
  const match = header.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] || null;
}

export function allowedImageHosts(configuredHosts = "") {
  return new Set([
    ...DEFAULT_IMAGE_HOSTS,
    ...String(configuredHosts)
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  ]);
}

export function parseBroadcastPayload(input, imageHosts = allowedImageHosts()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure(400, "INVALID_REQUEST");
  }

  const keys = Object.keys(input);
  if (keys.some((key) => !["message", "imageUrl", "platforms"].includes(key))) {
    return failure(400, "INVALID_REQUEST");
  }

  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!message || message.length > 5000) {
    return failure(400, "INVALID_MESSAGE");
  }

  if (!Array.isArray(input.platforms) || input.platforms.length === 0) {
    return failure(400, "INVALID_PLATFORMS");
  }

  if (input.platforms.some((platform) => typeof platform !== "string" || !PLATFORM_SET.has(platform))) {
    return failure(400, "INVALID_PLATFORMS");
  }

  const platforms = [...new Set(input.platforms)];
  if (platforms.includes("twitter") && message.length > 280) {
    return failure(400, "TWITTER_MESSAGE_TOO_LONG");
  }

  let imageUrl;
  if (input.imageUrl !== undefined && input.imageUrl !== null && input.imageUrl !== "") {
    if (typeof input.imageUrl !== "string") return failure(400, "INVALID_IMAGE_URL");
    try {
      const parsed = new URL(input.imageUrl);
      if (
        parsed.protocol !== "https:" ||
        parsed.username ||
        parsed.password ||
        parsed.port ||
        parsed.hash ||
        !imageHosts.has(parsed.hostname.toLowerCase())
      ) {
        return failure(400, "INVALID_IMAGE_URL");
      }
      imageUrl = parsed.toString();
    } catch {
      return failure(400, "INVALID_IMAGE_URL");
    }
  }

  if (platforms.includes("instagram") && !imageUrl) {
    return failure(400, "INSTAGRAM_IMAGE_REQUIRED");
  }

  return { ok: true, value: { message, imageUrl, platforms } };
}

export function unavailablePlatforms(platforms, env) {
  return platforms.filter((platform) => {
    const keys = REQUIRED_ENV[platform];
    return keys.some((key) => {
      const value = env[key];
      if (typeof value !== "string" || !value.trim()) return true;
      if (key === "WHATSAPP_BROADCAST_NUMBERS") {
        return !value.split(",").some((number) => number.trim());
      }
      return false;
    });
  });
}

export function createFixedWindowRateLimiter({ limit = 3, windowMs = 10 * 60 * 1000, now = Date.now } = {}) {
  const buckets = new Map();

  return {
    check(key) {
      const currentTime = now();
      const current = buckets.get(key);
      if (!current || current.resetAt <= currentTime) {
        buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      if (current.count >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000)),
        };
      }
      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

export async function handleBroadcastRequest({
  enabled,
  authorizationHeader,
  body,
  authorize,
  env,
  limiter,
  senders,
  imageHosts,
}) {
  if (!enabled) return failure(503, "BROADCASTS_DISABLED");

  const token = parseBearerToken(authorizationHeader);
  if (!token) return failure(401, "UNAUTHORIZED");

  let authorization;
  try {
    authorization = await authorize(token);
  } catch {
    return failure(503, "AUTHORIZATION_UNAVAILABLE");
  }
  if (!authorization?.ok) {
    return failure(authorization?.status || 403, authorization?.errorCode || "FORBIDDEN");
  }

  const payload = parseBroadcastPayload(body, imageHosts);
  if (!payload.ok) return payload;

  const unavailable = unavailablePlatforms(payload.value.platforms, env);
  if (unavailable.length > 0) {
    return {
      ...failure(503, "PROVIDER_NOT_CONFIGURED"),
      unavailablePlatforms: unavailable,
    };
  }

  const rate = limiter.check(authorization.userId);
  if (!rate.allowed) {
    return {
      ...failure(429, "RATE_LIMITED"),
      retryAfterSeconds: rate.retryAfterSeconds,
    };
  }

  const results = await Promise.all(payload.value.platforms.map(async (platform) => {
    try {
      const result = await senders[platform](payload.value.message, payload.value.imageUrl);
      return {
        platform,
        ok: result?.ok === true,
        ...(result?.ok === true ? {} : { errorCode: "PROVIDER_REJECTED" }),
      };
    } catch {
      return { platform, ok: false, errorCode: "PROVIDER_UNAVAILABLE" };
    }
  }));

  const success = results.every((result) => result.ok);
  return { ok: true, status: success ? 200 : 207, body: { success, results } };
}
