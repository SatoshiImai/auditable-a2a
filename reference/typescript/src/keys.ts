// §10.2: a key's a-MCP identifier (`key_id`, `host_key_id`) is the JWKS URL, `#`, and the JWK's `kid`.
// The URL carries no fragment (§3.1, §7.1), so the first `#` separates the two.
export function keyIdOf(jwksUrl: string, kid: string): string {
  if (jwksUrl.includes('#')) throw new Error('a JWKS URL carries no fragment (§10.2)');
  return `${jwksUrl}#${kid}`;
}
