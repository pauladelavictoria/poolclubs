/**
 * Who may change a drill. UI mirror of the `drills` RLS policies in
 * sql/schema.sql — change both together. This only decides what to show; the
 * database is the gate.
 */
export function canEditDrill(
  createdBy: string | null | undefined,
  userId: string | null | undefined,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  // A null owner (the seeded drills) must not match a missing user id.
  return !!userId && createdBy === userId;
}
