import { Link } from "react-router-dom";
import { useState } from "react";
import { useData } from "../../contexts/DataContext";
import 'react-calendar/dist/Calendar.css';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CreditCard,
  Shield
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  getPropertyTypeLabel,
  getPriceLabel,
} from "../../utils/propertyHelpers";

export default function LandingPage() {
  const {
    units, 
    contentSettings,
    addInquiry,
  } = useData();

  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const featuredUnits = units.filter((u) => u.available).slice(0, 6);

  const selectedUnitData = selectedUnit
    ? units.find((u) => u.id === selectedUnit)
    : null;

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addInquiry(inquiryForm);
    setInquirySubmitted(true);
    setInquiryForm({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setInquirySubmitted(false), 3000);
  };

  const nextImage = () => {
    if (selectedUnitData) {
      setCurrentImageIndex(
        (prev) => (prev + 1) % selectedUnitData.images.length
      );
    }
  };

  const prevImage = () => {
    if (selectedUnitData) {
      setCurrentImageIndex(
        (prev) =>
          (prev - 1 + selectedUnitData.images.length) %
          selectedUnitData.images.length
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Building2 className="size-8 text-blue-600" />
              <h1 className="text-blue-600">Commerciales Flores</h1>
            </div>
            <div className="flex gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center text-white py-20"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=1167&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
        }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="mb-4">{contentSettings.heroTitle}</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {contentSettings.heroSubtitle}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/register"
              className="px-6 py-3 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Get Started
            </Link>
            <a
              href="#properties"
              className="px-6 py-3 border border-white text-white rounded-lg hover:bg-white hover:text-blue-700 transition-colors"
            >
              View Properties
            </a>
          </div>
        </div>
      </section>

      {/* Announcements */}
      {contentSettings.announcements.length > 0 && (
        <section className="bg-yellow-50 border-b border-yellow-100 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-1">
              {contentSettings.announcements.map((announcement, index) => (
                <p key={index} className="text-sm text-yellow-800">
                  📢 {announcement}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Us */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">About Us</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              {contentSettings.aboutUs}
            </p>
          </div>
        </div>
      </section>

      {/* ✅ RESTORED: Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">Why Choose Commerciales Flores</h2>
            <p className="text-gray-600">
              Complete rental management solution for your business needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-gray-900 mb-2 font-semibold">Diverse Spaces</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Office units, function halls, and parking areas to meet all your needs
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-gray-900 mb-2 font-semibold">Easy Booking</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                View availability and book spaces online with instant confirmation
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-gray-900 mb-2 font-semibold">Payment Tracking</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Keep track of all your payments and transaction history securely
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-gray-900 mb-2 font-semibold">Secure & Reliable</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your data and transactions are protected with enterprise-grade security
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section id="properties" className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">Featured Properties</h2>
            <p className="text-gray-600">
              Browse our available rental spaces, function halls, and parking areas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredUnits.map((unit) => (
              <div
                key={unit.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedUnit(unit.id);
                  setCurrentImageIndex(0);
                }}
              >
                <img
                  src={unit.images[0]}
                  alt={unit.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="text-xs text-blue-600 mb-1">
                    {getPropertyTypeLabel(unit.type)}
                  </div>
                  <h3 className="mb-2">{unit.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {unit.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-blue-600 font-semibold">
                        {formatCurrency(unit.price)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getPriceLabel(unit.type)}
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="mb-6">Contact Us</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="size-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{contentSettings.contactEmail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="size-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{contentSettings.contactPhone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="size-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-900">{contentSettings.contactAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4">Send us a message</h3>
              <p className="text-sm text-gray-600 mb-4">
                No account required. We'll get back to you shortly.
              </p>
              {inquirySubmitted && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  Thank you! We've received your inquiry.
                </div>
              )}
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={inquiryForm.name}
                    onChange={(e) =>
                      setInquiryForm({ ...inquiryForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={inquiryForm.email}
                    onChange={(e) =>
                      setInquiryForm({ ...inquiryForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    required
                    value={inquiryForm.subject}
                    onChange={(e) =>
                      setInquiryForm({ ...inquiryForm, subject: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Message</label>
                  <textarea
                    required
                    value={inquiryForm.message}
                    onChange={(e) =>
                      setInquiryForm({ ...inquiryForm, message: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Inquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 Commerciales Flores. All rights reserved.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Compliant with the Philippine Data Privacy Act of 2012
          </p>
        </div>
      </footer>

      {/* Property Detail Modal */}
      {selectedUnitData && (
        <div className="fixed inset-0 z-50 p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUnit(null)}></div>
          <div className="relative bg-white rounded-lg max-w-4xl w-full mx-auto my-8 shadow-xl">
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <div>
                <div className="text-sm text-blue-600 mb-1 font-medium">
                  {getPropertyTypeLabel(selectedUnitData.type)}
                </div>
                <h2 className="text-xl font-bold">{selectedUnitData.name}</h2>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="relative">
                <img
                  src={selectedUnitData.images[currentImageIndex]}
                  alt={selectedUnitData.name}
                  className="w-full h-96 object-cover rounded-lg"
                />
                {selectedUnitData.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-2 rounded-full hover:bg-opacity-100 transition-all shadow-md"
                    >
                      <ChevronLeft className="size-6 text-gray-800" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-2 rounded-full hover:bg-opacity-100 transition-all shadow-md"
                    >
                      <ChevronRight className="size-6 text-gray-800" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {selectedUnitData.images.map((_, index) => (
                        <div
                          key={index}
                          className={`size-2 rounded-full ${
                            index === currentImageIndex
                              ? "bg-white"
                              : "bg-white bg-opacity-50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-lg text-gray-900">Description</h3>
                <p className="text-gray-600 leading-relaxed">{selectedUnitData.description}</p>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-lg text-gray-900">Features</h3>
                <ul className="grid grid-cols-2 gap-3">
                  {selectedUnitData.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-gray-600">
                      <div className="size-2 bg-blue-600 rounded-full flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wide">Price</p>
                  <div className="text-blue-600 text-xl font-bold">
                    {formatCurrency(selectedUnitData.price)}{" "}
                    <span className="text-sm font-normal text-blue-600/70">{getPriceLabel(selectedUnitData.type)}</span>
                  </div>
                </div>
                {selectedUnitData.capacity && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wide">Capacity</p>
                    <p className="text-gray-900 font-medium">{selectedUnitData.capacity} persons</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-lg text-gray-900">Policies</h3>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">{selectedUnitData.policies}</p>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-200">
                <Link
                  to="/register"
                  className="block w-full text-center px-6 py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                >
                  Book Now - Sign Up Required
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}