/** Normalized checks for the "single dentist / solo practice" staff role (API may use several spellings). */
export function isSingleDentistRole(role: string | null | undefined): boolean {
  const r = (role ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  return (
    r === 'singledentist' ||
    r === 'single dentist' ||
    r === 'sinledentist' ||
    r === 'single_dentist' ||
    r === 'single-dentist'
  );
}
