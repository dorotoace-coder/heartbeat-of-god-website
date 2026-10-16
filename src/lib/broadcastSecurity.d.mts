export type BroadcastPlatform = "telegram" | "facebook" | "instagram" | "twitter" | "whatsapp";

export interface BroadcastPayload {
  message: string;
  imageUrl?: string;
  platforms: BroadcastPlatform[];
}

export interface BroadcastFailure {
  ok: false;
  status: number;
  errorCode: string;
  retryAfterSeconds?: number;
  unavailablePlatforms?: BroadcastPlatform[];
}

export interface BroadcastSuccess {
  ok: true;
  status: number;
  body: {
    success: boolean;
    results: Array<{ platform: BroadcastPlatform; ok: boolean; errorCode?: string }>;
  };
}

export const BROADCAST_PLATFORMS: readonly BroadcastPlatform[];
export function parseBearerToken(header: unknown): string | null;
export function allowedImageHosts(configuredHosts?: string): Set<string>;
export function parseBroadcastPayload(
  input: unknown,
  imageHosts?: Set<string>,
): { ok: true; value: BroadcastPayload } | BroadcastFailure;
export function unavailablePlatforms(platforms: BroadcastPlatform[], env: Record<string, string | undefined>): BroadcastPlatform[];
export function createFixedWindowRateLimiter(options?: {
  limit?: number;
  windowMs?: number;
  now?: () => number;
}): { check(key: string): { allowed: boolean; retryAfterSeconds: number } };
export function handleBroadcastRequest(options: {
  enabled: boolean;
  authorizationHeader: string | null;
  body: unknown;
  authorize: (token: string) => Promise<
    | { ok: true; userId: string }
    | { ok: false; status: number; errorCode: string }
  >;
  env: Record<string, string | undefined>;
  limiter: { check(key: string): { allowed: boolean; retryAfterSeconds: number } };
  senders: Record<BroadcastPlatform, (message: string, imageUrl?: string) => Promise<{ ok?: boolean }>>;
  imageHosts: Set<string>;
}): Promise<BroadcastSuccess | BroadcastFailure>;
