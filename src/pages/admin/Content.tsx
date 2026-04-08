import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import supabase from '../../supabaseClient';
import AppNotice from '../../components/common/AppNotice';
import {
  Save,
  Plus,
  X,
  Layout,
  Info,
  Phone,
  Megaphone,
  CheckCircle,
  Pencil,
  ImageIcon,
  FileText,
  Mail,
  Eye,
} from 'lucide-react';

type EditableSection =
  | 'hero'
  | 'about'
  | 'history'
  | 'featured'
  | 'contactSection'
  | 'contactInfo'
  | 'footerMenu'
  | 'announcements'
  | null;

const CONTENT_LIMITS = {
  heroBadge: 50,
  heroTitle: 120,
  heroSubtitle: 500,
  heroCtaText: 40,
  heroCtaLink: 255,
  heroImage: 500,

  aboutEyebrow: 50,
  aboutTitle: 120,
  aboutText: 2000,
  miniCardTitle: 80,
  miniCardText: 300,

  historyEyebrow: 50,
  historyTitle: 120,
  historySubtitle: 150,
  historyText: 2500,
  historyImagePath: 500,
  historyPointTitle: 80,
  historyPointText: 300,

  featuredTitle: 120,
  featuredSubtitle: 500,
  featuredViewAllText: 40,
  featuredEmptyTitle: 100,
  featuredEmptyText: 300,

  contactTitle: 120,
  contactSubtitle: 500,
  locationTitle: 100,
  locationSubtitle: 200,
  contactEmail: 254,
  contactPhone: 30,
  contactAddress: 300,

  footerBrandName: 100,
  footerBrandDescription: 500,
  footerQuickLinksTitle: 80,
  footerContactTitle: 80,
  footerCopyright: 200,
  footerPrivacyText: 200,

  menuTitle: 80,

  announcement: 200,
  announcementsCount: 20,
  policies: 5000,
} as const;

function limitText(value: string, max: number) {
  return value.slice(0, max);
}

function normalizeText(value: string, max: number) {
  return value.trim().slice(0, max);
}

function getPublicMediaUrl(path: string) {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  const { data } = supabase.storage.from('property_media').getPublicUrl(path);
  return data.publicUrl;
}

async function removePublicImage(path?: string | null) {
  if (!path) return;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return;
  }

  const { error } = await supabase.storage.from('property_media').remove([path]);
  if (error) throw error;
}

async function uploadPublicImage(file: File, folder: string) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage.from('property_media').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });

  if (error) throw error;
  return filePath;
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const img = await createImageBitmap(file);

  const canvas = document.createElement('canvas');
  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / img.width);

  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.8)
  );

  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
    type: 'image/jpeg',
  });
}

