import type { Unit } from "../contexts/DataContext";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo, useCallback, useEffect } from "react";
import { formatCurrency } from "../utils/currency";
import { getPriceLabel, getUnitTypeLabel } from "../utils/propertyHelpers";

interface Props {
  Unit: Unit;
  onClose: () => void;
}

export default function UnitModal({ Unit, onClose }: Props) {
  const images = useMemo(
    () =>
      Array.isArray(Unit.images) && Unit.images.length > 0
        ? Unit.images
        : ["/fallback-unit.webp"],
    [Unit.images]
  );

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [Unit.id]);

  const hasMultipleImages = images.length > 1;

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (hasMultipleImages && e.key === "ArrowLeft") prevImage();
      if (hasMultipleImages && e.key === "ArrowRight") nextImage();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, hasMultipleImages, prevImage, nextImage]);

  const currentImage = images[currentImageIndex] || "/fallback-unit.webp";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unit-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 bg-white rounded-lg max-w-4xl w-full max-h-[90vh] mx-auto shadow-xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-start p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <div className="text-sm text-blue-600 mb-1">
              {getUnitTypeLabel(Unit.type)}
            </div>
            <h2 id="unit-modal-title" className="text-lg font-semibold">
              {Unit.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
            type="button"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="relative">
            <img
              src={currentImage}
              alt={Unit.name}
              decoding="async"
              className="w-full h-56 sm:h-72 md:h-96 object-cover rounded-lg"
            />

            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition-all shadow-md"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  onClick={nextImage}
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition-all shadow-md"
                  aria-label="Next image"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>

          {hasMultipleImages && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, index) => (
                <button
                  key={`${img}-${index}`}
                  type="button"
                  onClick={() => setCurrentImageIndex(index)}
                  className={`shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                    currentImageIndex === index
                      ? "border-blue-600"
                      : "border-transparent"
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={img}
                    alt={`${Unit.name} thumbnail ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-16 object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Description</h3>
            <p className="text-gray-600 leading-relaxed">
              {Unit.description || "No description available."}
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Location</h3>
            <p className="text-gray-600">
              {Unit.property?.address || Unit.location || "Location not available."}
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Features</h3>
            {Unit.features?.length ? (
              <ul className="grid grid-cols-2 gap-2">
                {Unit.features.map((feature, index) => (
                  <li key={`${feature}-${index}`} className="flex items-center gap-2 text-gray-600">
                    <div className="size-1.5 bg-blue-600 rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No features listed.</p>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Price</p>
              <div className="text-blue-600 font-bold">
                {formatCurrency(Unit.price)}{" "}
                <span className="text-sm font-normal">{getPriceLabel(Unit.type)}</span>
              </div>
            </div>

            {Unit.capacity ? (
              <div>
                <p className="text-sm text-gray-600 mb-1">Capacity</p>
                <p className="text-gray-900">{Unit.capacity} persons</p>
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Policies</h3>
            <p className="text-sm text-gray-600">
              {Unit.policies || "No policies provided."}
            </p>
          </div>

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