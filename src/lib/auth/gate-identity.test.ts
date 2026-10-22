import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  gateIdentityEnabled,
  gateIdentityFromHeaders,
  sessionBoundToGateIdentity,
  GATE_IDENTITY_HEADER,
  GATE_JWKS_PATH,
} from "./gate-identity.server.ts";

describe("gate-identity standalone behavior", () => {
  it("has gate identity disabled in standalone mode", () => {
    assert.equal(gateIdentityEnabled(), false);
  });

  it("returns null when extracting gate identity from headers", async () => {
    const headers = new Headers({
      [GATE_IDENTITY_HEADER]: "test-token",
    });
    const identity = await gateIdentityFromHeaders(headers);
    assert.equal(identity, null);
  });

  it("returns false for sessionBoundToGateIdentity in standalone mode", () => {
    const bound = sessionBoundToGateIdentity([], "sub-123", "idea-gate");
    assert.equal(bound, false);
  });

  it("exposes expected constants", () => {
    assert.equal(GATE_IDENTITY_HEADER, "x-idea-identity");
    assert.equal(GATE_JWKS_PATH, "/__gate/identity-key");
  });
});
