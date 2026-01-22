import { useState } from 'react';
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

export default function AdminPropertyManagement() {
  const { properties, addProperty, updateProperty, deleteProperty } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  
  const initialFormState = {
    name: '',
    type: '' as PropertyType | '',
    description: '',
    price: '',
    images: '', // Comma-separated string of URLs
    policies: '',
    capacity: '', // Optional number
    available: true,
    features: '' // Comma-separated string of features
  };

  const [propertyForm, setPropertyForm] = useState(initialFormState);

  const resetForm = () => {
    setPropertyForm(initialFormState);
    setEditingPropertyId(null);
    setShowModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const propertyData = {
      name: propertyForm.name,
      type: propertyForm.type as PropertyType,
      description: propertyForm.description,
      price: parseFloat(propertyForm.price),
      images: propertyForm.images.split(',').map(s => s.trim()).filter(s => s.length > 0),
      policies: propertyForm.policies,
      capacity: propertyForm.capacity ? parseInt(propertyForm.capacity) : undefined,
      available: propertyForm.available,
      features: propertyForm.features.split(',').map(s => s.trim()).filter(s => s.length > 0)
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="mb-2">Property Management</h1>
          <p className="text-gray-600">Manage all your rentable properties, halls, and parking slots.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-4" />
          Add Property
        </button>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No properties listed yet. Click "Add Property" to get started.
                  </td>
                </tr>
              ) : (
                properties.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {property.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <PropertyTypeDisplay type={property.type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(property.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                        property.available 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {property.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {property.capacity || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(property.id)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(property.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
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
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">{editingPropertyId ? 'Edit' : 'Add'} Property</h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <X className="size-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              {/* Images */}
              <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">Image URLs (Comma-separated)</label>
                <input
                  id="images"
                  type="text"
                  placeholder="URL1, URL2, URL3"
                  value={propertyForm.images}
                  onChange={(e) => setPropertyForm({ ...propertyForm, images: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  Available for booking
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPropertyId ? 'Update' : 'Add'} Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}