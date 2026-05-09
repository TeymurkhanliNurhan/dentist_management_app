import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from '../i18n/config';
import { isSingleDentistRole } from '../lib/singleDentistRole';

/** Single-dentist portal is English-only: keep i18n aligned on every in-app navigation. */
export default function SingleDentistEnglishLocale() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isSingleDentistRole(localStorage.getItem('role'))) return;
    void i18n.changeLanguage('en');
  }, [pathname]);

  return null;
}
