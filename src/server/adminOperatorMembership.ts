import type {
  CampaignOsAdminOperatorMembershipConfig,
  CampaignOsAdminOperatorRoleId,
} from "./config";

export type AdminOperatorMembershipLookupReason =
  | "disabled"
  | "not-member"
  | "revoked"
  | "role-mismatch"
  | "out-of-scope";

export interface AdminOperatorMembershipRegistryConfig {
  enabled: boolean;
  memberships: readonly CampaignOsAdminOperatorMembershipConfig[];
  sourceRevision: string;
}

export interface AdminOperatorMembershipLookupRequest {
  campaignId?: string;
  requestedRole: string;
  subjectAddress: string;
}

export interface AuthorizedAdminOperatorMembershipContext {
  campaignIds: readonly string[] | null;
  requestedRole: CampaignOsAdminOperatorRoleId;
  sourceRevision: string;
  subjectAddress: string;
}

export type AdminOperatorMembershipLookupDecision =
  | Readonly<{
      authorized: true;
      context: Readonly<AuthorizedAdminOperatorMembershipContext>;
    }>
  | Readonly<{
      authorized: false;
      reason: AdminOperatorMembershipLookupReason;
    }>;

export interface AdminOperatorMembershipHealth {
  activeMemberCount: number;
  configuredMemberCount: number;
  enabled: boolean;
  sourceRevision: string;
}

export interface AdminOperatorMembershipRegistry {
  health(): Readonly<AdminOperatorMembershipHealth>;
  lookup(request: AdminOperatorMembershipLookupRequest): AdminOperatorMembershipLookupDecision;
}

interface IndexedMembership {
  active: boolean;
  campaignIds: readonly string[] | null;
  campaignIdSet: ReadonlySet<string> | null;
  roleIds: readonly CampaignOsAdminOperatorRoleId[];
  roleIdSet: ReadonlySet<CampaignOsAdminOperatorRoleId>;
  subjectAddress: string;
}

export class AdminOperatorMembershipRegistryError extends Error {
  readonly code = "ADMIN_MEMBERSHIP_REGISTRY_INVALID";
  readonly field = "memberships";

  constructor() {
    super("Admin operator membership registry configuration is invalid.");
    this.name = "AdminOperatorMembershipRegistryError";
  }
}

const safeSourceRevision = (value: string) =>
  value.length > 0 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value)
    ? value
    : "admin-membership-revision-invalid";

const copyMembership = (
  membership: CampaignOsAdminOperatorMembershipConfig,
): IndexedMembership => {
  const campaignIds = membership.campaignIds === null
    ? null
    : Object.freeze([...membership.campaignIds]);
  const roleIds = Object.freeze([...membership.roleIds]);

  return Object.freeze({
    active: membership.active,
    campaignIds,
    campaignIdSet: campaignIds === null ? null : new Set(campaignIds),
    roleIds,
    roleIdSet: new Set(roleIds),
    subjectAddress: membership.subjectAddress.trim(),
  });
};

const membershipFingerprint = (membership: IndexedMembership) => JSON.stringify({
  active: membership.active,
  campaignIds: membership.campaignIds,
  roleIds: membership.roleIds,
  subjectAddress: membership.subjectAddress,
});

const denied = (
  reason: AdminOperatorMembershipLookupReason,
): AdminOperatorMembershipLookupDecision => Object.freeze({ authorized: false, reason });

export const createAdminOperatorMembershipRegistry = (
  config: AdminOperatorMembershipRegistryConfig,
): AdminOperatorMembershipRegistry => {
  const enabled = config.enabled;
  const sourceRevision = safeSourceRevision(config.sourceRevision);
  const bySubject = new Map<string, IndexedMembership>();

  for (const input of config.memberships) {
    const membership = copyMembership(input);
    const existing = bySubject.get(membership.subjectAddress);

    if (existing && membershipFingerprint(existing) !== membershipFingerprint(membership)) {
      throw new AdminOperatorMembershipRegistryError();
    }

    if (!existing) {
      bySubject.set(membership.subjectAddress, membership);
    }
  }

  const health = Object.freeze({
    activeMemberCount: [...bySubject.values()].filter((membership) => membership.active).length,
    configuredMemberCount: bySubject.size,
    enabled,
    sourceRevision,
  });

  const registry: AdminOperatorMembershipRegistry = {
    health: () => health,
    lookup: ({
      campaignId,
      requestedRole,
      subjectAddress,
    }: AdminOperatorMembershipLookupRequest) => {
      if (!enabled) {
        return denied("disabled");
      }

      const membership = bySubject.get(subjectAddress.trim());

      if (!membership) {
        return denied("not-member");
      }

      if (!membership.active) {
        return denied("revoked");
      }

      if (!membership.roleIdSet.has(requestedRole as CampaignOsAdminOperatorRoleId)) {
        return denied("role-mismatch");
      }

      if (
        campaignId !== undefined
        && membership.campaignIdSet !== null
        && !membership.campaignIdSet.has(campaignId.trim())
      ) {
        return denied("out-of-scope");
      }

      const context = Object.freeze({
        campaignIds: membership.campaignIds,
        requestedRole: requestedRole as CampaignOsAdminOperatorRoleId,
        sourceRevision,
        subjectAddress: membership.subjectAddress,
      });

      return Object.freeze({ authorized: true, context });
    },
  };

  return Object.freeze(registry);
};
