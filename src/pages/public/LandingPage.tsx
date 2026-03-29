import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useData } from "../../contexts/DataContext";
import { motion, AnimatePresence } from "framer-motion"; // Modern animations
import 'react-calendar/dist/Calendar.css';
import UnitModal from "../../components/PropertyModal";
import { useReviews } from "../../contexts/ReviewsContext";
import {
  Building2,
  Menu,
  MapPin,
  LogIn,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Info
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  getUnitTypeLabel,
} from "../../utils/propertyHelpers";

function isVideoUrl(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogg)$/i.test(url);
}


export default function LandingPage() {
  const { units, contentSettings, addInquiry } = useData();
  const { reviews } = useReviews();
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [inquiryForm, setInquiryForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  });
  const featuredVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

    useEffect(() => {
      document.body.style.overflow = isMenuOpen ? "hidden" : "";

      return () => {
        document.body.style.overflow = "";
      };
    }, [isMenuOpen]);

    // Close menu on desktop resize
    useEffect(() => {
      const handleResize = () => { if (window.innerWidth >= 768) setIsMenuOpen(false); };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const featuredProperties = useMemo(
    () => units.filter((p) => p.available && p.type !== "parking_slot"),
    [units]
  );

  useEffect(() => {
  const currentUnit = featuredProperties[currentSlide];
  if (!currentUnit?.videos?.[0]) return;

  const video = featuredVideoRefs.current[currentUnit.id];
  if (!video) return;

  video.pause();
  video.currentTime = 0;
  video.muted = true;
  video.load();

  const timeout = window.setTimeout(() => {
    void video.play().catch(() => {});
  }, 120);

  return () => {
    window.clearTimeout(timeout);
  };
}, [currentSlide, featuredProperties]);

  const announcementsToScroll = useMemo(
    () =>
      contentSettings.announcements.length > 3
        ? contentSettings.announcements.concat(contentSettings.announcements)
        : contentSettings.announcements,
    [contentSettings.announcements]
  );

  const historyImages = useMemo(
    () =>
      contentSettings.history.images && contentSettings.history.images.length > 0
        ? contentSettings.history.images
        : contentSettings.history.image
        ? [contentSettings.history.image]
        : ["/fallback-history.webp"],
    [contentSettings.history.images, contentSettings.history.image]
  );
  const [historySlide, setHistorySlide] = useState(0);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const openUnit = useCallback((unitId: string) => {
    setSelectedUnit(unitId);
  }, []);

  const closeUnit = useCallback(() => {
    setSelectedUnit(null);
  }, []);

  const handleInquirySubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      addInquiry(inquiryForm);
      setInquirySubmitted(true);
      setInquiryForm({
        firstName: "",
        lastName: "",
        email: "",
        subject: "",
        message: "",
      });
      setTimeout(() => setInquirySubmitted(false), 3000);
    },
    [addInquiry, inquiryForm]
  );

  const Unit = useMemo(
    () => (selectedUnit ? units.find((p) => p.id === selectedUnit) ?? null : null),
    [selectedUnit, units]
  );
  // Inside your LandingPage component, above the return statement
  useEffect(() => {
    if (featuredProperties.length <= 1 || selectedUnit) return;

    const timer = window.setInterval(() => {
      setCurrentSlide((prev) =>
        prev === featuredProperties.length - 1 ? 0 : prev + 1
      );
    }, 7000);

    return () => window.clearInterval(timer);
  }, [featuredProperties.length, selectedUnit]);

  useEffect(() => {
    if (currentSlide > Math.max(featuredProperties.length - 1, 0)) {
      setCurrentSlide(0);
    }
  }, [currentSlide, featuredProperties.length]);


  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans">
      {/* Modern Transparent Header */}
    <header className="bg-white/80 border-b border-gray-100 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex justify-between items-center">
      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
        <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl">
          <Building2 className="size-5 sm:size-6 text-white" />
        </div>
        <span className="text-base sm:text-xl font-bold text-slate-800">
          Commerciales<span className="text-blue-600">Flores</span>
        </span>
      </div>

      {/* Desktop Buttons */}
      <div className="hidden md:flex items-center gap-4">
        <button onClick={() => navigate('/login')} className="text-slate-600 font-semibold px-4 py-2 hover:text-blue-600">Login</button>
        <button onClick={() => navigate('/register')} className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-full hover:bg-blue-600 shadow-md">Sign Up</button>
      </div>

      {/* Hamburger Trigger */}
      <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMenuOpen(true)}>
        <Menu className="size-6" />
      </button>
    </div>
  </header>

  {/* Side Panel Overlay */}
  <AnimatePresence>
    {isMenuOpen && (
      <>
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60  z-[60] md:hidden"
        />

        {/* Sliding Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-[280px] sm:w-[320px] bg-white z-[70] shadow-2xl md:hidden flex flex-col"
        >
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <span className="font-bold text-slate-800">{contentSettings.menu.title}</span>
            <button onClick={closeMenu} className="p-2 hover:bg-slate-100 rounded-full">
              <X className="size-6 text-slate-500" />
            </button>
          </div>

          <nav className="p-6 space-y-2 flex-1">
            <button
              onClick={() => { navigate('/login'); setIsMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
            >
              <LogIn className="size-5" /> Login
            </button>
            <button
              onClick={() => { navigate('/register'); setIsMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors"            >
              <UserPlus className="size-5" /> Sign Up
            </button>
          </nav>

          <div className="p-6 border-t border-slate-100 text-xs text-slate-400 text-center">
            © 2026 Commerciales Flores
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
  

      {/* Hero Section: Dynamic & Clean */}
      <section className="relative min-h-[60vh] md:h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
          src={contentSettings.hero.image || "/fallback-hero.webp"}
          alt="Hero"
          loading="eager"
          decoding="async"
          {...{ fetchpriority: 'high' }}
          className="w-full h-full object-cover"
        />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase bg-blue-600 text-white rounded-full">
              {contentSettings.hero.badge}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-[1.1]">
              {contentSettings.hero.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-200 mb-6 sm:mb-10 leading-relaxed">
              {contentSettings.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
              <Link
                to={contentSettings.hero.primaryCtaLink || '/register'}
                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                {contentSettings.hero.primaryCtaText}
                <ArrowRight className="size-5" />
              </Link>

              <a
                href={contentSettings.hero.secondaryCtaLink || '#properties'}
                className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all"
              >
                {contentSettings.hero.secondaryCtaText}
              </a>
            </div>
          </motion.div>
        </div>
      </section>


      {/* Announcements: Modern horizontal scroll */}
      {contentSettings.announcements.length > 0 && (
        <section className="bg-yellow-50 py-4 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
  className="flex gap-6 whitespace-nowrap"
  animate={{ x: ["0%", "-100%"] }}
  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
>
  {announcementsToScroll.map((announcement, idx) => (
    <motion.div
      key={idx}
      className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-5 py-2 rounded-full font-semibold text-sm cursor-pointer hover:scale-105 hover:shadow-md transition-transform"
      whileHover={{ scale: 1.05, boxShadow: "0px 4px 12px rgba(0,0,0,0.1)" }}
    >
      📢 {announcement}
    </motion.div>
  ))}
</motion.div>
          </div>
        </section>
      )}

      {/* About Us */}
<section className="py-16 md:py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
  <motion.div
    className="max-w-5xl mx-auto text-center"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8 }}
  >
    {contentSettings.about.text?.trim() ? (
      <>
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            {contentSettings.about.eyebrow}
          </p>

          <h2 className="text-2xl md:text-4xl font-bold text-slate-900">
            {contentSettings.about.title}
          </h2>

          <p className="max-w-2xl mx-auto text-slate-600 text-base md:text-lg leading-relaxed">
            {contentSettings.about.text}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              {contentSettings.about.cards[0]?.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {contentSettings.about.cards[0]?.text}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              {contentSettings.about.cards[1]?.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {contentSettings.about.cards[1]?.text}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              {contentSettings.about.cards[2]?.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {contentSettings.about.cards[2]?.text}
            </p>
          </div>
        </div>
      </>
    ) : (
      <div className="max-w-3xl mx-auto rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 md:px-10 md:py-16">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100">
          <Info className="size-7 text-slate-400" />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
          {contentSettings.about.eyebrow || 'Who We Are'}
        </p>

        <h2 className="mt-3 text-2xl md:text-4xl font-bold text-slate-900">
          {contentSettings.about.title || 'About Us'}
        </h2>

        <p className="mt-4 max-w-2xl mx-auto text-slate-500 text-base md:text-lg leading-relaxed">
          Information about our company will be available soon.
        </p>
      </div>
    )}
  </motion.div>
</section>

<section className="py-16 md:py-24 bg-white px-4 sm:px-6 lg:px-8">
  {contentSettings.history.text?.trim() ? (
    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      {/* Slideshow / Image */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative"
      >
        <div className="relative overflow-hidden rounded-[2rem] shadow-xl border border-slate-200">
          <img
            src={historyImages[historySlide]}
            alt={contentSettings.history.title || `History slide ${historySlide + 1}`}
            loading="lazy"
            decoding="async"
            className="w-full h-[280px] sm:h-[380px] lg:h-[460px] object-cover transition-all duration-500"
          />

          {historyImages.length > 1 && (
            <>
              <button
                onClick={() =>
                  setHistorySlide((prev) =>
                    prev === 0 ? historyImages.length - 1 : prev - 1
                  )
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-md hover:bg-white"
              >
                <ChevronLeft className="size-5 text-slate-700" />
              </button>

              <button
                onClick={() =>
                  setHistorySlide((prev) =>
                    prev === historyImages.length - 1 ? 0 : prev + 1
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-md hover:bg-white"
              >
                <ChevronRight className="size-5 text-slate-700" />
              </button>
            </>
          )}
        </div>

        {historyImages.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {historyImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setHistorySlide(idx)}
                className={`h-2 rounded-full transition-all ${
                  historySlide === idx ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="space-y-5"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
          {contentSettings.history.eyebrow}
        </p>

        <h2 className="text-2xl md:text-4xl font-bold text-slate-900 leading-tight">
          {contentSettings.history.title || 'Growing Through the Years'}
        </h2>

        {contentSettings.history.subtitle && (
          <p className="text-slate-500 text-base md:text-lg leading-relaxed">
            {contentSettings.history.subtitle}
          </p>
        )}

        <p className="text-slate-600 text-base md:text-lg leading-relaxed whitespace-pre-line">
          {contentSettings.history.text}
        </p>

        <div className="space-y-4 pt-2">
          <div className="border-l-2 border-blue-200 pl-4">
            <h3 className="font-semibold text-slate-900">
              {contentSettings.history.points[0]?.title}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {contentSettings.history.points[0]?.text}
            </p>
          </div>

          <div className="border-l-2 border-blue-200 pl-4">
            <h3 className="font-semibold text-slate-900">
              {contentSettings.history.points[1]?.title}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {contentSettings.history.points[1]?.text}
            </p>
          </div>

          <div className="border-l-2 border-blue-200 pl-4">
            <h3 className="font-semibold text-slate-900">
              {contentSettings.history.points[2]?.title}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {contentSettings.history.points[2]?.text}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  ) : (
    <motion.div
      className="max-w-4xl mx-auto text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 md:px-10 md:py-16">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100">
          <Building2 className="size-7 text-slate-400" />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
          {contentSettings.history.eyebrow || 'Our History'}
        </p>

        <h2 className="mt-3 text-2xl md:text-4xl font-bold text-slate-900">
          {contentSettings.history.title || 'Our Story'}
        </h2>

        <p className="mt-4 max-w-2xl mx-auto text-slate-500 text-base md:text-lg leading-relaxed">
          Our story will be available soon.
        </p>
      </div>
    </motion.div>
  )}
</section>


     <section id="properties" className="py-12 md:py-24 bg-white overflow-hidden">

  {featuredProperties.length === 0 ? (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl md:rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 md:px-10 md:py-20 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100">
          <Building2 className="size-7 text-slate-400" />
        </div>

        <h3 className="text-lg md:text-2xl font-bold text-slate-900">
          {contentSettings.featured.emptyTitle}
        </h3>

        <p className="mt-2 text-sm md:text-base text-slate-500 max-w-xl mx-auto">
          {contentSettings.featured.emptyText}
        </p>
      </div>
    </div>
  ) : (
    <>
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 md:mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-slate-900 mb-2">
              {contentSettings.featured.title}
            </h2>
            <p className="text-slate-500 text-sm md:text-lg">
              {contentSettings.featured.subtitle}
            </p>
          </div>

          <Link
            to="/spaces"
            className="text-sm md:text-base flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 transition-colors group"
          >
            {contentSettings.featured.viewAllText}
            <ArrowRight className="size-4 md:size-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl md:rounded-[2rem]">
        <motion.div
          className="flex"
          animate={{ x: `-${currentSlide * 100}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        >
          {featuredProperties.map((Unit, index) => {
            const unitReviews = reviews.filter(
              (r) => r.unit_id === (Unit.id)
            );

            const averageRating =
              unitReviews.length > 0
                ? unitReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
                  unitReviews.length
                : 0;
            const isActiveSlide = currentSlide === index;

            return (
            <div
              key={Unit.id}
              className="w-full flex-shrink-0 cursor-pointer"
              onClick={() => openUnit(Unit.id)}
            >
              <div className="relative bg-slate-50 rounded-2xl md:rounded-[2rem] overflow-hidden border border-slate-100 mx-1">
                <div className="grid md:grid-cols-2">
                  <div className="relative h-[200px] sm:h-[250px] md:h-[500px] overflow-hidden">
                    {Unit.videos?.[0] ? (
                      isActiveSlide ? (
                        <motion.video
                          ref={(node) => {
                            featuredVideoRefs.current[Unit.id] = node;
                          }}
                          key={`${Unit.id}-active-video-${currentSlide}`}
                          whileHover={{ scale: 1.02 }}
                          src={Unit.videos[0]}
                          poster={Unit.images?.[0] || "/fallback-property.webp"}
                          muted
                          playsInline
                          preload="auto"
                          loop
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <motion.img
                          key={`${Unit.id}-inactive-poster`}
                          whileHover={{ scale: 1.05 }}
                          src={Unit.images?.[0] || "/fallback-property.webp"}
                          alt={Unit.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <motion.img
                        whileHover={{ scale: 1.05 }}
                        src={Unit.images?.[0] || "/fallback-property.webp"}
                        alt={Unit.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 rounded-full text-[10px] md:text-xs font-bold text-blue-600 shadow-sm">
                      {getUnitTypeLabel(Unit.type)}
                    </div>
                    {Unit.videos?.length ? (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-black/70 rounded-full text-[10px] md:text-xs font-bold text-white shadow-sm">
                        {Unit.videos.length} video{Unit.videos.length > 1 ? "s" : ""}
                      </div>
                    ) : null}
                  </div>

                  <div className="p-6 md:p-10 lg:p-12 flex flex-col justify-center">
                    <h3 className="text-lg md:text-3xl font-bold text-slate-900 mb-2 md:mb-4">
                      {Unit.name}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-500 mb-2 flex items-center gap-1">
                      <MapPin className="size-3 md:size-4 text-blue-600" /> {Unit.location}
                    </p>

                    <div className="mb-3 md:mb-4 flex items-center gap-1.5 text-xs md:text-sm">
                      {averageRating > 0 ? (
                        <>
                          <span className="text-amber-500">★</span>
                          <span className="font-semibold text-slate-900">
                            {averageRating.toFixed(1)}
                          </span>
                          <span className="text-slate-400">
                            ({unitReviews.length})
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">No ratings yet</span>
                      )}
                    </div>

                    <p className="text-slate-600 text-sm md:text-lg leading-relaxed mb-6 md:mb-8 line-clamp-3 md:line-clamp-4">
                      {Unit.description}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 md:pt-6 border-t border-slate-200">
                      <div>
                        <span className="text-[10px] md:text-sm text-slate-400 block uppercase tracking-wider font-semibold">
                          Price starts
                        </span>
                        <span className="text-lg md:text-2xl font-bold text-slate-900">
                          {formatCurrency(Unit.price)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-xs md:text-base px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )})}
        </motion.div>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {featuredProperties.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`h-1 md:h-1.5 transition-all duration-500 rounded-full ${
              currentSlide === idx ? "w-6 md:w-8 bg-blue-600" : "w-1.5 md:w-2 bg-slate-200"
            }`}
          />
        ))}
      </div>

      <button
        onClick={() =>
          setCurrentSlide((prev) =>
            prev === 0 ? featuredProperties.length - 1 : prev - 1
          )
        }
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white p-4 rounded-full shadow-xl text-slate-800 hover:text-blue-600 transition-all z-10 hidden md:block"
      >
        <ChevronLeft className="size-6" />
      </button>

      <button
        onClick={() =>
          setCurrentSlide((prev) =>
            prev === featuredProperties.length - 1 ? 0 : prev + 1
          )
        }
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full bg-white p-4 rounded-full shadow-xl text-slate-800 hover:text-blue-600 transition-all z-10 hidden md:block"
      >
        <ChevronRight className="size-6" />
      </button>
    </div>
    </>
  )}
</section>


      {/* Contact Section: Modern Form */}
<section id="contact" className="py-20 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12">
    <div className="rounded-2xl overflow-hidden shadow-lg h-full">

      <div className="bg-blue-600 text-white px-4 sm:px-6 lg:px-8 py-4">
        <h4 className="text-xl font-bold">{contentSettings.contact.locationTitle}</h4>
        <p className="text-sm">{contentSettings.contact.locationSubtitle}</p>
        {contentSettings.contact.address?.trim() && (
          <p className="mt-2 text-sm text-blue-100">
            {contentSettings.contact.address}
          </p>
        )}
      </div>
      <iframe
        src={`https://www.google.com/maps?q=${encodeURIComponent(contentSettings.contact.address)}&output=embed`}
        width="100%"
        height="100%"
        className="border-0 h-[300px] sm:h-[400px]"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Business location map"
      />
    </div>

    {/* Modern Form */}
<motion.div
  initial={{ opacity: 0, x: 30 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.8 }}
>
  <h3 className="text-lg font-semibold mb-4">{contentSettings.contact.title}</h3>
  <p className="text-gray-500 text-sm mb-6">{contentSettings.contact.subtitle}</p>
  <form onSubmit={handleInquirySubmit} className="space-y-4">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <input
      type="text"
      placeholder="First Name"
      value={inquiryForm.firstName}
      onChange={(e) =>
        setInquiryForm({ ...inquiryForm, firstName: e.target.value })
      }
      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
      required
    />

    <input
      type="text"
      placeholder="Last Name"
      value={inquiryForm.lastName}
      onChange={(e) =>
        setInquiryForm({ ...inquiryForm, lastName: e.target.value })
      }
      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
      required
    />
  </div>

  <input
    type="email"
    placeholder="Email"
    value={inquiryForm.email}
    onChange={(e) =>
      setInquiryForm({ ...inquiryForm, email: e.target.value })
    }
    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
    required
  />

  <input
    type="text"
    placeholder="Subject"
    value={inquiryForm.subject}
    onChange={(e) =>
      setInquiryForm({ ...inquiryForm, subject: e.target.value })
    }
    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
    required
  />

  <textarea
    placeholder="Message"
    value={inquiryForm.message}
    onChange={(e) =>
      setInquiryForm({ ...inquiryForm, message: e.target.value })
    }
    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
    rows={5}
    required
  />

  <button
    type="submit"
    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
  >
    Send Inquiry
  </button>

  {inquirySubmitted && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-green-700 text-center mt-2"
    >
      Thank you! We&apos;ve received your inquiry.
    </motion.div>
  )}
</form>
</motion.div>
  </div>
</section>

      {/* Modern Footer */}
<footer className="bg-gray-900 text-white py-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12">
    
    {/* Branding & Social */}
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-blue-600">
        {contentSettings.footer.brandName}
      </h2>
      <p className="text-gray-400 max-w-xs">
        {contentSettings.footer.brandDescription}
      </p>
      <div className="flex gap-4 mt-2">
        <a href="#" className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.34-1.6.57-2.46.68a4.3 4.3 0 0 0 1.88-2.37 8.59 8.59 0 0 1-2.72 1.04 4.28 4.28 0 0 0-7.3 3.9A12.14 12.14 0 0 1 3.15 4.7a4.28 4.28 0 0 0 1.32 5.72 4.27 4.27 0 0 1-1.94-.54v.05a4.28 4.28 0 0 0 3.44 4.2 4.28 4.28 0 0 1-1.93.07 4.28 4.28 0 0 0 3.99 2.97A8.58 8.58 0 0 1 2 19.54a12.1 12.1 0 0 0 6.56 1.92c7.88 0 12.2-6.54 12.2-12.2 0-.19-.01-.38-.02-.57A8.7 8.7 0 0 0 24 5.54a8.44 8.44 0 0 1-2.54.7z"/></svg>
        </a>
        <a href="#" className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.41 3.59 8 8 8h3v-6h-2v-2h2v-1.5c0-2 1.2-3.5 3-3.5.87 0 1.6.07 1.8.1v2.1h-1.25c-1 0-1.2.5-1.2 1.1V12h2.4l-.3 2h-2.1v6h4c4.41 0 8-3.59 8-8 0-5.5-4.46-9.96-9.96-9.96z"/></svg>
        </a>
      </div>
    </div>

    {/* Quick Links */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-100">
        {contentSettings.footer.quickLinksTitle}
      </h3>
      <ul className="space-y-2 text-gray-400">
        <li>
          <a href="#properties" className="hover:text-white transition-colors">
            Featured Spaces
          </a>
        </li>
        <li>
          <a href="#contact" className="hover:text-white transition-colors">
            Contact Us
          </a>
        </li>
      </ul>
    </div>

    {/* Contact Info */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-100">Get in Touch</h3>
      <p className="text-gray-400">Email: <a href={`mailto:${contentSettings.contact.email}`} className="hover:text-white">{contentSettings.contact.email}</a></p>
      <p className="text-gray-400">Phone: <a href={`tel:${contentSettings.contact.phone}`} className="hover:text-white">{contentSettings.contact.phone}</a></p>
      <p className="text-gray-400">{contentSettings.contact.address}</p>
    </div>

  </div>

  {/* Bottom */}
  <div className="mt-12 border-t border-gray-800 pt-6 text-center text-gray-500 text-sm">
  {contentSettings.footer.copyright}
  <br />
  {contentSettings.footer.privacyText}
</div>
</footer>

      {Unit && (
      <UnitModal
        Unit={Unit}
        onClose={closeUnit}
      />
    )}
    </div>
  );
}
