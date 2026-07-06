/**
 * Returns true when a Supabase error indicates the queried table does not exist
 * (Postgres error code 42P01) or cannot be found.
 */
export function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || !!error.message?.includes('not found');
}
