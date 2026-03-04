import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import type { Unit, UnitType } from '../../contexts/DataContext';
import { Plus, Edit2, Trash2, X, Save, Building2 } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function SpaceManagement() {
  // ✅ FIX 1: Pulled `units` and unit methods from context instead of spaces
  const { units, addUnit, updateUnit, deleteUnit } = useData();
  
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  
  // ✅ FIX 2: Updated form data to match the new `Unit` interface perfectly
  const [formData, setFormData] = useState({
    name: '',
    type: 'rental_space' as UnitType,
    description: '',
    price: 0,
    capacity: '',
    policies: '',
    features: '', // We will split this into an array on submit
    available: true,
    image: '', // We will put this into the images array on submit
  });

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      type: unit.type,
      description: unit.description,
      price: unit.price,
      capacity: unit.capacity ? unit.capacity.toString() : '',
      policies: unit.policies || '',
      features: unit.features ? unit.features.join(', ') : '',
      available: unit.available,
      image: unit.images && unit.images.length > 0 ? unit.images[0] : '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format the raw form data into the strict Unit interface
    const unitData: Omit<Unit, 'id'> = {
      name: formData.name,
      type: formData.type,
      description: formData.description,
      price: formData.price,
      policies: formData.policies,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      available: formData.available,
      features: formData.features.split(',').map(a => a.trim()).filter(Boolean),
      images: formData.image ? [formData.image] : [],
    };

    if (editingUnit) {
      updateUnit(editingUnit.id, unitData);
    } else {
      addUnit(unitData);
    }

    resetForm();
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingUnit(null);
    setFormData({
      name: '',
      type: 'rental_space',
      description: '',
      price: 0,
      capacity: '',
      policies: '',
      features: '',
      available: true,
      image: '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Management</h1>
          <p className="text-gray-600">Add, edit, or remove rental spaces, function halls, and parking slots</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add New Property
        </button>
      </div>

      {/* Properties List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Property Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Price Base</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {units.length === 0 ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No properties found. Add one to get started!</td>
                 </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {unit.images && unit.images.length > 0 ? (
                           <img src={unit.images[0]} alt={unit.name} className="w-12 h-12 rounded object-cover border border-gray-200" />
                        ) : (
                           <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <Building2 className="size-5 text-gray-400" />
                           </div>
                        )}
                        <div>
                          <p className="text-gray-900 font-medium">{unit.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{unit.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {unit.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(unit.price)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {unit.capacity ? `${unit.capacity} pax` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        unit.available ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {unit.available ? 'Available' : 'Occupied / Unavailable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(unit)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit Property"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${unit.name}?`)) {
                              deleteUnit(unit.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete Property"
                        >
                          <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-xl font-bold text-gray-900">{editingUnit ? 'Edit Property' : 'Add New Property'}</h2>
              <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <form id="property-form" onSubmit={handleSubmit} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                      placeholder="e.g. Commercial Unit 101"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as UnitType })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-shadow"
                    >
                      <option value="rental_space">Commercial / Office Unit</option>
                      <option value="function_hall">Function Hall</option>
                      <option value="parking_slot">Parking Slot</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-shadow"
                    placeholder="Describe the property..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price *</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                       <input
                         type="number"
                         required
                         min="0"
                         value={formData.price}
                         onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                         className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                       />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Optional)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                      placeholder="e.g., 50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Features / Amenities (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    placeholder="WiFi, Air Conditioning, Parking Included"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rental Policies *</label>
                  <textarea
                    required
                    value={formData.policies}
                    onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-shadow"
                    placeholder="e.g., Minimum 1-year contract. 2 months deposit."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Availability Status</label>
                     <select
                       value={formData.available ? 'true' : 'false'}
                       onChange={(e) => setFormData({ ...formData, available: e.target.value === 'true' })}
                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-shadow"
                     >
                       <option value="true">Available for Booking</option>
                       <option value="false">Occupied / Maintenance</option>
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Main Image URL</label>
                     <input
                       type="url"
                       required
                       value={formData.image}
                       onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                       placeholder="https://example.com/image.jpg"
                     />
                   </div>
                </div>

              </form>
            </div>
            
            {/* Sticky Footer Actions */}
            <div className="border-t border-gray-100 p-6 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="property-form"
                className="flex items-center justify-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                {editingUnit ? 'Save Changes' : 'Create Property'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}