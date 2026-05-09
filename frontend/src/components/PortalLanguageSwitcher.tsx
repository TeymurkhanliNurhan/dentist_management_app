import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en' as const, label: 'English' },
  { code: 'az' as const, label: 'Azərbaycan' },
  { code: 'ru' as const, label: 'Русский' },
];

/** Globe + dropdown; triggers full-app i18n (persists via i18next localStorage). */
export function PortalLanguageSwitcher() {
  const { i18n, t } = useTranslation('header');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const active = i18n.resolvedLanguage?.split('-')[0] ?? i18n.language.split('-')[0];

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
        aria-label={t('changeLanguage')}
        aria-expanded={open}
      >
        <Globe size={18} aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-[100] min-w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                void i18n.changeLanguage(code);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 ${
                active === code ? 'bg-[#f0f7fc] font-semibold text-[#0066A6]' : 'text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
