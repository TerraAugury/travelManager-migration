export function sendError(c, code, message) {
  return c.json({ error: message }, code);
}

