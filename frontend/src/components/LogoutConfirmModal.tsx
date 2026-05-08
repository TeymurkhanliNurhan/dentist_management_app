import type { NavigateFunction } from 'react-router-dom';
import { resetCachedDentistProfile } from '../services/api';

export function performLogout(navigate: NavigateFunction) {
  resetCachedDentistProfile();
  localStorage.removeItem('access_token');
  localStorage.removeItem('dentistId');
  localStorage.removeItem('staffId');
  localStorage.removeItem('clinicId');
  localStorage.removeItem('role');
  navigate('/login');
}

type LogoutConfirmModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function LogoutConfirmModal({ open, onCancel, onConfirm }: LogoutConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <h2 id="logout-confirm-title" className="text-lg font-semibold text-slate-900">
          Sign out
        </h2>
        <p className="mt-2 text-sm text-slate-600">Are you sure you want to leave?</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
