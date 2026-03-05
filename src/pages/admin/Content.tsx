import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Save, Plus, X, Loader2 } from 'lucide-react';

export default function AdminContent() {
  const { contentSettings, updateContentSettings } = useData();
  const [editing, setEditing] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [formData, setFormData] = useState(contentSettings);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ✅ NEW: Sync the form data as soon as Supabase finishes loading the content
  useEffect(() => {
    setFormData(contentSettings);
  }, [contentSettings]);

  // ✅ UPDATED: Now an async function that waits for Supabase to finish updating
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateContentSettings(formData);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save content settings:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAnnouncement = () => {
    if (newAnnouncement.trim()) {
      setFormData({
        ...formData,
        announcements: [...formData.announcements, newAnnouncement]
      });
      setNewAnnouncement('');
    }
  };

  const handleRemoveAnnouncement = (index: number) => {
    setFormData({
      ...formData,
      announcements: formData.announcements.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600">Edit landing page content and settings</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Content
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setFormData(contentSettings); // Reset to last saved DB state
              }}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-2 font-medium">
          Content saved successfully! The Landing Page has been updated.
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Hero Section</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hero Title</label>
            {editing ? (
              <input
                type="text"
                value={formData.heroTitle}
                onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">{contentSettings.heroTitle || 'Not set'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hero Subtitle</label>
            {editing ? (
              <input
                type="text"
                value={formData.heroSubtitle}
                onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">{contentSettings.heroSubtitle || 'Not set'}</p>
            )}
          </div>
        </div>
      </div>

      {/* About Us */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">About Us</h2>
        {editing ? (
          <textarea
            value={formData.aboutUs}
            onChange={(e) => setFormData({ ...formData, aboutUs: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">{contentSettings.aboutUs || 'Not set'}</p>
        )}
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Contact Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            {editing ? (
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">{contentSettings.contactEmail || 'Not set'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            {editing ? (
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">{contentSettings.contactPhone || 'Not set'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            {editing ? (
              <textarea
                value={formData.contactAddress}
                onChange={(e) => setFormData({ ...formData, contactAddress: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">{contentSettings.contactAddress || 'Not set'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Announcements</h2>
        <div className="space-y-3">
          {formData.announcements.length === 0 && !editing && (
            <p className="text-sm text-gray-500 italic">No active announcements.</p>
          )}
          {formData.announcements.map((announcement, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg">
                {announcement}
              </div>
              {editing && (
                <button
                  onClick={() => handleRemoveAnnouncement(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Remove Announcement"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>
          ))}
          {editing && (
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
                placeholder="Type a new announcement..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAnnouncement();
                    }
                }}
              />
              <button
                onClick={handleAddAnnouncement}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Plus className="size-4" />
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Policies */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-12">
        <h2 className="mb-4 text-lg font-bold text-gray-900">General Policies</h2>
        {editing ? (
          <textarea
            value={formData.policies}
            onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">{contentSettings.policies || 'Not set'}</p>
        )}
      </div>
    </div>
  );
}