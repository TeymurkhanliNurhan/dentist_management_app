import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, DollarSign } from 'lucide-react';
import Header from './Header';
import { toothTreatmentService, toothService } from '../services/api';
import type { ToothTreatment, ToothInfo } from '../services/api';

const ToothDetail = () => {
  const { patientId, toothId } = useParams<{ patientId: string; toothId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [treatments, setTreatments] = useState<ToothTreatment[]>([]);
  const [toothInfo, setToothInfo] = useState<ToothInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!toothId) return;
      
      setIsLoading(true);
      setError('');
      try {
        const [treatmentsData, toothData] = await Promise.all([
          toothTreatmentService.getAll({ tooth: parseInt(toothId) }),
          toothService.getAll({ id: parseInt(toothId), language: 'english' })
        ]);
        setTreatments(treatmentsData);
        if (toothData.length > 0) {
          setToothInfo(toothData[0]);
        }
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(err.response?.data?.message || 'Failed to fetch tooth information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toothId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading tooth details...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Patient</span>
        </button>

        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {toothInfo ? (
              <>
                <span className="text-teal-600">
                  {toothInfo.permanent ? 'Permanent' : 'Childish'}
                </span>
                {' '}
                <span>{toothInfo.name}</span>
              </>
            ) : (
              `Tooth #${toothId}`
            )}
          </h1>
          <p className="text-gray-600">Past Treatments History</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {treatments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">No treatments found for this tooth.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {treatments.map((treatment) => (
              <div 
                key={treatment.id} 
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Appointment Date</p>
                      <p className="text-lg text-gray-900 font-semibold">
                        {treatment.appointment.startDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Treatment</p>
                      <p className="text-lg text-gray-900 font-semibold">
                        {treatment.treatment.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <DollarSign className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Price</p>
                      <p className="text-lg text-gray-900 font-semibold">
                        ${treatment.treatment.price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Treatment Description</p>
                      <p className="text-base text-gray-700">
                        {treatment.treatment.description || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {treatment.description && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
                    <p className="text-base text-gray-700">
                      {treatment.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ToothDetail;

