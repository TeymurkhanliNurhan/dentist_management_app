import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from './Header';

const ToothDetail = () => {
  const { patientId, toothId } = useParams<{ patientId: string; toothId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [patientId, toothId]);

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

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Tooth #{toothId}
          </h1>
          
          <div className="text-gray-600">
            <p>Patient ID: {patientId}</p>
            <p className="mt-4">Tooth details and treatments will be displayed here.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ToothDetail;

