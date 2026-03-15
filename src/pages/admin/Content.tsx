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

  const updateHero = (patch: Partial<typeof formData.hero>) => {
  setFormData((prev) => ({
    ...prev,
    hero: { ...prev.hero, ...patch },
  }));
};

const updateAbout = (patch: Partial<typeof formData.about>) => {
  setFormData((prev) => ({
    ...prev,
    about: { ...prev.about, ...patch },
  }));
};

const updateHistory = (patch: Partial<typeof formData.history>) => {
  setFormData((prev) => ({
    ...prev,
    history: { ...prev.history, ...patch },
  }));
};

const updateFeatured = (patch: Partial<typeof formData.featured>) => {
  setFormData((prev) => ({
    ...prev,
    featured: { ...prev.featured, ...patch },
  }));
};

const updateContact = (patch: Partial<typeof formData.contact>) => {
  setFormData((prev) => ({
    ...prev,
    contact: { ...prev.contact, ...patch },
  }));
};

const updateFooter = (patch: Partial<typeof formData.footer>) => {
  setFormData((prev) => ({
    ...prev,
    footer: { ...prev.footer, ...patch },
  }));
};

const updateMenu = (patch: Partial<typeof formData.menu>) => {
  setFormData((prev) => ({
    ...prev,
    menu: { ...prev.menu, ...patch },
  }));
};

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
          value={formData.hero.badge}
          onChange={(e) => updateHero({ badge: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
      ) : (
        <p className="text-sm font-medium text-slate-700">
          {contentSettings.hero.badge || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="Main Title">
      {editing ? (
        <input
          type="text"
          value={formData.hero.title}
          onChange={(e) => updateHero({ title: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
        />
      ) : (
        <p className="text-lg font-semibold text-slate-900">
          {contentSettings.hero.title || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="Sub-headline">
      {editing ? (
        <textarea
          value={formData.hero.subtitle}
          onChange={(e) => updateHero({ subtitle: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
        />
      ) : (
        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
          {contentSettings.hero.subtitle || 'None'}
        </p>
      )}
    </FieldWrapper>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FieldWrapper label="Primary CTA Text">
        {editing ? (
          <input
            type="text"
            value={formData.hero.primaryCtaText}
            onChange={(e) => updateHero({ primaryCtaText: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        ) : (
          <p className="text-sm font-medium text-slate-700">
            {contentSettings.hero.primaryCtaText || 'None'}
          </p>
        )}
      </FieldWrapper>

      <FieldWrapper label="Primary CTA Link">
        {editing ? (
          <input
            type="text"
            value={formData.hero.primaryCtaLink}
            onChange={(e) => updateHero({ primaryCtaLink: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        ) : (
          <p className="text-sm text-slate-700 break-all">
            {contentSettings.hero.primaryCtaLink || 'None'}
          </p>
        )}
      </FieldWrapper>

      <FieldWrapper label="Secondary CTA Text">
        {editing ? (
          <input
            type="text"
            value={formData.hero.secondaryCtaText}
            onChange={(e) => updateHero({ secondaryCtaText: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        ) : (
          <p className="text-sm font-medium text-slate-700">
            {contentSettings.hero.secondaryCtaText || 'None'}
          </p>
        )}
      </FieldWrapper>

      <FieldWrapper label="Secondary CTA Link">
        {editing ? (
          <input
            type="text"
            value={formData.hero.secondaryCtaLink}
            onChange={(e) => updateHero({ secondaryCtaLink: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        ) : (
          <p className="text-sm text-slate-700 break-all">
            {contentSettings.hero.secondaryCtaLink || 'None'}
          </p>
        )}
      </FieldWrapper>
    </div>

    <FieldWrapper label="Hero Image URL">
      {editing ? (
        <input
          type="text"
          value={formData.hero.image || ''}
          onChange={(e) => updateHero({ image: e.target.value })}
          placeholder="https://example.com/hero-image.jpg"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 break-all">
            {contentSettings.hero.image || 'None'}
          </p>
          {contentSettings.hero.image && (
            <img
              src={contentSettings.hero.image}
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
          value={formData.about.eyebrow}
          onChange={(e) => updateAbout({ eyebrow: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
      ) : (
        <p className="text-sm font-medium text-slate-700">
          {contentSettings.about.eyebrow || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="About Title">
      {editing ? (
        <input
          type="text"
          value={formData.about.title}
          onChange={(e) => updateAbout({ title: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
        />
      ) : (
        <p className="text-lg font-semibold text-slate-900">
          {contentSettings.about.title || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="About Description">
      {editing ? (
        <textarea
          value={formData.about.text}
          onChange={(e) => updateAbout({ text: e.target.value })}
          rows={7}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
        />
      ) : (
        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
          {contentSettings.about.text || 'None'}
        </p>
      )}
    </FieldWrapper>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MiniCardEditor
        titleLabel="Card 1 Title"
        textLabel="Card 1 Text"
        titleValue={formData.about.cards[0]?.title || ''}
        textValue={formData.about.cards[0]?.text || ''}
        editing={editing}
        onTitleChange={(v: string) => {
          const cards = [...formData.about.cards];
          cards[0] = { ...cards[0], title: v };
          updateAbout({ cards });
        }}
        onTextChange={(v: string) => {
          const cards = [...formData.about.cards];
          cards[0] = { ...cards[0], text: v };
          updateAbout({ cards });
        }}
      />

      <MiniCardEditor
        titleLabel="Card 2 Title"
        textLabel="Card 2 Text"
        titleValue={formData.about.cards[1]?.title || ''}
        textValue={formData.about.cards[1]?.text || ''}
        editing={editing}
        onTitleChange={(v: string) => {
          const cards = [...formData.about.cards];
          cards[1] = { ...cards[1], title: v };
          updateAbout({ cards });
        }}
        onTextChange={(v: string) => {
          const cards = [...formData.about.cards];
          cards[1] = { ...cards[1], text: v };
          updateAbout({ cards });
        }}
      />

      <MiniCardEditor
        titleLabel="Card 3 Title"
        textLabel="Card 3 Text"
        titleValue={formData.about.cards[2]?.title || ''}
        textValue={formData.about.cards[2]?.text || ''}
        editing={editing}
        onTitleChange={(v: string) => {
          const cards = [...formData.about.cards];
          cards[2] = { ...cards[2], title: v };
          updateAbout({ cards });
        }}
        onTextChange={(v: string) => {
          const cards = [...formData.about.cards];
          cards[2] = { ...cards[2], text: v };
          updateAbout({ cards });
        }}
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
          value={formData.history.eyebrow}
          onChange={(e) => updateHistory({ eyebrow: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
      ) : (
        <p className="text-sm font-medium text-slate-700">
          {contentSettings.history.eyebrow || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="History Title">
      {editing ? (
        <input
          type="text"
          value={formData.history.title}
          onChange={(e) => updateHistory({ title: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
        />
      ) : (
        <p className="text-lg font-semibold text-slate-900">
          {contentSettings.history.title || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="History Subtitle">
      {editing ? (
        <input
          type="text"
          value={formData.history.subtitle}
          onChange={(e) => updateHistory({ subtitle: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
      ) : (
        <p className="text-sm text-slate-600">
          {contentSettings.history.subtitle || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="History Description">
      {editing ? (
        <textarea
          value={formData.history.text}
          onChange={(e) => updateHistory({ text: e.target.value })}
          rows={7}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
        />
      ) : (
        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
          {contentSettings.history.text || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="History Images">
      {editing ? (
        <div className="space-y-3">
          {(formData.history.images ?? []).length > 0 ? (
            <div className="space-y-3">
              {(formData.history.images ?? []).map((img, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={img}
                      onChange={(e) => {
                        const updated = [...(formData.history.images ?? [])];
                        updated[index] = e.target.value;
                        updateHistory({ images: updated });
                      }}
                      placeholder="https://example.com/history-image.jpg"
                      className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (formData.history.images ?? []).filter(
                          (_, i) => i !== index
                        );
                        updateHistory({ images: updated });
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
              updateHistory({
                images: [...(formData.history.images ?? []), ''],
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
          {contentSettings.history.images?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contentSettings.history.images.map((img, index) => (
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
          ) : contentSettings.history.image ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 break-all">
                {contentSettings.history.image}
              </p>
              <img
                src={contentSettings.history.image}
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
        titleValue={formData.history.points[0]?.title || ''}
        textValue={formData.history.points[0]?.text || ''}
        editing={editing}
        onTitleChange={(v: string) => {
          const points = [...formData.history.points];
          points[0] = { ...points[0], title: v };
          updateHistory({ points });
        }}
        onTextChange={(v: string) => {
          const points = [...formData.history.points];
          points[0] = { ...points[0], text: v };
          updateHistory({ points });
        }}
      />

      <MiniCardEditor
        titleLabel="Point 2 Title"
        textLabel="Point 2 Text"
        titleValue={formData.history.points[1]?.title || ''}
        textValue={formData.history.points[1]?.text || ''}
        editing={editing}
        onTitleChange={(v: string) => {
          const points = [...formData.history.points];
          points[1] = { ...points[1], title: v };
          updateHistory({ points });
        }}
        onTextChange={(v: string) => {
          const points = [...formData.history.points];
          points[1] = { ...points[1], text: v };
          updateHistory({ points });
        }}
      />

      <MiniCardEditor
        titleLabel="Point 3 Title"
        textLabel="Point 3 Text"
        titleValue={formData.history.points[2]?.title || ''}
        textValue={formData.history.points[2]?.text || ''}
        editing={editing}
        onTitleChange={(v: string) => {
          const points = [...formData.history.points];
          points[2] = { ...points[2], title: v };
          updateHistory({ points });
        }}
        onTextChange={(v: string) => {
          const points = [...formData.history.points];
          points[2] = { ...points[2], text: v };
          updateHistory({ points });
        }}
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
          value={formData.featured.title}
          onChange={(e) => updateFeatured({ title: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
        />
      ) : (
        <p className="text-lg font-semibold text-slate-900">
          {contentSettings.featured.title || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="Featured Subtitle">
      {editing ? (
        <textarea
          value={formData.featured.subtitle}
          onChange={(e) => updateFeatured({ subtitle: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
        />
      ) : (
        <p className="text-slate-600 text-sm leading-relaxed">
          {contentSettings.featured.subtitle || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="View All Button Text">
      {editing ? (
        <input
          type="text"
          value={formData.featured.viewAllText}
          onChange={(e) => updateFeatured({ viewAllText: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
      ) : (
        <p className="text-sm font-medium text-slate-700">
          {contentSettings.featured.viewAllText || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="Empty State Title">
      {editing ? (
        <input
          type="text"
          value={formData.featured.emptyTitle}
          onChange={(e) => updateFeatured({ emptyTitle: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
      ) : (
        <p className="text-sm font-medium text-slate-700">
          {contentSettings.featured.emptyTitle || 'None'}
        </p>
      )}
    </FieldWrapper>

    <FieldWrapper label="Empty State Description">
      {editing ? (
        <textarea
          value={formData.featured.emptyText}
          onChange={(e) => updateFeatured({ emptyText: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
        />
      ) : (
        <p className="text-slate-600 text-sm leading-relaxed">
          {contentSettings.featured.emptyText || 'None'}
        </p>
      )}
    </FieldWrapper>
  </div>
</ContentCard>

<div className="space-y-3 text-sm">
  <SnapshotRow label="Hero title" value={formData.hero.title || 'Empty'} />
  <SnapshotRow label="History title" value={formData.history.title || 'Empty'} />
  <SnapshotRow label="Announcements" value={String(formData.announcements.length)} />
  <SnapshotRow label="Contact email" value={formData.contact.email || 'Empty'} />
  <SnapshotRow
    label="Policies"
    value={formData.policies ? 'Configured' : 'Empty'}
  />
</div>

<ContentCard
  title="Contact Section"
  description="Controls the public contact form heading and location card text."
  icon={<Phone className="text-cyan-600 size-5" />}
>
  <div className="space-y-4">
    <SidebarField
      label="Contact Title"
      value={formData.contact.title}
      editing={editing}
      onChange={(v: string) => updateContact({ title: v })}
    />
    <SidebarField
      label="Contact Subtitle"
      value={formData.contact.subtitle}
      editing={editing}
      isTextArea
      onChange={(v: string) => updateContact({ subtitle: v })}
    />
    <SidebarField
      label="Location Title"
      value={formData.contact.locationTitle}
      editing={editing}
      onChange={(v: string) => updateContact({ locationTitle: v })}
    />
    <SidebarField
      label="Location Subtitle"
      value={formData.contact.locationSubtitle}
      editing={editing}
      onChange={(v: string) => updateContact({ locationSubtitle: v })}
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
      value={formData.contact.email}
      editing={editing}
      onChange={(v: string) => updateContact({ email: v })}
      icon={<Mail className="size-4 text-slate-400" />}
    />
    <SidebarField
      label="Public Phone"
      value={formData.contact.phone}
      editing={editing}
      onChange={(v: string) => updateContact({ phone: v })}
    />
    <SidebarField
      label="Office Address"
      value={formData.contact.address}
      editing={editing}
      isTextArea
      onChange={(v: string) => updateContact({ address: v })}
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
      value={formData.footer.brandName}
      editing={editing}
      onChange={(v: string) => updateFooter({ brandName: v })}
    />

    <SidebarField
      label="Footer Brand Description"
      value={formData.footer.brandDescription}
      editing={editing}
      isTextArea
      onChange={(v: string) => updateFooter({ brandDescription: v })}
    />

    <SidebarField
      label="Quick Links Title"
      value={formData.footer.quickLinksTitle}
      editing={editing}
      onChange={(v: string) => updateFooter({ quickLinksTitle: v })}
    />

    <SidebarField
      label="Footer Contact Title"
      value={formData.footer.contactTitle}
      editing={editing}
      onChange={(v: string) => updateFooter({ contactTitle: v })}
    />

    <SidebarField
      label="Footer Copyright"
      value={formData.footer.copyright}
      editing={editing}
      isTextArea
      onChange={(v: string) => updateFooter({ copyright: v })}
    />

    <SidebarField
      label="Footer Privacy Text"
      value={formData.footer.privacyText}
      editing={editing}
      isTextArea
      onChange={(v: string) => updateFooter({ privacyText: v })}
    />

    <SidebarField
      label="Menu Title"
      value={formData.menu.title}
      editing={editing}
      onChange={(v: string) => updateMenu({ title: v })}
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