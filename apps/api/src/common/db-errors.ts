/** PostgreSQL error codes, see https://www.postgresql.org/docs/current/errcodes-appendix.html */
const UNIQUE_VIOLATION = "23505";

/** True when a query failed because of a unique constraint (Drizzle wraps the driver error). */
export function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: unknown })?.cause ?? error;
  return (cause as { code?: string } | undefined)?.code === UNIQUE_VIOLATION;
}
