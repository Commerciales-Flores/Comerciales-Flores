import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Save, Plus, X, Layout, Info, Phone, Megaphone, ShieldAlert, CheckCircle, Pencil } from 'lucide-react';

export default function AdminContent() {
  const { contentSettings, updateContentSettings } = useData();
  const [editing, setEditing] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [formData, setFormData] = useState(contentSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => setFormData(contentSettings), [contentSettings]);

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
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-sm text-gray-500">Update landing page content, contact info, and announcements.</p>
        </div>
        <div className="hidden md:flex gap-3 w-full md:w-auto">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
            >
              Edit Content
            </button>
          ) : (
            <>
              <button
                onClick={() => { setEditing(false); setFormData(contentSettings); }}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
              >
                <Save className="size-4" />
                Publish Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {saved && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="size-5 shrink-0" />
          <span className="font-bold text-sm">Changes published successfully!</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <ContentCard title="Hero Section" icon={<Layout className="text-blue-600 size-5" />}>
            <div className="space-y-4">
              <FieldWrapper label="Main Title">
                {editing ? (
                  <input
                    type="text"
                    value={formData.heroTitle}
                    onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
                  />
                ) : (
                  <p className="text-lg font-bold text-gray-900">{contentSettings.heroTitle}</p>
                )}
              </FieldWrapper>

              <FieldWrapper label="Sub-headline">
                {editing ? (
                  <textarea
                    value={formData.heroSubtitle}
                    onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed">{contentSettings.heroSubtitle}</p>
                )}
              </FieldWrapper>
            </div>
          </ContentCard>

          <ContentCard title="About Us" icon={<Info className="text-purple-600 size-5" />}>
            {editing ? (
              <textarea
                value={formData.aboutUs}
                onChange={(e) => setFormData({ ...formData, aboutUs: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{contentSettings.aboutUs}</p>
            )}
          </ContentCard>

          <ContentCard title="Business Policies" icon={<ShieldAlert className="text-red-600 size-5" />}>
            {editing ? (
              <textarea
                value={formData.policies}
                onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{contentSettings.policies}</p>
            )}
          </ContentCard>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <ContentCard title="Contact Info" icon={<Phone className="text-green-600 size-5" />}>
            <div className="space-y-4">
              <SidebarField label="Public Email" value={formData.contactEmail} editing={editing} 
                onChange={(v) => setFormData({...formData, contactEmail: v})} />
              <SidebarField label="Public Phone" value={formData.contactPhone} editing={editing} 
                onChange={(v) => setFormData({...formData, contactPhone: v})} />
              <SidebarField label="Office Address" value={formData.contactAddress} editing={editing} isTextArea
                onChange={(v) => setFormData({...formData, contactAddress: v})} />
            </div>
          </ContentCard>

          <ContentCard title="Announcements" icon={<Megaphone className="text-orange-500 size-5" />}>
            <div className="space-y-3">
              {formData.announcements.map((announcement, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <p className="flex-1 text-sm text-orange-800 font-bold leading-tight">{announcement}</p>
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder="Add alert..."
                      className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={handleAddAnnouncement}
                      className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex justify-center items-center"
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

      {/* FAB for Mobile */}
      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="fixed bottom-6 right-6 z-50 md:hidden flex items-center justify-center size-14 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 active:scale-90 transition-all border-4 border-white"
        >
          <Pencil className="size-6" />
        </button>
      ) : (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 md:hidden">
          <button
            onClick={() => { setEditing(false); setFormData(contentSettings); }}
            className="flex items-center justify-center size-12 bg-white text-gray-500 rounded-full shadow-xl border border-gray-200"
          >
            <X className="size-5" />
          </button>
          <button
            onClick={handleSave}
            className="flex items-center justify-center size-14 bg-green-600 text-white rounded-full shadow-2xl border-4 border-white"
          >
            <Save className="size-6" />
          </button>
        </div>
      )}
    </div>
  );
}

// Sub-components
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
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
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