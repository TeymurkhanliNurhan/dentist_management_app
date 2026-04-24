import Header from './Header';

const MainBoard = () => {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-gray-50">
      <Header />
      
      <main className="min-h-0 flex-1 overflow-y-auto max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
          <p className="text-gray-600">
            Welcome to your dentist management dashboard.
          </p>
        </div>
      </main>
    </div>
  );
};

export default MainBoard;

