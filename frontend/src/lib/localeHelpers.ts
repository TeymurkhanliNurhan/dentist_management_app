/** BCP 47 locale for Intl formatting from i18next language code. */
export function appLocaleTag(language: string): string {
  const base = language.split('-')[0]?.toLowerCase() ?? 'en';
  if (base === 'az') return 'az-AZ';
  if (base === 'ru') return 'ru-RU';
  return 'en-US';
}

function languageBase(language: string): string {
  return language.split('-')[0]?.toLowerCase() ?? 'en';
}

/**
 * Azerbaijani full month names (1-indexed). We use the full form everywhere
 * because some browsers' ICU data falls back to placeholders like "M05" for the
 * `az` short form.
 */
const AZ_MONTHS_FULL = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'İyun',
  'İyul',
  'Avqust',
  'Sentyabr',
  'Oktyabr',
  'Noyabr',
  'Dekabr',
] as const;

/** Compact Azerbaijani month labels for crowded chart axes / dropdowns. */
const AZ_MONTHS_SHORT = [
  'Yan',
  'Fev',
  'Mar',
  'Apr',
  'May',
  'İyn',
  'İyl',
  'Avq',
  'Sen',
  'Okt',
  'Noy',
  'Dek',
] as const;

/**
 * Localized month label for a given JS Date.
 *
 * - Uses Azerbaijani full names when language is `az` (browser fallback often
 *   shows "M05" instead of a real Az name otherwise).
 * - Falls back to `Intl.DateTimeFormat({ month })` for other languages.
 */
export function formatMonthLabel(
  date: Date,
  language: string,
  variant: 'short' | 'long' = 'short',
): string {
  if (languageBase(language) === 'az') {
    const idx = date.getMonth();
    return (variant === 'short' ? AZ_MONTHS_SHORT : AZ_MONTHS_FULL)[idx] ?? '';
  }
  return date.toLocaleDateString(appLocaleTag(language), { month: variant });
}

/** Helper for callers that already track a 1-indexed month number. */
export function formatMonthLabelByIndex1(
  monthIndex1: number,
  language: string,
  variant: 'short' | 'long' = 'short',
): string {
  return formatMonthLabel(new Date(2000, monthIndex1 - 1, 1), language, variant);
}

/**
 * User-requested Azerbaijani weekday short labels. Mapped by JS
 * `Date#getDay()` (0 = Sunday … 6 = Saturday).
 */
const AZ_WEEKDAY_SHORT_BY_JS_DAY: readonly string[] = [
  'Ba.',   // Sunday
  'B.e',   // Monday
  'Ç.a',   // Tuesday
  'Çər.',  // Wednesday
  'C.a',   // Thursday
  'Cümə',  // Friday
  'Şən.',  // Saturday
];

/** Locale-aware weekday short label that uses our Az conventions when needed. */
export function formatWeekdayShort(date: Date, language: string): string {
  if (languageBase(language) === 'az') {
    return AZ_WEEKDAY_SHORT_BY_JS_DAY[date.getDay()] ?? '';
  }
  return date.toLocaleDateString(appLocaleTag(language), { weekday: 'short' });
}

/**
 * "{weekday}, {day} {month}" / "{weekday}, {month} {day}" combined label that
 * stays readable on the schedule weekly header.
 */
export function formatWeekdayWithDate(date: Date, language: string): string {
  const weekday = formatWeekdayShort(date, language);
  if (languageBase(language) === 'az') {
    const dayPart = `${date.getDate()} ${formatMonthLabel(date, language, 'short')}`;
    return `${weekday}, ${dayPart}`;
  }
  const datePart = date.toLocaleDateString(appLocaleTag(language), {
    day: 'numeric',
    month: 'short',
  });
  return `${weekday}, ${datePart}`;
}

/**
 * "{weekday}, {day} {month} {year}" used by detail tooltips/popovers. Keeps
 * Az output readable while reusing Intl elsewhere.
 */
export function formatLongWeekdayDate(date: Date, language: string): string {
  if (languageBase(language) === 'az') {
    const weekday = formatWeekdayShort(date, language);
    return `${weekday}, ${date.getDate()} ${formatMonthLabel(date, language, 'short')} ${date.getFullYear()}`;
  }
  return date.toLocaleDateString(appLocaleTag(language), {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Birth-date format used in the patients directory (`dd.mm.yyyy`). */
export function formatDateDdMmYyyy(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
