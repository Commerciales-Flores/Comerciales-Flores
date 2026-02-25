import { X, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

interface LogoutConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutConfirmModal({
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 200); // match animation duration
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 transform transition-all duration-200 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="size-5" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="bg-red-100 rounded-full p-4 flex items-center justify-center">
            <LogOut className="size-8 text-red-600" />
          </div>
        </div>

        {/* Text */}
        <h2 className="text-lg font-semibold text-gray-800 mb-2 text-center">
          Confirm Logout
        </h2>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Are you sure you want to log out of your account?
        </p>

        {/* Buttons side by side */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}