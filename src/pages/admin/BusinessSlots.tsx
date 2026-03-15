import { useState, useRef } from 'react';
import type { JSX } from 'react';
import { useData } from "../../contexts/DataContext";
import type { UnitType } from "../../contexts/DataContext"; // ✅ type-only
import { Plus, Edit, Trash2, X, Home, Building2, Car } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { motion } from 'framer-motion';
import EmptyState from '../../components/common/EmptyState';

// Helper function to map unit type to an icon/label
const UnitTypeDisplay = ({ type }: { type: UnitType }) => {
  const map: Record<UnitType, { icon: JSX.Element; label: string; color: string }> = {
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

export default function AdminUnitManagement() {
  const { units, addUnit, updateUnit, deleteUnit } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [hoveredButtonIndex, setHoveredButtonIndex] = useState<number | null>(null);
  const initialFormState = {
    name: '',
    type: '' as UnitType | '',
    description: '',
    price: '',
    images: '', // Comma-separated string of URLs
    policies: '',
    capacity: '', // Optional number
    available: true,
    features: '', // Comma-separated string of features
    propertyId: '',
    location: '',
  };

  const [UnitForm, setUnitForm] = useState(initialFormState);
  const locations: string[] = Array.from(
  new Set(
      units
        .map((u) => u.location)
        .filter((loc): loc is string => Boolean(loc && loc.trim() !== ""))
    )
  );

  // file input ref to trigger explorer programmatically
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // lightbox state for enlarged preview
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const resetForm = () => {
    // Revoke any object URLs created during session to avoid memory leaks
    try {
      const prev = UnitForm.images ? UnitForm.images.split(',').map(s => s.trim()).filter(Boolean) : [];
      revokeObjectURLs(prev);
    } catch {
      /* ignore */
    }
    setUnitForm(initialFormState);
    setEditingUnitId(null);
    setShowModal(false);
    setLightboxImage(null);
  };

    const removeImage = (url: string) => {
        setUnitForm(prev => {
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

    // UnitForm.images already contains uploaded image URLs (or object URLs)
    const imageUrls = UnitForm.images
      ? UnitForm.images.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];

    const UnitData = {
      name: UnitForm.name,
      type: UnitForm.type as UnitType,
      description: UnitForm.description,
      price: parseFloat(UnitForm.price),
      images: imageUrls,
      policies: UnitForm.policies,
      capacity: UnitForm.capacity ? parseInt(UnitForm.capacity) : undefined,
      available: UnitForm.available,
      features: UnitForm.features.split(',').map(s => s.trim()).filter(s => s.length > 0),
      propertyId: UnitForm.propertyId, 
      location: UnitForm.location,  
    };

    if (editingUnitId) {
      updateUnit(editingUnitId, UnitData);
    } else {
      addUnit(UnitData);
    }

    resetForm();
  };

  const handleEdit = (UnitId: string) => {
    const Unit = units.find(p => p.id === UnitId);
    if (Unit) {
      setUnitForm({
        name: Unit.name,
        type: Unit.type,
        description: Unit.description,
        price: Unit.price.toString(),
        images: Unit.images.join(', '),
        policies: Unit.policies,
        capacity: Unit.capacity?.toString() || '',
        available: Unit.available,
        features: Unit.features.join(', '),
        propertyId: Unit.propertyId || '',
        location: Unit.location || '',
      });
      setEditingUnitId(UnitId);
      setShowModal(true);
    }
  };

  const handleDelete = (UnitId: string) => {
    if (confirm('Are you sure you want to delete this Unit? This action cannot be undone.')) {
      deleteUnit(UnitId);
    }
  };

  // handle files selected from explorer
  const handleFilesSelected = async (filesList: FileList | null) => {
    const files = Array.from(filesList || []);
    if (files.length === 0) return;

    try {
      const urls = await uploadImages(files);
      setUnitForm(prev => {
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
    <div className="bg-gray-50 min-h-screen p-4 md:p-6 lg:p-8 flex flex-col gap-6 pb-24 lg:pb-8">
      {/* Header - Stacked on mobile, row on desktop */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Unit Management</h1>
          <p className="text-sm text-gray-500">Manage all your rentable units and slots.</p>
        </div>
        <button
      onClick={() => setShowModal(true)}
      className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Plus className="size-4" />
      Add Unit
    </button>
      </div>
      <button
        onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
        aria-label="Add Unit"
      >
        <Plus className="size-8" />
      </button>

      {/* Units Container */}
<div className="flex-1">
  {units.length === 0 ? (
  <EmptyState
    icon={<Building2 className="size-10 text-blue-500" />}
    title="No units yet"
    description="Units will appear here once an administrator adds rentable spaces, halls, or parking slots."
  />
  ) : (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {units.map((Unit) => (
              <tr key={Unit.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {Unit.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <UnitTypeDisplay type={Unit.type} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatCurrency(Unit.price)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-bold ${
                      Unit.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {Unit.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(Unit.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="size-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(Unit.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200">
        {units.map((Unit) => (
          <div key={Unit.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900">{Unit.name}</h3>
                <div className="mt-1">
                  <UnitTypeDisplay type={Unit.type} />
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(Unit.id)}
                  className="p-3 text-blue-600 active:bg-blue-50 rounded-full"
                >
                  <Edit className="size-5" />
                </button>
                <button
                  onClick={() => handleDelete(Unit.id)}
                  className="p-3 text-red-600 active:bg-red-50 rounded-full"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm border-t pt-3">
              <span className="text-gray-500 font-medium">
                {formatCurrency(Unit.price)}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                  Unit.available
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {Unit.available ? 'AVAILABLE' : 'UNAVAILABLE'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

      {/* Modal Adjustments */}
      {showModal && (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 transition-all duration-300">
    <div className="bg-white w-full sm:max-w-4xl h-[92vh] sm:h-auto sm:max-h-[92vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200/60 animate-in fade-in zoom-in-95 slide-in-from-bottom duration-300 flex flex-col">
      
      {/* Header */}
      <div className="bg-slate-900 p-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {editingUnitId ? 'Edit Unit' : 'Add New Unit'}
          </h2>
          <p className="text-slate-400 text-xs font-medium mt-1">
            {editingUnitId
              ? 'Update the selected unit details for Comerciales Flores'
              : 'Create a new rentable unit profile for Comerciales Flores'}
          </p>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
        >
          <X size={20} />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 pb-28 sm:pb-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          {/* Unit Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"
            >
              Unit Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={UnitForm.name}
              onChange={(e) => setUnitForm({ ...UnitForm, name: e.target.value })}
              placeholder="Enter unit name"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            />
          </div>

          {/* Unit Type */}
          <div className="space-y-1.5">
            <label
              htmlFor="type"
              className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"
            >
              Unit Type
            </label>
            <select
              id="type"
              required
              value={UnitForm.type}
              onChange={(e) =>
                setUnitForm({ ...UnitForm, type: e.target.value as UnitType | '' })
              }
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            >
              <option value="">Select a type</option>
              <option value="rental_space">Rental Space (e.g., Office/Retail)</option>
              <option value="function_hall">Function Hall (e.g., Event Venue)</option>
              <option value="parking_slot">Parking Slot (e.g., Vehicle Space)</option>
            </select>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label
              htmlFor="location"
              className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"
            >
              Location
            </label>
            <select
              id="location"
              required
              value={UnitForm.location}
              onChange={(e) => setUnitForm({ ...UnitForm, location: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            >
              <option value="">Select a location</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 ml-1">
              Choose the unit location from the available list.
            </p>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label
              htmlFor="price"
              className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"
            >
              Price
            </label>
            <input
              id="price"
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="e.g. 25000"
              value={UnitForm.price}
              onChange={(e) => setUnitForm({ ...UnitForm, price: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            />
            <p className="text-[11px] text-slate-400 ml-1">
              {UnitForm.type === 'rental_space' && 'Monthly Rate'}
              {UnitForm.type === 'function_hall' && 'Daily Rate'}
              {UnitForm.type === 'parking_slot' && 'Hourly Rate'}
              {UnitForm.type === '' && 'Rate depends on unit type'}
            </p>
          </div>

          {/* Capacity */}
          <div className="space-y-1.5">
            <label
              htmlFor="capacity"
              className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"
            >
              Capacity
            </label>
            <input
              id="capacity"
              type="number"
              min="1"
              placeholder="Optional"
              value={UnitForm.capacity}
              onChange={(e) => setUnitForm({ ...UnitForm, capacity: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            />
            <p className="text-[11px] text-slate-400 ml-1">
              Number of people or vehicles allowed.
            </p>
          </div>

          {/* Availability */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Status
            </label>
            <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-all">
              <input
                id="available"
                type="checkbox"
                checked={UnitForm.available}
                onChange={(e) =>
                  setUnitForm({ ...UnitForm, available: e.target.checked })
                }
                className="size-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Available for reservation
              </span>
            </label>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="description"
            className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"
          >
            Description
          </label>
          <textarea
            id="description"
            required
            rows={4}
            value={UnitForm.description}
            onChange={(e) => setUnitForm({ ...UnitForm, description: e.target.value })}
            placeholder="Describe the unit..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium resize-none"
          />
        </div>

        {/* Images */}
        <div className="space-y-1.5">
          <label
            htmlFor="images"
            className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"
          >
            Unit Images
          </label>

          <input
            ref={fileInputRef}
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          {UnitForm.images ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 overflow-x-auto py-1">
                {UnitForm.images.split(',').map((src, i) => {
                  const trimmed = src.trim();
                  if (!trimmed) return null;

                  return (
                    <div
                      key={i}
                      className="relative flex-shrink-0 w-[170px] h-[150px] rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden group shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(trimmed);
                        }}
                        onMouseEnter={() => setHoveredButtonIndex(i)}
                        onMouseLeave={() => setHoveredButtonIndex(null)}
                        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full shadow-lg transition-all"
                        style={{
                          backgroundColor:
                            hoveredButtonIndex === i ? '#ef4444' : 'white',
                          color: hoveredButtonIndex === i ? 'white' : '#475569',
                        }}
                        aria-label="Remove image"
                        title="Remove image"
                      >
                        <X className="size-4" />
                      </button>

                      <img
                        src={trimmed}
                        alt={`preview-${i}`}
                        onClick={() => openLightbox(trimmed)}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-all flex items-center justify-center"
                  title="Add more images"
                  aria-label="Add more images"
                >
                  <Plus className="size-6" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 ml-1">
                Uploaded images. Click a photo to preview it.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600"
              >
                <Plus className="size-5" />
                <span className="text-sm font-semibold">Upload Images</span>
              </button>
              <p className="text-[11px] text-slate-400 ml-1">
                Select one or more images. Supported types: JPG, PNG, GIF.
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-1.5">
          <label
            htmlFor="features"
            className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"
          >
            Features
          </label>
          <input
            id="features"
            type="text"
            placeholder="WiFi, Aircon, Parking, Stage"
            value={UnitForm.features}
            onChange={(e) => setUnitForm({ ...UnitForm, features: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
          />
        </div>

        {/* Policies */}
        <div className="space-y-1.5">
          <label
            htmlFor="policies"
            className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"
          >
            Policies / Terms
          </label>
          <textarea
            id="policies"
            required
            rows={3}
            value={UnitForm.policies}
            onChange={(e) => setUnitForm({ ...UnitForm, policies: e.target.value })}
            placeholder="Enter terms and policies..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 sm:static bg-white/95 backdrop-blur border-t border-slate-200 sm:border-0 p-4 sm:p-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="hidden sm:block flex-1 py-4 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="w-full sm:flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {editingUnitId ? 'Update Unit' : 'Add Unit'}
            </button>
          </div>
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