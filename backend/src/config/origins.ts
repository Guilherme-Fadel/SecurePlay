const LOCAL_ORIGIN = 'http://localhost:5173';

export function getAllowedOrigins(value = process.env.CORS_ORIGIN): string[] {
  const origins = (value ?? LOCAL_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : [LOCAL_ORIGIN];
}

export function isAllowedOrigin(
  origin: string | undefined,
  allowedOrigins = getAllowedOrigins(),
): boolean {
  return Boolean(origin && allowedOrigins.includes(origin));
}

const LOCAL_HOST_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isLocalOrigin(origin: string | undefined): boolean {
  return Boolean(origin && LOCAL_HOST_REGEX.test(origin));
}

export function isDevEnvironment(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv !== 'production';
}
