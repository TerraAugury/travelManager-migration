export function sendError(reply, code, message) {
  reply.code(code);
  return { error: message };
}

