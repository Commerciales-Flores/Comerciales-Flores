import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import {
  Save,
  Plus,
  X,
  Layout,
  Info,
  Phone,
  Megaphone,
  ShieldAlert,
  CheckCircle,
  Pencil,
  ImageIcon,
  FileText,
  Mail,
} from 'lucide-react';

export default function AdminContent() {
  const { contentSettings, updateContentSettings } = useData();
  const [editing, setEditing] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [formData, setFormData] = useState(contentSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => setFormData(contentSettings), [contentSettings]);

  const handleSave = async () => {
    try {
      await updateContentSettings(formData);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save content settings:', error);
    }
  };

  const handleAddAnnouncement = () => {
    if (newAnnouncement.trim()) {
      setFormData({
        ...formData,
        announcements: [...formData.announcements, newAnnouncement.trim()],
      });
      setNewAnnouncement('');
    }
  };

  const handleRemoveAnnouncement = (index: number) => {
    setFormData({
      ...formData,
      announcements: formData.announcements.filter((_, i) => i !== index),
    });
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData(contentSettings);
    setNewAnnouncement('');
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 pb-28 md:pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Management</h1>
          <p className="text-sm text-slate-500">
            Manage the public-facing content of your website.
          </p>
        </div>

        <div className="hidden md:flex gap-3 w-full md:w-auto">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-all shadow-sm"
            >
              Edit Content
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-2xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
              >
                <Save className="size-4" />
                Publish Changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-6 md:p-8 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
          Site Content
        </p>
        <h2 className="text-2xl md:text-3xl font-bold mt-2">
          Manage your public website content
        </h2>
        <p className="text-sm md:text-base text-slate-300 mt-3 max-w-2xl leading-relaxed">
          Update your homepage story, visuals, contact information, policies, and
          announcements shown to visitors.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="size-5 shrink-0" />
          <span className="font-semibold text-sm">Changes published successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <SectionLabel title="Landing Page" />

          <ContentCard
            title="Hero Section"
            description="Controls the main headline, badge, calls-to-action, and visual shown at the top of the homepage."
            icon={<Layout className="text-blue-600 size-5" />}
          >
            <div className="space-y-5">
              <FieldWrapper label="Hero Badge">
                {editing ? (
                  <input
                    type="text"
                    value={formData.heroBadge}
                    onChange={(e) => setFormData({ ...formData, heroBadge: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-700">
                    {contentSettings.heroBadge || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="Main Title">
                {editing ? (
                  <input
                    type="text"
                    value={formData.heroTitle}
                    onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-900">
                    {contentSettings.heroTitle || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="Sub-headline">
                {editing ? (
                  <textarea
                    value={formData.heroSubtitle}
                    onChange={(e) =>
                      setFormData({ ...formData, heroSubtitle: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                  />
                ) : (
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                    {contentSettings.heroSubtitle || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldWrapper label="Primary CTA Text">
                  {editing ? (
                    <input
                      type="text"
                      value={formData.heroPrimaryCtaText}
                      onChange={(e) =>
                        setFormData({ ...formData, heroPrimaryCtaText: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-700">
                      {contentSettings.heroPrimaryCtaText || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="Primary CTA Link">
                  {editing ? (
                    <input
                      type="text"
                      value={formData.heroPrimaryCtaLink}
                      onChange={(e) =>
                        setFormData({ ...formData, heroPrimaryCtaLink: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 break-all">
                      {contentSettings.heroPrimaryCtaLink || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="Secondary CTA Text">
                  {editing ? (
                    <input
                      type="text"
                      value={formData.heroSecondaryCtaText}
                      onChange={(e) =>
                        setFormData({ ...formData, heroSecondaryCtaText: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-700">
                      {contentSettings.heroSecondaryCtaText || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="Secondary CTA Link">
                  {editing ? (
                    <input
                      type="text"
                      value={formData.heroSecondaryCtaLink}
                      onChange={(e) =>
                        setFormData({ ...formData, heroSecondaryCtaLink: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 break-all">
                      {contentSettings.heroSecondaryCtaLink || 'None'}
                    </p>
                  )}
                </FieldWrapper>
              </div>

              <FieldWrapper label="Hero Image URL">
                {editing ? (
                  <input
                    type="text"
                    value={formData.heroImage || ''}
                    onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                    placeholder="https://example.com/hero-image.jpg"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700 break-all">
                      {contentSettings.heroImage || 'None'}
                    </p>
                    {contentSettings.heroImage && (
                      <img
                        src={contentSettings.heroImage}
                        alt="Hero preview"
                        className="w-full max-h-72 object-cover rounded-2xl border border-slate-200"
                      />
                    )}
                  </div>
                )}
              </FieldWrapper>
            </div>
          </ContentCard>

          <ContentCard
            title="About Us"
            description="Displays the introduction and supporting value cards for your business."
            icon={<Info className="text-purple-600 size-5" />}
          >
            <div className="space-y-5">
              <FieldWrapper label="About Eyebrow">
                {editing ? (
                  <input
                    type="text"
                    value={formData.aboutEyebrow}
                    onChange={(e) => setFormData({ ...formData, aboutEyebrow: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-700">
                    {contentSettings.aboutEyebrow || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="About Title">
                {editing ? (
                  <input
                    type="text"
                    value={formData.aboutTitle}
                    onChange={(e) => setFormData({ ...formData, aboutTitle: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-900">
                    {contentSettings.aboutTitle || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="About Description">
                {editing ? (
                  <textarea
                    value={formData.aboutUs}
                    onChange={(e) => setFormData({ ...formData, aboutUs: e.target.value })}
                    rows={7}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                  />
                ) : (
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                    {contentSettings.aboutUs || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MiniCardEditor
                  titleLabel="Card 1 Title"
                  textLabel="Card 1 Text"
                  titleValue={formData.aboutCard1Title}
                  textValue={formData.aboutCard1Text}
                  editing={editing}
                  onTitleChange={(v: string) => setFormData({ ...formData, aboutCard1Title: v })}
                  onTextChange={(v: string) => setFormData({ ...formData, aboutCard1Text: v })}
                />

                <MiniCardEditor
                  titleLabel="Card 2 Title"
                  textLabel="Card 2 Text"
                  titleValue={formData.aboutCard2Title}
                  textValue={formData.aboutCard2Text}
                  editing={editing}
                  onTitleChange={(v: string) => setFormData({ ...formData, aboutCard2Title: v })}
                  onTextChange={(v: string) => setFormData({ ...formData, aboutCard2Text: v })}
                />

                <MiniCardEditor
                  titleLabel="Card 3 Title"
                  textLabel="Card 3 Text"
                  titleValue={formData.aboutCard3Title}
                  textValue={formData.aboutCard3Text}
                  editing={editing}
                  onTitleChange={(v: string) => setFormData({ ...formData, aboutCard3Title: v })}
                  onTextChange={(v: string) => setFormData({ ...formData, aboutCard3Text: v })}
                />
              </div>
            </div>
          </ContentCard>

          <ContentCard
            title="History Section"
            description="Tells the story of your business with supporting text, image, and milestone points."
            icon={<ImageIcon className="text-amber-600 size-5" />}
          >
            <div className="space-y-5">
              <FieldWrapper label="History Eyebrow">
                {editing ? (
                  <input
                    type="text"
                    value={formData.historyEyebrow}
                    onChange={(e) => setFormData({ ...formData, historyEyebrow: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-700">
                    {contentSettings.historyEyebrow || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="History Title">
                {editing ? (
                  <input
                    type="text"
                    value={formData.historyTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, historyTitle: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-900">
                    {contentSettings.historyTitle || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="History Subtitle">
                {editing ? (
                  <input
                    type="text"
                    value={formData.historySubtitle}
                    onChange={(e) =>
                      setFormData({ ...formData, historySubtitle: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                ) : (
                  <p className="text-sm text-slate-600">
                    {contentSettings.historySubtitle || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="History Description">
                {editing ? (
                  <textarea
                    value={formData.historyText}
                    onChange={(e) =>
                      setFormData({ ...formData, historyText: e.target.value })
                    }
                    rows={7}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                  />
                ) : (
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                    {contentSettings.historyText || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="History Images">
  {editing ? (
    <div className="space-y-3">
      {(formData.historyImages ?? []).length > 0 ? (
        <div className="space-y-3">
          {(formData.historyImages ?? []).map((img, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={img}
                  onChange={(e) => {
                    const updated = [...(formData.historyImages ?? [])];
                    updated[index] = e.target.value;
                    setFormData({ ...formData, historyImages: updated });
                  }}
                  placeholder="https://example.com/history-image.jpg"
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = (formData.historyImages ?? []).filter(
                      (_, i) => i !== index
                    );
                    setFormData({ ...formData, historyImages: updated });
                  }}
                  className="px-3 py-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {img && (
                <img
                  src={img}
                  alt={`History preview ${index + 1}`}
                  className="w-full max-h-52 object-cover rounded-xl border border-slate-200"
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm text-slate-500">No history images added yet.</p>
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          setFormData({
            ...formData,
            historyImages: [...(formData.historyImages ?? []), ''],
          })
        }
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium"
      >
        <Plus className="size-4" />
        Add Image URL
      </button>

      <p className="text-xs text-slate-400">
        Add one or more image URLs for the History slideshow.
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      {(contentSettings.historyImages && contentSettings.historyImages.length > 0) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {contentSettings.historyImages.map((img, index) => (
            <div key={index} className="space-y-2">
              <p className="text-xs text-slate-500 break-all">{img}</p>
              <img
                src={img}
                alt={`History preview ${index + 1}`}
                className="w-full h-40 object-cover rounded-2xl border border-slate-200"
              />
            </div>
          ))}
        </div>
      ) : contentSettings.historyImage ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 break-all">
            {contentSettings.historyImage}
          </p>
          <img
            src={contentSettings.historyImage}
            alt="History preview"
            className="w-full max-h-72 object-cover rounded-2xl border border-slate-200"
          />
        </div>
      ) : (
        <p className="text-sm text-slate-700">None</p>
      )}
    </div>
  )}
</FieldWrapper>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MiniCardEditor
                  titleLabel="Point 1 Title"
                  textLabel="Point 1 Text"
                  titleValue={formData.historyPoint1Title}
                  textValue={formData.historyPoint1Text}
                  editing={editing}
                  onTitleChange={(v: string) => setFormData({ ...formData, historyPoint1Title: v })}
                  onTextChange={(v: string) => setFormData({ ...formData, historyPoint1Text: v })}
                />

                <MiniCardEditor
                  titleLabel="Point 2 Title"
                  textLabel="Point 2 Text"
                  titleValue={formData.historyPoint2Title}
                  textValue={formData.historyPoint2Text}
                  editing={editing}
                  onTitleChange={(v: string) => setFormData({ ...formData, historyPoint2Title: v })}
                  onTextChange={(v: string) => setFormData({ ...formData, historyPoint2Text: v })}
                />

                <MiniCardEditor
                  titleLabel="Point 3 Title"
                  textLabel="Point 3 Text"
                  titleValue={formData.historyPoint3Title}
                  textValue={formData.historyPoint3Text}
                  editing={editing}
                  onTitleChange={(v: string) => setFormData({ ...formData, historyPoint3Title: v })}
                  onTextChange={(v: string) => setFormData({ ...formData, historyPoint3Text: v })}
                />
              </div>
            </div>
          </ContentCard>

          <ContentCard
            title="Featured Section"
            description="Controls the heading, subheading, and empty-state messaging for featured spaces."
            icon={<FileText className="text-indigo-600 size-5" />}
          >
            <div className="space-y-5">
              <FieldWrapper label="Featured Title">
                {editing ? (
                  <input
                    type="text"
                    value={formData.featuredTitle}
                    onChange={(e) => setFormData({ ...formData, featuredTitle: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-900">
                    {contentSettings.featuredTitle || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="Featured Subtitle">
                {editing ? (
                  <textarea
                    value={formData.featuredSubtitle}
                    onChange={(e) =>
                      setFormData({ ...formData, featuredSubtitle: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                  />
                ) : (
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {contentSettings.featuredSubtitle || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="View All Button Text">
                {editing ? (
                  <input
                    type="text"
                    value={formData.featuredViewAllText}
                    onChange={(e) =>
                      setFormData({ ...formData, featuredViewAllText: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-700">
                    {contentSettings.featuredViewAllText || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="Empty State Title">
                {editing ? (
                  <input
                    type="text"
                    value={formData.featuredEmptyTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, featuredEmptyTitle: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-700">
                    {contentSettings.featuredEmptyTitle || 'None'}
                  </p>
                )}
              </FieldWrapper>

              <FieldWrapper label="Empty State Description">
                {editing ? (
                  <textarea
                    value={formData.featuredEmptyText}
                    onChange={(e) =>
                      setFormData({ ...formData, featuredEmptyText: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                  />
                ) : (
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {contentSettings.featuredEmptyText || 'None'}
                  </p>
                )}
              </FieldWrapper>
            </div>
          </ContentCard>

          <SectionLabel title="Business Information" />

          <ContentCard
            title="Business Policies"
            description="Displays important policies and terms for visitors and customers."
            icon={<ShieldAlert className="text-red-600 size-5" />}
          >
            {editing ? (
              <textarea
                value={formData.policies}
                onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
                rows={7}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
              />
            ) : (
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {contentSettings.policies || 'None'}
              </p>
            )}
          </ContentCard>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionLabel title="Sidebar Content" />

          <ContentCard
            title="Content Snapshot"
            description="Quick overview of what is currently set on the website."
            icon={<FileText className="text-sky-600 size-5" />}
          >
            <div className="space-y-3 text-sm">
              <SnapshotRow label="Hero title" value={formData.heroTitle || 'Empty'} />
              <SnapshotRow label="History title" value={formData.historyTitle || 'Empty'} />
              <SnapshotRow label="Announcements" value={String(formData.announcements.length)} />
              <SnapshotRow label="Contact email" value={formData.contactEmail || 'Empty'} />
              <SnapshotRow
                label="Policies"
                value={formData.policies ? 'Configured' : 'Empty'}
              />
            </div>
          </ContentCard>

          <ContentCard
            title="Contact Section"
            description="Controls the public contact form heading and location card text."
            icon={<Phone className="text-cyan-600 size-5" />}
          >
            <div className="space-y-4">
              <SidebarField
                label="Contact Title"
                value={formData.contactTitle}
                editing={editing}
                onChange={(v: string) => setFormData({ ...formData, contactTitle: v })}
              />
              <SidebarField
                label="Contact Subtitle"
                value={formData.contactSubtitle}
                editing={editing}
                isTextArea
                onChange={(v: string) => setFormData({ ...formData, contactSubtitle: v })}
              />
              <SidebarField
                label="Location Title"
                value={formData.locationTitle}
                editing={editing}
                onChange={(v: string) => setFormData({ ...formData, locationTitle: v })}
              />
              <SidebarField
                label="Location Subtitle"
                value={formData.locationSubtitle}
                editing={editing}
                onChange={(v: string) => setFormData({ ...formData, locationSubtitle: v })}
              />
            </div>
          </ContentCard>

          <ContentCard
            title="Contact Info"
            description="Public contact details shown across the website."
            icon={<Phone className="text-green-600 size-5" />}
          >
            <div className="space-y-4">
              <SidebarField
                label="Public Email"
                value={formData.contactEmail}
                editing={editing}
                onChange={(v: string) => setFormData({ ...formData, contactEmail: v })}
                icon={<Mail className="size-4 text-slate-400" />}
              />
              <SidebarField
                label="Public Phone"
                value={formData.contactPhone}
                editing={editing}
                onChange={(v: string) => setFormData({ ...formData, contactPhone: v })}
              />
              <SidebarField
                label="Office Address"
                value={formData.contactAddress}
                editing={editing}
                isTextArea
                onChange={(v: string) => setFormData({ ...formData, contactAddress: v })}
              />
            </div>
          </ContentCard>

          <ContentCard
            title="Footer & Menu"
            description="Controls footer text, branding, and mobile menu title."
            icon={<Layout className="text-slate-600 size-5" />}
          >
            <div className="space-y-4">
              <SidebarField
                label="Footer Brand Name"
                value={formData.footerBrandName}
                editing={editing}
                onChange={(v: string) => setFormData({ ...formData, footerBrandName: v })}
              />

              <SidebarField
                label="Footer Brand Description"
                value={formData.footerBrandDescription}
                editing={editing}
                isTextArea
                onChange={(v: string) =>
                  setFormData({ ...formData, footerBrandDescription: v })
                }
              />

              <SidebarField
                label="Quick Links Title"
                value={formData.footerQuickLinksTitle}
                editing={editing}
                onChange={(v: string) =>
                  setFormData({ ...formData, footerQuickLinksTitle: v })
                }
              />

              <SidebarField
                label="Footer Contact Title"
                value={formData.footerContactTitle}
                editing={editing}
                onChange={(v: string) =>
                  setFormData({ ...formData, footerContactTitle: v })
                }
              />

              <SidebarField
                label="Footer Copyright"
                value={formData.footerCopyright}
                editing={editing}
                isTextArea
                onChange={(v: string) =>
                  setFormData({ ...formData, footerCopyright: v })
                }
              />

              <SidebarField
                label="Footer Privacy Text"
                value={formData.footerPrivacyText}
                editing={editing}
                isTextArea
                onChange={(v: string) =>
                  setFormData({ ...formData, footerPrivacyText: v })
                }
              />

              <SidebarField
                label="Menu Title"
                value={formData.menuTitle}
                editing={editing}
                onChange={(v: string) => setFormData({ ...formData, menuTitle: v })}
              />
            </div>
          </ContentCard>

          <ContentCard
            title="Announcements"
            description="Short updates or alerts displayed on the landing page."
            icon={<Megaphone className="text-orange-500 size-5" />}
          >
            <div className="space-y-3">
              {formData.announcements.length > 0 ? (
                formData.announcements.map((announcement, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-orange-50 p-3 rounded-xl border border-orange-100"
                  >
                    <p className="flex-1 text-sm text-orange-800 font-semibold leading-tight">
                      {announcement}
                    </p>
                    {editing && (
                      <button
                        onClick={() => handleRemoveAnnouncement(index)}
                        className="p-1 text-orange-300 hover:text-red-600 transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-sm text-slate-500">No announcements added yet.</p>
                </div>
              )}

              {editing && (
                <div className="pt-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder="Add alert..."
                      className="flex-1 px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={handleAddAnnouncement}
                      className="p-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors flex justify-center items-center"
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
            onClick={handleCancel}
            className="flex items-center justify-center size-12 bg-white text-slate-500 rounded-full shadow-xl border border-slate-200"
          >
            <X className="size-5" />
          </button>
          <button
            onClick={handleSave}
            className="flex items-center justify-center size-14 bg-emerald-600 text-white rounded-full shadow-2xl border-4 border-white"
          >
            <Save className="size-6" />
          </button>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="px-1">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
    </div>
  );
}

function ContentCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function FieldWrapper({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium text-right line-clamp-1">{value}</span>
    </div>
  );
}

function SidebarField({
  label,
  value,
  editing,
  onChange,
  isTextArea = false,
  icon,
}: any) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
        {label}
      </label>

      {editing ? (
        isTextArea ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
        ) : (
          <div className="relative">
            {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${
                icon ? 'pl-10 pr-4' : 'px-4'
              }`}
            />
          </div>
        )
      ) : (
        <p className="text-sm text-slate-700 font-medium break-words">{value || 'None'}</p>
      )}
    </div>
  );
}

function MiniCardEditor({
  titleLabel,
  textLabel,
  titleValue,
  textValue,
  editing,
  onTitleChange,
  onTextChange,
}: {
  titleLabel: string;
  textLabel: string;
  titleValue: string;
  textValue: string;
  editing: boolean;
  onTitleChange: (value: string) => void;
  onTextChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <FieldWrapper label={titleLabel}>
        {editing ? (
          <input
            type="text"
            value={titleValue}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        ) : (
          <p className="text-sm font-medium text-slate-900">{titleValue || 'None'}</p>
        )}
      </FieldWrapper>

      <FieldWrapper label={textLabel}>
        {editing ? (
          <textarea
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
          />
        ) : (
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {textValue || 'None'}
          </p>
        )}
      </FieldWrapper>
    </div>
  );
}