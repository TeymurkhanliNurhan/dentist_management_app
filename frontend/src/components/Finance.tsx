import { useMemo } from 'react';
import DirectorFinance from './DirectorFinance';
import DentistFinance from './DentistFinance';
import ReceptionFinance from './ReceptionFinance';

const Finance = () => {
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);

  if (role === 'director') {
    return <DirectorFinance />;
  }

  if (role === 'dentist' || role === 'singledentist' || role === 'single dentist') {
    return <DentistFinance />;
  }

  if (role === 'frontdesk') {
    return <ReceptionFinance />;
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-[#f4f6f8] text-slate-700">
      <p className="text-lg">You do not have permission to view this page.</p>
    </div>
  );
};

export default Finance;
