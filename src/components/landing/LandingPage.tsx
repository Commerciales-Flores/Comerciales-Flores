import { Link } from 'react-router-dom';
import { Building2, Calendar, CreditCard, Shield, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
<<<<<<< HEAD
import { ImageWithFallback } from '../ui/ImageWithFallback';
=======
import { ImageWithFallback } from '../figma/ImageWithFallback';
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <span className="font-semibold text-gray-900">Commerciales Flores</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-gray-900 mb-6">
                Premium Commercial Spaces for Your Business
              </h1>
              <p className="text-gray-600 mb-8">
                Discover and book office units, function halls, and parking spaces with ease. 
                Manage your rentals, track payments, and schedule visits all in one place.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#spaces"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Browse Spaces
                </a>
              </div>
            </div>
            <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80"
                alt="Commercial building"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">Why Choose Commerciales Flores</h2>
            <p className="text-gray-600">
              Complete rental management solution for your business needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-gray-900 mb-2">Diverse Spaces</h3>
              <p className="text-gray-600">
                Office units, function halls, and parking areas to meet all your needs
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-gray-900 mb-2">Easy Booking</h3>
              <p className="text-gray-600">
                View availability and book spaces online with instant confirmation
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-gray-900 mb-2">Payment Tracking</h3>
              <p className="text-gray-600">
                Keep track of all your payments and transaction history
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-gray-900 mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Your data and transactions are protected with enterprise-grade security
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Space Types */}
      <section id="spaces" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">Available Space Types</h2>
            <p className="text-gray-600">
              Find the perfect space for your business or event
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group cursor-pointer">
              <div className="relative h-64 rounded-xl overflow-hidden mb-4">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80"
                  alt="Office Units"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="mb-1">Office Units</h3>
                  <p className="text-sm text-gray-200">Modern workspace solutions</p>
                </div>
              </div>
            </div>
            <div className="group cursor-pointer">
              <div className="relative h-64 rounded-xl overflow-hidden mb-4">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80"
                  alt="Function Halls"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="mb-1">Function Halls</h3>
                  <p className="text-sm text-gray-200">Perfect for events & conferences</p>
                </div>
              </div>
            </div>
            <div className="group cursor-pointer">
              <div className="relative h-64 rounded-xl overflow-hidden mb-4">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&q=80"
                  alt="Parking Areas"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="mb-1">Parking Areas</h3>
                  <p className="text-sm text-gray-200">Secure covered parking</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-gray-600">
              Have questions? We're here to help
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-gray-900 mb-2">Location</h3>
              <p className="text-gray-600">123 Business Ave, Commercial District</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600">+1 (555) 123-4567</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">info@comercialesflores.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center text-gray-600">
          <p>&copy; 2024 Commerciales Flores. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
