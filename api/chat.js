import { defaultChatDeps, handleChat } from "./_lib/chat/handler.js";

/** POST /api/chat: Bit and Byte answer questions from data.js. See api/_lib/chat/handler.js. */
export const POST = (request) => handleChat(request, defaultChatDeps());
