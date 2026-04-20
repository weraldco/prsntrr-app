import type { Server } from "socket.io";
import { upstashRedisUrl } from "../config/redis.js";

export async function attachRedisAdapterIfConfigured(io: Server): Promise<void> {
  if (!upstashRedisUrl) {
    console.log("Socket.io: in-memory adapter (set UPSTASH_REDIS_URL for multi-instance)");
    return;
  }
  const { createClient } = await import("redis");
  const { createAdapter } = await import("@socket.io/redis-adapter");
  const pubClient = createClient({ url: upstashRedisUrl });
  const subClient = pubClient.duplicate();
  const errors = (label: string) => (err: Error) => {
    console.error(`Redis ${label}:`, err.message);
  };
  pubClient.on("error", errors("pub"));
  subClient.on("error", errors("sub"));
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Socket.io: @socket.io/redis-adapter enabled");
}
