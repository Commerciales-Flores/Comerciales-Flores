import React from 'react';
import { ShieldAlert, LogIn, Building2 } from 'lucide-react';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center p-6">
      {/* Branding - Top Left */}
      <div className="absolute top-8 left-8 flex items-center gap-3 select-none">
        <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl">
          <Building2 className="size-5 sm:size-6 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-gray-900 tracking-tight">Comerciales Flores</span>
        </div>
      </div>

      <div className="max-w-sm w-full text-center">
        {/* Animated Icon Container */}
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20"></div>
          <div className="relative flex items-center justify-center w-full h-full bg-white rounded-full shadow-xl border border-indigo-50">
            <ShieldAlert className="size-10 text-indigo-600" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-gray-900 tracking-tight italic mb-2">401</h1>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Session Expired</h2>
        
        <p className="text-gray-500 mb-10 text-sm leading-relaxed">
          For your security, sessions are timed out after a period of inactivity. 
          Please log in again to securely access your dashboard and data.
        </p>

        <a
          href="/login"
          className="group flex items-center justify-center gap-3 w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98]"
        >
          <LogIn className="size-5 group-hover:translate-x-1 transition-transform" />
          Login to Continue
        </a>

        <p className="mt-8 text-xs font-medium text-gray-400">
          Secure Session Management &copy; 2026
        </p>
      </div>
    </div>
  );
};

export default UnauthorizedPage;