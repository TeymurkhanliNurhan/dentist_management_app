/** BCP 47 locale for Intl formatting from i18next language code. */
export function appLocaleTag(language: string): string {
  const base = language.split('-')[0]?.toLowerCase() ?? 'en';
  if (base === 'az') return 'az-AZ';
  if (base === 'ru') return 'ru-RU';
  return 'en-US';
}
