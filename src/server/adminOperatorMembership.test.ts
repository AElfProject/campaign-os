import { describe, expect, it } from "vitest";
import {
  createAdminOperatorMembershipRegistry,
  type AdminOperatorMembershipRegistryConfig,
} from "./adminOperatorMembership";
import { CAMPAIGN_OS_CAMPAIGN_ID_MAX_LENGTH } from "./config";

const membership = (
  overrides: Partial<AdminOperatorMembershipRegistryConfig["memberships"][number]> = {},
): AdminOperatorMembershipRegistryConfig["memberships"][number] => ({
  active: true,
  campaignIds: ["campaign-admin-a"],
  roleIds: ["review_operator"],
  subjectAddress: "2YVwAdminOperatorCaseSensitive",
  ...overrides,
});

const registry = (
  memberships: AdminOperatorMembershipRegistryConfig["memberships"] = [membership()],
  enabled = true,
) => createAdminOperatorMembershipRegistry({
  enabled,
  memberships,
  sourceRevision: "admin-membership-sha256:0123456789abcdef".padEnd(89, "0"),
});

describe("Admin operator membership registry", () => {
  it("uses trimmed exact subject identity without case folding", () => {
    const subjectAddress = "2YVwAdminOperatorCaseSensitive";
    const current = registry();

    expect(current.lookup({
      campaignId: "campaign-admin-a",
      requestedRole: "review_operator",
      subjectAddress: `  ${subjectAddress}  `,
    })).toMatchObject({
      authorized: true,
      context: { subjectAddress },
    });

    for (const variant of [subjectAddress.toLowerCase(), subjectAddress.toUpperCase()]) {
      expect(current.lookup({
        campaignId: "campaign-admin-a",
        requestedRole: "review_operator",
        subjectAddress: variant,
      })).toEqual({ authorized: false, reason: "not-member" });
    }
  });

  it("requires an exact configured role and never maps ordinary roles", () => {
    const current = registry();

    expect(current.lookup({
      campaignId: "campaign-admin-a",
      requestedRole: "internal_operator",
      subjectAddress: "2YVwAdminOperatorCaseSensitive",
    })).toEqual({ authorized: false, reason: "role-mismatch" });
    expect(current.lookup({
      campaignId: "campaign-admin-a",
      requestedRole: "participant",
      subjectAddress: "2YVwAdminOperatorCaseSensitive",
    })).toEqual({ authorized: false, reason: "role-mismatch" });
  });

  it("distinguishes Campaign scope, no scope, and explicit global scope", () => {
    const scoped = registry();
    const noScope = registry([membership({ campaignIds: [] })]);
    const global = registry([membership({ campaignIds: null })]);
    const request = {
      campaignId: "campaign-admin-b",
      requestedRole: "review_operator",
      subjectAddress: "2YVwAdminOperatorCaseSensitive",
    };

    expect(scoped.lookup(request)).toEqual({ authorized: false, reason: "out-of-scope" });
    expect(noScope.lookup(request)).toEqual({ authorized: false, reason: "out-of-scope" });
    expect(global.lookup(request)).toMatchObject({ authorized: true });
    expect(scoped.lookup({ ...request, campaignId: undefined })).toMatchObject({
      authorized: true,
      context: { campaignIds: ["campaign-admin-a"] },
    });
  });

  it("enforces the canonical Campaign ID boundary for scoped and global membership", () => {
    const atLimit = "c".repeat(CAMPAIGN_OS_CAMPAIGN_ID_MAX_LENGTH);
    const overLimit = `${atLimit}x`;
    const request = {
      requestedRole: "review_operator",
      subjectAddress: "2YVwAdminOperatorCaseSensitive",
    };

    expect(registry([membership({ campaignIds: [atLimit] })]).lookup({
      ...request,
      campaignId: atLimit,
    })).toMatchObject({ authorized: true });

    for (const current of [
      registry([membership({ campaignIds: [atLimit] })]),
      registry([membership({ campaignIds: null })]),
    ]) {
      expect(current.lookup({ ...request, campaignId: overLimit })).toEqual({
        authorized: false,
        reason: "out-of-scope",
      });
    }

    expect(() => registry([membership({ campaignIds: [overLimit] })])).toThrowError(
      expect.objectContaining({
        code: "ADMIN_MEMBERSHIP_REGISTRY_INVALID",
        field: "memberships",
      }),
    );
  });

  it("denies revoked entries and applies a new registry revision immediately", () => {
    const request = {
      campaignId: "campaign-admin-a",
      requestedRole: "review_operator",
      subjectAddress: "2YVwAdminOperatorCaseSensitive",
    };

    expect(registry().lookup(request)).toMatchObject({ authorized: true });
    expect(registry([membership({ active: false })]).lookup(request)).toEqual({
      authorized: false,
      reason: "revoked",
    });
  });

  it("copies and freezes inputs and returned authorization context", () => {
    const campaignIds = ["campaign-admin-a"];
    const roleIds = ["review_operator"] as ("review_operator" | "internal_operator")[];
    const input = membership({ campaignIds, roleIds });
    const current = registry([input]);

    campaignIds[0] = "campaign-injected";
    roleIds[0] = "internal_operator";
    input.active = false;

    const decision = current.lookup({
      campaignId: "campaign-admin-a",
      requestedRole: "review_operator",
      subjectAddress: "2YVwAdminOperatorCaseSensitive",
    });

    expect(decision).toMatchObject({
      authorized: true,
      context: {
        campaignIds: ["campaign-admin-a"],
        requestedRole: "review_operator",
      },
    });
    if (decision.authorized) {
      expect(Object.isFrozen(decision)).toBe(true);
      expect(Object.isFrozen(decision.context)).toBe(true);
      expect(Object.isFrozen(decision.context.campaignIds)).toBe(true);
      expect(() => (decision.context.campaignIds as string[]).push("campaign-injected")).toThrow(TypeError);
    }
  });

  it("snapshots feature enablement at construction", () => {
    const config: AdminOperatorMembershipRegistryConfig = {
      enabled: true,
      memberships: [membership()],
      sourceRevision: "admin-membership-sha256:test-enabled-snapshot",
    };
    const current = createAdminOperatorMembershipRegistry(config);

    config.enabled = false;

    expect(current.lookup({
      campaignId: "campaign-admin-a",
      requestedRole: "review_operator",
      subjectAddress: "2YVwAdminOperatorCaseSensitive",
    })).toMatchObject({ authorized: true });
    expect(current.health().enabled).toBe(true);
  });

  it("fails closed for disabled and empty registries", () => {
    const request = {
      campaignId: "campaign-admin-a",
      requestedRole: "review_operator",
      subjectAddress: "unknown-subject",
    };

    expect(registry([], false).lookup(request)).toEqual({
      authorized: false,
      reason: "disabled",
    });
    expect(registry([], true).lookup(request)).toEqual({
      authorized: false,
      reason: "not-member",
    });
  });

  it("projects count-only safe health metadata", () => {
    const sourceRevision = "admin-membership-sha256:abcdef";
    const current = createAdminOperatorMembershipRegistry({
      enabled: true,
      memberships: [
        membership(),
        membership({ active: false, subjectAddress: "2YVwRevokedOperator" }),
      ],
      sourceRevision,
    });

    expect(current.health()).toEqual({
      activeMemberCount: 1,
      configuredMemberCount: 2,
      enabled: true,
      sourceRevision,
    });
    expect(Object.keys(current.health()).sort()).toEqual([
      "activeMemberCount",
      "configuredMemberCount",
      "enabled",
      "sourceRevision",
    ]);
    const serialized = JSON.stringify(current.health());
    expect(serialized).not.toContain("2YVw");
    expect(serialized).not.toContain("review_operator");
    expect(serialized).not.toContain("campaign-admin");
  });

  it("uses a bounded subject index for a large fixture", () => {
    const memberships = Array.from({ length: 100 }, (_, index) => membership({
      campaignIds: [`campaign-${index}`],
      subjectAddress: `2YVwAdmin${String(index).padStart(3, "0")}`,
    }));
    const current = registry(memberships);

    for (let index = 0; index < memberships.length; index += 1) {
      expect(current.lookup({
        campaignId: `campaign-${index}`,
        requestedRole: "review_operator",
        subjectAddress: `2YVwAdmin${String(index).padStart(3, "0")}`,
      })).toMatchObject({ authorized: true });
    }
  });
});
