export function getAllowedOrigins(): string[] {
  const fromEnv = process.env['ALLOWED_ORIGINS'];
  return fromEnv
    ? fromEnv.split(',').map((origin) => origin.trim())
    : ['http://localhost:4200', 'http://localhost:4000'];
}
