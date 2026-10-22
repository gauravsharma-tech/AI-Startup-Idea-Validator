/**
 * Stub gate-identity server module.
 *
 * The original implementation was coupled to the Grok platform's sandbox
 * header injection (`x-grok-identity`). Since this project runs standalone,
 * gate identity is disabled. All exports are kept so the rest of the auth
 * system compiles without changes.
 */

export const GATE_IDENTITY_HEADER = "x-idea-identity";
export const GATE_JWKS_PATH = "/__gate/identity-key";

export type GateIdentity = {
  sub: string;
  email: string | null;
  name: string | null;
  teamId: string | null;
};

export type GateLinkedAccount = { providerId: string; accountId: string };

/** Always disabled in the standalone build. */
export function gateIdentityEnabled(): boolean {
  return false;
}

/** No-op: returns null since gate identity is disabled. */
export async function gateIdentityFromHeaders(
  _headers: Headers,
): Promise<GateIdentity | null> {
  return null;
}

/** Returns false since no accounts can be gate-bound in standalone mode. */
export function sessionBoundToGateIdentity(
  _accounts: readonly GateLinkedAccount[],
  _identitySub: string,
  _gateProviderId: string,
): boolean {
  return false;
}
