import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Edit, X, Save } from 'lucide-react';
import Header from './Header';
import { dentistService } from '../services/api';

interface Dentist {
  id: number;
  name: string;
  surname: string;
  birthDate: string;
  gmail: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const [dentist, setDentist] = useState<Dentist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFields, setEditFields] = useState({ name: '', surname: '', birthDate: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    </div>
  );
};

export default Settings;

