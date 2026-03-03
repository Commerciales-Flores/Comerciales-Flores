import type { Property } from '../contexts/DataContext';
import { X, ChevronLeft, ChevronRight } from "lucide-react"; // Removed Link icon from here
import { Link } from "react-router-dom"; // Added Link component from react-router-dom
import { useState } from "react";
import { formatCurrency } from "../utils/currency";
import { getPriceLabel, getPropertyTypeLabel } from "../utils/propertyHelpers";

interface Props {
  property: Property;
  onClose: () => void;
}

export default function PropertyModal({ property, onClose }: Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const prevImage = () => setCurrentImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
  const nextImage = () => setCurrentImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 1️⃣ Blur overlay - Calls onClose when clicked */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 2️⃣ Modal content */}
      <div className="relative z-10 bg-white rounded-lg max-w-4xl w-full max-h-[90vh] mx-auto shadow-xl flex flex-col overflow-hidden">
        
        {/* Header: Stays fixed at the top */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <div className="text-sm text-blue-600 mb-1">{getPropertyTypeLabel(property.type)}</div>
            <h2 className="text-lg font-semibold">{property.name}</h2>
          </div>
          <button
            onClick={onClose} // Calls the parent's close function
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Body: Scrollable area */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="relative">
            <img
              src={property.images[currentImageIndex] ?? '/fallback-property.jpg'}
              alt={property.name}
              className="w-full h-56 sm:h-72 md:h-96 object-cover rounded-lg"
            />
            {property.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition-all shadow-md"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition-all shadow-md"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Description</h3>
            <p className="text-gray-600 leading-relaxed">{property.description}</p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Location</h3>
            <p className="text-gray-600">{property.location}</p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Features</h3>
            <ul className="grid grid-cols-2 gap-2">
              {property.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-600">
                  <div className="size-1.5 bg-blue-600 rounded-full" />{feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Price</p>
              <div className="text-blue-600 font-bold">
                {formatCurrency(property.price)} <span className="text-sm font-normal">{getPriceLabel(property.type)}</span>
              </div>
            </div>
            {property.capacity && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Capacity</p>
                <p className="text-gray-900">{property.capacity} persons</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Policies</h3>
            <p className="text-sm text-gray-600">{property.policies}</p>
          </div>

          {/* Footer button: Now uses React Router Link */}
          <div className="pt-4 border-t border-gray-200">
            <Link 
              to="/register" 
              className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
            >
              Reserve Now - Sign Up Required
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}