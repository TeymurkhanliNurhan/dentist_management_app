import { useState, useEffect } from 'react';
import { User, Calendar, Edit, X, Save, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import Header from './Header';
import { dentistService, authService } from '../services/api';

interface Dentist {
  id: number;
  name: string;
  surname: string;
  birthDate: string;
  gmail: string;
}

const Settings = () => {
  const [dentist, setDentist] = useState<Dentist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'code' | 'password'>('code');
  const [editFields, setEditFields] = useState({ name: '', surname: '', birthDate: '' });
  const [passwordFields, setPasswordFields] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [forgotPasswordFields, setForgotPasswordFields] = useState({ code: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [showForgotPasswords, setShowForgotPasswords] = useState({ new: false, confirm: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchDentistData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const dentistId = localStorage.getItem('dentistId');
        if (!dentistId) {
          setError('Dentist ID not found');
          return;
        }
        const dentistData = await dentistService.getById(parseInt(dentistId));
        setDentist(dentistData);
        setEditFields({
          name: dentistData.name || '',
          surname: dentistData.surname || '',
          birthDate: dentistData.birthDate ? dentistData.birthDate.split('T')[0] : '',
        });
      } catch (err: any) {
        console.error('Failed to fetch dentist data:', err);
        setError(err.response?.data?.message || 'Failed to fetch dentist details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDentistData();
  }, []);

  const handleEdit = () => {
    if (dentist) {
      setEditFields({
        name: dentist.name || '',
        surname: dentist.surname || '',
        birthDate: dentist.birthDate ? dentist.birthDate.split('T')[0] : '',
      });
      setShowEditModal(true);
      setError('');
      setSuccess('');
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const updatedDentist = await dentistService.update({
        name: editFields.name,
        surname: editFields.surname,
        birthDate: editFields.birthDate,
      });
      
      setDentist(updatedDentist);
      setShowEditModal(false);
      setSuccess('Dentist details updated successfully!');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to update dentist:', err);
      setError(err.response?.data?.message || 'Failed to update dentist details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async () => {
    setIsPasswordSubmitting(true);
    setError('');
    setSuccess('');

    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      setError('New password and confirm password do not match');
      setIsPasswordSubmitting(false);
      return;
    }

    if (passwordFields.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setIsPasswordSubmitting(false);
      return;
    }

    try {
      await dentistService.updatePassword({
        currentPassword: passwordFields.currentPassword,
        newPassword: passwordFields.newPassword,
        confirmPassword: passwordFields.confirmPassword,
      });
      
      setShowPasswordModal(false);
      setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password updated successfully!');
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Failed to update password:', err);
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!dentist) return;
    
    setIsForgotPasswordLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.forgotPassword(dentist.gmail);
      setSuccess('Reset code has been sent to your email.');
      setForgotPasswordStep('code');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to send reset code');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!dentist) return;

    setIsForgotPasswordLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.verifyResetCode(dentist.gmail, forgotPasswordFields.code);
      if (result.valid) {
        setSuccess('Code verified successfully!');
        setForgotPasswordStep('password');
      } else {
        setError('Invalid verification code');
      }
    } catch (err: any) {
      console.error('Verify code error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to verify code');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!dentist) return;

    setIsForgotPasswordLoading(true);
    setError('');
    setSuccess('');

    if (forgotPasswordFields.newPassword !== forgotPasswordFields.confirmPassword) {
      setError('Passwords do not match');
      setIsForgotPasswordLoading(false);
      return;
    }

    if (forgotPasswordFields.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsForgotPasswordLoading(false);
      return;
    }

    try {
      const result = await authService.resetPassword(
        dentist.gmail,
        forgotPasswordFields.newPassword,
        forgotPasswordFields.confirmPassword
      );
      if (result.success) {
        setSuccess('Password reset successful!');
        setTimeout(() => {
          setShowForgotPasswordModal(false);
          setForgotPasswordStep('code');
          setForgotPasswordFields({
            code: '',
            newPassword: '',
            confirmPassword: '',
          });
          setSuccess('');
        }, 2000);
      } else {
        setError(result.message || 'Failed to reset password');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading settings...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error && !dentist) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <button
              onClick={handleEdit}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {dentist && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-teal-600 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-lg text-gray-900">{dentist.name}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-teal-600 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Surname</p>
                    <p className="text-lg text-gray-900">{dentist.surname}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-teal-600 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Birth Date</p>
                    <p className="text-lg text-gray-900">
                      {dentist.birthDate ? new Date(dentist.birthDate).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-teal-600 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-lg text-gray-900">{dentist.gmail}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Password</p>
                      <p className="text-lg text-gray-900">••••••••</p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowPasswordModal(true);
                        setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setError('');
                        setSuccess('');
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Change Password</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Dentist Details</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setError('');
                  setSuccess('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={editFields.name}
                  onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  maxLength={20}
                />
              </div>

              <div>
                <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-2">
                  Surname
                </label>
                <input
                  type="text"
                  id="surname"
                  required
                  value={editFields.surname}
                  onChange={(e) => setEditFields({ ...editFields, surname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  maxLength={20}
                />
              </div>

              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Birth Date
                </label>
                <input
                  type="date"
                  id="birthDate"
                  value={editFields.birthDate}
                  onChange={(e) => setEditFields({ ...editFields, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setError('');
                  setSuccess('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePasswordChange();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    id="currentPassword"
                    required
                    value={passwordFields.currentPassword}
                    onChange={(e) => setPasswordFields({ ...passwordFields, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    id="newPassword"
                    required
                    minLength={6}
                    value={passwordFields.newPassword}
                    onChange={(e) => setPasswordFields({ ...passwordFields, newPassword: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    id="confirmPassword"
                    required
                    minLength={6}
                    value={passwordFields.confirmPassword}
                    onChange={(e) => setPasswordFields({ ...passwordFields, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setShowForgotPasswordModal(true);
                    setForgotPasswordStep('code');
                    setForgotPasswordFields({ code: '', newPassword: '', confirmPassword: '' });
                    setError('');
                    setSuccess('');
                    handleForgotPassword();
                  }}
                  className="text-sm text-teal-600 hover:text-teal-700 transition-colors flex items-center space-x-1"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Forgot Password?</span>
                </button>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setError('');
                    setSuccess('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPasswordSubmitting}
                  className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isPasswordSubmitting ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
              <button
                onClick={() => {
                  setShowForgotPasswordModal(false);
                  setForgotPasswordStep('code');
                  setForgotPasswordFields({ code: '', newPassword: '', confirmPassword: '' });
                  setError('');
                  setSuccess('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {dentist && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                Verification code has been sent to: <strong>{dentist.gmail}</strong>
              </div>
            )}

            {forgotPasswordStep === 'code' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyResetCode();
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="resetCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="resetCode"
                    required
                    value={forgotPasswordFields.code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 7);
                      setForgotPasswordFields({ ...forgotPasswordFields, code: value });
                    }}
                    maxLength={7}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-center text-2xl tracking-widest font-mono"
                    placeholder="0000000"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPasswordModal(false);
                      setForgotPasswordStep('code');
                      setForgotPasswordFields({ code: '', newPassword: '', confirmPassword: '' });
                      setError('');
                      setSuccess('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotPasswordLoading || forgotPasswordFields.code.length !== 7}
                    className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isForgotPasswordLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </div>
              </form>
            )}

            {forgotPasswordStep === 'password' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleResetPassword();
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="newPasswordForgot" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotPasswords.new ? 'text' : 'password'}
                      id="newPasswordForgot"
                      required
                      minLength={6}
                      value={forgotPasswordFields.newPassword}
                      onChange={(e) => setForgotPasswordFields({ ...forgotPasswordFields, newPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswords({ ...showForgotPasswords, new: !showForgotPasswords.new })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showForgotPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPasswordForgot" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotPasswords.confirm ? 'text' : 'password'}
                      id="confirmPasswordForgot"
                      required
                      minLength={6}
                      value={forgotPasswordFields.confirmPassword}
                      onChange={(e) => setForgotPasswordFields({ ...forgotPasswordFields, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswords({ ...showForgotPasswords, confirm: !showForgotPasswords.confirm })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showForgotPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordStep('code');
                      setForgotPasswordFields({ ...forgotPasswordFields, newPassword: '', confirmPassword: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotPasswordLoading}
                    className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isForgotPasswordLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

