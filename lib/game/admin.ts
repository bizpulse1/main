// Whether a user's role permits admin/trainer dashboard access. No
// self-service UI grants this role — profiles.role defaults to
// 'player' for everyone via the signup trigger; a super_admin (or a
// direct DB update, documented in biz_pulse_grant_admin.sql) has to
// promote someone. That's an intentional gate: this isn't a feature a
// player should be able to grant themselves.
export function canAccessAdminDashboard(role: string | null | undefined): boolean {
  return role === "admin_trainer" || role === "super_admin";
}
