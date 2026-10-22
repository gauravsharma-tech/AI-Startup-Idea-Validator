/**
 * Gate Identity Sessions — Standalone no-op plugin.
 *
 * The original implementation auto-signed viewers in using a JWT injected by
 * the Grok platform's sandbox proxy (`x-grok-identity` header). Since this
 * project runs as a standalone app with no platform proxy, the gate session
 * system is replaced with a harmless no-op Better Auth plugin.
 *
 * Auth still works fully via email/password and the 1-click Demo Login.
 */
import type { BetterAuthPlugin } from "better-auth";

/** Provider id kept as a stable string so existing DB rows remain valid. */
export const GATE_PROVIDER_ID = "idea-gate";

/**
 * Returns a no-op Better Auth plugin.
 * No Grok-platform headers, no external JWT verification, no sandbox dependency.
 */
export function gateIdentitySessions(): BetterAuthPlugin {
  return {
    id: "idea-gate-identity",
    // No hooks needed — gate identity is not active in standalone mode.
  };
}
