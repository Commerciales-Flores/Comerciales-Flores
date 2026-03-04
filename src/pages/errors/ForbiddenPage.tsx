import React from 'react';
import { ShieldOff, ArrowLeft, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determine where "Home" is based on the user's current session
  const handleRedirect = () => {
    if (user?.role === 'admin') navigate('/admin/dashboard');
    else if (user?.role === 'client') navigate('/client/dashboard');
    else navigate('/');
  };

  return (
    /* h-full ensures it takes up the space inside the Dashboard Layout */
    <div className="relative h-full w-full flex flex-col items-center justify-center p-6 bg-white rounded-3xl">
      
      {/* 1. Top Left Branding - Only visible if you want to repeat it inside the dashboard */}
      <div className="absolute top-8 left-8 flex items-center gap-3 select-none">
        <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl">
          <Building2 className="size-5 sm:size-6 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Comerciales Flores</span>
      </div>

      <div className="max-w-md w-full text-center">
        {/* Icon Section */}
        <div className="relative mx-auto w-20 h-20 mb-8">
          <div className="absolute inset-0 bg-red-50 rounded-2xl rotate-6"></div>
          <div className="relative flex items-center justify-center w-full h-full bg-white border border-red-100 rounded-2xl shadow-sm">
            <ShieldOff className="size-10 text-red-600" />
          </div>
        </div>
        
        <div className="space-y-3 mb-10">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">403</h1>
          <h2 className="text-xl font-bold text-gray-800">Access Restricted</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            You don't have the necessary permissions to view this section. 
            Please contact your administrator if you believe this is an error.
          </p>
        </div>

        {/* Single Primary Action Button */}
        <button
          onClick={handleRedirect}
          className="group flex items-center justify-center gap-2 mx-auto px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-gray-200"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ForbiddenPage;