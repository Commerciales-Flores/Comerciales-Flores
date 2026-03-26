import type { Unit } from "../contexts/DataContext";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { formatCurrency } from "../utils/currency";
import { getPriceLabel, getUnitTypeLabel } from "../utils/propertyHelpers";

interface Props {
  Unit: Unit;
  onClose: () => void;
}

function isVideoUrl(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogg)$/i.test(url);
}

export default function UnitModal({ Unit, onClose }: Props) {
  const media = useMemo(() => {
    const images = Array.isArray(Unit.images) ? Unit.images.filter(Boolean) : [];
    const videos = Array.isArray(Unit.videos) ? Unit.videos.filter(Boolean) : [];
    const combined = [...images, ...videos];
    return combined.length > 0 ? combined : ["/fallback-unit.webp"];
  }, [Unit.images, Unit.videos]);

  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [Unit.id]);

  const hasMultipleMedia = media.length > 1;

  const prevMedia = useCallback(() => {
    setCurrentMediaIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  }, [media.length]);

  const nextMedia = useCallback(() => {
    setCurrentMediaIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  }, [media.length]);

  const currentMedia = media[currentMediaIndex] || "/fallback-unit.webp";
  const currentIsVideo = isVideoUrl(currentMedia);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (hasMultipleMedia && e.key === "ArrowLeft") prevMedia();
      if (hasMultipleMedia && e.key === "ArrowRight") nextMedia();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, hasMultipleMedia, prevMedia, nextMedia]);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!hasMultipleMedia) return;

    const preloadIndex = (currentMediaIndex + 1) % media.length;
    const nextItem = media[preloadIndex];

    if (!nextItem) return;

    if (isVideoUrl(nextItem)) {
      const video = document.createElement("video");
      video.src = nextItem;
      video.preload = "metadata";
    } else {
      const img = new Image();
      img.src = nextItem;
    }
  }, [currentMediaIndex, media, hasMultipleMedia]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
    touchEndXRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    touchEndXRef.current = e.changedTouches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!hasMultipleMedia) return;

    const startX = touchStartXRef.current;
    const endX = touchEndXRef.current;

    if (startX == null || endX == null) return;

    const delta = startX - endX;
    const swipeThreshold = 40;

    if (Math.abs(delta) < swipeThreshold) return;

    if (delta > 0) {
      nextMedia();
    } else {
      prevMedia();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  }, [hasMultipleMedia, nextMedia, prevMedia]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unit-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative z-10 mx-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl outline-none"
      >
        <div className="flex flex-shrink-0 items-start justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <div className="mb-1 text-sm font-medium text-blue-600">
              {getUnitTypeLabel(Unit.type)}
            </div>
            <h2 id="unit-modal-title" className="text-xl font-semibold text-slate-900">
              {Unit.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close modal"
            type="button"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className="relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {currentIsVideo ? (
              <video
                src={currentMedia}
                controls
                preload="metadata"
                playsInline
                className="h-56 w-full rounded-2xl object-cover sm:h-72 md:h-96"
              />
            ) : (
              <img
                src={currentMedia}
                alt={Unit.name}
                decoding="async"
                loading="eager"
                className="h-56 w-full rounded-2xl object-cover sm:h-72 md:h-96"
              />
            )}

            {currentIsVideo && (
              <span className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white">
                Video
              </span>
            )}

            {hasMultipleMedia && (
              <>
                <button
                  onClick={prevMedia}
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md backdrop-blur transition-all hover:bg-white"
                  aria-label="Previous media"
                >
                  <ChevronLeft className="size-6" />
                </button>

                <button
                  onClick={nextMedia}
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md backdrop-blur transition-all hover:bg-white"
                  aria-label="Next media"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>

          {hasMultipleMedia && (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {media.map((item, index) => {
                  const itemIsVideo = isVideoUrl(item);

                  return (
                    <button
                      key={`${item}-${index}`}
                      type="button"
                      onClick={() => setCurrentMediaIndex(index)}
                      className={`shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        currentMediaIndex === index
                          ? "border-blue-600 ring-2 ring-blue-100"
                          : "border-transparent"
                      }`}
                      aria-label={`View media ${index + 1}`}
                    >
                      {itemIsVideo ? (
                        <div className="relative h-16 w-20 bg-gray-100">
                          <video
                            src={item}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover pointer-events-none"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
                            Video
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item}
                          alt={`${Unit.name} thumbnail ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-16 w-20 object-cover"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-gray-500">
                Swipe or use the arrows to browse photos and videos.
              </p>
            </>
          )}

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Description</h3>
            <p className="leading-relaxed text-gray-600">
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
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Unit.features.map((feature, index) => (
                  <li
                    key={`${feature}-${index}`}
                    className="flex items-center gap-2 text-gray-600"
                  >
                    <div className="size-1.5 rounded-full bg-blue-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No features listed.</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-blue-50 p-4">
            <div>
              <p className="mb-1 text-sm text-gray-600">Price</p>
              <div className="font-bold text-blue-600">
                {formatCurrency(Unit.price)}{" "}
                <span className="text-sm font-normal">{getPriceLabel(Unit.type)}</span>
              </div>
            </div>

            {Unit.capacity ? (
              <div>
                <p className="mb-1 text-sm text-gray-600">Capacity</p>
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

          <div className="border-t border-gray-200 pt-4">
            <Link
              to="/register"
              className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center font-bold text-white transition-colors hover:bg-blue-700"
            >
              Reserve Now - Sign Up Required
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}