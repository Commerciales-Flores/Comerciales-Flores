import React from 'react';
import { RefreshCcw, AlertCircle, Building2 } from 'lucide-react';

const ServerErrorPage: React.FC = () => {
  return (
    <div className="relative h-[calc(100vh-120px)] w-full flex flex-col items-center justify-center p-6 bg-white rounded-3xl">
      {/* Branding */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl">
          <Building2 className="size-5 sm:size-6 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Commerciales Flores</span>
      </div>

      <div className="max-w-md w-full text-center">
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-3xl border border-red-100">
          <AlertCircle className="size-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight italic mb-2">500</h1>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Server Connection Error</h2>
        <p className="text-gray-500 mb-10 text-sm leading-relaxed">
          Our systems are experiencing a temporary hiccup. Your data remains safe. 
          Please try refreshing the page to restore the connection.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-2 mx-auto px-10 py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all active:scale-[0.98] shadow-xl shadow-red-100"
        >
          <RefreshCcw className="size-5" />
          Refresh Connection
        </button>
      </div>
    </div>
  );
};

export default ServerErrorPage;