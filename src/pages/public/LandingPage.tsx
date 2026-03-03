import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useData } from "../../contexts/DataContext";
import { motion, AnimatePresence } from "framer-motion"; // Modern animations
import 'react-calendar/dist/Calendar.css';
import PropertyModal from "../../components/PropertyModal";
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Menu,
  Phone,
  MapPin,
  LogIn,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  getPropertyTypeLabel,
  getPriceLabel,
} from "../../utils/propertyHelpers";


export default function LandingPage() {
  const { properties, contentSettings, addInquiry } = useData();
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [containerWidth, setContainerWidth] = useState(0);
  const navigate = useNavigate();
  const visibleCards = 3;
  const gap = 24; // px
  const cardWidth = (containerWidth - gap * (visibleCards - 1)) / visibleCards;
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

  // Close menu on desktop resize
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setIsMenuOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter for slider
  const featuredProperties = properties.filter((p) => p.available && p.type !== "parking_slot");
  const announcementsToScroll =
  contentSettings.announcements.length > 3
    ? contentSettings.announcements.concat(contentSettings.announcements)
    : contentSettings.announcements;


  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addInquiry(inquiryForm);
    setInquirySubmitted(true);
    setInquiryForm({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setInquirySubmitted(false), 3000);
  };

  const property = selectedProperty ? properties.find((p) => p.id === selectedProperty) : null;
  // Inside your LandingPage component, above the return statement
  useEffect(() => {
  if (featuredProperties.length === 0) return;

  const timer = setInterval(() => {
    if (!selectedProperty) {
      setCurrentSlide((prev) =>
        prev === featuredProperties.length - 1 ? 0 : prev + 1
      );
    }
  }, 7000);

  return () => clearInterval(timer);
}, [featuredProperties.length, selectedProperty]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedProperty]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans">
      {/* Modern Transparent Header */}
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
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
            <span className="font-bold text-slate-800">Menu</span>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
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
            src={contentSettings.heroImage ?? '/fallback-hero.jpg'}
            className="w-full h-full object-cover"
            alt="Hero"
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
              Premium Spaces
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-[1.1]">
              {contentSettings.heroTitle}
            </h1>
            <p className="text-base sm:text-lg text-slate-200 mb-6 sm:mb-10 leading-relaxed">
              {contentSettings.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
              <Link to="/register" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2">
                Get Started <ArrowRight className="size-5" />
              </Link>
              <a href="#properties" className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
                Browse Collection
              </a>
            </div>
          </motion.div>
        </div>
      </section>


      {/* Announcements: Modern horizontal scroll */}
      {contentSettings.announcements.length > 0 && (
        <section className="bg-yellow-50 py-4 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-4 sm:px-6 lg:px-8 lg:px-8">
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
      <section className="py-12 md:py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-3xl mx-auto text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-2xl md:text-4xl font-bold text-slate-900">About Us</h2>
          <p className="text-gray-600 text-base md:text-lg leading-relaxed">
            {contentSettings.aboutUs}
          </p>
        </motion.div>
      </section>

      <section id="properties" className="py-12 md:py-24 bg-white overflow-hidden">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 md:mb-12">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div className="w-full">
        {/* Adjusted: text-xl on mobile, scales up to 4xl */}
        <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-slate-900 mb-2">
          Featured Space
        </h2>
        <p className="text-slate-500 text-sm md:text-lg">
          Experience our most premium locations.
        </p>
      </div>
      
      <div className="flex justify-between items-center w-full md:w-auto gap-6">
        <Link 
          to="/spaces" 
          className="text-sm md:text-base flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 transition-colors group whitespace-nowrap"
        >
          View all Spaces 
          <ArrowRight className="size-4 md:size-5 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

      </div>
    </div>
  </div>

  <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="overflow-hidden rounded-2xl md:rounded-[2rem]">
      <motion.div
        className="flex"
        animate={{ x: `-${currentSlide * 100}%` }}
        transition={{ type: "spring", stiffness: 50, damping: 15 }}
      >
        {featuredProperties.map((property) => (
          <div
            key={property.id}
            className="w-full flex-shrink-0 cursor-pointer"
            onClick={() => {
              setSelectedProperty(property.id);
              setCurrentImageIndex(0);
            }}
          >
            <div className="relative bg-slate-50 rounded-2xl md:rounded-[2rem] overflow-hidden border border-slate-100 mx-1">
              <div className="grid md:grid-cols-2">
                {/* Image Side */}
                <div className="relative h-[200px] sm:h-[250px] md:h-[500px] overflow-hidden">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    src={property.images[0]}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] md:text-xs font-bold text-blue-600 shadow-sm">
                    {getPropertyTypeLabel(property.type)}
                  </div>
                </div>

                {/* Content Side */}
                <div className="p-6 md:p-10 lg:p-12 flex flex-col justify-center">
                  {/* Adjusted: text-lg on mobile, 3xl on desktop */}
                  <h3 className="text-lg md:text-3xl font-bold text-slate-900 mb-2 md:mb-4">
                    {property.name}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4 flex items-center gap-1">
                    <MapPin className="size-3 md:size-4 text-blue-600" /> {property.location}
                  </p>
                  {/* Adjusted: smaller text and fewer lines visible on mobile */}
                  <p className="text-slate-600 text-sm md:text-lg leading-relaxed mb-6 md:mb-8 line-clamp-3 md:line-clamp-4">
                    {property.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 md:pt-6 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] md:text-sm text-slate-400 block uppercase tracking-wider font-semibold">Price starts</span>
                      <span className="text-lg md:text-2xl font-bold text-slate-900">
                        {formatCurrency(property.price)}
                      </span>
                    </div>
                    {/* Added styling to your button */}
                    <button type="button" className="text-xs md:text-base px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>

    {/* Progress Indicators - Centered Below Slider */}
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
    
    {/* Navigation Arrows (Hidden on mobile via hidden md:block) */}
    <button
      onClick={() => setCurrentSlide((prev) => (prev === 0 ? featuredProperties.length - 1 : prev - 1))}
      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white p-4 rounded-full shadow-xl text-slate-800 hover:text-blue-600 transition-all z-10 hidden md:block"
    >
      <ChevronLeft className="size-6" />
    </button>
    <button
      onClick={() => setCurrentSlide((prev) => (prev === featuredProperties.length - 1 ? 0 : prev + 1))}
      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full bg-white p-4 rounded-full shadow-xl text-slate-800 hover:text-blue-600 transition-all z-10 hidden md:block"
    >
      <ChevronRight className="size-6" />
    </button>
  </div>
</section>


      {/* Contact Section: Modern Form */}
<section id="contact" className="py-20 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12">
    <div className="rounded-2xl overflow-hidden shadow-lg h-full">

      <div className="bg-blue-600 text-white px-4 sm:px-6 lg:px-8 py-4">
        <h4 className="text-xl font-bold">Our Location</h4>
        <p className="text-sm">Visit us</p>
      </div>
      <iframe
        src={`https://www.google.com/maps?q=${encodeURIComponent(contentSettings.contactAddress)}&output=embed`}

        width="100%"
        height="100%"
        className="border-0 h-[300px] sm:h-[400px]"
        allowFullScreen
        loading="lazy"
      ></iframe>
    </div>

    {/* Modern Form */}
<motion.div
  initial={{ opacity: 0, x: 30 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.8 }}
>
  <h3 className="text-lg font-semibold mb-4">Send us a message</h3>
  <p className="text-gray-500 text-sm mb-6">We’ll get back to you as soon as possible.</p>
  <form onSubmit={handleInquirySubmit} className="space-y-4">
    {['name', 'email', 'subject', 'message'].map((field) => (
      <div key={field}>
        {field === 'message' ? (
          <textarea
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={(inquiryForm as any)[field]}
            onChange={(e) => setInquiryForm({ ...inquiryForm, [field]: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            rows={5} // Adjust number of lines
            required
          />
        ) : (
          <input
            type={field === 'email' ? 'email' : 'text'}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={(inquiryForm as any)[field]}
            onChange={(e) => setInquiryForm({ ...inquiryForm, [field]: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            required
          />
        )}
      </div>
    ))}
    <button
      type="submit"
      className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
    >
      Send Inquiry
    </button>
    {inquirySubmitted && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-700 text-center mt-2">
        Thank you! We've received your inquiry.
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
      <h2 className="text-2xl font-bold text-blue-600">Commerciales Flores</h2>
      <p className="text-gray-400 max-w-xs">
        Premium rental spaces and function halls for your business or event needs.
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
      <h3 className="text-lg font-semibold text-gray-100">Quick Links</h3>
      <ul className="space-y-2 text-gray-400">
        <li><a href="#properties" className="hover:text-white transition-colors">Featured Spaces</a></li>
        <li><a href="#contact" className="hover:text-white transition-colors">Contact Us</a></li>
        <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
        <li><a href="/faq" className="hover:text-white transition-colors">FAQ</a></li>
      </ul>
    </div>

    {/* Contact Info */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-100">Get in Touch</h3>
      <p className="text-gray-400">Email: <a href={`mailto:${contentSettings.contactEmail}`} className="hover:text-white">{contentSettings.contactEmail}</a></p>
      <p className="text-gray-400">Phone: <a href={`tel:${contentSettings.contactPhone}`} className="hover:text-white">{contentSettings.contactPhone}</a></p>
      <p className="text-gray-400">{contentSettings.contactAddress}</p>
    </div>

  </div>

  {/* Bottom */}
  <div className="mt-12 border-t border-gray-800 pt-6 text-center text-gray-500 text-sm">
    © 2025 Commerciales Flores. All rights reserved. <br />
    Compliant with the Philippine Data Privacy Act of 2012
  </div>
</footer>

      {property && (
        <PropertyModal
          property={property}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
