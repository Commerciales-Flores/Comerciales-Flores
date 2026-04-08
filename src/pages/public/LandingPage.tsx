import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useUnits } from "../../contexts/UnitsContext";
import { useContentSettings } from "../../contexts/ContentSettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import "react-calendar/dist/Calendar.css";
import UnitModal from "../../components/PropertyModal";
import { useReviews } from "../../contexts/ReviewsContext";
import { useInquiries } from "../../contexts/InquiriesContext";
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
  Info,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { getUnitTypeLabel } from "../../utils/propertyHelpers";
import {
  sanitizeNameInput,
  sanitizeEmailInput,
  sanitizePlainText,
} from "../../utils/DataNormalization";

export default function LandingPage() {
  const { units } = useUnits();
  const { contentSettings } = useContentSettings();
  const { createTicket } = useInquiries();
  const { reviews } = useReviews();

  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [inquiryError, setInquiryError] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [historySlide, setHistorySlide] = useState(0);
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

  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const openUnit = useCallback((unitId: string) => {
    setSelectedUnit(unitId);
  }, []);

  const closeUnit = useCallback(() => {
    setSelectedUnit(null);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
  console.log("hero image:", contentSettings.hero.image);
}, [contentSettings.hero.image]);

  const { featuredProperties, unitsById } = useMemo(() => {
    const map = new Map<string, (typeof units)[number]>();
    const featured: typeof units = [];

    for (const unit of units) {
      map.set(unit.id, unit);

      if (unit.available && unit.type !== "parking_slot") {
        featured.push(unit);
      }
    }

    return {
      featuredProperties: featured,
      unitsById: map,
    };
  }, [units]);

  const reviewSummaryByUnitId = useMemo(() => {
    const temp = new Map<string, { total: number; count: number }>();

    for (const review of reviews) {
      if (!review.unit_id) continue;

      if (!temp.has(review.unit_id)) {
        temp.set(review.unit_id, { total: 0, count: 0 });
      }

      const entry = temp.get(review.unit_id)!;
      entry.total += review.rating || 0;
      entry.count += 1;
    }

    const result = new Map<string, { avg: number; count: number }>();

    for (const [unitId, entry] of temp.entries()) {
      result.set(unitId, {
        avg: entry.count > 0 ? entry.total / entry.count : 0,
        count: entry.count,
      });
    }

    return result;
  }, [reviews]);

  const featuredSlides = useMemo(() => {
    return featuredProperties.map((unit, index) => {
      const summary = reviewSummaryByUnitId.get(unit.id);

      return {
        unit,
        index,
        averageRating: summary?.avg ?? 0,
        reviewCount: summary?.count ?? 0,
      };
    });
  }, [featuredProperties, reviewSummaryByUnitId]);

  const activeFeaturedUnit = featuredProperties[currentSlide] ?? null;

  useEffect(() => {
    if (!activeFeaturedUnit?.videos?.[0]) return;

    const video = featuredVideoRefs.current[activeFeaturedUnit.id];
    if (!video) return;

    video.pause();
    video.currentTime = 0;
    video.muted = true;

    if (video.readyState < 2) {
      video.load();
    }

    const timeout = window.setTimeout(() => {
      void video.play().catch(() => {});
    }, 120);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeFeaturedUnit]);

  const announcementsToScroll = useMemo(() => {
    return contentSettings.announcements.length > 3
      ? contentSettings.announcements.concat(contentSettings.announcements)
      : contentSettings.announcements;
  }, [contentSettings.announcements]);

  const historyImages = useMemo(() => {
    return contentSettings.history.images && contentSettings.history.images.length > 0
      ? contentSettings.history.images
      : contentSettings.history.image
        ? [contentSettings.history.image]
        : ["/fallback-history.webp"];
  }, [contentSettings.history.images, contentSettings.history.image]);

  const selectedUnitData = useMemo(() => {
    return selectedUnit ? unitsById.get(selectedUnit) ?? null : null;
  }, [selectedUnit, unitsById]);

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

  const updateInquiryField = useCallback(
  (field: keyof typeof inquiryForm, value: string) => {
    setInquiryError("");
    setInquirySubmitted(false);

    let sanitized = value;

    switch (field) {
      case "firstName":
      case "lastName":
        sanitized = sanitizeNameInput(value);
        break;

      case "email":
        sanitized = sanitizeEmailInput(value);
        break;

      case "subject":
      case "message":
        sanitized = sanitizePlainText(value);
        break;

      default:
        sanitized = value;
    }

    setInquiryForm((prev) => ({
      ...prev,
      [field]: sanitized,
    }));
  },
  []
);

  const handleInquirySubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isSubmittingInquiry) return;

      const trimmedFirstName = inquiryForm.firstName.trim();
      const trimmedLastName = inquiryForm.lastName.trim();
      const trimmedEmail = inquiryForm.email.trim().toLowerCase();
      const trimmedSubject = inquiryForm.subject.trim();
      const trimmedMessage = inquiryForm.message.trim();

      if (
        !trimmedFirstName ||
        !trimmedLastName ||
        !trimmedEmail ||
        !trimmedSubject ||
        !trimmedMessage
      ) {
        setInquiryError("Please complete all fields before sending your inquiry.");
        setInquirySubmitted(false);
        return;
      }

      setInquiryError("");
      setInquirySubmitted(false);
      setIsSubmittingInquiry(true);

      try {
        await createTicket({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail,
          subject: trimmedSubject,
          message: trimmedMessage,
        });

        setInquirySubmitted(true);
        setInquiryForm({
          firstName: "",
          lastName: "",
          email: "",
          subject: "",
          message: "",
        });
      } catch (error) {
        console.error("Failed to submit inquiry:", error);
        setInquiryError("We couldn't send your inquiry right now. Please try again.");
      } finally {
        setIsSubmittingInquiry(false);
      }
    },
    [createTicket, inquiryForm, isSubmittingInquiry]
  );

  console.log("hero image:", contentSettings.hero.image);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-900">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <div
            className="group flex cursor-pointer items-center gap-2"
            onClick={() => navigate("/")}
          >
            <div className="rounded-xl bg-blue-600 p-1.5 sm:p-2">
              <Building2 className="size-5 text-white sm:size-6" />
            </div>
            <span className="text-base font-bold text-slate-800 sm:text-xl">
              Commerciales<span className="text-blue-600">Flores</span>
            </span>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-blue-600"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="rounded-full bg-slate-900 px-6 py-2.5 font-semibold text-white shadow-md hover:bg-blue-600"
            >
              Sign Up
            </button>
          </div>

          <button className="p-2 text-slate-600 md:hidden" onClick={openMenu}>
            <Menu className="size-6" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 z-[60] bg-slate-900/60 md:hidden"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-[70] flex h-full w-[280px] flex-col bg-white shadow-2xl sm:w-[320px] md:hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <span className="font-bold text-slate-800">
                  {contentSettings.menu.title}
                </span>
                <button onClick={closeMenu} className="rounded-full p-2 hover:bg-slate-100">
                  <X className="size-6 text-slate-500" />
                </button>
              </div>

              <nav className="flex-1 space-y-2 p-6">
                <button
                  onClick={() => {
                    navigate("/login");
                    closeMenu();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <LogIn className="size-5" /> Login
                </button>
                <button
                  onClick={() => {
                    navigate("/register");
                    closeMenu();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <UserPlus className="size-5" /> Sign Up
                </button>
              </nav>

              <div className="border-t border-slate-100 p-6 text-center text-xs text-slate-400">
                © 2026 Commerciales Flores
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      <section className="relative flex min-h-[60vh] items-center overflow-hidden md:h-[85vh]">
        <div className="absolute inset-0 z-0">
          <img
            src={
              contentSettings.hero.image
                ? `https://nlermulroebcmfwvyhmo.supabase.co/storage/v1/object/public/property_media/${contentSettings.hero.image}`
                : "/fallback-hero.webp"
            }
            alt="Hero"
            loading="eager"
            decoding="async"
            {...{ fetchpriority: "high" }}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="mb-6 inline-block rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
              {contentSettings.hero.badge}
            </span>
            <h1 className="mb-4 text-2xl font-extrabold leading-[1.1] text-white sm:text-3xl md:mb-6 md:text-5xl lg:text-7xl">
              {contentSettings.hero.title}
            </h1>
            <p className="mb-6 text-base leading-relaxed text-slate-200 sm:text-lg md:mb-10">
              {contentSettings.hero.subtitle}
            </p>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                to={contentSettings.hero.primaryCtaLink || "/register"}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-bold text-white transition-all hover:bg-blue-700"
              >
                {contentSettings.hero.primaryCtaText}
                <ArrowRight className="size-5" />
              </Link>

              <a
                href={contentSettings.hero.secondaryCtaLink || "#properties"}
                className="rounded-xl border border-white/20 bg-white/10 px-8 py-4 font-bold text-white transition-all hover:bg-white/20"
              >
                {contentSettings.hero.secondaryCtaText}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {contentSettings.announcements.length > 0 && (
        <section className="relative overflow-hidden bg-yellow-50 py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="flex gap-6 whitespace-nowrap"
              animate={{ x: ["0%", "-100%"] }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            >
              {announcementsToScroll.map((announcement, idx) => (
                <motion.div
                  key={idx}
                  className="cursor-pointer rounded-full bg-yellow-100 px-5 py-2 text-sm font-semibold text-yellow-800 transition-transform hover:scale-105 hover:shadow-md"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  📢 {announcement}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      <section className="bg-gray-50 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <motion.div
          className="mx-auto max-w-5xl text-center"
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

                <h2 className="text-2xl font-bold text-slate-900 md:text-4xl">
                  {contentSettings.about.title}
                </h2>

                <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                  {contentSettings.about.text}
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
                {contentSettings.about.cards.slice(0, 3).map((card, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <h3 className="mb-2 text-sm font-bold text-slate-900">
                      {card?.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-500">
                      {card?.text}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 md:px-10 md:py-16">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100">
                <Info className="size-7 text-slate-400" />
              </div>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                {contentSettings.about.eyebrow || "Who We Are"}
              </p>

              <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-4xl">
                {contentSettings.about.title || "About Us"}
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500 md:text-lg">
                Information about our company will be available soon.
              </p>
            </div>
          )}
        </motion.div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        {contentSettings.history.text?.trim() ? (
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 shadow-xl">
                <img
                  src={historyImages[historySlide]}
                  alt={
                    contentSettings.history.title || `History slide ${historySlide + 1}`
                  }
                  loading="lazy"
                  decoding="async"
                  className="h-[280px] w-full object-cover transition-all duration-500 sm:h-[380px] lg:h-[460px]"
                />

                {historyImages.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setHistorySlide((prev) =>
                          prev === 0 ? historyImages.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-md hover:bg-white"
                    >
                      <ChevronLeft className="size-5 text-slate-700" />
                    </button>

                    <button
                      onClick={() =>
                        setHistorySlide((prev) =>
                          prev === historyImages.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-md hover:bg-white"
                    >
                      <ChevronRight className="size-5 text-slate-700" />
                    </button>
                  </>
                )}
              </div>

              {historyImages.length > 1 && (
                <div className="mt-4 flex justify-center gap-2">
                  {historyImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setHistorySlide(idx)}
                      className={`h-2 rounded-full transition-all ${
                        historySlide === idx ? "w-8 bg-blue-600" : "w-2 bg-slate-300"
                      }`}
                    />
                  ))}
                </div>
              )}
            </motion.div>

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

              <h2 className="text-2xl font-bold leading-tight text-slate-900 md:text-4xl">
                {contentSettings.history.title || "Growing Through the Years"}
              </h2>

              {contentSettings.history.subtitle && (
                <p className="text-base leading-relaxed text-slate-500 md:text-lg">
                  {contentSettings.history.subtitle}
                </p>
              )}

              <p className="whitespace-pre-line text-base leading-relaxed text-slate-600 md:text-lg">
                {contentSettings.history.text}
              </p>

              <div className="space-y-4 pt-2">
                {contentSettings.history.points.slice(0, 3).map((point, index) => (
                  <div key={index} className="border-l-2 border-blue-200 pl-4">
                    <h3 className="font-semibold text-slate-900">{point?.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{point?.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <motion.div
            className="mx-auto max-w-4xl text-center"
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
                {contentSettings.history.eyebrow || "Our History"}
              </p>

              <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-4xl">
                {contentSettings.history.title || "Our Story"}
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500 md:text-lg">
                Our story will be available soon.
              </p>
            </div>
          </motion.div>
        )}
      </section>

      <section id="properties" className="overflow-hidden bg-white py-12 md:py-24">
        {featuredProperties.length === 0 ? (
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center md:rounded-[2rem] md:px-10 md:py-20">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100">
                <Building2 className="size-7 text-slate-400" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 md:text-2xl">
                {contentSettings.featured.emptyTitle}
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 md:text-base">
                {contentSettings.featured.emptyText}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-8 max-w-7xl px-4 sm:px-6 lg:px-8 md:mb-12">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h2 className="mb-2 text-xl font-bold text-slate-900 sm:text-2xl md:text-4xl">
                    {contentSettings.featured.title}
                  </h2>
                  <p className="text-sm text-slate-500 md:text-lg">
                    {contentSettings.featured.subtitle}
                  </p>
                </div>

                <Link
                  to="/spaces"
                  className="group flex items-center gap-2 text-sm font-bold text-blue-600 transition-colors hover:text-blue-700 md:text-base"
                >
                  {contentSettings.featured.viewAllText}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 md:size-5" />
                </Link>
              </div>
            </div>

            <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded-2xl md:rounded-[2rem]">
                <motion.div
                  className="flex"
                  animate={{ x: `-${currentSlide * 100}%` }}
                  transition={{ type: "spring", stiffness: 50, damping: 15 }}
                >
                  {featuredSlides.map(({ unit, index, averageRating, reviewCount }) => {
                    const isActiveSlide = currentSlide === index;

                    return (
                      <div
                        key={unit.id}
                        className="w-full flex-shrink-0 cursor-pointer"
                        onClick={() => openUnit(unit.id)}
                      >
                        <div className="mx-1 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 md:rounded-[2rem]">
                          <div className="grid md:grid-cols-2">
                            <div className="relative h-[200px] overflow-hidden sm:h-[250px] md:h-[500px]">
                              {unit.videos?.[0] ? (
                                isActiveSlide ? (
                                  <motion.video
                                    ref={(node) => {
                                      featuredVideoRefs.current[unit.id] = node;
                                    }}
                                    key={`${unit.id}-active-video-${currentSlide}`}
                                    whileHover={{ scale: 1.02 }}
                                    src={unit.videos[0]}
                                    poster={unit.images?.[0] || "/fallback-property.webp"}
                                    muted
                                    playsInline
                                    preload="auto"
                                    loop
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <motion.img
                                    key={`${unit.id}-inactive-poster`}
                                    whileHover={{ scale: 1.05 }}
                                    src={unit.images?.[0] || "/fallback-property.webp"}
                                    alt={unit.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                  />
                                )
                              ) : (
                                <motion.img
                                  whileHover={{ scale: 1.05 }}
                                  src={unit.images?.[0] || "/fallback-property.webp"}
                                  alt={unit.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                />
                              )}

                              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-blue-600 shadow-sm md:text-xs">
                                {getUnitTypeLabel(unit.type)}
                              </div>

                              {unit.videos?.length ? (
                                <div className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-[10px] font-bold text-white shadow-sm md:text-xs">
                                  {unit.videos.length} video
                                  {unit.videos.length > 1 ? "s" : ""}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
                              <h3 className="mb-2 text-lg font-bold text-slate-900 md:mb-4 md:text-3xl">
                                {unit.name}
                              </h3>
                              <p className="mb-2 flex items-center gap-1 text-xs text-slate-500 md:text-sm">
                                <MapPin className="size-3 text-blue-600 md:size-4" />
                                {unit.location}
                              </p>

                              <div className="mb-3 flex items-center gap-1.5 text-xs md:mb-4 md:text-sm">
                                {averageRating > 0 ? (
                                  <>
                                    <span className="text-amber-500">★</span>
                                    <span className="font-semibold text-slate-900">
                                      {averageRating.toFixed(1)}
                                    </span>
                                    <span className="text-slate-400">
                                      ({reviewCount})
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-400">No ratings yet</span>
                                )}
                              </div>

                              <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-slate-600 md:mb-8 md:line-clamp-4 md:text-lg">
                                {unit.description}
                              </p>

                              <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-4 md:pt-6">
                                <div>
                                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 md:text-sm">
                                    Price starts
                                  </span>
                                  <span className="text-lg font-bold text-slate-900 md:text-2xl">
                                    {formatCurrency(unit.price)}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs text-white transition-colors hover:bg-blue-600 md:text-base"
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </div>

              <div className="mt-6 flex justify-center gap-2">
                {featuredProperties.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-1 rounded-full transition-all duration-500 md:h-1.5 ${
                      currentSlide === idx
                        ? "w-6 bg-blue-600 md:w-8"
                        : "w-1.5 bg-slate-200 md:w-2"
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
                className="absolute left-0 top-1/2 z-10 hidden -translate-x-full -translate-y-1/2 rounded-full bg-white p-4 text-slate-800 shadow-xl transition-all hover:text-blue-600 md:block"
              >
                <ChevronLeft className="size-6" />
              </button>

              <button
                onClick={() =>
                  setCurrentSlide((prev) =>
                    prev === featuredProperties.length - 1 ? 0 : prev + 1
                  )
                }
                className="absolute right-0 top-1/2 z-10 hidden translate-x-full -translate-y-1/2 rounded-full bg-white p-4 text-slate-800 shadow-xl transition-all hover:text-blue-600 md:block"
              >
                <ChevronRight className="size-6" />
              </button>
            </div>
          </>
        )}
      </section>

      <section id="contact" className="bg-gray-50 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="h-full overflow-hidden rounded-2xl shadow-lg">
            <div className="bg-blue-600 px-4 py-4 text-white sm:px-6 lg:px-8">
              <h4 className="text-xl font-bold">
                {contentSettings.contact.locationTitle}
              </h4>
              <p className="text-sm">{contentSettings.contact.locationSubtitle}</p>
              {contentSettings.contact.address?.trim() && (
                <p className="mt-2 text-sm text-blue-100">
                  {contentSettings.contact.address}
                </p>
              )}
            </div>

            <iframe
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                contentSettings.contact.address
              )}&output=embed`}
              width="100%"
              height="100%"
              className="h-[300px] border-0 sm:h-[400px]"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Business location map"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h3 className="mb-4 text-lg font-semibold">
              {contentSettings.contact.title}
            </h3>
            <p className="mb-6 text-sm text-gray-500">
              {contentSettings.contact.subtitle}
            </p>

            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="First Name"
                  disabled={isSubmittingInquiry}
                  value={inquiryForm.firstName}
                  onChange={(e) => updateInquiryField("firstName", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />

                <input
                  type="text"
                  maxLength={100}
                  placeholder="Last Name"
                  disabled={isSubmittingInquiry}
                  value={inquiryForm.lastName}
                  onChange={(e) => updateInquiryField("lastName", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <input
                type="email"
                maxLength={150}
                placeholder="Email"
                value={inquiryForm.email}
                disabled={isSubmittingInquiry}
                onChange={(e) => updateInquiryField("email", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <p className="text-xs leading-relaxed text-gray-500">
                This inquiry is a one-time submission. Our team will reply directly
                to your email.
                <span className="mt-1 block">
                  Want a smoother experience?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Create an account
                  </button>{" "}
                  to continue conversations and manage your requests.
                </span>
              </p>

              <input
                type="text"
                maxLength={150}
                placeholder="Subject"
                value={inquiryForm.subject}
                disabled={isSubmittingInquiry}
                onChange={(e) => updateInquiryField("subject", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <textarea
                placeholder="Message"
                maxLength={2000}
                value={inquiryForm.message}
                disabled={isSubmittingInquiry}
                onChange={(e) => updateInquiryField("message", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={5}
                required
              />

              <button
                type="submit"
                disabled={isSubmittingInquiry}
                className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingInquiry ? "Sending Inquiry..." : "Send Inquiry"}
              </button>

              {inquiryError && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left"
                >
                  <p className="text-sm font-semibold text-red-800">
                    Inquiry not sent
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-red-700">
                    {inquiryError}
                  </p>
                </motion.div>
              )}

              {inquirySubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-left"
                >
                  <p className="text-sm font-semibold text-green-800">
                    Thanks for your inquiry.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-green-700">
                    We’ll get back to you through the email address you provided.
                    If you don’t receive any message from us, please make sure the
                    email you entered is correct and check your spam or junk folder
                    as well.
                  </p>
                </motion.div>
              )}
            </form>
          </motion.div>
        </div>
      </section>

      <footer className="bg-gray-900 py-16 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:grid-cols-2 sm:px-6 md:grid-cols-3 lg:px-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-blue-600">
              {contentSettings.footer.brandName}
            </h2>
            <p className="max-w-xs text-gray-400">
              {contentSettings.footer.brandDescription}
            </p>
            <div className="mt-2 flex gap-4">
              <a
                href="#"
                className="rounded-full bg-blue-600 p-2 transition-colors hover:bg-blue-700"
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22.46 6c-.77.34-1.6.57-2.46.68a4.3 4.3 0 0 0 1.88-2.37 8.59 8.59 0 0 1-2.72 1.04 4.28 4.28 0 0 0-7.3 3.9A12.14 12.14 0 0 1 3.15 4.7a4.28 4.28 0 0 0 1.32 5.72 4.27 4.27 0 0 1-1.94-.54v.05a4.28 4.28 0 0 0 3.44 4.2 4.28 4.28 0 0 1-1.93.07 4.28 4.28 0 0 0 3.99 2.97A8.58 8.58 0 0 1 2 19.54a12.1 12.1 0 0 0 6.56 1.92c7.88 0 12.2-6.54 12.2-12.2 0-.19-.01-.38-.02-.57A8.7 8.7 0 0 0 24 5.54a8.44 8.44 0 0 1-2.54.7z" />
                </svg>
              </a>
              <a
                href="#"
                className="rounded-full bg-blue-600 p-2 transition-colors hover:bg-blue-700"
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.41 3.59 8 8 8h3v-6h-2v-2h2v-1.5c0-2 1.2-3.5 3-3.5.87 0 1.6.07 1.8.1v2.1h-1.25c-1 0-1.2.5-1.2 1.1V12h2.4l-.3 2h-2.1v6h4c4.41 0 8-3.59 8-8 0-5.5-4.46-9.96-9.96-9.96z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-100">
              {contentSettings.footer.quickLinksTitle}
            </h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#properties" className="transition-colors hover:text-white">
                  Featured Spaces
                </a>
              </li>
              <li>
                <a href="#contact" className="transition-colors hover:text-white">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-100">Get in Touch</h3>
            <p className="text-gray-400">
              Email:{" "}
              <a
                href={`mailto:${contentSettings.contact.email}`}
                className="hover:text-white"
              >
                {contentSettings.contact.email}
              </a>
            </p>
            <p className="text-gray-400">
              Phone:{" "}
              <a
                href={`tel:${contentSettings.contact.phone}`}
                className="hover:text-white"
              >
                {contentSettings.contact.phone}
              </a>
            </p>
            <p className="text-gray-400">{contentSettings.contact.address}</p>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
          {contentSettings.footer.copyright}
          <br />
          {contentSettings.footer.privacyText}
        </div>
      </footer>

      {selectedUnitData && (
        <UnitModal Unit={selectedUnitData} onClose={closeUnit} />
      )}
    </div>
  );
}