import React, { useState, useRef } from 'react';
import { useData } from "../../contexts/DataContext";
import type { UnitType, Unit } from "../../contexts/DataContext"; 
import { Plus, Edit, Trash2, X, Home, Building2, Car } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const UnitTypeDisplay = ({ type }: { type: UnitType }) => {
  const map: Record<UnitType, { icon: React.ReactNode; label: string; color: string }> = {
    rental_space: { icon: <Building2 className="size-4" />, label: 'Rental Space', color: 'text-indigo-600 bg-indigo-100' },
    function_hall: { icon: <Home className="size-4" />, label: 'Function Hall', color: 'text-purple-600 bg-purple-100' },
    parking_slot: { icon: <Car className="size-4" />, label: 'Parking Slot', color: 'text-orange-600 bg-orange-100' },
  };

  const defaultDisplay = { icon: <Building2 className="size-4" />, label: 'Property', color: 'text-gray-600 bg-gray-100' };
  const { icon, label, color } = map[type] || defaultDisplay;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${color}`}>
      {icon}
      {label}
    </span>
  );
};

export default function AdminPropertyManagement() {
  // ✅ FIX: added uploadPropertyImage from DataContext
  const { units, addUnit, updateUnit, deleteUnit, uploadPropertyImage } = useData();
  
  const [showModal, setShowModal] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [hoveredButtonIndex, setHoveredButtonIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialFormState = {
    name: '',
    type: '' as UnitType | '',
    description: '',
    price: '',
    images: '', 
    policies: '',
    capacity: '', 
    available: true,
    features: '' 
  };

  const [propertyForm, setPropertyForm] = useState(initialFormState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const resetForm = () => {
    try {
      // Just in case any old broken blob URLs are lingering in state
      const prev = propertyForm.images ? propertyForm.images.split(',').map(s => s.trim()).filter(Boolean) : [];
      prev.forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
    } catch { /* ignore */ }
    
    setPropertyForm(initialFormState);
    setEditingUnitId(null);
    setShowModal(false);
    setLightboxImage(null);
  };

  const removeImage = (url: string) => {
      setPropertyForm(prev => {
          const remaining = prev.images
              .split(',')
              .map(s => s.trim())
              .filter(img => img !== url);

          return { ...prev, images: remaining.join(', ') };
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const imageUrls = propertyForm.images
        ? propertyForm.images.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [];

      const unitData: Omit<Unit, 'id'> = {
        name: propertyForm.name,
        type: propertyForm.type as UnitType,
        description: propertyForm.description,
        price: parseFloat(propertyForm.price),
        images: imageUrls,
        policies: propertyForm.policies,
        capacity: propertyForm.capacity ? parseInt(propertyForm.capacity) : undefined,
        available: propertyForm.available,
        features: propertyForm.features.split(',').map(s => s.trim()).filter(s => s.length > 0)
      };

      if (editingUnitId) {
        await updateUnit(editingUnitId, unitData);
      } else {
        await addUnit(unitData);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save property:", error);
      alert("Failed to save property. Please check the console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (unit) {
      setPropertyForm({
        name: unit.name,
        type: unit.type,
        description: unit.description,
        price: unit.price.toString(),
        images: unit.images.join(', '),
        policies: unit.policies || '',
        capacity: unit.capacity?.toString() || '',
        available: unit.available,
        features: unit.features.join(', ')
      });
      setEditingUnitId(unitId);
      setShowModal(true);
    }
  };

  const handleDelete = async (unitId: string) => {
    if (window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      try {
        await deleteUnit(unitId);
      } catch (error) {
        console.error("Failed to delete property:", error);
        alert("Failed to delete property.");
      }
    }
  };

  // ✅ FIX: Actually uploads files to Supabase instead of generating fake local blob links
  const handleFilesSelected = async (filesList: FileList | null) => {
    const files = Array.from(filesList || []);
    if (files.length === 0) return;

    try {
      // 1. Upload all selected files to Supabase Storage concurrently
      const uploadPromises = files.map(file => uploadPropertyImage(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      
      // 2. Filter out any uploads that might have failed (returned null)
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);

      if (validUrls.length === 0) {
        alert("Failed to upload images. Please try again.");
        return;
      }

      // 3. Save the permanent public URLs to the form state
      setPropertyForm(prev => {
        const existing = prev.images ? prev.images.split(',').map(s => s.trim()).filter(Boolean) : [];
        const merged = [...existing, ...validUrls];
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Management</h1>
            <p className="text-gray-600">Manage all your rentable properties, halls, and parking slots.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="size-5" />
            Add Property
          </button>
        </div>

      {/* Properties Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Price Base</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {units.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No properties listed yet. Click "Add Property" to get started.
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {unit.images && unit.images.length > 0 ? (
                            <img src={unit.images[0]} alt={unit.name} className="w-12 h-12 rounded object-cover border border-gray-200 shadow-sm" />
                        ) : (
                            <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <Building2 className="size-5 text-gray-400" />
                            </div>
                        )}
                        <div>
                          <p className="text-gray-900 font-medium">{unit.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{unit.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <UnitTypeDisplay type={unit.type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(unit.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-semibold border ${
                        unit.available 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {unit.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {unit.capacity ? `${unit.capacity} pax` : <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(unit.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(unit.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">{editingUnitId ? 'Edit' : 'Add'} Property</h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
                <X className="size-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={propertyForm.name}
                    onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                </div>

                {/* Type */}
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                  <select
                    id="type"
                    required
                    value={propertyForm.type}
                    onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value as UnitType | '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-shadow"
                  >
                    <option value="">Select a type</option>
                    <option value="rental_space">Commercial / Office Unit</option>
                    <option value="function_hall">Function Hall</option>
                    <option value="parking_slot">Parking Slot</option>
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
                  <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                      <input
                        id="price"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="e.g., 25000"
                        value={propertyForm.price}
                        onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 ml-1">
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
                    placeholder="e.g., 200"
                    value={propertyForm.capacity}
                    onChange={(e) => setPropertyForm({ ...propertyForm, capacity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                  <p className="text-xs text-gray-500 mt-1.5 ml-1">Number of people or vehicles allowed.</p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-shadow"
                ></textarea>
              </div>

              {/* Images (file upload with preview) */}
              <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">Images (Upload)</label>

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

                {propertyForm.images ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-3 overflow-x-auto py-2 max-h-40">
                      {propertyForm.images.split(',').map((src, i) => {
                        const trimmed = src.trim();
                        if (!trimmed) return null;
                        return (
                          <div
                            key={i}
                            className="relative bg-gray-100 rounded-lg border border-gray-200 flex-shrink-0" 
                            style={{ width: 170, height: 150 }}
                            aria-label="Uploaded image preview"
                            title="Click image to enlarge"
                          >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeImage(trimmed);
                                    }}
                                    onMouseEnter={() => setHoveredButtonIndex(i)}
                                    onMouseLeave={() => setHoveredButtonIndex(null)}
                                    className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full shadow-md transition-colors duration-200 cursor-pointer"
                                    style={{
                                        backgroundColor: hoveredButtonIndex === i ? '#ef4444' : 'white', 
                                        color: hoveredButtonIndex === i ? 'white' : '#4b5563', 
                                    }}
                                >
                                    <X className="size-4" />
                                </button>

                            <img
                              src={trimmed}
                              alt={`preview-${i}`}
                              className="w-full h-full object-cover transition-all duration-300 transform hover:scale-[1.02] cursor-pointer rounded-lg overflow-hidden" 
                              onClick={() => openLightbox(trimmed)}
                            />
                                </div>
                            );
                          })}

                          {/* Add more button */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors flex-shrink-0 cursor-pointer"
                            style={{ width: 80, height: 80 }}
                            title="Add more images"
                          >
                            <Plus className="size-6" />
                          </button>

                        </div>
                        <p className="text-xs text-gray-500 mt-2 ml-1">Uploaded images. Click to enlarge. Use "Add more" to append additional photos.</p>
                      </div>

                    ) : (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-600 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 cursor-pointer"
                          style={{ height: '72px' }} 
                        >
                          <Plus className="size-5" /> Add Images
                        </button>
                        <p className="text-xs text-gray-500 mt-2 ml-1">Select one or more images. Supported types: JPG, PNG, GIF.</p>
                      </div>
                )}
              </div>
              
              {/* Features */}
              <div>
                <label htmlFor="features" className="block text-sm font-medium text-gray-700 mb-1">Features (Comma-separated)</label>
                <input
                  id="features"
                  type="text"
                  placeholder="e.g., WiFi, Air Conditioning, Security"
                  value={propertyForm.features}
                  onChange={(e) => setPropertyForm({ ...propertyForm, features: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>

              {/* Policies */}
              <div>
                <label htmlFor="policies" className="block text-sm font-medium text-gray-700 mb-1">Policies & Terms</label>
                <textarea
                  id="policies"
                  required
                  rows={2}
                  placeholder="e.g., Minimum 1-year contract. 2 months deposit."
                  value={propertyForm.policies}
                  onChange={(e) => setPropertyForm({ ...propertyForm, policies: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-shadow"
                ></textarea>
              </div>

              {/* Available Checkbox */}
              <div className="flex items-center gap-3 pt-2 pb-4 border-b border-gray-100">
                <input
                  id="available"
                  type="checkbox"
                  checked={propertyForm.available}
                  onChange={(e) => setPropertyForm({ ...propertyForm, available: e.target.checked })}
                  className="size-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="available" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Available for new reservations
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : editingUnitId ? 'Update Property' : 'Save Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ zIndex: 2147483647 }}
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 z-[2147483648] bg-white text-gray-900 rounded-full p-2 hover:bg-gray-200 transition-colors shadow-lg"
            aria-label="Close image"
          >
            <X className="size-6" />
          </button>

          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Enlarged preview"
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}