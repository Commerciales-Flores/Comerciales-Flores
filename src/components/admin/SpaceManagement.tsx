import { useState } from 'react';
import { useData, Space } from '../../context/DataContext';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

export default function SpaceManagement() {
  const { spaces, addSpace, updateSpace, deleteSpace } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'unit' as 'unit' | 'function-hall' | 'parking',
    description: '',
    price: 0,
    priceUnit: 'per month',
    capacity: '',
    area: '',
    amenities: '',
    availability: 'available' as 'available' | 'occupied' | 'maintenance',
    image: '',
  });

  const handleEdit = (space: Space) => {
    setEditingSpace(space);
    setFormData({
      name: space.name,
      type: space.type,
      description: space.description,
      price: space.price,
      priceUnit: space.priceUnit,
      capacity: space.capacity || '',
      area: space.area || '',
      amenities: space.amenities.join(', '),
      availability: space.availability,
      image: space.image,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const spaceData = {
      ...formData,
      amenities: formData.amenities.split(',').map(a => a.trim()).filter(Boolean),
    };

    if (editingSpace) {
      updateSpace(editingSpace.id, spaceData);
    } else {
      addSpace(spaceData);
    }

    resetForm();
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingSpace(null);
    setFormData({
      name: '',
      type: 'unit',
      description: '',
      price: 0,
      priceUnit: 'per month',
      capacity: '',
      area: '',
      amenities: '',
      availability: 'available',
      image: '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Space Management</h1>
          <p className="text-gray-600">Add, edit, or remove business spaces</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Space
        </button>
      </div>

      {/* Spaces List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-gray-700">Type</th>
                <th className="px-6 py-3 text-left text-gray-700">Price</th>
                <th className="px-6 py-3 text-left text-gray-700">Capacity</th>
                <th className="px-6 py-3 text-left text-gray-700">Area</th>
                <th className="px-6 py-3 text-left text-gray-700">Status</th>
                <th className="px-6 py-3 text-right text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {spaces.map((space) => (
                <tr key={space.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{space.name}</p>
                    <p className="text-sm text-gray-600">{space.description.substring(0, 50)}...</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600 capitalize">{space.type.replace('-', ' ')}</td>
                  <td className="px-6 py-4 text-gray-900">${space.price} / {space.priceUnit.replace('per ', '')}</td>
                  <td className="px-6 py-4 text-gray-600">{space.capacity || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{space.area || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      space.availability === 'available' ? 'bg-green-100 text-green-800' :
                      space.availability === 'occupied' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {space.availability}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(space)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this space?')) {
                            deleteSpace(space.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-gray-900">{editingSpace ? 'Edit Space' : 'Add New Space'}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="unit">Office Unit</option>
                    <option value="function-hall">Function Hall</option>
                    <option value="parking">Parking</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Price</label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Price Unit</label>
                  <select
                    value={formData.priceUnit}
                    onChange={(e) => setFormData({ ...formData, priceUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="per day">Per Day</option>
                    <option value="per month">Per Month</option>
                    <option value="per year">Per Year</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Capacity</label>
                  <input
                    type="text"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 10-15 people"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Area</label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 500 sq ft"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Amenities (comma-separated)</label>
                <input
                  type="text"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="WiFi, Air Conditioning, Parking"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Availability Status</label>
                <select
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Image URL</label>
                <input
                  type="url"
                  required
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingSpace ? 'Update Space' : 'Add Space'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
