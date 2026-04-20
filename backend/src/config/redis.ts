/**
 * Optional Upstash Redis URL for Socket.io `@socket.io/redis-adapter` (horizontal scale).
 * Use the full connection string from the Upstash console (often `rediss://` for TLS).
 * When unset, Socket.io uses the default in-memory adapter (single Node process only).
 */
export const upstashRedisUrl = process.env.UPSTASH_REDIS_URL ?? null;
