
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [type, token] = authHeader.split(' ');
  return type === 'Bearer' && token ? token : null;
}

export function calcTokenTtl(exp: number): number {
  return exp - Math.floor(Date.now() / 1000);
}
