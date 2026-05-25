export function loadAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.GATEWAY_ALLOWED_ORIGINS;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return ['http://localhost:3000'];
}
