import { useMemo } from 'react';
import DirectorFinance from './DirectorFinance';
import DentistFinance from './DentistFinance';

const Finance = () => {
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);

  if (role === 'director') {
    return <DirectorFinance />;
  }

  if (role === 'dentist') {
    return <DentistFinance />;
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-[#f4f6f8] text-slate-700">
      <p className="text-lg">You do not have permission to view this page.</p>
    </div>
  );
};

export default Finance;
