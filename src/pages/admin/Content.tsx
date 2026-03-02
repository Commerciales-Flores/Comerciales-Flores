import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Save, Plus, X, Layout, Info, Phone, Megaphone, ShieldAlert, CheckCircle } from 'lucide-react';

export default function AdminContent() {
  const { contentSettings, updateContentSettings } = useData();
  const [editing, setEditing] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [formData, setFormData] = useState(contentSettings);
  const [saved, setSaved] = useState(false);

  // Keep local form in sync with context data
  useEffect(() => {
    setFormData(contentSettings);
  }, [contentSettings]);

  const handleSave = () => {
    updateContentSettings(formData);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-500">Update the landing page content, contact details, and announcements.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
            >
              Edit Content
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  setFormData(contentSettings);
                }}
                className="flex-1 md:flex-none px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-blue-100 shadow-lg"
              >
                <Save className="size-4" />
                Publish Changes
              </button>
            </>
          )}
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="size-5" />
          <span className="font-medium">Changes published successfully to the landing page!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Hero Section Card */}
          <ContentCard title="Hero Section" icon={<Layout className="text-blue-600" />}>
            <div className="space-y-4">
              <FieldWrapper label="Main Title">
                {editing ? (
                  <input
                    type="text"
                    value={formData.heroTitle}
                    onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900">{contentSettings.heroTitle}</p>
                )}
              </FieldWrapper>

              <FieldWrapper label="Sub-headline">
                {editing ? (
                  <textarea
                    value={formData.heroSubtitle}
                    onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ) : (
                  <p className="text-gray-600 leading-relaxed">{contentSettings.heroSubtitle}</p>
                )}
              </FieldWrapper>
            </div>
          </ContentCard>

          {/* About Us Card */}
          <ContentCard title="About Us" icon={<Info className="text-purple-600" />}>
            {editing ? (
              <textarea
                value={formData.aboutUs}
                onChange={(e) => setFormData({ ...formData, aboutUs: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            ) : (
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{contentSettings.aboutUs}</p>
            )}
          </ContentCard>

          {/* Policies Card */}
          <ContentCard title="Business Policies" icon={<ShieldAlert className="text-red-600" />}>
            {editing ? (
              <textarea
                value={formData.policies}
                onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            ) : (
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{contentSettings.policies}</p>
            )}
          </ContentCard>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Contact Details Card */}
          <ContentCard title="Contact Info" icon={<Phone className="text-green-600" />}>
            <div className="space-y-4">
              <SidebarField label="Public Email" value={formData.contactEmail} editing={editing} 
                onChange={(v) => setFormData({...formData, contactEmail: v})} />
              <SidebarField label="Public Phone" value={formData.contactPhone} editing={editing} 
                onChange={(v) => setFormData({...formData, contactPhone: v})} />
              <SidebarField label="Office Address" value={formData.contactAddress} editing={editing} isTextArea
                onChange={(v) => setFormData({...formData, contactAddress: v})} />
            </div>
          </ContentCard>

          {/* Announcements Card */}
          <ContentCard title="Announcements" icon={<Megaphone className="text-orange-500" />}>
            <div className="space-y-3">
              {formData.announcements.map((announcement, index) => (
                <div key={index} className="group flex items-start gap-2 bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                  <p className="flex-1 text-sm text-orange-800 leading-tight">{announcement}</p>
                  {editing && (
                    <button
                      onClick={() => handleRemoveAnnouncement(index)}
                      className="p-1 text-orange-300 hover:text-red-600 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              
              {editing && (
                <div className="pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder="New alert..."
                      className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={handleAddAnnouncement}
                      className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ContentCard>
        </div>
      </div>
    </div>
  );
}

// Sub-components for better organization
function ContentCard({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center gap-2">
        {icon}
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function FieldWrapper({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</label>
      {children}
    </div>
  );
}

function SidebarField({ label, value, editing, onChange, isTextArea = false }: any) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      {editing ? (
        isTextArea ? (
          <textarea 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        ) : (
          <input 
            type="text" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
      ) : (
        <p className="text-sm text-gray-700 font-medium break-words">{value || 'None'}</p>
      )}
    </div>
  );
}