export default function AdminContent() {
  const { contentSettings, updateContentSettings } = useAdminData();

  const [notice, setNotice] = useState<{
    message: string;
    variant?: 'error' | 'warning' | 'success' | 'info';
  } | null>(null);

  const [activeSection, setActiveSection] = useState<EditableSection>(null);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [formData, setFormData] = useState(contentSettings);
  const [saved, setSaved] = useState(false);

  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
  const [isUploadingHistoryImages, setIsUploadingHistoryImages] = useState(false);
  const [isDraggingHistory, setIsDraggingHistory] = useState(false);

  const heroImageInputRef = useRef<HTMLInputElement | null>(null);
  const historyImagesInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFormData(contentSettings);
  }, [contentSettings]);

  const isEditing = (section: EditableSection) => activeSection === section;

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

  const handleHeroImageUpload = async (file: File | null) => {
    if (!file) return;

    try {
      setIsUploadingHeroImage(true);
      const compressed = await compressImage(file);
      const path = await uploadPublicImage(compressed, 'public/landing');
      updateHero({ image: limitText(path, CONTENT_LIMITS.heroImage) });
    } catch (error) {
      console.error('Failed to upload hero image:', error);
      setNotice({
        message: 'Failed to upload hero image.',
        variant: 'error',
      });
    } finally {
      setIsUploadingHeroImage(false);
    }
  };

  const handleHistoryImagesUpload = async (files: FileList | null) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    try {
      setIsUploadingHistoryImages(true);

      const uploadedPaths = await Promise.all(
        selectedFiles.map(async (file) => {
          const compressed = await compressImage(file);
          const path = await uploadPublicImage(compressed, 'public/history');
          return limitText(path, CONTENT_LIMITS.historyImagePath);
        })
      );

      updateHistory({
        images: [...(formData.history.images ?? []), ...uploadedPaths],
      });
    } catch (error) {
      console.error('Failed to upload history images:', error);
      setNotice({
        message: 'Failed to upload one or more history images.',
        variant: 'error',
      });
    } finally {
      setIsUploadingHistoryImages(false);
    }
  };

  const buildNormalizedContent = () => {
    const aboutCards = (formData.about.cards ?? []).slice(0, 3).map((card) => ({
      title: normalizeText(card?.title ?? '', CONTENT_LIMITS.miniCardTitle),
      text: normalizeText(card?.text ?? '', CONTENT_LIMITS.miniCardText),
    }));

    const historyPoints = (formData.history.points ?? []).slice(0, 3).map((point) => ({
      title: normalizeText(point?.title ?? '', CONTENT_LIMITS.historyPointTitle),
      text: normalizeText(point?.text ?? '', CONTENT_LIMITS.historyPointText),
    }));

    return {
      ...formData,
      hero: {
        ...formData.hero,
        badge: normalizeText(formData.hero.badge ?? '', CONTENT_LIMITS.heroBadge),
        title: normalizeText(formData.hero.title ?? '', CONTENT_LIMITS.heroTitle),
        subtitle: normalizeText(formData.hero.subtitle ?? '', CONTENT_LIMITS.heroSubtitle),
        primaryCtaText: normalizeText(
          formData.hero.primaryCtaText ?? '',
          CONTENT_LIMITS.heroCtaText
        ),
        primaryCtaLink: normalizeText(
          formData.hero.primaryCtaLink ?? '',
          CONTENT_LIMITS.heroCtaLink
        ),
        secondaryCtaText: normalizeText(
          formData.hero.secondaryCtaText ?? '',
          CONTENT_LIMITS.heroCtaText
        ),
        secondaryCtaLink: normalizeText(
          formData.hero.secondaryCtaLink ?? '',
          CONTENT_LIMITS.heroCtaLink
        ),
        image: normalizeText(formData.hero.image ?? '', CONTENT_LIMITS.heroImage),
      },
      about: {
        ...formData.about,
        eyebrow: normalizeText(formData.about.eyebrow ?? '', CONTENT_LIMITS.aboutEyebrow),
        title: normalizeText(formData.about.title ?? '', CONTENT_LIMITS.aboutTitle),
        text: normalizeText(formData.about.text ?? '', CONTENT_LIMITS.aboutText),
        cards: aboutCards,
      },
      history: {
        ...formData.history,
        eyebrow: normalizeText(formData.history.eyebrow ?? '', CONTENT_LIMITS.historyEyebrow),
        title: normalizeText(formData.history.title ?? '', CONTENT_LIMITS.historyTitle),
        subtitle: normalizeText(
          formData.history.subtitle ?? '',
          CONTENT_LIMITS.historySubtitle
        ),
        text: normalizeText(formData.history.text ?? '', CONTENT_LIMITS.historyText),
        image: normalizeText(formData.history.image ?? '', CONTENT_LIMITS.historyImagePath),
        images: (formData.history.images ?? []).map((img) =>
          normalizeText(img, CONTENT_LIMITS.historyImagePath)
        ),
        points: historyPoints,
      },
      featured: {
        ...formData.featured,
        title: normalizeText(formData.featured.title ?? '', CONTENT_LIMITS.featuredTitle),
        subtitle: normalizeText(
          formData.featured.subtitle ?? '',
          CONTENT_LIMITS.featuredSubtitle
        ),
        viewAllText: normalizeText(
          formData.featured.viewAllText ?? '',
          CONTENT_LIMITS.featuredViewAllText
        ),
        emptyTitle: normalizeText(
          formData.featured.emptyTitle ?? '',
          CONTENT_LIMITS.featuredEmptyTitle
        ),
        emptyText: normalizeText(
          formData.featured.emptyText ?? '',
          CONTENT_LIMITS.featuredEmptyText
        ),
      },
      contact: {
        ...formData.contact,
        title: normalizeText(formData.contact.title ?? '', CONTENT_LIMITS.contactTitle),
        subtitle: normalizeText(
          formData.contact.subtitle ?? '',
          CONTENT_LIMITS.contactSubtitle
        ),
        locationTitle: normalizeText(
          formData.contact.locationTitle ?? '',
          CONTENT_LIMITS.locationTitle
        ),
        locationSubtitle: normalizeText(
          formData.contact.locationSubtitle ?? '',
          CONTENT_LIMITS.locationSubtitle
        ),
        email: normalizeText(formData.contact.email ?? '', CONTENT_LIMITS.contactEmail),
        phone: normalizeText(formData.contact.phone ?? '', CONTENT_LIMITS.contactPhone),
        address: normalizeText(formData.contact.address ?? '', CONTENT_LIMITS.contactAddress),
      },
      footer: {
        ...formData.footer,
        brandName: normalizeText(
          formData.footer.brandName ?? '',
          CONTENT_LIMITS.footerBrandName
        ),
        brandDescription: normalizeText(
          formData.footer.brandDescription ?? '',
          CONTENT_LIMITS.footerBrandDescription
        ),
        quickLinksTitle: normalizeText(
          formData.footer.quickLinksTitle ?? '',
          CONTENT_LIMITS.footerQuickLinksTitle
        ),
        contactTitle: normalizeText(
          formData.footer.contactTitle ?? '',
          CONTENT_LIMITS.footerContactTitle
        ),
        copyright: normalizeText(
          formData.footer.copyright ?? '',
          CONTENT_LIMITS.footerCopyright
        ),
        privacyText: normalizeText(
          formData.footer.privacyText ?? '',
          CONTENT_LIMITS.footerPrivacyText
        ),
      },
      menu: {
        ...formData.menu,
        title: normalizeText(formData.menu.title ?? '', CONTENT_LIMITS.menuTitle),
      },
      announcements: (formData.announcements ?? [])
        .map((item) => normalizeText(item, CONTENT_LIMITS.announcement))
        .filter(Boolean)
        .slice(0, CONTENT_LIMITS.announcementsCount),
      policies: normalizeText(formData.policies ?? '', CONTENT_LIMITS.policies),
    };
  };

  const handleSaveSection = async () => {
    try {
      const normalized = buildNormalizedContent();
      setFormData(normalized);
      await updateContentSettings(normalized);
      setActiveSection(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error('Failed to save content settings:', error);
      setNotice({
        message: 'Failed to save changes. Please try again.',
        variant: 'error',
      });
    }
  };

  const resetSection = (section: EditableSection) => {
    if (!section) return;

    setFormData((prev) => {
      switch (section) {
        case 'hero':
          return { ...prev, hero: contentSettings.hero };
        case 'about':
          return { ...prev, about: contentSettings.about };
        case 'history':
          return { ...prev, history: contentSettings.history };
        case 'featured':
          return { ...prev, featured: contentSettings.featured };
        case 'contactSection':
        case 'contactInfo':
          return { ...prev, contact: contentSettings.contact };
        case 'footerMenu':
          return {
            ...prev,
            footer: contentSettings.footer,
            menu: contentSettings.menu,
          };
        case 'announcements':
          return { ...prev, announcements: contentSettings.announcements };
        default:
          return prev;
      }
    });

    setNewAnnouncement('');
    setActiveSection(null);
  };

  const handleAddAnnouncement = () => {
    const next = normalizeText(newAnnouncement, CONTENT_LIMITS.announcement);
    if (!next) return;

    if (formData.announcements.length >= CONTENT_LIMITS.announcementsCount) {
      setNotice({
        message: `You can only add up to ${CONTENT_LIMITS.announcementsCount} announcements.`,
        variant: 'warning',
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      announcements: [...prev.announcements, next],
    }));
    setNewAnnouncement('');
  };

  const handleRemoveAnnouncement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      announcements: prev.announcements.filter((_, i) => i !== index),
    }));
  };

  const moveHistoryImage = (from: number, to: number) => {
    const arr = [...(formData.history.images ?? [])];
    if (to < 0 || to >= arr.length) return;

    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);

    updateHistory({ images: arr });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Content Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Update your public website content section by section.
            </p>
          </div>

          {notice && (
            <AppNotice
              message={notice.message}
              variant={notice.variant}
              onClose={() => setNotice(null)}
              autoHideMs={4000}
            />
          )}

          {saved && (
            <AppNotice
              message="Changes saved successfully."
              variant="success"
              onClose={() => setSaved(false)}
              autoHideMs={2500}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8 2xl:col-span-9">
            <ContentCard
              title="Hero Section"
              description="Controls the main headline, badge, calls-to-action, and visual shown at the top of the homepage."
              icon={<Layout className="size-5 text-blue-600" />}
              isEditing={isEditing('hero')}
              onEdit={() => setActiveSection('hero')}
              onCancel={() => resetSection('hero')}
              onSave={handleSaveSection}
            >
              <div className="space-y-5">
                <FieldWrapper label="Hero Badge">
                  {isEditing('hero') ? (
                    <input
                      type="text"
                      maxLength={CONTENT_LIMITS.heroBadge}
                      value={formData.hero.badge}
                      onChange={(e) =>
                        updateHero({
                          badge: limitText(e.target.value, CONTENT_LIMITS.heroBadge),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-700">
                      {contentSettings.hero.badge || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="Main Title">
                  {isEditing('hero') ? (
                    <input
                      type="text"
                      maxLength={CONTENT_LIMITS.heroTitle}
                      value={formData.hero.title}
                      onChange={(e) =>
                        updateHero({
                          title: limitText(e.target.value, CONTENT_LIMITS.heroTitle),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">
                      {contentSettings.hero.title || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="Sub-headline">
                  {isEditing('hero') ? (
                    <>
                      <textarea
                        value={formData.hero.subtitle}
                        maxLength={CONTENT_LIMITS.heroSubtitle}
                        onChange={(e) =>
                          updateHero({
                            subtitle: limitText(e.target.value, CONTENT_LIMITS.heroSubtitle),
                          })
                        }
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                      <Counter
                        current={formData.hero.subtitle?.length ?? 0}
                        max={CONTENT_LIMITS.heroSubtitle}
                      />
                    </>
                  ) : (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {contentSettings.hero.subtitle || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FieldWrapper label="Primary CTA Text">
                    {isEditing('hero') ? (
                      <input
                        type="text"
                        maxLength={CONTENT_LIMITS.heroCtaText}
                        value={formData.hero.primaryCtaText}
                        onChange={(e) =>
                          updateHero({
                            primaryCtaText: limitText(
                              e.target.value,
                              CONTENT_LIMITS.heroCtaText
                            ),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-700">
                        {contentSettings.hero.primaryCtaText || 'None'}
                      </p>
                    )}
                  </FieldWrapper>

                  <FieldWrapper label="Primary CTA Link">
                    {isEditing('hero') ? (
                      <input
                        type="text"
                        maxLength={CONTENT_LIMITS.heroCtaLink}
                        value={formData.hero.primaryCtaLink}
                        onChange={(e) =>
                          updateHero({
                            primaryCtaLink: limitText(
                              e.target.value,
                              CONTENT_LIMITS.heroCtaLink
                            ),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="break-all text-sm text-slate-700">
                        {contentSettings.hero.primaryCtaLink || 'None'}
                      </p>
                    )}
                  </FieldWrapper>

                  <FieldWrapper label="Secondary CTA Text">
                    {isEditing('hero') ? (
                      <input
                        type="text"
                        maxLength={CONTENT_LIMITS.heroCtaText}
                        value={formData.hero.secondaryCtaText}
                        onChange={(e) =>
                          updateHero({
                            secondaryCtaText: limitText(
                              e.target.value,
                              CONTENT_LIMITS.heroCtaText
                            ),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-700">
                        {contentSettings.hero.secondaryCtaText || 'None'}
                      </p>
                    )}
                  </FieldWrapper>

                  <FieldWrapper label="Secondary CTA Link">
                    {isEditing('hero') ? (
                      <input
                        type="text"
                        maxLength={CONTENT_LIMITS.heroCtaLink}
                        value={formData.hero.secondaryCtaLink}
                        onChange={(e) =>
                          updateHero({
                            secondaryCtaLink: limitText(
                              e.target.value,
                              CONTENT_LIMITS.heroCtaLink
                            ),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="break-all text-sm text-slate-700">
                        {contentSettings.hero.secondaryCtaLink || 'None'}
                      </p>
                    )}
                  </FieldWrapper>
                </div>

                <FieldWrapper label="Hero Image">
                  {isEditing('hero') ? (
                    <div className="space-y-3">
                      <input
                        ref={heroImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleHeroImageUpload(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />

                      {formData.hero.image ? (
                        <div className="space-y-3">
                          <img
                            src={getPublicMediaUrl(formData.hero.image)}
                            alt="Hero preview"
                            className="max-h-72 w-full rounded-2xl border border-slate-200 object-cover"
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => heroImageInputRef.current?.click()}
                              disabled={isUploadingHeroImage}
                              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                            >
                              {isUploadingHeroImage ? 'Uploading...' : 'Replace Image'}
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  if (formData.hero.image) {
                                    await removePublicImage(formData.hero.image);
                                  }
                                  updateHero({ image: '' });
                                } catch (error) {
                                  console.error('Failed to remove hero image:', error);
                                }
                              }}
                              className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => heroImageInputRef.current?.click()}
                          disabled={isUploadingHeroImage}
                          className="flex h-24 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-60"
                        >
                          <span className="text-sm font-semibold">
                            {isUploadingHeroImage ? 'Uploading...' : 'Upload Hero Image'}
                          </span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="break-all text-sm text-slate-700">
                        {contentSettings.hero.image || 'None'}
                      </p>
                      {contentSettings.hero.image && (
                        <img
                          src={getPublicMediaUrl(contentSettings.hero.image)}
                          alt="Hero preview"
                          className="max-h-72 w-full rounded-2xl border border-slate-200 object-cover"
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
              icon={<Info className="size-5 text-violet-600" />}
              isEditing={isEditing('about')}
              onEdit={() => setActiveSection('about')}
              onCancel={() => resetSection('about')}
              onSave={handleSaveSection}
            >
              <div className="space-y-5">
                <FieldWrapper label="About Eyebrow">
                  {isEditing('about') ? (
                    <input
                      type="text"
                      maxLength={CONTENT_LIMITS.aboutEyebrow}
                      value={formData.about.eyebrow}
                      onChange={(e) =>
                        updateAbout({
                          eyebrow: limitText(e.target.value, CONTENT_LIMITS.aboutEyebrow),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-700">
                      {contentSettings.about.eyebrow || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="About Title">
                  {isEditing('about') ? (
                    <input
                      type="text"
                      maxLength={CONTENT_LIMITS.aboutTitle}
                      value={formData.about.title}
                      onChange={(e) =>
                        updateAbout({
                          title: limitText(e.target.value, CONTENT_LIMITS.aboutTitle),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">
                      {contentSettings.about.title || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="About Description">
                  {isEditing('about') ? (
                    <>
                      <textarea
                        value={formData.about.text}
                        maxLength={CONTENT_LIMITS.aboutText}
                        onChange={(e) =>
                          updateAbout({
                            text: limitText(e.target.value, CONTENT_LIMITS.aboutText),
                          })
                        }
                        rows={7}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                      <Counter
                        current={formData.about.text?.length ?? 0}
                        max={CONTENT_LIMITS.aboutText}
                      />
                    </>
                  ) : (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {contentSettings.about.text || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <MiniCardEditor
                    titleLabel="Card 1 Title"
                    textLabel="Card 1 Text"
                    titleValue={formData.about.cards[0]?.title || ''}
                    textValue={formData.about.cards[0]?.text || ''}
                    titleMaxLength={CONTENT_LIMITS.miniCardTitle}
                    textMaxLength={CONTENT_LIMITS.miniCardText}
                    editing={isEditing('about')}
                    onTitleChange={(v: string) => {
                      const cards = [...formData.about.cards];
                      cards[0] = { ...cards[0], title: limitText(v, CONTENT_LIMITS.miniCardTitle) };
                      updateAbout({ cards });
                    }}
                    onTextChange={(v: string) => {
                      const cards = [...formData.about.cards];
                      cards[0] = { ...cards[0], text: limitText(v, CONTENT_LIMITS.miniCardText) };
                      updateAbout({ cards });
                    }}
                  />

                  <MiniCardEditor
                    titleLabel="Card 2 Title"
                    textLabel="Card 2 Text"
                    titleValue={formData.about.cards[1]?.title || ''}
                    textValue={formData.about.cards[1]?.text || ''}
                    titleMaxLength={CONTENT_LIMITS.miniCardTitle}
                    textMaxLength={CONTENT_LIMITS.miniCardText}
                    editing={isEditing('about')}
                    onTitleChange={(v: string) => {
                      const cards = [...formData.about.cards];
                      cards[1] = { ...cards[1], title: limitText(v, CONTENT_LIMITS.miniCardTitle) };
                      updateAbout({ cards });
                    }}
                    onTextChange={(v: string) => {
                      const cards = [...formData.about.cards];
                      cards[1] = { ...cards[1], text: limitText(v, CONTENT_LIMITS.miniCardText) };
                      updateAbout({ cards });
                    }}
                  />

                  <MiniCardEditor
                    titleLabel="Card 3 Title"
                    textLabel="Card 3 Text"
                    titleValue={formData.about.cards[2]?.title || ''}
                    textValue={formData.about.cards[2]?.text || ''}
                    titleMaxLength={CONTENT_LIMITS.miniCardTitle}
                    textMaxLength={CONTENT_LIMITS.miniCardText}
                    editing={isEditing('about')}
                    onTitleChange={(v: string) => {
                      const cards = [...formData.about.cards];
                      cards[2] = { ...cards[2], title: limitText(v, CONTENT_LIMITS.miniCardTitle) };
                      updateAbout({ cards });
                    }}
                    onTextChange={(v: string) => {
                      const cards = [...formData.about.cards];
                      cards[2] = { ...cards[2], text: limitText(v, CONTENT_LIMITS.miniCardText) };
                      updateAbout({ cards });
                    }}
                  />
                </div>
              </div>
            </ContentCard>

            <ContentCard
              title="History Section"
              description="Tells the story of your business with supporting text, image, and milestone points."
              icon={<ImageIcon className="size-5 text-amber-600" />}
              isEditing={isEditing('history')}
              onEdit={() => setActiveSection('history')}
              onCancel={() => resetSection('history')}
              onSave={handleSaveSection}
            >
              <div className="space-y-5">
                <FieldWrapper label="History Eyebrow">
                  {isEditing('history') ? (
                    <input
                      type="text"
                      maxLength={CONTENT_LIMITS.historyEyebrow}
                      value={formData.history.eyebrow}
                      onChange={(e) =>
                        updateHistory({
                          eyebrow: limitText(e.target.value, CONTENT_LIMITS.historyEyebrow),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-700">
                      {contentSettings.history.eyebrow || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="History Title">
                  {isEditing('history') ? (
                    <input
                      type="text"
                      maxLength={CONTENT_LIMITS.historyTitle}
                      value={formData.history.title}
                      onChange={(e) =>
                        updateHistory({
                          title: limitText(e.target.value, CONTENT_LIMITS.historyTitle),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">
                      {contentSettings.history.title || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="History Subtitle">
                  {isEditing('history') ? (
                    <input
                      type="text"
                      maxLength={CONTENT_LIMITS.historySubtitle}
                      value={formData.history.subtitle}
                      onChange={(e) =>
                        updateHistory({
                          subtitle: limitText(e.target.value, CONTENT_LIMITS.historySubtitle),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-slate-600">
                      {contentSettings.history.subtitle || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="History Description">
                  {isEditing('history') ? (
                    <>
                      <textarea
                        value={formData.history.text}
                        maxLength={CONTENT_LIMITS.historyText}
                        onChange={(e) =>
                          updateHistory({
                            text: limitText(e.target.value, CONTENT_LIMITS.historyText),
                          })
                        }
                        rows={7}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                      <Counter
                        current={formData.history.text?.length ?? 0}
                        max={CONTENT_LIMITS.historyText}
                      />
                    </>
                  ) : (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {contentSettings.history.text || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="History Images">
                  {isEditing('history') ? (
                    <div className="space-y-3">
                      <input
                        ref={historyImagesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleHistoryImagesUpload(e.target.files)}
                        className="hidden"
                      />

                      {(formData.history.images ?? []).length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {(formData.history.images ?? []).map((img, index) => (
                            <div
                              key={index}
                              className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <img
                                src={getPublicMediaUrl(img)}
                                alt={`History preview ${index + 1}`}
                                className="h-40 w-full rounded-xl border border-slate-200 object-cover"
                              />

                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs text-slate-500">{img}</p>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => moveHistoryImage(index, index - 1)}
                                    className="rounded-xl border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                                  >
                                    ↑
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      index === (formData.history.images ?? []).length - 1
                                    }
                                    onClick={() => moveHistoryImage(index, index + 1)}
                                    className="rounded-xl border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                                  >
                                    ↓
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const target = (formData.history.images ?? [])[index];
                                        if (target) {
                                          await removePublicImage(target);
                                        }

                                        const updated = (formData.history.images ?? []).filter(
                                          (_, i) => i !== index
                                        );
                                        updateHistory({ images: updated });
                                      } catch (error) {
                                        console.error('Failed to remove history image:', error);
                                      }
                                    }}
                                    className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                          <p className="text-sm text-slate-500">No history images added yet.</p>
                        </div>
                      )}

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingHistory(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDraggingHistory(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingHistory(false);
                          handleHistoryImagesUpload(e.dataTransfer.files);
                        }}
                        className={`rounded-2xl border-2 border-dashed p-4 text-center transition ${
                          isDraggingHistory
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-slate-300 bg-slate-50'
                        }`}
                      >
                        <p className="text-sm font-medium text-slate-700">
                          Drag & drop images here
                        </p>

                        <button
                          type="button"
                          onClick={() => historyImagesInputRef.current?.click()}
                          disabled={isUploadingHistoryImages}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isUploadingHistoryImages ? 'Uploading...' : 'Choose Files'}
                        </button>
                      </div>

                      <p className="text-xs text-slate-400">
                        Upload one or more images for the History slideshow.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contentSettings.history.images?.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {contentSettings.history.images.map((img, index) => (
                            <div key={index} className="space-y-2">
                              <p className="break-all text-xs text-slate-500">{img}</p>
                              <img
                                src={getPublicMediaUrl(img)}
                                alt={`History preview ${index + 1}`}
                                className="h-40 w-full rounded-2xl border border-slate-200 object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : contentSettings.history.image ? (
                        <div className="space-y-3">
                          <p className="break-all text-sm text-slate-700">
                            {contentSettings.history.image}
                          </p>
                          <img
                            src={getPublicMediaUrl(contentSettings.history.image)}
                            alt="History preview"
                            className="max-h-72 w-full rounded-2xl border border-slate-200 object-cover"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700">None</p>
                      )}
                    </div>
                  )}
                </FieldWrapper>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <MiniCardEditor
                    titleLabel="Point 1 Title"
                    textLabel="Point 1 Text"
                    titleValue={formData.history.points[0]?.title || ''}
                    textValue={formData.history.points[0]?.text || ''}
                    titleMaxLength={CONTENT_LIMITS.historyPointTitle}
                    textMaxLength={CONTENT_LIMITS.historyPointText}
                    editing={isEditing('history')}
                    onTitleChange={(v: string) => {
                      const points = [...formData.history.points];
                      points[0] = {
                        ...points[0],
                        title: limitText(v, CONTENT_LIMITS.historyPointTitle),
                      };
                      updateHistory({ points });
                    }}
                    onTextChange={(v: string) => {
                      const points = [...formData.history.points];
                      points[0] = {
                        ...points[0],
                        text: limitText(v, CONTENT_LIMITS.historyPointText),
                      };
                      updateHistory({ points });
                    }}
                  />

                  <MiniCardEditor
                    titleLabel="Point 2 Title"
                    textLabel="Point 2 Text"
                    titleValue={formData.history.points[1]?.title || ''}
                    textValue={formData.history.points[1]?.text || ''}
                    titleMaxLength={CONTENT_LIMITS.historyPointTitle}
                    textMaxLength={CONTENT_LIMITS.historyPointText}
                    editing={isEditing('history')}
                    onTitleChange={(v: string) => {
                      const points = [...formData.history.points];
                      points[1] = {
                        ...points[1],
                        title: limitText(v, CONTENT_LIMITS.historyPointTitle),
                      };
                      updateHistory({ points });
                    }}
                    onTextChange={(v: string) => {
                      const points = [...formData.history.points];
                      points[1] = {
                        ...points[1],
                        text: limitText(v, CONTENT_LIMITS.historyPointText),
                      };
                      updateHistory({ points });
                    }}
                  />

                  <MiniCardEditor
                    titleLabel="Point 3 Title"
                    textLabel="Point 3 Text"
                    titleValue={formData.history.points[2]?.title || ''}
                    textValue={formData.history.points[2]?.text || ''}
                    titleMaxLength={CONTENT_LIMITS.historyPointTitle}
                    textMaxLength={CONTENT_LIMITS.historyPointText}
                    editing={isEditing('history')}
                    onTitleChange={(v: string) => {
                      const points = [...formData.history.points];
                      points[2] = {
                        ...points[2],
                        title: limitText(v, CONTENT_LIMITS.historyPointTitle),
                      };
                      updateHistory({ points });
                    }}
                    onTextChange={(v: string) => {
                      const points = [...formData.history.points];
                      points[2] = {
                        ...points[2],
                        text: limitText(v, CONTENT_LIMITS.historyPointText),
                      };
                      updateHistory({ points });
                    }}
                  />
                </div>
              </div>
            </ContentCard>

            <ContentCard
              title="Featured Section"
              description="Controls the heading, subheading, and empty-state messaging for featured spaces."
              icon={<FileText className="size-5 text-indigo-600" />}
              isEditing={isEditing('featured')}
              onEdit={() => setActiveSection('featured')}
              onCancel={() => resetSection('featured')}
              onSave={handleSaveSection}
            >
              <div className="space-y-5">
                <FieldWrapper label="Featured Title">
                  {isEditing('featured') ? (
                    <input
                      type="text"
                      maxLength={CONTENT_LIMITS.featuredTitle}
                      value={formData.featured.title}
                      onChange={(e) =>
                        updateFeatured({
                          title: limitText(e.target.value, CONTENT_LIMITS.featuredTitle),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-slate-900">
                      {contentSettings.featured.title || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="Featured Subtitle">
                  {isEditing('featured') ? (
                    <>
                      <textarea
                        value={formData.featured.subtitle}
                        maxLength={CONTENT_LIMITS.featuredSubtitle}
                        onChange={(e) =>
                          updateFeatured({
                            subtitle: limitText(
                              e.target.value,
                              CONTENT_LIMITS.featuredSubtitle
                            ),
                          })
                        }
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                      <Counter
                        current={formData.featured.subtitle?.length ?? 0}
                        max={CONTENT_LIMITS.featuredSubtitle}
                      />
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed text-slate-600">
                      {contentSettings.featured.subtitle || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="View All Button Text">
                  {isEditing('featured') ? (
                    <input
                      type="text"
                      maxLength={CONTENT_LIMITS.featuredViewAllText}
                      value={formData.featured.viewAllText}
                      onChange={(e) =>
                        updateFeatured({
                          viewAllText: limitText(
                            e.target.value,
                            CONTENT_LIMITS.featuredViewAllText
                          ),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-700">
                      {contentSettings.featured.viewAllText || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="Empty State Title">
                  {isEditing('featured') ? (
                    <input
                      type="text"
                      maxLength={CONTENT_LIMITS.featuredEmptyTitle}
                      value={formData.featured.emptyTitle}
                      onChange={(e) =>
                        updateFeatured({
                          emptyTitle: limitText(
                            e.target.value,
                            CONTENT_LIMITS.featuredEmptyTitle
                          ),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-700">
                      {contentSettings.featured.emptyTitle || 'None'}
                    </p>
                  )}
                </FieldWrapper>

                <FieldWrapper label="Empty State Description">
                  {isEditing('featured') ? (
                    <>
                      <textarea
                        value={formData.featured.emptyText}
                        maxLength={CONTENT_LIMITS.featuredEmptyText}
                        onChange={(e) =>
                          updateFeatured({
                            emptyText: limitText(
                              e.target.value,
                              CONTENT_LIMITS.featuredEmptyText
                            ),
                          })
                        }
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                      <Counter
                        current={formData.featured.emptyText?.length ?? 0}
                        max={CONTENT_LIMITS.featuredEmptyText}
                      />
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed text-slate-600">
                      {contentSettings.featured.emptyText || 'None'}
                    </p>
                  )}
                </FieldWrapper>
              </div>
            </ContentCard>

            <ContentCard
              title="Contact Section"
              description="Controls the public contact form heading and location card text."
              icon={<Phone className="size-5 text-cyan-600" />}
              isEditing={isEditing('contactSection')}
              onEdit={() => setActiveSection('contactSection')}
              onCancel={() => resetSection('contactSection')}
              onSave={handleSaveSection}
            >
              <div className="space-y-4">
                <SidebarField
                  label="Contact Title"
                  value={formData.contact.title}
                  editing={isEditing('contactSection')}
                  maxLength={CONTENT_LIMITS.contactTitle}
                  onChange={(v: string) =>
                    updateContact({ title: limitText(v, CONTENT_LIMITS.contactTitle) })
                  }
                />
                <SidebarField
                  label="Contact Subtitle"
                  value={formData.contact.subtitle}
                  editing={isEditing('contactSection')}
                  isTextArea
                  maxLength={CONTENT_LIMITS.contactSubtitle}
                  onChange={(v: string) =>
                    updateContact({
                      subtitle: limitText(v, CONTENT_LIMITS.contactSubtitle),
                    })
                  }
                />
                <SidebarField
                  label="Location Title"
                  value={formData.contact.locationTitle}
                  editing={isEditing('contactSection')}
                  maxLength={CONTENT_LIMITS.locationTitle}
                  onChange={(v: string) =>
                    updateContact({
                      locationTitle: limitText(v, CONTENT_LIMITS.locationTitle),
                    })
                  }
                />
                <SidebarField
                  label="Location Subtitle"
                  value={formData.contact.locationSubtitle}
                  editing={isEditing('contactSection')}
                  maxLength={CONTENT_LIMITS.locationSubtitle}
                  onChange={(v: string) =>
                    updateContact({
                      locationSubtitle: limitText(v, CONTENT_LIMITS.locationSubtitle),
                    })
                  }
                />
              </div>
            </ContentCard>

            <ContentCard
              title="Contact Info"
              description="Public contact details shown across the website."
              icon={<Phone className="size-5 text-green-600" />}
              isEditing={isEditing('contactInfo')}
              onEdit={() => setActiveSection('contactInfo')}
              onCancel={() => resetSection('contactInfo')}
              onSave={handleSaveSection}
            >
              <div className="space-y-4">
                <SidebarField
                  label="Public Email"
                  value={formData.contact.email}
                  editing={isEditing('contactInfo')}
                  maxLength={CONTENT_LIMITS.contactEmail}
                  onChange={(v: string) =>
                    updateContact({ email: limitText(v, CONTENT_LIMITS.contactEmail) })
                  }
                  icon={<Mail className="size-4 text-slate-400" />}
                />
                <SidebarField
                  label="Public Phone"
                  value={formData.contact.phone}
                  editing={isEditing('contactInfo')}
                  maxLength={CONTENT_LIMITS.contactPhone}
                  onChange={(v: string) =>
                    updateContact({ phone: limitText(v, CONTENT_LIMITS.contactPhone) })
                  }
                />
                <SidebarField
                  label="Office Address"
                  value={formData.contact.address}
                  editing={isEditing('contactInfo')}
                  isTextArea
                  maxLength={CONTENT_LIMITS.contactAddress}
                  onChange={(v: string) =>
                    updateContact({ address: limitText(v, CONTENT_LIMITS.contactAddress) })
                  }
                />
              </div>
            </ContentCard>

            <ContentCard
              title="Footer & Menu"
              description="Controls footer text, branding, and mobile menu title."
              icon={<Layout className="size-5 text-slate-600" />}
              isEditing={isEditing('footerMenu')}
              onEdit={() => setActiveSection('footerMenu')}
              onCancel={() => resetSection('footerMenu')}
              onSave={handleSaveSection}
            >
              <div className="space-y-4">
                <SidebarField
                  label="Footer Brand Name"
                  value={formData.footer.brandName}
                  editing={isEditing('footerMenu')}
                  maxLength={CONTENT_LIMITS.footerBrandName}
                  onChange={(v: string) =>
                    updateFooter({
                      brandName: limitText(v, CONTENT_LIMITS.footerBrandName),
                    })
                  }
                />

                <SidebarField
                  label="Footer Brand Description"
                  value={formData.footer.brandDescription}
                  editing={isEditing('footerMenu')}
                  isTextArea
                  maxLength={CONTENT_LIMITS.footerBrandDescription}
                  onChange={(v: string) =>
                    updateFooter({
                      brandDescription: limitText(
                        v,
                        CONTENT_LIMITS.footerBrandDescription
                      ),
                    })
                  }
                />

                <SidebarField
                  label="Quick Links Title"
                  value={formData.footer.quickLinksTitle}
                  editing={isEditing('footerMenu')}
                  maxLength={CONTENT_LIMITS.footerQuickLinksTitle}
                  onChange={(v: string) =>
                    updateFooter({
                      quickLinksTitle: limitText(
                        v,
                        CONTENT_LIMITS.footerQuickLinksTitle
                      ),
                    })
                  }
                />

                <SidebarField
                  label="Footer Contact Title"
                  value={formData.footer.contactTitle}
                  editing={isEditing('footerMenu')}
                  maxLength={CONTENT_LIMITS.footerContactTitle}
                  onChange={(v: string) =>
                    updateFooter({
                      contactTitle: limitText(v, CONTENT_LIMITS.footerContactTitle),
                    })
                  }
                />

                <SidebarField
                  label="Footer Copyright"
                  value={formData.footer.copyright}
                  editing={isEditing('footerMenu')}
                  isTextArea
                  maxLength={CONTENT_LIMITS.footerCopyright}
                  onChange={(v: string) =>
                    updateFooter({
                      copyright: limitText(v, CONTENT_LIMITS.footerCopyright),
                    })
                  }
                />

                <SidebarField
                  label="Footer Privacy Text"
                  value={formData.footer.privacyText}
                  editing={isEditing('footerMenu')}
                  isTextArea
                  maxLength={CONTENT_LIMITS.footerPrivacyText}
                  onChange={(v: string) =>
                    updateFooter({
                      privacyText: limitText(v, CONTENT_LIMITS.footerPrivacyText),
                    })
                  }
                />

                <SidebarField
                  label="Menu Title"
                  value={formData.menu.title}
                  editing={isEditing('footerMenu')}
                  maxLength={CONTENT_LIMITS.menuTitle}
                  onChange={(v: string) =>
                    updateMenu({ title: limitText(v, CONTENT_LIMITS.menuTitle) })
                  }
                />
              </div>
            </ContentCard>

            <ContentCard
              title="Announcements"
              description="Short updates or alerts displayed on the landing page."
              icon={<Megaphone className="size-5 text-orange-500" />}
              isEditing={isEditing('announcements')}
              onEdit={() => setActiveSection('announcements')}
              onCancel={() => resetSection('announcements')}
              onSave={handleSaveSection}
            >
              <div className="space-y-3">
                {formData.announcements.length > 0 ? (
                  formData.announcements.map((announcement, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-2 rounded-xl border border-orange-100 bg-orange-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="flex-1 text-sm font-semibold leading-tight text-orange-800">
                        {announcement}
                      </p>
                      {isEditing('announcements') && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAnnouncement(index)}
                          className="rounded-lg p-1 text-orange-300 transition-colors hover:text-red-600"
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

                {isEditing('announcements') && (
                  <div className="pt-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        maxLength={CONTENT_LIMITS.announcement}
                        value={newAnnouncement}
                        onChange={(e) =>
                          setNewAnnouncement(
                            limitText(e.target.value, CONTENT_LIMITS.announcement)
                          )
                        }
                        placeholder="Add alert..."
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddAnnouncement}
                        className="flex items-center justify-center rounded-xl bg-orange-500 p-2.5 text-white transition-colors hover:bg-orange-600"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <Counter
                      current={newAnnouncement.length}
                      max={CONTENT_LIMITS.announcement}
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      {formData.announcements.length}/{CONTENT_LIMITS.announcementsCount}{' '}
                      announcements
                    </p>
                  </div>
                )}
              </div>
            </ContentCard>
          </div>

          <aside className="xl:col-span-4 2xl:col-span-3">
            <div className="sticky top-6 space-y-6">
              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 text-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_35%)]" />
                  <div className="relative space-y-5">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                      <Eye className="size-3.5" />
                      Content Overview
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-base font-semibold tracking-tight text-white">
                        Website content status
                      </h3>
                      <p className="text-xs leading-relaxed text-slate-300">
                        Monitor what is live, what is being edited, and which sections still need
                        content.
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            Active State
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-white">
                            {activeSection
                              ? formatSectionName(activeSection)
                              : 'No section being edited'}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            activeSection
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-white/15 text-slate-200'
                          }`}
                        >
                          {activeSection ? 'Editing' : 'Idle'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-6">
                  <SnapshotTile label="Hero title" value={formData.hero.title || 'Empty'} />
                  <SnapshotTile
                    label="Featured title"
                    value={formData.featured.title || 'Empty'}
                  />
                  <SnapshotTile
                    label="Announcements"
                    value={`${formData.announcements.length} item(s)`}
                  />
                  <SnapshotTile
                    label="Contact email"
                    value={formData.contact.email || 'Empty'}
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 via-white to-white px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-sm">
                      <CheckCircle className="size-4" />
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Section Status</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        See which content blocks are complete and which ones still need attention.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-6">
                  <StatusRow
                    label="Hero Section"
                    status={formData.hero.title?.trim() ? 'complete' : 'empty'}
                    active={activeSection === 'hero'}
                  />
                  <StatusRow
                    label="About Us"
                    status={formData.about.title?.trim() ? 'complete' : 'empty'}
                    active={activeSection === 'about'}
                  />
                  <StatusRow
                    label="History Section"
                    status={formData.history.title?.trim() ? 'complete' : 'empty'}
                    active={activeSection === 'history'}
                  />
                  <StatusRow
                    label="Featured Section"
                    status={formData.featured.title?.trim() ? 'complete' : 'empty'}
                    active={activeSection === 'featured'}
                  />
                  <StatusRow
                    label="Contact Section"
                    status={formData.contact.title?.trim() ? 'complete' : 'empty'}
                    active={activeSection === 'contactSection'}
                  />
                  <StatusRow
                    label="Contact Info"
                    status={
                      formData.contact.email?.trim() || formData.contact.phone?.trim()
                        ? 'complete'
                        : 'empty'
                    }
                    active={activeSection === 'contactInfo'}
                  />
                  <StatusRow
                    label="Footer & Menu"
                    status={
                      formData.footer.brandName?.trim() && formData.menu.title?.trim()
                        ? 'complete'
                        : 'empty'
                    }
                    active={activeSection === 'footerMenu'}
                  />
                  <StatusRow
                    label="Announcements"
                    status={formData.announcements.length > 0 ? 'complete' : 'empty'}
                    active={activeSection === 'announcements'}
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-white px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-600 p-2.5 text-white shadow-sm">
                      <Pencil className="size-4" />
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Editing Tips</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        Keep homepage content polished, clear, and easy to scan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-6">
                  <TipItem text="Keep titles short and strong for better readability." />
                  <TipItem text="Use concise descriptions to avoid overwhelming visitors." />
                  <TipItem text="Check image URLs carefully so previews load properly." />
                  <TipItem text="Keep CTA labels action-oriented and easy to understand." />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {activeSection && (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 md:hidden">
            <button
              type="button"
              onClick={() => resetSection(activeSection)}
              className="flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xl"
            >
              <X className="size-5" />
            </button>
            <button
              type="button"
              onClick={handleSaveSection}
              className="flex size-14 items-center justify-center rounded-full border-4 border-white bg-emerald-600 text-white shadow-2xl"
            >
              <Save className="size-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatSectionName(section: EditableSection) {
  switch (section) {
    case 'hero':
      return 'Hero Section';
    case 'about':
      return 'About Us';
    case 'history':
      return 'History Section';
    case 'featured':
      return 'Featured Section';
    case 'contactSection':
      return 'Contact Section';
    case 'contactInfo':
      return 'Contact Info';
    case 'footerMenu':
      return 'Footer & Menu';
    case 'announcements':
      return 'Announcements';
    default:
      return 'None';
  }
}

function Counter({ current, max }: { current: number; max: number }) {
  return <p className="text-right text-xs text-slate-400">{current}/{max}</p>;
}

function ContentCard({
  title,
  description,
  icon,
  children,
  isEditing,
  onEdit,
  onCancel,
  onSave,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  isEditing?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border bg-white shadow-sm transition-all ${
        isEditing
          ? 'border-blue-200 ring-2 ring-blue-100'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{icon}</div>
            <div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-start">
            {!isEditing ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Save className="size-4" />
                  Save
                </button>
              </>
            )}
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
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function SnapshotTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="group rounded-[1.25rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-4 transition hover:border-slate-300 hover:shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-900">
        {value}
      </p>
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
  maxLength,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
  isTextArea?: boolean;
  icon?: ReactNode;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>

      {editing ? (
        isTextArea ? (
          <>
            <textarea
              value={value}
              maxLength={maxLength}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            {typeof maxLength === 'number' ? (
              <Counter current={value.length} max={maxLength} />
            ) : null}
          </>
        ) : (
          <div className="relative">
            {icon ? <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div> : null}
            <input
              type="text"
              value={value}
              maxLength={maxLength}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                icon ? 'pl-10 pr-4' : 'px-4'
              }`}
            />
          </div>
        )
      ) : (
        <p className="break-words text-sm font-medium text-slate-700">{value || 'None'}</p>
      )}
    </div>
  );
}

function StatusRow({
  label,
  status,
  active = false,
}: {
  label: string;
  status: 'complete' | 'empty';
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-[1.25rem] border px-4 py-3.5 transition ${
        active
          ? 'border-blue-200 bg-blue-50'
          : status === 'complete'
            ? 'border-emerald-200 bg-emerald-50/70'
            : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="min-w-0">
        <p className={`truncate text-sm font-semibold ${active ? 'text-blue-900' : 'text-slate-800'}`}>
          {label}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {active
            ? 'Currently being edited'
            : status === 'complete'
              ? 'Looks configured'
              : 'Needs content'}
        </p>
      </div>

      <span
        className={`ml-3 inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          active
            ? 'bg-blue-100 text-blue-700'
            : status === 'complete'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
        }`}
      >
        {active ? 'Active' : status === 'complete' ? 'Ready' : 'Empty'}
      </span>
    </div>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="mt-1 size-2 rounded-full bg-emerald-500" />
      <p className="text-sm leading-relaxed text-slate-600">{text}</p>
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
  titleMaxLength,
  textMaxLength,
}: {
  titleLabel: string;
  textLabel: string;
  titleValue: string;
  textValue: string;
  editing: boolean;
  onTitleChange: (value: string) => void;
  onTextChange: (value: string) => void;
  titleMaxLength?: number;
  textMaxLength?: number;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <FieldWrapper label={titleLabel}>
        {editing ? (
          <input
            type="text"
            maxLength={titleMaxLength}
            value={titleValue}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <p className="text-sm font-medium text-slate-900">{titleValue || 'None'}</p>
        )}
      </FieldWrapper>

      <FieldWrapper label={textLabel}>
        {editing ? (
          <>
            <textarea
              value={textValue}
              maxLength={textMaxLength}
              onChange={(e) => onTextChange(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            {typeof textMaxLength === 'number' ? (
              <Counter current={textValue.length} max={textMaxLength} />
            ) : null}
          </>
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {textValue || 'None'}
          </p>
        )}
      </FieldWrapper>
    </div>
  );
}