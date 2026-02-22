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
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  getPropertyTypeLabel,
  getPriceLabel,
} from "../../utils/propertyHelpers";


export default function LandingPage() {
  const {
    properties,
    contentSettings,
    addInquiry,
  } = useData();
  const [selectedProperty, setSelectedProperty] = useState<
    string | null
  >(null);
  const [inquirySubmitted, setInquirySubmitted] =
    useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const featuredProperties = properties
    .filter((p) => p.available)
    .slice(0, 6);
  const property = selectedProperty
    ? properties.find((p) => p.id === selectedProperty)
    : null;

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addInquiry(inquiryForm);
    setInquirySubmitted(true);
    setInquiryForm({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
    setTimeout(() => setInquirySubmitted(false), 3000);
  };

  const nextImage = () => {
    if (property) {
      setCurrentImageIndex(
        (prev) => (prev + 1) % property.images.length,
      );
    }
  };

  const prevImage = () => {
    if (property) {
      setCurrentImageIndex(
        (prev) =>
          (prev - 1 + property.images.length) %
          property.images.length,
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
              <h1 className="text-blue-600">
                Commerciales Flores
              </h1>
            </div>
            <div className="flex gap-3">
              <Link to="/login" className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                Login
              </Link>
              <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
  className="relative bg-cover bg-center text-white py-20"
  // 1. Set the background image URL here.
  //    Replace this Unsplash URL with your own image.
  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=1167&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')" }}
>
  {/* 2. Add a semi-transparent overlay to ensure text is readable */}
  <div className="absolute inset-0 bg-black opacity-50"></div>

  {/* 3. Add `relative` to this div so it sits on top of the overlay */}
  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 className="mb-4">{contentSettings.heroTitle}</h1>
    <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
      {contentSettings.heroSubtitle}
    </p>
    <div className="flex gap-4 justify-center">
      <Link to="/register" className="px-6 py-3 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
        Get Started
      </Link>
      <a href="#properties" className="px-6 py-3 border border-white text-white rounded-lg hover:bg-white hover:text-blue-700 transition-colors">
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
                <p key={index} className="text-sm text-yellow-800">📢 {announcement}</p>
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
            <p className="text-gray-600 max-w-3xl mx-auto">{contentSettings.aboutUs}</p>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section id="properties" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">Featured Properties</h2>
            <p className="text-gray-600">Browse our available rental spaces, function halls, and parking areas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProperties
              .filter((p) => p.type !== "parking_slot")
              .map((property) => (
                <div key={property.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { setSelectedProperty(property.id); setCurrentImageIndex(0); }}>
                  <img src={property.images[0]} alt={property.name} className="w-full h-48 object-cover"/>
                  <div className="p-4">
                    <div className="text-xs text-blue-600 mb-1">{getPropertyTypeLabel(property.type)}</div>
                    <h3 className="mb-2">{property.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{property.description}</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-blue-600">{formatCurrency(property.price)}</div>
                        <div className="text-xs text-gray-500">{getPriceLabel(property.type)}</div>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">View Details</button>
                    </div>
                  </div>
                </div>
              ))}
                  </div>
          </div>

    </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-50">
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
              <p className="text-sm text-gray-600 mb-4">No account required. We'll get back to you shortly.</p>
              {inquirySubmitted && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">Thank you! We've received your inquiry.</div>
              )}
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Name</label>
                  <input type="text" required value={inquiryForm.name} onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Email</label>
                  <input type="email" required value={inquiryForm.email} onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Subject</label>
                  <input type="text" required value={inquiryForm.subject} onChange={(e) => setInquiryForm({ ...inquiryForm, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Message</label>
                  <textarea required value={inquiryForm.message} onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Send Inquiry</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2025 Commerciales Flores. All rights reserved.</p>
          <p className="text-sm text-gray-500 mt-2">Compliant with the Philippine Data Privacy Act of 2012</p>
        </div>
      </footer>

      {/* Property Detail Modal */}
      {property && (
        <div className="fixed inset-0 z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-auto my-8 shadow-xl">
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <div>
                <div className="text-sm text-blue-600 mb-1">{getPropertyTypeLabel(property.type)}</div>
                <h2 className="text-lg font-semibold">{property.name}</h2>
              </div>
              <button onClick={() => setSelectedProperty(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="size-6" /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="relative">
                <img src={property.images[currentImageIndex]} alt={property.name} className="w-full h-96 object-cover rounded-lg" />
                {property.images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-2 rounded-full hover:bg-opacity-100 transition-all"><ChevronLeft className="size-6" /></button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-2 rounded-full hover:bg-opacity-100 transition-all"><ChevronRight className="size-6" /></button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {property.images.map((_, index) => (
                        <div key={index} className={`size-2 rounded-full ${index === currentImageIndex ? "bg-white" : "bg-white bg-opacity-50"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Description</h3>
                <p className="text-gray-600">{property.description}</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Features</h3>
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
                  <div className="text-blue-600">{formatCurrency(property.price)} <span className="text-sm">{getPriceLabel(property.type)}</span></div>
                </div>
                {property.capacity && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Capacity</p>
                    <p className="text-gray-900">{property.capacity} persons</p>
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Policies</h3>
                <p className="text-sm text-gray-600">{property.policies}</p>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <Link to="/register" className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Book Now - Sign Up Required</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
