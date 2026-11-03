export const learnerPortalsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_LEARNER_PORTALS === "true";

export const staffPortalRoles = ["manager", "deputy", "teacher", "staff"] as const;

export function isStaffPortalRole(role?: string): boolean {
  return staffPortalRoles.includes(role as (typeof staffPortalRoles)[number]);
}
