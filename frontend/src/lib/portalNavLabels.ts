/** Maps portal sidebar routes to keys in the header i18n namespace. */
const PATH_TO_HEADER_KEY: Record<string, string> = {
  '/dashboard': 'navDashboard',
  '/patients': 'navPatients',
  '/schedule': 'navSchedule',
  '/treatments': 'navTreatments',
  '/course-of-treatments': 'navCourseOfTreatments',
  '/medicines': 'navInventory',
  '/staff': 'navStaff',
  '/finance': 'navFinance',
};

export function labelForPortalNavPath(path: string, fallbackLabel: string, t: (key: string) => string): string {
  const key = PATH_TO_HEADER_KEY[path];
  return key ? t(key) : fallbackLabel;
}
