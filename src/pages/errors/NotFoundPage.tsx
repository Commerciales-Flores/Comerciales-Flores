import React from 'react';
import { Compass, ArrowLeft, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleDashboardRedirect = () => {
    if (user?.role === 'admin') navigate('/admin/dashboard');
    else if (user?.role === 'client') navigate('/client/dashboard');
    else navigate('/');
  };

  return (
    <div className="relative h-[calc(100vh-120px)] w-full flex flex-col items-center justify-center p-6 bg-white rounded-3xl">
      {/* Branding */}
      <div className="absolute top-8 left-8 flex items-center gap-3 select-none">
        <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl">
          <Building2 className="size-5 sm:size-6 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Commerciales Flores</span>
      </div>

      <div className="max-w-md w-full text-center">
        <h1 className="text-9xl font-black text-gray-100 leading-none select-none italic">404</h1>
        
        <div className="relative -mt-12 mb-8 inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl rotate-12 shadow-xl">
          <Compass className="size-10 text-white -rotate-12 animate-pulse" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Lost in space?</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          The page you are looking for doesn't exist. Don't worry, your session is still active.
        </p>

        <button
          onClick={handleDashboardRedirect}
          className="group flex items-center justify-center gap-2 mx-auto px-10 py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-gray-200"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;