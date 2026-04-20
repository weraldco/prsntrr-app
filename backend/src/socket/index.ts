import type { Server } from "socket.io";
import { registerJoinHandler } from "./handlers/join-handler.js";
import { registerSlideHandler } from "./handlers/slide-handler.js";
import { registerSessionLifecycleHandler } from "./handlers/session-lifecycle-handler.js";
import { registerControlHandlers } from "./handlers/control-handler.js";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    registerJoinHandler(io, socket);
    registerSlideHandler(io, socket);
    registerSessionLifecycleHandler(io, socket);
    registerControlHandlers(io, socket);
  });
}
