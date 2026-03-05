import { useState, useRef } from 'react';
import type { JSX } from 'react';
import { useData } from "../../contexts/DataContext";
import type { PropertyType } from "../../contexts/DataContext"; // ✅ type-only
import { Plus, Edit, Trash2, X, Home, Building2, Car } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

// Helper function to map property type to an icon/label
const PropertyTypeDisplay = ({ type }: { type: PropertyType }) => {
  const map: Record<PropertyType, { icon: JSX.Element; label: string; color: string }> = {
    rental_space: { icon: <Building2 className="size-4" />, label: 'Rental Space', color: 'text-indigo-600 bg-indigo-100' },
    function_hall: { icon: <Home className="size-4" />, label: 'Function Hall', color: 'text-purple-600 bg-purple-100' },
    parking_slot: { icon: <Car className="size-4" />, label: 'Parking Slot', color: 'text-orange-600 bg-orange-100' },
  };

  const { icon, label, color } = map[type];


  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${color}`}>
      {icon}
      {label}
    </span>
  );
};

// Add this near the top of the file (after imports)

async function uploadImages(files: File[]): Promise<string[]> {
  if (!files || files.length === 0) return [];

  // Vite uses VITE_, Create React App uses REACT_APP_
   const endpoint = import.meta.env.VITE_IMAGE_UPLOAD_ENDPOINT;

  if (endpoint) {
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const res = await fetch(endpoint, { method: "POST", body: form });
      
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      
      const data = await res.json();
      return data.urls ?? [];
    } catch (err) {
      console.error("Upload failed, falling back to local previews", err);
      // Fallback to local previews if the server is down
    }
  }

  // Local Preview Fallback
  return Array.from(files).map((f) => URL.createObjectURL(f));
}

function revokeObjectURLs(urls: string[] | undefined) {
  if (!urls) return;
  urls.forEach((u) => {
    try {
      // Only revoke if it looks like an object URL
      if (u.startsWith("blob:")) URL.revokeObjectURL(u);
    } catch {
      // ignore
    }
  });
}

export default function AdminPropertyManagement() {
  const { properties, addProperty, updateProperty, deleteProperty, locations } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [hoveredButtonIndex, setHoveredButtonIndex] = useState<number | null>(null);
  const initialFormState = {
    name: '',
    type: '' as PropertyType | '',
    description: '',
    price: '',
    images: '', // Comma-separated string of URLs
    policies: '',
    capacity: '', // Optional number
    available: true,
    features: '', // Comma-separated string of features
    location: ''
  };

  const [propertyForm, setPropertyForm] = useState(initialFormState);

  // file input ref to trigger explorer programmatically
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // lightbox state for enlarged preview
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const resetForm = () => {
    // Revoke any object URLs created during session to avoid memory leaks
    try {
      const prev = propertyForm.images ? propertyForm.images.split(',').map(s => s.trim()).filter(Boolean) : [];
      revokeObjectURLs(prev);
    } catch {
      /* ignore */
    }
    setPropertyForm(initialFormState);
    setEditingPropertyId(null);
    setShowModal(false);
    setLightboxImage(null);
  };

    const removeImage = (url: string) => {
        setPropertyForm(prev => {
            const remaining = prev.images
                .split(',')
                .map(s => s.trim())
                .filter(img => img !== url);

            // Revoke object URL if needed
            try {
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            } catch { }

            return { ...prev, images: remaining.join(', ') };
        });
    };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // propertyForm.images already contains uploaded image URLs (or object URLs)
    const imageUrls = propertyForm.images
      ? propertyForm.images.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];

    const propertyData = {
      name: propertyForm.name,
      type: propertyForm.type as PropertyType,
      description: propertyForm.description,
      price: parseFloat(propertyForm.price),
      images: imageUrls,
      policies: propertyForm.policies,
      capacity: propertyForm.capacity ? parseInt(propertyForm.capacity) : undefined,
      available: propertyForm.available,
      features: propertyForm.features.split(',').map(s => s.trim()).filter(s => s.length > 0),
      location: propertyForm.location
    };

    if (editingPropertyId) {
      updateProperty(editingPropertyId, propertyData);
    } else {
      addProperty(propertyData);
    }

    resetForm();
  };

  const handleEdit = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setPropertyForm({
        name: property.name,
        type: property.type,
        description: property.description,
        price: property.price.toString(),
        images: property.images.join(', '),
        policies: property.policies,
        capacity: property.capacity?.toString() || '',
        available: property.available,
        features: property.features.join(', ')
        ,location: property.location
      });
      setEditingPropertyId(propertyId);
      setShowModal(true);
    }
  };

  const handleDelete = (propertyId: string) => {
    if (confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      deleteProperty(propertyId);
    }
  };

  // handle files selected from explorer
  const handleFilesSelected = async (filesList: FileList | null) => {
    const files = Array.from(filesList || []);
    if (files.length === 0) return;

    try {
      const urls = await uploadImages(files);
      setPropertyForm(prev => {
        const existing = prev.images ? prev.images.split(',').map(s => s.trim()).filter(Boolean) : [];
        const merged = [...existing, ...urls];
        return { ...prev, images: merged.join(', ') };
      });
    } catch (err: any) {
      console.error('Image upload failed', err);
      alert('Image upload failed. See console for details.');
    }
  };

  const openLightbox = (src: string) => setLightboxImage(src);
  const closeLightbox = () => setLightboxImage(null);

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8 flex flex-col gap-6">
      {/* Header - Stacked on mobile, row on desktop */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Property Management</h1>
          <p className="text-sm text-gray-500">Manage all your rentable properties and slots.</p>
        </div>
        <button
      onClick={() => setShowModal(true)}
      className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Plus className="size-4" />
      Add Property
    </button>
      </div>
      <button
        onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
        aria-label="Add Property"
      >
        <Plus className="size-8" />
      </button>

      {/* Properties Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Desktop Table View (Hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {properties.map((property) => (
                <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{property.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><PropertyTypeDisplay type={property.type} /></td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(property.price)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${property.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {property.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(property.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="size-5" /></button>
                      <button onClick={() => handleDelete(property.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="size-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile "Card" View (Visible only on mobile/small tablets) */}
        <div className="md:hidden divide-y divide-gray-200">
          {properties.length === 0 ? (
             <div className="p-8 text-center text-gray-500">No properties listed yet.</div>
          ) : (
            properties.map((property) => (
              <div key={property.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{property.name}</h3>
                    <div className="mt-1"><PropertyTypeDisplay type={property.type} /></div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(property.id)} className="p-3 text-blue-600 active:bg-blue-50 rounded-full"><Edit className="size-5" /></button>
                    <button onClick={() => handleDelete(property.id)} className="p-3 text-red-600 active:bg-red-50 rounded-full"><Trash2 className="size-5" /></button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm border-t pt-3">
                  <span className="text-gray-500 font-medium">{formatCurrency(property.price)}</span>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${property.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {property.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Adjustments */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold">{editingPropertyId ? 'Edit' : 'Add'} Property</h2>
              <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="size-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 overflow-y-auto space-y-5 pb-24 sm:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={propertyForm.name}
                    onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Type */}
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                  <select
                    id="type"
                    required
                    value={propertyForm.type}
                    onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value as PropertyType | '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a type</option>
                    <option value="rental_space">Rental Space (e.g., Office/Retail)</option>
                    <option value="function_hall">Function Hall (e.g., Event Venue)</option>
                    <option value="parking_slot">Parking Slot (e.g., Vehicle Space)</option>
                  </select>
                </div>

                <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  id="location"
                  required
                  value={propertyForm.location}
                  onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a location</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose the property's location from the list.</p>
              </div>

                {/* Price */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (₱)</label>
                  <input
                    id="price"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g., 25000"
                    value={propertyForm.price}
                    onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {propertyForm.type === 'rental_space' && 'Monthly Rate'}
                    {propertyForm.type === 'function_hall' && 'Daily Rate'}
                    {propertyForm.type === 'parking_slot' && 'Hourly Rate'}
                    {propertyForm.type === '' && 'Rate depends on property type'}
                  </p>
                </div>

                {/* Capacity */}
                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">Capacity (Optional)</label>
                  <input
                    id="capacity"
                    type="number"
                    min="1"
                    placeholder="e.g., 200 (for hall) or N/A"
                    value={propertyForm.capacity}
                    onChange={(e) => setPropertyForm({ ...propertyForm, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of people or vehicles allowed.</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="description"
                  required
                  rows={3}
                  value={propertyForm.description}
                  onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Images (file upload with preview) */}
<div>
  <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">Images (upload)</label>

  {/* hidden file input */}
  <input
    ref={fileInputRef}
    id="images"
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => handleFilesSelected(e.target.files)}
    className="hidden"
  />

  {/* If images exist show horizontal preview strip, otherwise show prominent upload prompt */}
  {propertyForm.images ? (
    <div className="mt-2">
  <div className="flex items-center gap-2 overflow-x-auto py-1 max-h-40">
    {propertyForm.images.split(',').map((src, i) => {
  const trimmed = src.trim();
  if (!trimmed) return null;
  return (
    <div
      key={i}
      className="relative bg-gray-100 rounded-md border border-gray-200 flex-shrink-0"  // Removed overflow-hidden to prevent clipping the button
      style={{ width: 170, height: 150 }}
      aria-label="Uploaded image preview"
      title="Click image to enlarge"
    >
      {/* Remove button */}
          <button
              type="button"
              onClick={(e) => {
                  e.stopPropagation();
                  removeImage(trimmed);
              }}
              onMouseEnter={() => setHoveredButtonIndex(i)}  // Set the specific index on hover
              onMouseLeave={() => setHoveredButtonIndex(null)}  // Clear on leave
              className="
    absolute top-3 right-2 z-10
    w-6 h-6 
    flex items-center justify-center
    rounded-full
    shadow-md
    transition-colors duration-200
    cursor-pointer
  "
              style={{
                  backgroundColor: hoveredButtonIndex === i ? '#ed4c4a' : 'white',  // Only red if this button's index matches
                  color: hoveredButtonIndex === i ? 'white' : '#4B5563',  // Only white text if this button's index matches
              }}
              aria-label="Remove image"
              title="Remove image"
          >
              <X className="size-4" />
          </button>

      <img
        src={trimmed}
        alt={`preview-${i}`}
        className="w-full h-full object-cover transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:ring-2 hover:ring-blue-400 cursor-pointer rounded-md overflow-hidden"  // Added overflow-hidden to the image for rounded corners
        onClick={() => openLightbox(trimmed)}
      />
          </div>
      );
    })}

    {/* Add more button at the end (square, bigger) */}
    <button
  type="button"
  onClick={() => fileInputRef.current?.click()}
  className="flex items-center justify-center
             border-2 border-dashed border-gray-300
             rounded-md bg-white text-gray-700
             hover:border-blue-400 hover:bg-blue-100
             transition-colors flex-shrink-0 cursor-pointer"
  style={{ width: 80, height: 80 }} // ← bigger & obvious
  title="Add more images"
  aria-label="Add more images"
>
  <Plus className="size-6" />
</button>

  </div>
  <p className="text-xs text-gray-500 mt-2">Uploaded images. Click to enlarge. Use "Add more" to append additional photos.</p>
</div>

  ) : (
    <div className="mt-2">
      <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    className="
      w-full
      flex items-center justify-center gap-2
      border-2 border-dashed border-gray-300
      rounded-md bg-white text-gray-700
      hover:border-blue-500 hover:bg-blue-100
      hover:shadow-md
      transition-all duration-200
      cursor-pointer
    "
    style={{ height: '72px' }}   // ← THIS WILL OVERRIDE EVERYTHING
  >
    <Plus className="size-5" />
      </button>
      <p className="text-xs text-gray-500 mt-1">You can select one or more images. Supported types: JPG, PNG, GIF.</p>
    </div>
  )}
</div>
              
              {/* Features */}
              <div>
                <label htmlFor="features" className="block text-sm font-medium text-gray-700 mb-1">Features (Comma-separated)</label>
                <input
                  id="features"
                  type="text"
                  placeholder="Feature 1, Feature 2, Feature 3"
                  value={propertyForm.features}
                  onChange={(e) => setPropertyForm({ ...propertyForm, features: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Policies */}
              <div>
                <label htmlFor="policies" className="block text-sm font-medium text-gray-700 mb-1">Policies/Terms</label>
                <textarea
                  id="policies"
                  required
                  rows={2}
                  value={propertyForm.policies}
                  onChange={(e) => setPropertyForm({ ...propertyForm, policies: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Available Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="available"
                  type="checkbox"
                  checked={propertyForm.available}
                  onChange={(e) => setPropertyForm({ ...propertyForm, available: e.target.checked })}
                  className="size-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="available" className="text-sm font-medium text-gray-700">
                  Available for reservation
                </label>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t sm:relative sm:p-0 sm:border-0 sm:flex sm:gap-3 sm:pt-4">
                  <button type="button" onClick={resetForm} className="hidden sm:block flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium">Cancel</button>
                  <button type="submit" className="w-full sm:flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">
                    {editingPropertyId ? 'Update Property' : 'Add Property'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          style={{ zIndex: 2147483647 }}
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          {/* Close button pinned to the top-right of the viewport */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-[2147483648] bg-white bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition-colors shadow-md"
            aria-label="Close image"
          >
            <X className="size-5 text-gray-800" />
          </button>

          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Enlarged preview"
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}