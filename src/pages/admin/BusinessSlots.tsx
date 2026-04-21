import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { JSX } from 'react';
import { useUnits } from '../../contexts/UnitsContext';
import type { UnitType } from '../../data/types';
import supabase from '../../supabaseClient';
import { DataCell, ActionCell, DataTable } from '../../components/common/DataTable';
import { normalizeAmountInput, finalizeAmountInput } from '../../utils/priceNormalization';
import AppNotice from '../../components/common/AppNotice';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Home,
  Building2,
  Car,
  Hash,
  MapPin,
  Users,
  AlertTriangle,
  Settings2,
  Wrench,
  CheckCircle2,
  PauseCircle,
  Filter,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/date';
import AdminFilterBar, {
  FILTER_SELECT_CLASS,
} from '../../components/common/AdminFilterBar';

const UNIT_TYPE_MAP: Record<UnitType, { icon: JSX.Element; label: string; color: string }> = {
  rental_space: {
    icon: <Building2 className="size-4" />,
    label: 'Rental Space',
    color: 'text-indigo-600 bg-indigo-100',
  },
  function_hall: {
    icon: <Home className="size-4" />,
    label: 'Function Hall',
    color: 'text-purple-600 bg-purple-100',
  },
  parking_slot: {
    icon: <Car className="size-4" />,
    label: 'Parking Area',
    color: 'text-orange-600 bg-orange-100',
  },
};

const TYPE_CATEGORY_RULES: Record<UnitType, string[]> = {
  rental_space: ['commercial_space', 'residential_space'],
  function_hall: ['function_room'],
  parking_slot: ['parking'],
};

const INITIAL_FORM_STATE = {
  name: '',
  type: '' as UnitType | '',
  unitCategory: '',
  unitSubtype: '',
  description: '',
  price: '',
  images: '',
  videos: '',
  policies: '',
  capacity: '',
  available: true,
  features: '',
  propertyId: '',
  location: '',
  minimumPaymentPercent: '',
  contractFilePath: '',
  contractFileName: '',
};

const INPUT_LIMITS = {
  unitName: 100,
  description: 2000,
  policies: 3000,
  features: 500,
  location: 100,
  propertyId: 100,
  contractFileName: 255,
  slotCode: 20,
  slotLabel: 100,
  slotVehicleType: 50,
  slotNotes: 500,
};

const INITIAL_SLOT_FORM = {
  slotCode: '',
  label: '',
  status: 'active' as 'active' | 'inactive' | 'maintenance',
  vehicleType: '',
  imagePath: '',
  notes: '',
};

type ImagePreviewItem = {
  id: string;
  path: string;
  previewUrl: string;
};

type ParkingSlotRecord = {
  id: string;
  unitId: string;
  slotCode: string;
  label?: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  vehicleType?: string | null;
  imagePath?: string | null;
  notes?: string | null;
  occupiedByUserId?: string | null;
  occupiedByName?: string | null;
  occupiedByPublicId?: string | null;
  occupancyReservationId?: string | null;
  isOccupied?: boolean;
  isReservable?: boolean;
  occupiedSince?: string | null;
};

type UnitRecord = {
  id: string;
  name: string;
  type: UnitType;
  category?: string | null;
  subtype?: string | null;
  description: string;
  price: number;
  imagePaths?: string[];
  images?: string[];
  videoPaths?: string[];
  videos?: string[];
  policies: string;
  capacity?: number | null;
  available: boolean;
  features: string[];
  propertyId?: string | null;
  location?: string | null;
  minimumPaymentPercent?: number | null;
  contractFilePath?: string | null;
  contractFileName?: string | null;
};

type TaxonomyOption = {
  option_id: string;
  option_type: 'category' | 'subtype';
  value: string;
  label: string;
  parent_category: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
};

const SLOT_STATUS_STYLES: Record<
  ParkingSlotRecord['status'],
  { chip: string; icon: JSX.Element; label: string }
> = {
  active: {
    chip: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="size-3.5" />,
    label: 'Active',
  },
  inactive: {
    chip: 'bg-slate-200 text-slate-700',
    icon: <PauseCircle className="size-3.5" />,
    label: 'Inactive',
  },
  maintenance: {
    chip: 'bg-amber-100 text-amber-700',
    icon: <Wrench className="size-3.5" />,
    label: 'Maintenance',
  },
};

function NoPropertyResults() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center text-center"
    >
      <div className="mb-4 rounded-3xl bg-gray-50 p-5 shadow-sm">
        <Filter className="size-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">No matching properties found</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        Try adjusting your search or filters by unit name, type, location, or availability.
      </p>
    </motion.div>
  );
}

function parseCommaSeparated(value: string) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function revokePreviewUrls(items: ImagePreviewItem[]) {
  items.forEach((item) => {
    try {
      if (item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
    } catch {
      // ignore
    }
  });
}

function getPublicImageUrl(path: string) {
  if (!path) return '';

  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  const { data } = supabase.storage.from('property_media').getPublicUrl(path.trim());
  return data.publicUrl;
}

const UnitTypeDisplay = React.memo(function UnitTypeDisplay({ type }: { type: UnitType }) {
  const { icon, label, color } = UNIT_TYPE_MAP[type];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}
    >
      {icon}
      {label}
    </span>
  );
});

type UnitImagePickerProps = {
  imagePreviews: ImagePreviewItem[];
  isUploadingImages: boolean;
  onRemove: (imagePath: string) => void;
  onOpenLightbox: (src: string) => void;
  onTriggerUpload: () => void;
};

const UnitImagePicker = React.memo(function UnitImagePicker({
  imagePreviews,
  isUploadingImages,
  onRemove,
  onOpenLightbox,
  onTriggerUpload,
}: UnitImagePickerProps) {
  if (imagePreviews.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          {imagePreviews.map((item, i) => (
            <div
              key={item.id}
              className="group relative h-[150px] w-[170px] flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.path);
                }}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg transition-all hover:bg-red-500 hover:text-white"
                aria-label="Remove image"
                title="Remove image"
              >
                <X className="size-4" />
              </button>

              <img
                src={item.previewUrl}
                alt={`preview-${i}`}
                onClick={() => onOpenLightbox(item.previewUrl)}
                className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={onTriggerUpload}
            disabled={isUploadingImages}
            className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            title="Add more images"
            aria-label="Add more images"
          >
            <Plus className="size-6" />
          </button>
        </div>

        <p className="ml-1 text-[11px] text-slate-400">
          Uploaded images. Click a photo to preview it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onTriggerUpload}
        disabled={isUploadingImages}
        className="flex h-24 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="size-5" />
        <span className="text-sm font-semibold">
          {isUploadingImages ? 'Uploading...' : 'Upload Images'}
        </span>
      </button>

      <p className="ml-1 text-[11px] text-slate-400">
        Select one or more images. Max file size: 5MB per image.
      </p>
    </div>
  );
});

type UnitFormModalProps = {
  open: boolean;
  editingUnit: UnitRecord | null;
  defaultLocation: string;
  locationOptions: string[];
  onClose: () => void;
    onSave: (payload: {
    unitId?: string;
    data: {
      name: string;
      type: UnitType;
      category?: string | null;
      subtype?: string | null;
      description: string;
      price: number;
      imagePaths: string[];
      videoPaths: string[];
      policies: string;
      capacity?: number;
      available: boolean;
      features: string[];
      propertyId: string;
      location: string;
      minimumPaymentPercent?: number | null;
      contractFilePath?: string | null;
      contractFileName?: string | null;
    };
  }) => Promise<void>;
  uploadUnitContract: (file: File) => Promise<{ path: string; name: string } | null>;
  uploadUnitImage: (file: File) => Promise<string | null | undefined>;
  uploadUnitVideo: (file: File) => Promise<string | null | undefined>;
  onOpenLightbox: (src: string) => void;
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_CONTRACT_SIZE = 10 * 1024 * 1024;
const UnitFormModal = React.memo(function UnitFormModal({
  open,
  editingUnit,
  defaultLocation,
  locationOptions,
  onClose,
  onSave,
  uploadUnitImage,
  uploadUnitVideo,
  uploadUnitContract,
  onOpenLightbox,
}: UnitFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [unitForm, setUnitForm] = useState({
    ...INITIAL_FORM_STATE,
    location: defaultLocation,
  });
  const [imagePreviews, setImagePreviews] = useState<ImagePreviewItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [videoPreviews, setVideoPreviews] = useState<ImagePreviewItem[]>([]);
  const [isUploadingVideos, setIsUploadingVideos] = useState(false);

    const [categories, setCategories] = useState<TaxonomyOption[]>([]);
const [subtypes, setSubtypes] = useState<TaxonomyOption[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubtype, setShowAddSubtype] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newSubtypeLabel, setNewSubtypeLabel] = useState('');
  const [isSavingTaxonomy, setIsSavingTaxonomy] = useState(false);

  const allPreviewsRef = useRef<ImagePreviewItem[]>([]);

  useEffect(() => {
    allPreviewsRef.current = [...imagePreviews, ...videoPreviews];
  }, [imagePreviews, videoPreviews]);


  useEffect(() => {
  if (!open) return;

  return () => {
    revokePreviewUrls(allPreviewsRef.current);
  };
}, [open]);



  useEffect(() => {
    if (open && !unitForm.location && defaultLocation) {
      setUnitForm((prev) => ({ ...prev, location: defaultLocation }));
    }
  }, [open, unitForm.location, defaultLocation]);

  useEffect(() => {
    if (unitForm.type !== 'function_hall' && unitForm.capacity !== '') {
      setUnitForm((prev) => ({
        ...prev,
        capacity: '',
      }));
    }
  }, [unitForm.type, unitForm.capacity]);

  useEffect(() => {
  if (!unitForm.type) return;

  const allowedCategories = TYPE_CATEGORY_RULES[unitForm.type] ?? [];

  if (unitForm.unitCategory && !allowedCategories.includes(unitForm.unitCategory)) {
    setUnitForm((prev) => ({
      ...prev,
      unitCategory: '',
      unitSubtype: '',
    }));
    return;
  }

  if (
    unitForm.unitSubtype &&
    !subtypes.some(
      (subtype) =>
        subtype.value === unitForm.unitSubtype &&
        subtype.parent_category === unitForm.unitCategory
    )
  ) {
    setUnitForm((prev) => ({
      ...prev,
      unitSubtype: '',
    }));
  }
}, [unitForm.type, unitForm.unitCategory, unitForm.unitSubtype, subtypes]);

  useEffect(() => {
  if (!open) return;

  revokePreviewUrls(allPreviewsRef.current);

  if (editingUnit) {
    const existingPaths =
      Array.isArray(editingUnit.imagePaths) && editingUnit.imagePaths.length
        ? editingUnit.imagePaths
        : Array.isArray(editingUnit.images)
          ? editingUnit.images
          : [];

    const existingVideoPaths =
      Array.isArray(editingUnit.videoPaths) && editingUnit.videoPaths.length
        ? editingUnit.videoPaths
        : Array.isArray(editingUnit.videos)
          ? editingUnit.videos
          : [];

    setImagePreviews(
      existingPaths.map((path, index) => ({
        id: `image-${path}-${index}`,
        path,
        previewUrl: getPublicImageUrl(path),
      }))
    );

    setVideoPreviews(
      existingVideoPaths.map((path, index) => ({
        id: `video-${path}-${index}`,
        path,
        previewUrl: getPublicImageUrl(path),
      }))
    );

        setUnitForm({
      name: editingUnit.name,
      type: editingUnit.type,
      unitCategory: editingUnit.category || '',
      unitSubtype: editingUnit.subtype || '',
      description: editingUnit.description,
      price: editingUnit.price.toString(),
      images: existingPaths.join(', '),
      videos: existingVideoPaths.join(', '),
      policies: editingUnit.policies,
      capacity:
        editingUnit.type === 'function_hall' ? editingUnit.capacity?.toString() || '' : '',
      available: editingUnit.available,
      features: editingUnit.features.join(', '),
      propertyId: editingUnit.propertyId || '',
      location: editingUnit.location || defaultLocation,
      minimumPaymentPercent:
        editingUnit.minimumPaymentPercent !== null &&
        editingUnit.minimumPaymentPercent !== undefined
          ? String(editingUnit.minimumPaymentPercent)
          : '',
      contractFilePath: editingUnit.contractFilePath || '',
      contractFileName: editingUnit.contractFileName || '',
    });
  } else {
    setImagePreviews([]);
    setVideoPreviews([]);
    setUnitForm({
      ...INITIAL_FORM_STATE,
      location: defaultLocation,
    });
  }

  setFormError(null);
  setIsSubmitting(false);
  setIsUploadingImages(false);
  setIsUploadingVideos(false);

  if (fileInputRef.current) fileInputRef.current.value = '';
  if (videoInputRef.current) videoInputRef.current.value = '';
}, [open, editingUnit, defaultLocation]);

  const updateFormField = useCallback(
  <K extends keyof typeof INITIAL_FORM_STATE>(
    key: K,
    value: (typeof INITIAL_FORM_STATE)[K]
  ) => {
    let nextValue = value;

    if (typeof nextValue === 'string') {
      const limitMap: Partial<Record<keyof typeof INITIAL_FORM_STATE, number>> = {
        name: INPUT_LIMITS.unitName,
        description: INPUT_LIMITS.description,
        policies: INPUT_LIMITS.policies,
        features: INPUT_LIMITS.features,
        location: INPUT_LIMITS.location,
        propertyId: INPUT_LIMITS.propertyId,
        contractFileName: INPUT_LIMITS.contractFileName,
      };

      const max = limitMap[key];
      if (max) {
        nextValue = nextValue.slice(0, max) as (typeof INITIAL_FORM_STATE)[K];
      }
    }

    setUnitForm((prev) => ({ ...prev, [key]: nextValue }));
    setFormError(null);
  },
  []
);

  const reloadTaxonomy = useCallback(async () => {
    const { data, error } = await supabase
      .from('unit_taxonomy_options')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      setFormError('Failed to load category and subtype options.');
      return;
    }

    setCategories((data ?? []).filter((d) => d.option_type === 'category'));
    setSubtypes((data ?? []).filter((d) => d.option_type === 'subtype'));
  }, []);

  useEffect(() => {
  void reloadTaxonomy();
}, [reloadTaxonomy]);

  const toSlug = useCallback((value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
  }, []);

  const handleAddCategory = useCallback(async () => {
    const label = newCategoryLabel.trim();
    if (!label) {
      setFormError('Category name is required.');
      return;
    }

    try {
      setIsSavingTaxonomy(true);
      setFormError(null);

      const value = toSlug(label);

      const { error } = await supabase.from('unit_taxonomy_options').insert({
        option_type: 'category',
        label,
        value,
        parent_category: null,
        is_active: true,
      });

      if (error) throw error;

      await reloadTaxonomy();
      updateFormField('unitCategory', value);
      updateFormField('unitSubtype', '');
      setNewCategoryLabel('');
      setShowAddCategory(false);
    } catch (error: any) {
      setFormError(error?.message || 'Failed to add category.');
    } finally {
      setIsSavingTaxonomy(false);
    }
  }, [newCategoryLabel, reloadTaxonomy, toSlug, updateFormField]);

  const handleAddSubtype = useCallback(async () => {
    const label = newSubtypeLabel.trim();

    if (!unitForm.unitCategory) {
      setFormError('Select a category first before adding a subtype.');
      return;
    }

    if (!label) {
      setFormError('Subtype name is required.');
      return;
    }

    try {
      setIsSavingTaxonomy(true);
      setFormError(null);

      const value = toSlug(label);

      const { error } = await supabase.from('unit_taxonomy_options').insert({
        option_type: 'subtype',
        label,
        value,
        parent_category: unitForm.unitCategory,
        is_active: true,
      });

      if (error) throw error;

      await reloadTaxonomy();
      updateFormField('unitSubtype', value);
      setNewSubtypeLabel('');
      setShowAddSubtype(false);
    } catch (error: any) {
      setFormError(error?.message || 'Failed to add subtype.');
    } finally {
      setIsSavingTaxonomy(false);
    }
  }, [
    newSubtypeLabel,
    unitForm.unitCategory,
    reloadTaxonomy,
    toSlug,
    updateFormField,
  ]);

  const triggerUpload = useCallback(() => {
    if (!isUploadingImages) fileInputRef.current?.click();
  }, [isUploadingImages]);

  const removeImage = useCallback((imagePath: string) => {
    setUnitForm((prev) => {
      const remaining = parseCommaSeparated(prev.images).filter((img) => img !== imagePath);
      return { ...prev, images: remaining.join(', ') };
    });

    setImagePreviews((prev) => {
      const target = prev.find((item) => item.path === imagePath);

      if (target?.previewUrl?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          // ignore
        }
      }

      return prev.filter((item) => item.path !== imagePath);
    });
  }, []);

  const triggerVideoUpload = useCallback(() => {
  if (!isUploadingVideos) videoInputRef.current?.click();
}, [isUploadingVideos]);

const removeVideo = useCallback((videoPath: string) => {
  setUnitForm((prev) => {
    const remaining = parseCommaSeparated(prev.videos).filter((vid) => vid !== videoPath);
    return { ...prev, videos: remaining.join(', ') };
  });

  setVideoPreviews((prev) => {
    const target = prev.find((item) => item.path === videoPath);

    if (target?.previewUrl?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(target.previewUrl);
      } catch {
        // ignore
      }
    }

    return prev.filter((item) => item.path !== videoPath);
  });
}, []);

const handleVideoFilesSelected = useCallback(
  async (filesList: FileList | null) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;

    const oversizedFiles = files.filter((file) => file.size > MAX_VIDEO_SIZE);

    if (oversizedFiles.length > 0) {
      setFormError(
        oversizedFiles.length === 1
          ? `${oversizedFiles[0].name} exceeds the 50MB video limit.`
          : `${oversizedFiles.length} video files exceed the 50MB limit.`
      );
    }

    const validFiles = files.filter((file) => file.size <= MAX_VIDEO_SIZE);
    if (!validFiles.length) return;

    setIsUploadingVideos(true);

    const tempItems = validFiles.map((file) => ({
      id: `temp-video-${crypto.randomUUID()}`,
      path: '',
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    setVideoPreviews((prev) => [
      ...prev,
      ...tempItems.map(({ id, path, previewUrl }) => ({
        id,
        path,
        previewUrl,
      })),
    ]);

    try {
      const uploadResults = await Promise.all(
        tempItems.map(async (item) => {
          const uploadedPath = await uploadUnitVideo(item.file);

          if (!uploadedPath) {
            return { ...item, failed: true };
          }

          return {
            ...item,
            path: uploadedPath,
            failed: false,
          };
        })
      );

      const successful = uploadResults.filter((item) => !item.failed && item.path);

      setVideoPreviews((prev) =>
        prev
          .filter(
            (item) =>
              !tempItems.some((temp) => temp.id === item.id) ||
              successful.some((s) => s.id === item.id)
          )
          .map((item) => {
            const match = successful.find((s) => s.id === item.id);
            return match
              ? {
                  id: `${match.path}-${crypto.randomUUID()}`,
                  path: match.path,
                  previewUrl: item.previewUrl,
                }
              : item;
          })
      );

      setUnitForm((prev) => {
        const existing = parseCommaSeparated(prev.videos);
        return {
          ...prev,
          videos: [...existing, ...successful.map((r) => r.path)].join(', '),
        };
      });

      uploadResults
        .filter((item) => item.failed)
        .forEach((item) => {
          URL.revokeObjectURL(item.previewUrl);
        });

      setVideoPreviews((prev) =>
        prev.filter((item) => !uploadResults.some((r) => r.failed && r.id === item.id))
      );
    } catch (err) {
      console.error('Video upload failed', err);

      tempItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setVideoPreviews((prev) =>
        prev.filter((item) => !tempItems.some((temp) => temp.id === item.id))
      );

      setFormError('Video upload failed. Please try again.');
    } finally {
      setIsUploadingVideos(false);
    }
  },
  [uploadUnitVideo]
);



  const handleFilesSelected = useCallback(
  async (filesList: FileList | null) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;

    const oversizedFiles = files.filter((file) => file.size > MAX_IMAGE_SIZE);

    if (oversizedFiles.length > 0) {
      setFormError(
        oversizedFiles.length === 1
          ? `${oversizedFiles[0].name} exceeds the 5MB image limit.`
          : `${oversizedFiles.length} image files exceed the 5MB limit.`
      );
    }

    const validFiles = files.filter((file) => file.size <= MAX_IMAGE_SIZE);
    if (!validFiles.length) return;

    setIsUploadingImages(true);

    const tempItems = validFiles.map((file) => ({
      id: `temp-${crypto.randomUUID()}`,
      path: '',
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    setImagePreviews((prev) => [
      ...prev,
      ...tempItems.map(({ id, path, previewUrl }) => ({
        id,
        path,
        previewUrl,
      })),
    ]);

    try {
      const uploadResults = await Promise.all(
        tempItems.map(async (item) => {
          const uploadedPath = await uploadUnitImage(item.file);

          if (!uploadedPath) {
            return { ...item, failed: true };
          }

          return {
            ...item,
            path: uploadedPath,
            failed: false,
          };
        })
      );

      const successful = uploadResults.filter((item) => !item.failed && item.path);

      setImagePreviews((prev) =>
        prev
          .filter(
            (item) =>
              !tempItems.some((temp) => temp.id === item.id) ||
              successful.some((s) => s.id === item.id)
          )
          .map((item) => {
            const match = successful.find((s) => s.id === item.id);
            return match
              ? {
                  id: `${match.path}-${crypto.randomUUID()}`,
                  path: match.path,
                  previewUrl: item.previewUrl,
                }
              : item;
          })
      );

      setUnitForm((prev) => {
        const existing = parseCommaSeparated(prev.images);
        return {
          ...prev,
          images: [...existing, ...successful.map((r) => r.path)].join(', '),
        };
      });

      uploadResults
        .filter((item) => item.failed)
        .forEach((item) => {
          URL.revokeObjectURL(item.previewUrl);
        });

      setImagePreviews((prev) =>
        prev.filter((item) => !uploadResults.some((r) => r.failed && r.id === item.id))
      );
    } catch (err) {
      console.error('Image upload failed', err);

      tempItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setImagePreviews((prev) =>
        prev.filter((item) => !tempItems.some((temp) => temp.id === item.id))
      );

      setFormError('Image upload failed. Please try again.');
    } finally {
      setIsUploadingImages(false);
    }
  },
  [uploadUnitImage]
);

  const contractInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingContract, setIsUploadingContract] = useState(false);

  const handleContractUpload = useCallback(
  async (file: File) => {
    if (!file) return;

    if (file.size > MAX_CONTRACT_SIZE) {
      setFormError(`${file.name} exceeds the 10MB PDF limit.`);
      return;
    }

    setIsUploadingContract(true);

    try {
      const result = await uploadUnitContract(file);

      if (!result) return;

      setUnitForm((prev) => ({
        ...prev,
        contractFilePath: result.path,
        contractFileName: result.name,
      }));
    } catch (err) {
      console.error('Contract upload failed', err);
      setFormError('Contract upload failed. Please try again.');
    } finally {
      setIsUploadingContract(false);
    }
  },
  [uploadUnitContract]
);

const [formError, setFormError] = useState<string | null>(null);

const allowedCategoriesForSelectedType = useMemo(() => {
  if (!unitForm.type) return [];
  return TYPE_CATEGORY_RULES[unitForm.type] ?? [];
}, [unitForm.type]);

const filteredCategories = useMemo(() => {
  if (!unitForm.type) return categories;
  return categories.filter((category) =>
    allowedCategoriesForSelectedType.includes(category.value)
  );
}, [categories, allowedCategoriesForSelectedType, unitForm.type]);

const filteredSubtypes = useMemo(() => {
  if (!unitForm.unitCategory) return [];
  return subtypes.filter((subtype) => subtype.parent_category === unitForm.unitCategory);
}, [subtypes, unitForm.unitCategory]);

  const handleClose = useCallback(() => {
  if (isSubmitting || isUploadingImages || isUploadingVideos || isUploadingContract) return;
  onClose();
}, [isSubmitting, isUploadingImages, isUploadingVideos, isUploadingContract, onClose]);

  const handleSubmit = useCallback(
  async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      isSubmitting ||
      !unitForm.type ||
      isUploadingImages ||
      isUploadingVideos ||
      isUploadingContract
    ) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const parsedPrice = Number(unitForm.price);

      if (!Number.isFinite(parsedPrice) || parsedPrice < 500) {
        setFormError('Price must be at least ₱500.');
        setIsSubmitting(false);
        return;
      }

      const parsedCapacity =
      unitForm.type === 'function_hall' && unitForm.capacity
        ? parseInt(unitForm.capacity, 10)
        : undefined;
    if (unitForm.type === 'function_hall') {
      if (parsedCapacity === undefined || parsedCapacity <= 0) {
        setFormError('Function hall capacity is required and must be at least 1.');
        setIsSubmitting(false);
        return;
      }
    }

    if (unitForm.unitCategory) {
  const allowedCategories = TYPE_CATEGORY_RULES[unitForm.type] ?? [];

  if (!allowedCategories.includes(unitForm.unitCategory)) {
    setFormError('Selected category does not match the chosen unit type.');
    setIsSubmitting(false);
    return;
  }
}

if (
  unitForm.unitSubtype &&
  !subtypes.some(
    (subtype) =>
      subtype.value === unitForm.unitSubtype &&
      subtype.parent_category === unitForm.unitCategory
  )
) {
  setFormError('Selected subtype does not belong to the chosen category.');
  setIsSubmitting(false);
  return;
}
          

      const parsedMinimumPaymentPercent =
        unitForm.minimumPaymentPercent === ''
          ? null
          : parseInt(unitForm.minimumPaymentPercent, 10);

            await onSave({
        unitId: editingUnit?.id,
        data: {
          name: unitForm.name.trim(),
          type: unitForm.type,
          category: unitForm.unitCategory || null,
          subtype: unitForm.unitSubtype || null,
          description: unitForm.description.trim(),
          price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
          imagePaths: parseCommaSeparated(unitForm.images),
          videoPaths: parseCommaSeparated(unitForm.videos),
          policies: unitForm.policies.trim(),
          capacity: parsedCapacity,
          available: unitForm.available,
          features: parseCommaSeparated(unitForm.features),
          propertyId: unitForm.propertyId,
          contractFilePath: unitForm.contractFilePath || null,
          contractFileName: unitForm.contractFileName || null,
          location: unitForm.location || defaultLocation,
          minimumPaymentPercent:
            parsedMinimumPaymentPercent !== null &&
            Number.isFinite(parsedMinimumPaymentPercent)
              ? parsedMinimumPaymentPercent
              : null,
        },
      });

      onClose();
    } catch (error: any) {
      console.error('Failed to save unit:', error);
      setFormError(error?.message || 'Failed to save unit. Please try again.');
      setIsSubmitting(false);
    }
  },
  [
  isSubmitting,
  unitForm,
  isUploadingImages,
  isUploadingVideos,
  isUploadingContract,
  onSave,
  editingUnit?.id,
  defaultLocation,
  onClose,
  subtypes,
]
);

  const categoryModal = showAddCategory ? (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Add Category</h3>
        <p className="mt-1 text-sm text-slate-500">
          Create a new unit category for the dropdown.
        </p>

        <input
          type="text"
          value={newCategoryLabel}
          onChange={(e) => setNewCategoryLabel(e.target.value)}
          placeholder="e.g. Commercial Space"
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
        />

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowAddCategory(false);
              setNewCategoryLabel('');
            }}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleAddCategory()}
            disabled={isSavingTaxonomy}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSavingTaxonomy ? 'Saving...' : 'Add Category'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const subtypeModal = showAddSubtype ? (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Add Subtype</h3>
        <p className="mt-1 text-sm text-slate-500">
          Create a new subtype under the selected category.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          Parent category: {categories.find((cat) => cat.value === unitForm.unitCategory)?.label || '—'}
        </div>

        <input
          type="text"
          value={newSubtypeLabel}
          onChange={(e) => setNewSubtypeLabel(e.target.value)}
          placeholder="e.g. Kiosk"
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
        />

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowAddSubtype(false);
              setNewSubtypeLabel('');
            }}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleAddSubtype()}
            disabled={isSavingTaxonomy || !unitForm.unitCategory}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSavingTaxonomy ? 'Saving...' : 'Add Subtype'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (!open) return null;



  return (
    <>
      {categoryModal}
      {subtypeModal}
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 p-0 bg-slate-900/50 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-slate-200/60 bg-white shadow-xl sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between bg-slate-900 p-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {editingUnit ? 'Edit Unit' : 'Add New Unit'}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {editingUnit
                ? 'Update the selected unit details for Commerciales Flores'
                : 'Create a new rentable unit profile for Commerciales Flores'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-6 overflow-y-auto p-6 pb-28 sm:p-8 sm:pb-8"
        >
          {formError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                Unit Name
              </label>
              <input
                id="name"
                type="text"
                required
                maxLength={INPUT_LIMITS.unitName}
                value={unitForm.name}
                onChange={(e) => updateFormField('name', e.target.value)}
                placeholder="Enter unit name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="type"
                className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                Unit Type
              </label>
              <select
                id="type"
                required
                value={unitForm.type}
                onChange={(e) => updateFormField('type', e.target.value as UnitType | '')}
                disabled={Boolean(editingUnit)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select a type</option>
                <option value="rental_space">Rental Space (e.g., Office/Retail)</option>
                <option value="function_hall">Function Hall (e.g., Event Venue)</option>
                <option value="parking_slot">Parking Area (container for multiple slots)</option>
              </select>
            </div>

            <div className="space-y-1.5">
  <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
    Unit Category
  </label>

  <div className="flex gap-2">
    <select
      value={unitForm.unitCategory}
      onChange={(e) => {
        updateFormField('unitCategory', e.target.value);
        updateFormField('unitSubtype', '');
      }}
      disabled={!unitForm.type}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100"
    >
      <option value="">
        {!unitForm.type ? 'Select unit type first' : 'Select category'}
      </option>

      {filteredCategories.map((cat) => (
        <option key={cat.option_id} value={cat.value}>
          {cat.label}
        </option>
      ))}
    </select>

    <button
      type="button"
      onClick={() => setShowAddCategory(true)}
      disabled={!unitForm.type}
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      title="Add category"
    >
      Add
    </button>
  </div>

  {!unitForm.type ? (
    <p className="ml-1 text-[11px] text-slate-400">
      Select a unit type first before choosing a category.
    </p>
  ) : null}
</div>

          <div className="space-y-1.5">
  <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
    Unit Subtype
  </label>

  <div className="flex gap-2">
    <select
      value={unitForm.unitSubtype}
      onChange={(e) => updateFormField('unitSubtype', e.target.value)}
      disabled={!unitForm.unitCategory}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100"
    >
      <option value="">Select subtype</option>

      {filteredSubtypes.map((sub) => (
        <option key={sub.option_id} value={sub.value}>
          {sub.label}
        </option>
      ))}
    </select>

    <button
      type="button"
      onClick={() => setShowAddSubtype(true)}
      disabled={!unitForm.unitCategory}
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      title="Add subtype"
    >
      Add
    </button>
  </div>

  {!unitForm.unitCategory ? (
    <p className="ml-1 text-[11px] text-slate-400">
      Select a category first before choosing or adding a subtype.
    </p>
  ) : null}
</div>
            <div className="space-y-1.5">
              <label
                htmlFor="location"
                className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                Location
              </label>
              <select
                id="location"
                required
                value={unitForm.location}
                onChange={(e) => updateFormField('location', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="">Select a location</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <p className="ml-1 text-[11px] text-slate-400">
                Choose the assigned branch/location for this unit.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="price"
                className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                Price
              </label>
              <input
                id="price"
                type="text"
                inputMode="decimal"
                required
                value={unitForm.price}
                onChange={(e) =>
                  updateFormField(
                    'price',
                    normalizeAmountInput(e.target.value, {
                      max: 999_999_999.99,
                      decimals: 2,
                      allowEmpty: true,
                    })
                  )
                }
                onBlur={(e) =>
                  updateFormField(
                    'price',
                    finalizeAmountInput(e.target.value, {
                      min: 500,
                      max: 999_999_999.99,
                      decimals: 2,
                      allowEmpty: true,
                    })
                  )
                }
                placeholder="e.g. 25000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
              <p className="ml-1 text-[11px] text-slate-400">
                Minimum price is ₱500.
                {unitForm.type === 'rental_space' && ' Monthly rate'}
                {unitForm.type === 'function_hall' && ' Daily rate'}
                {unitForm.type === 'parking_slot' && ' Base monthly rate for this parking area'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="minimumPaymentPercent"
                className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                Minimum Initial Payment
              </label>
              <select
                id="minimumPaymentPercent"
                value={unitForm.minimumPaymentPercent}
                onChange={(e) => updateFormField('minimumPaymentPercent', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="">No minimum</option>
                <option value="10">10%</option>
                <option value="20">20%</option>
                <option value="30">30%</option>
                <option value="40">40%</option>
                <option value="50">50%</option>
                <option value="60">60%</option>
                <option value="70">70%</option>
                <option value="80">80%</option>
                <option value="90">90%</option>
                <option value="100">100%</option>
              </select>
              <p className="ml-1 text-[11px] text-slate-400">
                {unitForm.type === 'rental_space' &&
                  'Required minimum for the first payment only. Later payments follow the selected billing cycle.'}
                {unitForm.type === 'function_hall' &&
                  'Required minimum for the first payment only. Later payments may be completed through flexible partial payments.'}
                {unitForm.type === 'parking_slot' &&
                  'Required minimum for the first payment only. Later payments may be completed based on the approved parking dues policy.'}
                {!unitForm.type &&
                  'Set the required minimum for the first payment.'}
              </p>
            </div>

            {unitForm.type === 'function_hall' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="capacity"
                  className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
                >
                  Capacity
                </label>
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  required={unitForm.type === 'function_hall'}
                  placeholder="Enter maximum guests"
                  value={unitForm.capacity}
                  onChange={(e) => updateFormField('capacity', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
                <p className="ml-1 text-[11px] text-slate-400">
                  Number of guests the function hall can accommodate.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Public ID
              </label>
              <div className="flex min-h-[50px] items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                {editingUnit
                  ? unitForm.propertyId || 'Public ID unavailable'
                  : 'Automatically generated after unit creation'}
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Status
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all hover:bg-white">
                <input
                  id="available"
                  type="checkbox"
                  checked={unitForm.available}
                  onChange={(e) => updateFormField('available', e.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Available for reservation
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              Description
            </label>
            <textarea
              id="description"
              required
              rows={4}
              maxLength={INPUT_LIMITS.description}
              value={unitForm.description}
              onChange={(e) => updateFormField('description', e.target.value)}
              placeholder="Describe the unit..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="images"
              className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              Unit Images
            </label>

            <input
              ref={fileInputRef}
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />

            <UnitImagePicker
              imagePreviews={imagePreviews}
              isUploadingImages={isUploadingImages}
              onRemove={removeImage}
              onOpenLightbox={onOpenLightbox}
              onTriggerUpload={triggerUpload}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="videos"
              className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              Unit Videos
            </label>

            <input
              ref={videoInputRef}
              id="videos"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              multiple
              onChange={(e) => handleVideoFilesSelected(e.target.files)}
              className="hidden"
            />

            {videoPreviews.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 overflow-x-auto py-1">
                  {videoPreviews.map((item) => (
                    <div
                      key={item.id}
                      className="group relative h-[150px] w-[220px] flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVideo(item.path);
                        }}
                        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg transition-all hover:bg-red-500 hover:text-white"
                      >
                        <X className="size-4" />
                      </button>

                      <video
                        src={item.previewUrl}
                        controls
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={triggerVideoUpload}
                    disabled={isUploadingVideos}
                    className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-60"
                  >
                    <Plus className="size-6" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={triggerVideoUpload}
                  disabled={isUploadingVideos}
                  className="flex h-24 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-60"
                >
                  <Plus className="size-5" />
                  <span className="text-sm font-semibold">
                    {isUploadingVideos ? 'Uploading...' : 'Upload Videos'}
                  </span>
                </button>

                <p className="ml-1 text-[11px] text-slate-400">
                  Supported formats: MP4, WebM, MOV. Max file size: 50MB per video.
                </p>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="features"
              className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              Features
            </label>
            <input
              id="features"
              type="text"
              placeholder="WiFi, Aircon, Parking, Stage"
              maxLength={INPUT_LIMITS.features}
              value={unitForm.features}
              onChange={(e) => updateFormField('features', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="policies"
              className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              Policies / Terms
            </label>
            <textarea
              id="policies"
              maxLength={INPUT_LIMITS.policies}
              required
              rows={3}
              value={unitForm.policies}
              onChange={(e) => updateFormField('policies', e.target.value)}
              placeholder="Enter terms and policies..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />

            <div className="space-y-1.5">
  <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
    Contract (PDF)
  </label>

  <input
    ref={contractInputRef}
    type="file"
    accept="application/pdf"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) handleContractUpload(file);
    }}
    className="hidden"
  />

  {unitForm.contractFilePath ? (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-sm font-medium text-slate-700 truncate">
          📄 {unitForm.contractFileName}
        </div>

        <button
          type="button"
          onClick={() =>
            setUnitForm((prev) => ({
              ...prev,
              contractFilePath: '',
              contractFileName: '',
            }))
          }
          className="text-red-500 hover:text-red-600 text-xs font-semibold"
        >
          Remove
        </button>
      </div>

      <button
        type="button"
        onClick={() => contractInputRef.current?.click()}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
      >
        Replace Contract
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => contractInputRef.current?.click()}
      disabled={isUploadingContract}
      className="flex h-20 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-60"
    >
      <span className="text-sm font-semibold">
        {isUploadingContract ? 'Uploading...' : 'Upload Contract PDF'}
      </span>
    </button>
  )}

  <p className="ml-1 text-[11px] text-slate-400">
    Optional: Upload a contract (PDF only, max 10MB). Replaces the current contract.
  </p>
</div>
          </div>

          {unitForm.type === 'parking_slot' && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4 text-sm text-orange-800">
              This parking area acts as the parent listing. After saving it, use{' '}
              <span className="font-semibold">Manage Slots</span> to add the actual physical
              parking spaces like A1, A2, or B1.
            </div>
          )}

          <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="hidden flex-1 rounded-2xl border border-slate-200 py-4 text-xs font-bold uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-50 sm:block"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 sm:flex-1"
              >
                {isSubmitting
                  ? editingUnit
                    ? 'Updating...'
                    : 'Adding...'
                  : editingUnit
                    ? 'Update Unit'
                    : 'Add Unit'}
              </button>
            </div>
          </div>
                </form>
      </div>
    </div>
    </>
  );
});

type UnitListProps = {
  units: UnitRecord[];
  slotStatsByUnit: Map<string, { total: number; active: number }>;
  onEdit: (unitId: string) => void;
  onDelete: (unitId: string) => void;
  onManageSlots: (unitId: string) => void;
  loading: boolean;
  hasNoProperties: boolean;
  hasNoSearchResults: boolean;
};

const UnitsList = React.memo(function UnitsList({
  units,
  slotStatsByUnit,
  onEdit,
  onDelete,
  onManageSlots,
  loading,
  hasNoProperties,
  hasNoSearchResults,
}: UnitListProps) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {loading ? (
          <EmptyState
            icon={
              <div className="flex items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              </div>
            }
            title="Loading properties..."
            description="Fetching units, availability, and unit details."
          />
        ) : hasNoProperties ? (
          <EmptyState
            icon={<Building2 className="size-10 text-blue-500" />}
            title="No properties yet"
            description="Units will appear here once rental spaces, halls, or parking areas are added."
          />
        ) : hasNoSearchResults ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 shadow-sm">
            <NoPropertyResults />
          </div>
        ) : (
          units.map((unit) => {
            const slotStats = slotStatsByUnit.get(unit.id) ?? { total: 0, active: 0 };

            return (
              <div
                key={unit.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-gray-900">{unit.name}</h3>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <UnitTypeDisplay type={unit.type} />

                      {unit.propertyId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          <Hash className="size-3" />
                          {unit.propertyId}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    {unit.type === 'parking_slot' && (
                      <button
                        type="button"
                        onClick={() => onManageSlots(unit.id)}
                        className="rounded-full p-2.5 text-orange-600 transition active:bg-orange-50"
                        title="Manage Slots"
                      >
                        <Settings2 className="size-5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEdit(unit.id)}
                      className="rounded-full p-2.5 text-blue-600 transition active:bg-blue-50"
                      title="Edit"
                    >
                      <Edit className="size-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(unit.id)}
                      className="rounded-full p-2.5 text-red-600 transition active:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-red-400" />
                    <span className="truncate">{unit.location || '—'}</span>
                  </div>

                  {unit.type === 'function_hall' && unit.capacity ? (
                    <div className="flex items-center gap-2">
                      <Users className="size-4 shrink-0 text-gray-400" />
                      <span>Capacity: {unit.capacity}</span>
                    </div>
                  ) : null}

                  {unit.type === 'parking_slot' ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Car className="size-3.5" />
                        {slotStats.total} slot(s)
                      </span>
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="size-3.5" />
                        {slotStats.active} active
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(unit.price)}
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      unit.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {unit.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden lg:block">
        {loading ? (
          <EmptyState
            icon={
              <div className="flex items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              </div>
            }
            title="Loading properties..."
            description="Fetching units, availability, and unit details."
          />
        ) : hasNoProperties ? (
          <EmptyState
            icon={<Building2 className="size-10 text-blue-500" />}
            title="No properties yet"
            description="Units will appear here once rental spaces, halls, or parking areas are added."
          />
        ) : hasNoSearchResults ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-20 shadow-sm">
            <NoPropertyResults />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <DataTable
                headers={[
                  <span className="block">Unit</span>,
                  <span className="block">Public ID</span>,
                  <span className="block">Type</span>,
                  <span className="block">Location</span>,
                  <span className="block">Price</span>,
                  <span className="block">Status</span>,
                  <span className="block">Actions</span>,
                ]}
              >
                {units.map((unit) => {
                  const slotStats = slotStatsByUnit.get(unit.id) ?? { total: 0, active: 0 };

                  return (
                    <tr key={unit.id} className="transition-colors hover:bg-gray-50">
                      <DataCell
                        value={
                          <div>
                            <p className="font-semibold text-gray-900">{unit.name}</p>

                            {unit.type === 'function_hall' && unit.capacity && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                <Users className="size-3.5" />
                                Capacity: {unit.capacity}
                              </p>
                            )}

                            {unit.type === 'parking_slot' && (
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1">
                                  <Car className="size-3.5" />
                                  {slotStats.total} slot(s)
                                </span>
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="size-3.5" />
                                  {slotStats.active} active
                                </span>
                              </div>
                            )}
                          </div>
                        }
                      />

                      <DataCell value={unit.propertyId || '—'} mono />
                      <DataCell value={<UnitTypeDisplay type={unit.type} />} nowrap />
                      <DataCell
                        value={
                          <div className="flex items-center gap-1.5">
                            <MapPin className="size-4 text-red-400" />
                            {unit.location || '—'}
                          </div>
                        }
                      />
                      <DataCell value={formatCurrency(unit.price)} mono />
                      <DataCell
                        value={
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-[10px] font-bold ${
                              unit.available
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {unit.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                          </span>
                        }
                        nowrap
                      />

                      <ActionCell>
                        {unit.type === 'parking_slot' && (
                          <button
                            type="button"
                            onClick={() => onManageSlots(unit.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-orange-600 hover:bg-orange-50"
                            title="Manage Slots"
                          >
                            <Settings2 className="size-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onEdit(unit.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit className="size-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(unit.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </ActionCell>
                    </tr>
                  );
                })}
              </DataTable>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});


type TaxonomyManagerModalProps = {
  open: boolean;
  taxonomyOptions: TaxonomyOption[];
  taxonomyLoading: boolean;
  taxonomyError: string | null;
  editingTaxonomy: TaxonomyOption | null;
  taxonomyLabel: string;
  taxonomyParent: string;
  taxonomySortOrder: string;
  isSavingTaxonomy: boolean;
  onClose: () => void;
  onEdit: (item: TaxonomyOption) => void;
  onLabelChange: (value: string) => void;
  onParentChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onToggleStatus: (item: TaxonomyOption) => void;
};

const TaxonomyManagerModal = React.memo(function TaxonomyManagerModal({
  open,
  taxonomyOptions,
  taxonomyLoading,
  taxonomyError,
  editingTaxonomy,
  taxonomyLabel,
  taxonomyParent,
  taxonomySortOrder,
  isSavingTaxonomy,
  onClose,
  onEdit,
  onLabelChange,
  onParentChange,
  onSortOrderChange,
  onSave,
  onCancelEdit,
  onToggleStatus,
}: TaxonomyManagerModalProps) {
  if (!open) return null;

  const categories = taxonomyOptions.filter(
    (item) => item.option_type === 'category'
  );

  const subtypes = taxonomyOptions.filter(
    (item) => item.option_type === 'subtype'
  );

  const renderStatusChip = (isActive: boolean) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        isActive
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-200 text-slate-700'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-slate-200/60 bg-slate-50 shadow-xl sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-5 sm:px-8">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Manage Categories &amp; Subtypes
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Edit labels, parent category, sort order, and active status.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
            aria-label="Close taxonomy manager"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 xl:grid-cols-[1.2fr_1.2fr_0.95fr]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">
                  Categories
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Main classifications available in the unit form.
                </p>
              </div>

              {taxonomyLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <EmptyState
                    icon={
                      <div className="flex items-center justify-center">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                      </div>
                    }
                    title="Loading categories..."
                    description="Fetching taxonomy records."
                  />
                </div>
              ) : categories.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <EmptyState
                    icon={<Building2 className="size-10 text-blue-500" />}
                    title="No categories found"
                    description="Categories will appear here once created."
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((item) => (
                    <div
                      key={item.option_id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {item.label}
                            </p>
                            <p className="mt-1 break-all text-xs text-slate-500">
                              value: {item.value}
                            </p>
                          </div>

                          {renderStatusChip(item.is_active)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                            Order: {item.sort_order}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleStatus(item)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                          >
                            {item.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">
                  Subtypes
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Child options grouped under a parent category.
                </p>
              </div>

              {taxonomyLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <EmptyState
                    icon={
                      <div className="flex items-center justify-center">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                      </div>
                    }
                    title="Loading subtypes..."
                    description="Fetching taxonomy records."
                  />
                </div>
              ) : subtypes.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <EmptyState
                    icon={<Hash className="size-10 text-blue-500" />}
                    title="No subtypes found"
                    description="Subtypes will appear here once created."
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {subtypes.map((item) => (
                    <div
                      key={item.option_id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {item.label}
                            </p>
                            <p className="mt-1 break-all text-xs text-slate-500">
                              value: {item.value}
                            </p>
                          </div>

                          {renderStatusChip(item.is_active)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                            Parent: {item.parent_category || '—'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                            Order: {item.sort_order}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleStatus(item)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                          >
                            {item.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">
                  Editor
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Select a category or subtype card and edit it here.
                </p>
              </div>

              {taxonomyError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {taxonomyError}
                </div>
              ) : null}

              {editingTaxonomy ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Editing {editingTaxonomy.option_type}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Fixed value: {editingTaxonomy.value}
                      </p>
                    </div>

                    {renderStatusChip(editingTaxonomy.is_active)}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Label
                      </label>
                      <input
                        type="text"
                        value={taxonomyLabel}
                        onChange={(e) => onLabelChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        value={taxonomySortOrder}
                        onChange={(e) => onSortOrderChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      />
                    </div>

                    {editingTaxonomy.option_type === 'subtype' ? (
                      <div className="space-y-1.5">
                        <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Parent Category
                        </label>
                        <select
                          value={taxonomyParent}
                          onChange={(e) => onParentChange(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                        >
                          <option value="">Select parent category</option>
                          {categories.map((category) => (
                            <option key={category.option_id} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 pt-2">
                      <button
                        type="button"
                        onClick={onSave}
                        disabled={isSavingTaxonomy}
                        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSavingTaxonomy ? 'Saving...' : 'Save Changes'}
                      </button>

                      <button
                        type="button"
                        onClick={onCancelEdit}
                        disabled={isSavingTaxonomy}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <Edit className="size-5 text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    No item selected
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Click any card’s Edit button to modify it.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
});


type SlotManagerModalProps = {
  open: boolean;
  selectedParkingUnit: UnitRecord | null;
  selectedParkingUnitSlots: ParkingSlotRecord[];
  editingSlotId: string | null;
  slotForm: typeof INITIAL_SLOT_FORM;
  slotImagePreview: string;
  isSavingSlot: boolean;
  parkingSlotLimit: number;
  usedParkingSlots: number;
  remainingParkingSlots: number;
  isUpdatingParkingLimit: boolean;
  onUpdateParkingSlotLimit: (nextLimit: number) => Promise<void>;
  onClose: () => void;
  onEditSlot: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onSaveSlot: (e: React.FormEvent) => void;
  onSlotFieldChange: <K extends keyof typeof INITIAL_SLOT_FORM>(
    key: K,
    value: (typeof INITIAL_SLOT_FORM)[K]
  ) => void;
  onSlotImageSelected: (fileList: FileList | null) => void;
  onResetSlotForm: () => void;
  setSlotImagePreview: React.Dispatch<React.SetStateAction<string>>;
  setSlotForm: React.Dispatch<React.SetStateAction<typeof INITIAL_SLOT_FORM>>;
  slotFileInputRef: React.RefObject<HTMLInputElement>;
  slotError: string | null;
};

const SlotManagerModal = React.memo(function SlotManagerModal({
  open,
  selectedParkingUnit,
  selectedParkingUnitSlots,
  editingSlotId,
  slotForm,
  slotImagePreview,
  isSavingSlot,
  parkingSlotLimit,
  usedParkingSlots,
  remainingParkingSlots,
  isUpdatingParkingLimit,
  onUpdateParkingSlotLimit,
  onClose,
  onEditSlot,
  onDeleteSlot,
  onSaveSlot,
  onSlotFieldChange,
  onSlotImageSelected,
  onResetSlotForm,
  setSlotImagePreview,
  setSlotForm,
  slotFileInputRef,
  slotError,
}: SlotManagerModalProps) {
  if (!open || !selectedParkingUnit) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-end justify-center bg-slate-900/60 p-0 bg-slate-900/50 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-slate-200/60 bg-white shadow-xl sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between bg-slate-900 p-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Manage Parking Slots</h2>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {selectedParkingUnit.name} • {selectedParkingUnit.propertyId || 'Parking Area'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {slotError && (
          <div className="mx-6 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {slotError}
          </div>
        )}

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 sm:p-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <h3 className="text-base font-semibold text-slate-900">Existing Slots</h3>
      <p className="mt-1 text-xs text-slate-500">
        {selectedParkingUnitSlots.length} slot(s) in this parking area
      </p>
      <p className="mt-1 text-xs text-orange-600">
        Global usage: <strong>{usedParkingSlots}</strong> /{' '}
        <strong>{parkingSlotLimit}</strong> · Remaining:{' '}
        <strong>{remainingParkingSlots}</strong>
      </p>
    </div>

    <div className="w-full max-w-xs rounded-2xl border border-orange-200 bg-orange-50 p-3">
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-orange-700">
        Global Parking Slot Limit
      </label>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={usedParkingSlots || 1}
          step={1}
          defaultValue={parkingSlotLimit}
          onBlur={(e) => {
            const nextLimit = Number(e.target.value);

            if (!Number.isFinite(nextLimit)) {
              e.target.value = String(parkingSlotLimit);
              return;
            }

            if (nextLimit < Math.max(usedParkingSlots, 1)) {
              e.target.value = String(parkingSlotLimit);
              return;
            }

            if (nextLimit !== parkingSlotLimit) {
              void onUpdateParkingSlotLimit(nextLimit);
            }
          }}
          className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />

        {isUpdatingParkingLimit ? (
          <span className="text-xs font-medium text-orange-700">Saving...</span>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] text-orange-700">
        Cannot be lower than the current total used slots ({usedParkingSlots}).
      </p>
    </div>
  </div>
</div>

              {selectedParkingUnitSlots.length === 0 ? (
                <div className="px-6 py-16">
                  <EmptyState
                    icon={<Car className="size-10 text-orange-500" />}
                    title="No parking slots yet"
                    description="Add the first physical parking space under this parking area."
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedParkingUnitSlots.map((slot) => {
                    const statusStyle = SLOT_STATUS_STYLES[slot.status];

                    return (
                      <div
                        key={slot.id}
                        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-900">
                              {slot.slotCode}
                            </h4>

                            {slot.label ? (
                              <span className="text-xs text-slate-500">• {slot.label}</span>
                            ) : null}

                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${statusStyle.chip}`}
                            >
                              {statusStyle.icon}
                              {statusStyle.label}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            {slot.vehicleType ? <span>Vehicle: {slot.vehicleType}</span> : null}
                            {slot.imagePath ? <span>Image attached</span> : null}
                            {slot.notes ? (
                              <span className="max-w-[220px] truncate">Notes: {slot.notes}</span>
                            ) : null}
                          </div>

                          {slot.isOccupied && (
                            <div className="mt-2 w-full rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                              <p className="text-[10px] font-bold uppercase tracking-wider">
                                Occupied
                              </p>
                              {slot.occupiedByName && <p>Client: {slot.occupiedByName}</p>}
                              {slot.occupiedByPublicId && <p>ID: {slot.occupiedByPublicId}</p>}
                              {slot.occupiedSince && (
                                <p>Since: {formatDate(slot.occupiedSince)}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (slot.isOccupied) return;
                              onEditSlot(slot.id);
                            }}
                            disabled={slot.isOccupied}
                            className={`rounded-lg p-2 ${
                              slot.isOccupied
                                ? 'cursor-not-allowed text-gray-300'
                                : 'text-blue-600 hover:bg-blue-50'
                            }`}
                            title={slot.isOccupied ? 'Cannot edit an occupied slot' : 'Edit slot'}
                          >
                            <Edit className="size-4.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (slot.isOccupied) return;
                              onDeleteSlot(slot.id);
                            }}
                            disabled={slot.isOccupied}
                            className={`rounded-lg p-2 ${
                              slot.isOccupied
                                ? 'cursor-not-allowed text-gray-300'
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            title={
                              slot.isOccupied ? 'Cannot delete an occupied slot' : 'Delete slot'
                            }
                          >
                            <Trash2 className="size-4.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">
                  {editingSlotId ? 'Edit Parking Slot' : 'Add Parking Slot'}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Each slot corresponds to one physical parking space.
                </p>
              </div>

              <form onSubmit={onSaveSlot} className="space-y-4 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Slot Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={INPUT_LIMITS.slotCode}
                      value={slotForm.slotCode}
                      onChange={(e) => onSlotFieldChange('slotCode', e.target.value)}
                      placeholder="e.g. A1"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Label
                    </label>
                    <input
                      type="text"
                      maxLength={INPUT_LIMITS.slotLabel}
                      value={slotForm.label}
                      onChange={(e) => onSlotFieldChange('label', e.target.value)}
                      placeholder="Optional display name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Status
                    </label>
                    <select
                      value={slotForm.status}
                      onChange={(e) =>
                        onSlotFieldChange(
                          'status',
                          e.target.value as 'active' | 'inactive' | 'maintenance'
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-50"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Vehicle Type
                    </label>
                    <input
                      type="text"
                      maxLength={INPUT_LIMITS.slotVehicleType}
                      value={slotForm.vehicleType}
                      onChange={(e) => onSlotFieldChange('vehicleType', e.target.value)}
                      placeholder="e.g. Car, SUV, Motorcycle"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Slot Image
                  </label>

                  <input
                    ref={slotFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => onSlotImageSelected(e.target.files)}
                    className="hidden"
                  />

                  {slotImagePreview ? (
                    <div className="space-y-3">
                      <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <img
                          src={slotImagePreview}
                          alt="Slot preview"
                          className="h-full w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            if (slotImagePreview.startsWith('blob:')) {
                              try {
                                URL.revokeObjectURL(slotImagePreview);
                              } catch {
                                // ignore
                              }
                            }

                            setSlotImagePreview('');
                            setSlotForm((prev) => ({
                              ...prev,
                              imagePath: '',
                            }));

                            if (slotFileInputRef.current) {
                              slotFileInputRef.current.value = '';
                            }
                          }}
                          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg transition-all hover:bg-red-500 hover:text-white"
                          aria-label="Remove slot image"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => slotFileInputRef.current?.click()}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
                      >
                        Replace Image
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => slotFileInputRef.current?.click()}
                      className="flex h-24 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600"
                    >
                      <Plus className="size-5" />
                      <span className="text-sm font-semibold">Upload Slot Image</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={slotForm.notes}
                    maxLength={INPUT_LIMITS.slotNotes}
                    onChange={(e) => onSlotFieldChange('notes', e.target.value)}
                    placeholder="Optional notes for this slot"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-50"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  {editingSlotId ? (
                    <button
                      type="button"
                      onClick={onResetSlotForm}
                      className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
                    >
                      Cancel Edit
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSavingSlot}
                    className="flex-1 rounded-2xl bg-orange-600 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isSavingSlot
                      ? editingSlotId
                        ? 'Updating...'
                        : 'Adding...'
                      : editingSlotId
                        ? 'Update Slot'
                        : 'Add Slot'}
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4 text-sm text-orange-800">
              Slot codes should be unique per parking area. Example format: A1, A2, B1.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

type DeleteUnitDialogProps = {
  unit: UnitRecord | null;
  slotCount: number;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const DeleteUnitDialog = React.memo(function DeleteUnitDialog({
  unit,
  slotCount,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteUnitDialogProps) {
  if (!unit) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/60 p-0 bg-slate-900/50 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-unit-title"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-slate-200/60 bg-white shadow-xl sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 bg-gradient-to-br from-red-50 via-white to-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-red-100 p-3 text-red-600">
                <AlertTriangle className="size-5" />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-500">
                  Delete Unit
                </p>
                <h2 id="delete-unit-title" className="mt-2 text-xl font-bold text-slate-900">
                  Are you sure?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  This will permanently remove the selected unit from the system.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Close delete panel"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900">{unit.name}</h3>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <UnitTypeDisplay type={unit.type} />

                  {unit.propertyId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                      <Hash className="size-3" />
                      {unit.propertyId}
                    </span>
                  ) : null}
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  unit.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {unit.available ? 'AVAILABLE' : 'UNAVAILABLE'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Location
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">{unit.location || '—'}</p>
              </div>

              <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Price
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {formatCurrency(unit.price)}
                </p>
              </div>

              {unit.type === 'function_hall' && unit.capacity ? (
                <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Capacity
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {unit.capacity} guests
                  </p>
                </div>
              ) : null}

              {unit.type === 'parking_slot' ? (
                <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Parking Slots
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{slotCount} slot(s)</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm leading-relaxed text-red-700">
              This action cannot be undone. Any records that still depend on this unit may be
              affected.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Delete Unit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

type DeleteSlotDialogProps = {
  slot: ParkingSlotRecord | null;
  isDeletingSlot: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const DeleteSlotDialog = React.memo(function DeleteSlotDialog({
  slot,
  isDeletingSlot,
  onClose,
  onConfirm,
}: DeleteSlotDialogProps) {
  if (!slot) return null;

  return (
    <div
      className="fixed inset-0 z-[115] flex items-end justify-center bg-slate-900/60 p-0 bg-slate-900/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-slate-200/60 bg-white shadow-xl sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 bg-gradient-to-br from-red-50 via-white to-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-red-100 p-3 text-red-600">
                <AlertTriangle className="size-5" />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-500">
                  Delete Parking Slot
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">Remove this slot?</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  This will permanently remove the physical parking space record.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeletingSlot}
              className="rounded-xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">
              {slot.slotCode}
              {slot.label ? ` • ${slot.label}` : ''}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${SLOT_STATUS_STYLES[slot.status].chip}`}
              >
                {SLOT_STATUS_STYLES[slot.status].icon}
                {SLOT_STATUS_STYLES[slot.status].label}
              </span>

              {slot.vehicleType ? (
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                  {slot.vehicleType}
                </span>
              ) : null}

              {slot.isOccupied && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  This parking slot is currently occupied and cannot be deleted.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeletingSlot}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeletingSlot || slot.isOccupied}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                slot.isOccupied
                  ? 'bg-gray-200 text-gray-400'
                  : 'bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700'
              }`}
            >
              {slot.isOccupied
                ? 'Occupied Slot'
                : isDeletingSlot
                  ? 'Deleting...'
                  : 'Delete Slot'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

const ImageLightbox = React.memo(function ImageLightbox({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 bg-slate-900/50"
      style={{ zIndex: 2147483647 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-[2147483648] rounded-full bg-white bg-opacity-90 p-2 shadow-md transition-colors hover:bg-opacity-100"
        aria-label="Close image"
      >
        <X className="size-5 text-gray-800" />
      </button>

      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt="Enlarged preview"
          className="max-h-[85vh] max-w-[95vw] rounded-lg border border-white/10 object-contain shadow-xl"
          decoding="async"
        />
      </div>
    </div>
  );
});

export default function AdminUnitManagement() {
  const {
    units,
    loadingUnits,
    addUnit,
    updateUnit,
    deleteUnit,
    uploadUnitImage,
    uploadUnitVideo,
    uploadUnitContract,
    locationOptions,
    defaultLocation,
    parkingSlots = [],
    getParkingSlotsByUnit,
    addParkingSlot,
    updateParkingSlot,
    deleteParkingSlot,
    parkingSlotLimit,
    usedParkingSlots,
    remainingParkingSlots,
    updateParkingSlotLimit,
  } = useUnits();

  const [slotError, setSlotError] = useState<string | null>(null);

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [unitToDelete, setUnitToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [notice, setNotice] = useState<{
  message: string;
  variant?: 'error' | 'warning' | 'success' | 'info';
} | null>(null);
  

  const [showSlotManager, setShowSlotManager] = useState(false);
  const [selectedParkingUnitId, setSelectedParkingUnitId] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState(INITIAL_SLOT_FORM);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<string | null>(null);
  const [isDeletingSlot, setIsDeletingSlot] = useState(false);
  const [slotImagePreview, setSlotImagePreview] = useState<string>('');
  const slotFileInputRef = useRef<HTMLInputElement | null>(null);


type TaxonomyOption = {
  option_id: string;
  option_type: 'category' | 'subtype';
  value: string;
  label: string;
  parent_category: string | null;
  is_active: boolean;
  sort_order: number;
};

const [taxonomyOptions, setTaxonomyOptions] = useState<TaxonomyOption[]>([]);
const [taxonomyLoading, setTaxonomyLoading] = useState(false);
const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
const [showTaxonomyManager, setShowTaxonomyManager] = useState(false);
const [editingTaxonomy, setEditingTaxonomy] = useState<TaxonomyOption | null>(null);
const [taxonomyLabel, setTaxonomyLabel] = useState('');
const [taxonomyParent, setTaxonomyParent] = useState('');
const [taxonomySortOrder, setTaxonomySortOrder] = useState('0');
const [isSavingTaxonomy, setIsSavingTaxonomy] = useState(false);
const [isUpdatingParkingLimit, setIsUpdatingParkingLimit] = useState(false);

  

  const [searchTerm, setSearchTerm] = useState('');
const [typeFilter, setTypeFilter] = useState<'all' | UnitType>('all');
const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
const [showMobileFilters, setShowMobileFilters] = useState(false);  
  const selectedUnitToDelete = useMemo(
    () => units.find((unit) => unit.id === unitToDelete) ?? null,
    [units, unitToDelete]
  );

  const editingUnit = useMemo(
    () => units.find((unit) => unit.id === editingUnitId) ?? null,
    [units, editingUnitId]
  );

  const selectedParkingUnit = useMemo(
    () => units.find((unit) => unit.id === selectedParkingUnitId) ?? null,
    [units, selectedParkingUnitId]
  );

  const selectedParkingUnitSlots = useMemo<ParkingSlotRecord[]>(() => {
    if (!selectedParkingUnitId) return [];
    if (typeof getParkingSlotsByUnit === 'function') {
      return getParkingSlotsByUnit(selectedParkingUnitId) ?? [];
    }
    return (parkingSlots ?? []).filter(
      (slot: ParkingSlotRecord) => slot.unitId === selectedParkingUnitId
    );
  }, [selectedParkingUnitId, getParkingSlotsByUnit, parkingSlots]);

  const selectedSlotToDelete = useMemo(
    () => selectedParkingUnitSlots.find((slot) => slot.id === slotToDelete) ?? null,
    [selectedParkingUnitSlots, slotToDelete]
  );

  const slotStatsByUnit = useMemo(() => {
    const stats = new Map<string, { total: number; active: number }>();

    for (const slot of parkingSlots as ParkingSlotRecord[]) {
      const current = stats.get(slot.unitId) ?? { total: 0, active: 0 };
      current.total += 1;

      if (slot.status === 'active' && !slot.isOccupied) {
        current.active += 1;
      }

      stats.set(slot.unitId, current);
    }

    return stats;
  }, [parkingSlots]);

  const filteredUnits = useMemo(() => {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return units.filter((unit) => {
    const matchesSearch =
      normalizedSearch === '' ||
      unit.name.toLowerCase().includes(normalizedSearch) ||
      (unit.propertyId ?? '').toLowerCase().includes(normalizedSearch) ||
      (unit.location ?? '').toLowerCase().includes(normalizedSearch);

    const matchesType =
      typeFilter === 'all' || unit.type === typeFilter;

    const matchesAvailability =
      availabilityFilter === 'all' ||
      (availabilityFilter === 'available' && unit.available) ||
      (availabilityFilter === 'unavailable' && !unit.available);

    return matchesSearch && matchesType && matchesAvailability;
  });
}, [units, searchTerm, typeFilter, availabilityFilter]);
  const openAddModal = useCallback(() => {
    setEditingUnitId(null);
    setShowUnitModal(true);
  }, []);

  const handleEdit = useCallback((unitId: string) => {
    setEditingUnitId(unitId);
    setShowUnitModal(true);
  }, []);


  const closeUnitModal = useCallback(() => {
    setShowUnitModal(false);
    setEditingUnitId(null);
  }, []);

  const loadTaxonomyOptions = useCallback(async () => {
  try {
    setTaxonomyLoading(true);
    setTaxonomyError(null);

    const { data, error } = await supabase
      .from('unit_taxonomy_options')
      .select('*')
      .order('option_type', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (error) throw error;

    setTaxonomyOptions((data ?? []) as TaxonomyOption[]);
  } catch (error: any) {
    setTaxonomyError(
      error?.message || 'Failed to load taxonomy options.'
    );
  } finally {
    setTaxonomyLoading(false);
  }
}, []);

useEffect(() => {
  loadTaxonomyOptions();
}, [loadTaxonomyOptions]);

  const handleSaveUnit = useCallback(
    async ({
      unitId,
      data,
    }: {
      unitId?: string;
      data: {
        name: string;
        type: UnitType;
        description: string;
        price: number;
        imagePaths: string[];
        policies: string;
        capacity?: number;
        available: boolean;
        features: string[];
        propertyId: string;
        location: string;
        minimumPaymentPercent?: number | null;
        contractFilePath?: string | null;
        contractFileName?: string | null;
      };
    }) => {
      if (unitId) {
        await updateUnit(unitId, data);
      } else {
        await addUnit(data);
      }
    },
    [addUnit, updateUnit]
  );

  const handleDelete = useCallback((unitId: string) => {
    setUnitToDelete(unitId);
  }, []);

  const handleUpdateParkingSlotLimit = useCallback(
  async (nextLimit: number) => {
    try {
      setIsUpdatingParkingLimit(true);

      await updateParkingSlotLimit(nextLimit);

      setNotice({
        variant: 'success',
        message: `Global parking slot limit updated to ${nextLimit}.`,
      });
    } catch (error: any) {
      setNotice({
        variant: 'error',
        message:
          error?.message || 'Failed to update parking slot limit.',
      });
    } finally {
      setIsUpdatingParkingLimit(false);
    }
  },
  [updateParkingSlotLimit]
);

  const closeDeletePanel = useCallback(() => {
    if (isDeleting) return;
    setUnitToDelete(null);
  }, [isDeleting]);

const confirmDelete = useCallback(async () => {
  if (!unitToDelete || isDeleting) return;

  setIsDeleting(true);

  try {
    await deleteUnit(unitToDelete);

    setNotice({
      message: 'Unit deleted successfully.',
      variant: 'success',
    });

    setUnitToDelete(null);
  } catch (error) {
    setNotice({
      message:
        error instanceof Error
          ? error.message
          : 'Failed to delete unit. Please try again.',
      variant: 'error',
    });
  } finally {
    setIsDeleting(false);
  }
}, [deleteUnit, isDeleting, unitToDelete]);

  const resetSlotForm = useCallback(() => {
    if (slotImagePreview.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(slotImagePreview);
      } catch {
        // ignore
      }
    }

    setSlotImagePreview('');
    setSlotForm(INITIAL_SLOT_FORM);
    setEditingSlotId(null);
    setIsSavingSlot(false);

    if (slotFileInputRef.current) {
      slotFileInputRef.current.value = '';
    }
  }, [slotImagePreview]);

  const openSlotManager = useCallback(
    (unitId: string) => {
      const unit = units.find((u) => u.id === unitId);
      if (!unit || unit.type !== 'parking_slot') return;

      setSelectedParkingUnitId(unitId);
      resetSlotForm();
      setSlotToDelete(null);
      setShowSlotManager(true);
    },
    [units, resetSlotForm]
  );

  const closeSlotManager = useCallback(() => {
    if (isSavingSlot || isDeletingSlot) return;
    resetSlotForm();
    setSlotToDelete(null);
    setSelectedParkingUnitId(null);
    setShowSlotManager(false);
  }, [isSavingSlot, isDeletingSlot, resetSlotForm]);

 const updateSlotFormField = useCallback(
  <K extends keyof typeof INITIAL_SLOT_FORM>(
    key: K,
    value: (typeof INITIAL_SLOT_FORM)[K]
  ) => {
    let nextValue = value;

    if (typeof nextValue === 'string') {
      const limitMap: Partial<Record<keyof typeof INITIAL_SLOT_FORM, number>> = {
        slotCode: INPUT_LIMITS.slotCode,
        label: INPUT_LIMITS.slotLabel,
        vehicleType: INPUT_LIMITS.slotVehicleType,
        notes: INPUT_LIMITS.slotNotes,
      };

      const max = limitMap[key];
      if (max) {
        nextValue = nextValue.slice(0, max) as (typeof INITIAL_SLOT_FORM)[K];
      }
    }

    setSlotForm((prev) => ({ ...prev, [key]: nextValue }));
    setSlotError(null);
  },
  []
);

const openEditTaxonomy = useCallback((item: TaxonomyOption) => {
  setEditingTaxonomy(item);
  setTaxonomyLabel(item.label);
  setTaxonomyParent(item.parent_category ?? '');
  setTaxonomySortOrder(String(item.sort_order ?? 0));
}, []);

const closeTaxonomyManager = useCallback(() => {
  if (isSavingTaxonomy) return;

  setShowTaxonomyManager(false);
  setEditingTaxonomy(null);
  setTaxonomyLabel('');
  setTaxonomyParent('');
  setTaxonomySortOrder('0');
}, [isSavingTaxonomy]);

const cancelEditTaxonomy = useCallback(() => {
  if (isSavingTaxonomy) return;

  setEditingTaxonomy(null);
  setTaxonomyLabel('');
  setTaxonomyParent('');
  setTaxonomySortOrder('0');
}, [isSavingTaxonomy]);

const saveTaxonomyChanges = useCallback(async () => {
  if (!editingTaxonomy) return;

  try {
    setIsSavingTaxonomy(true);
    setTaxonomyError(null);

    const payload: any = {
      label: taxonomyLabel.trim(),
      sort_order: Number.parseInt(taxonomySortOrder, 10) || 0,
    };

    if (editingTaxonomy.option_type === 'subtype') {
      payload.parent_category = taxonomyParent || null;
    }

    const { error } = await supabase
      .from('unit_taxonomy_options')
      .update(payload)
      .eq('option_id', editingTaxonomy.option_id);

    if (error) throw error;

    await loadTaxonomyOptions();

    setEditingTaxonomy(null);
  } catch (error: any) {
    setTaxonomyError(
      error?.message || 'Failed to save changes.'
    );
  } finally {
    setIsSavingTaxonomy(false);
  }
}, [
  editingTaxonomy,
  taxonomyLabel,
  taxonomyParent,
  taxonomySortOrder,
  loadTaxonomyOptions,
]);

const toggleTaxonomyStatus = useCallback(
  async (item: TaxonomyOption) => {
    try {
      const { error } = await supabase
        .from('unit_taxonomy_options')
        .update({
          is_active: !item.is_active,
        })
        .eq('option_id', item.option_id);

      if (error) throw error;

      await loadTaxonomyOptions();
    } catch (error: any) {
      setTaxonomyError(
        error?.message || 'Failed to update status.'
      );
    }
  },
  [loadTaxonomyOptions]
);

  const handleSlotImageSelected = useCallback(
    async (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (!file) return;

      try {
        const previewUrl = URL.createObjectURL(file);
        const uploadedPath = await uploadUnitImage(file);

        if (!uploadedPath) {
          URL.revokeObjectURL(previewUrl);
          return;
        }

        setSlotImagePreview((prev) => {
          if (prev.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(prev);
            } catch {
              // ignore
            }
          }
          return previewUrl;
        });

        setSlotForm((prev) => ({
          ...prev,
          imagePath: uploadedPath,
        }));
      } catch (error) {
        console.error('Failed to upload slot image:', error);
        setSlotError('Slot image upload failed. Please try again.');
      }
    },
    [uploadUnitImage]
  );

  const handleEditSlot = useCallback(
    (slotId: string) => {
      const slot = selectedParkingUnitSlots.find((item) => item.id === slotId);
      if (!slot) return;

      if (slot.isOccupied) {
        setSlotError('Cannot edit an occupied parking slot.');
        return;
      }

      setSlotImagePreview(slot.imagePath ? getPublicImageUrl(slot.imagePath) : '');
      setSlotForm({
        slotCode: slot.slotCode ?? '',
        label: slot.label ?? '',
        status: slot.status ?? 'active',
        vehicleType: slot.vehicleType ?? '',
        imagePath: slot.imagePath ?? '',
        notes: slot.notes ?? '',
      });
      setEditingSlotId(slotId);
    },
    [selectedParkingUnitSlots]
  );

  const handleSaveSlot = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedParkingUnitId || isSavingSlot) return;

      const payload = {
        unitId: selectedParkingUnitId,
        slotCode: slotForm.slotCode.trim().toUpperCase(),
        label: slotForm.label.trim(),
        status: slotForm.status,
        vehicleType: slotForm.vehicleType.trim(),
        imagePath: slotForm.imagePath.trim(),
        notes: slotForm.notes.trim(),
      };

      if (!payload.slotCode) return;

      setIsSavingSlot(true);

      try {
        if (editingSlotId) {
          await updateParkingSlot(editingSlotId, payload);
        } else {
          await addParkingSlot(payload);
        }
        resetSlotForm();
      } catch (error) {
        console.error('Failed to save parking slot:', error);
        setIsSavingSlot(false);
      }
    },
    [
      selectedParkingUnitId,
      isSavingSlot,
      slotForm,
      editingSlotId,
      updateParkingSlot,
      addParkingSlot,
      resetSlotForm,
    ]
  );

  const handleDeleteSlot = useCallback((slotId: string) => {
    setSlotToDelete(slotId);
  }, []);

  const closeDeleteSlotDialog = useCallback(() => {
    if (!isDeletingSlot) setSlotToDelete(null);
  }, [isDeletingSlot]);

  const confirmDeleteSlot = useCallback(async () => {
    if (!slotToDelete || isDeletingSlot) return;

    const targetSlot = selectedParkingUnitSlots.find((slot) => slot.id === slotToDelete);
    if (targetSlot?.isOccupied) {
      setSlotError('Cannot delete an occupied parking slot.');
      return;
    }

    setIsDeletingSlot(true);

    try {
      await deleteParkingSlot(slotToDelete);
      setSlotToDelete(null);
      if (editingSlotId === slotToDelete) {
        resetSlotForm();
      }
    } catch (error) {
      console.error('Failed to delete parking slot:', error);
    } finally {
      setIsDeletingSlot(false);
    }
  }, [
    slotToDelete,
    isDeletingSlot,
    deleteParkingSlot,
    editingSlotId,
    resetSlotForm,
    selectedParkingUnitSlots,
  ]);

  const openLightbox = useCallback((src: string) => setLightboxImage(src), []);
  const closeLightbox = useCallback(() => setLightboxImage(null), []);

  if (showUnitModal && loadingUnits) return null;

  

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {notice && (
          <AppNotice
            message={notice.message}
            variant={notice.variant}
            onClose={() => setNotice(null)}
            autoHideMs={4000}
          />
        )}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Unit Management</h1>
            <p className="text-sm text-gray-500">
              Manage all your rentable units and parking areas.
            </p>
          </div>

          {!loadingUnits && (
            <div className="hidden items-center gap-3 lg:flex">
              <button
                onClick={openAddModal}
                className="cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all active:scale-95 hover:bg-blue-700 lg:flex"
              >
                <Plus className="size-5" />
                Add Unit
              </button>

              <button
                type="button"
                onClick={() => setShowTaxonomyManager(true)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
              >
                Manage Categories
              </button>
            </div>
          )}
        </div>

        {!loadingUnits && (
          <button
            onClick={openAddModal}
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-transform active:scale-90 md:hidden"
            aria-label="Add Unit"
          >
            <Plus className="size-8" />
          </button>
        )}

        {!loadingUnits && units.length > 0 && (
  <AdminFilterBar
    searchTerm={searchTerm}
    onSearchChange={setSearchTerm}
    placeholder="Search by unit name, public ID, or location..."
    showMobileFilters={showMobileFilters}
    onToggleMobileFilters={() => setShowMobileFilters((prev) => !prev)}
    actions={
      <div className="hidden lg:flex lg:items-center lg:gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | UnitType)}
          className={FILTER_SELECT_CLASS}
        >
          <option value="all">All Types</option>
          <option value="rental_space">Rental Space</option>
          <option value="function_hall">Function Hall</option>
          <option value="parking_slot">Parking Area</option>
        </select>

        <select
          value={availabilityFilter}
          onChange={(e) =>
            setAvailabilityFilter(
              e.target.value as 'all' | 'available' | 'unavailable'
            )
          }
          className={FILTER_SELECT_CLASS}
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>

        {(searchTerm.trim() || typeFilter !== 'all' || availabilityFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('all');
              setAvailabilityFilter('all');
              setShowMobileFilters(false);
            }}
            className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>
    }
    filters={
  <div className="grid grid-cols-1 gap-2 lg:hidden">
    <select
      value={typeFilter}
      onChange={(e) => setTypeFilter(e.target.value as 'all' | UnitType)}
      className={FILTER_SELECT_CLASS}
    >
      <option value="all">All Types</option>
      <option value="rental_space">Rental Space</option>
      <option value="function_hall">Function Hall</option>
      <option value="parking_slot">Parking Area</option>
    </select>

    <select
      value={availabilityFilter}
      onChange={(e) =>
        setAvailabilityFilter(
          e.target.value as 'all' | 'available' | 'unavailable'
        )
      }
      className={FILTER_SELECT_CLASS}
    >
      <option value="all">All Status</option>
      <option value="available">Available</option>
      <option value="unavailable">Unavailable</option>
    </select>

    {(searchTerm.trim() || typeFilter !== 'all' || availabilityFilter !== 'all') && (
      <button
        type="button"
        onClick={() => {
          setSearchTerm('');
          setTypeFilter('all');
          setAvailabilityFilter('all');
          setShowMobileFilters(false);
        }}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
      >
        Clear
      </button>
    )}
  </div>
}
  />
)}

        <div className="flex-1">
          {loadingUnits ? (
            <EmptyState
              icon={
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                </div>
              }
              title="Loading units..."
              description="Please wait while unit records are being retrieved."
            />
          ) : units.length === 0 ? (
            <EmptyState
              icon={<Building2 className="size-10 text-blue-500" />}
              title="No units yet"
              description="Units will appear here once an administrator adds rentable spaces, halls, or parking areas."
            />
          ) : (
            filteredUnits.length === 0 ? (
  <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 shadow-sm">
    <EmptyState
      icon={<AlertTriangle className="size-10 text-amber-500" />}
      title="No matching units found"
      description="Try adjusting your search, type, or availability filter."
    />
  </div>
) : (
  <UnitsList
  units={filteredUnits}
  slotStatsByUnit={slotStatsByUnit}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onManageSlots={openSlotManager}
  loading={loadingUnits}
  hasNoProperties={!loadingUnits && units.length === 0}
  hasNoSearchResults={!loadingUnits && units.length > 0 && filteredUnits.length === 0}
/>
)
          )}
        </div>

        <UnitFormModal
          open={showUnitModal}
          editingUnit={editingUnit}
          defaultLocation={defaultLocation}
          locationOptions={locationOptions}
          onClose={closeUnitModal}
          onSave={handleSaveUnit}
          uploadUnitImage={uploadUnitImage}
          uploadUnitVideo={uploadUnitVideo}
          uploadUnitContract={uploadUnitContract}
          onOpenLightbox={openLightbox}
        />

        <SlotManagerModal
          open={showSlotManager}
          selectedParkingUnit={selectedParkingUnit}
          selectedParkingUnitSlots={selectedParkingUnitSlots}
          editingSlotId={editingSlotId}
          slotForm={slotForm}
          slotImagePreview={slotImagePreview}
          isSavingSlot={isSavingSlot}
          onClose={closeSlotManager}
          onEditSlot={handleEditSlot}
          onDeleteSlot={handleDeleteSlot}
          onSaveSlot={handleSaveSlot}
          onSlotFieldChange={updateSlotFormField}
          onSlotImageSelected={handleSlotImageSelected}
          onResetSlotForm={resetSlotForm}
          setSlotImagePreview={setSlotImagePreview}
          setSlotForm={setSlotForm}
          slotFileInputRef={slotFileInputRef}
          slotError={slotError}
          parkingSlotLimit={parkingSlotLimit}
          usedParkingSlots={usedParkingSlots}
          remainingParkingSlots={remainingParkingSlots}
          isUpdatingParkingLimit={isUpdatingParkingLimit}
          onUpdateParkingSlotLimit={handleUpdateParkingSlotLimit}
        />

        <TaxonomyManagerModal
          open={showTaxonomyManager}
          taxonomyOptions={taxonomyOptions}
          taxonomyLoading={taxonomyLoading}
          taxonomyError={taxonomyError}
          editingTaxonomy={editingTaxonomy}
          taxonomyLabel={taxonomyLabel}
          taxonomyParent={taxonomyParent}
          taxonomySortOrder={taxonomySortOrder}
          isSavingTaxonomy={isSavingTaxonomy}
          onClose={closeTaxonomyManager}
          onEdit={openEditTaxonomy}
          onLabelChange={setTaxonomyLabel}
          onParentChange={setTaxonomyParent}
          onSortOrderChange={setTaxonomySortOrder}
          onSave={saveTaxonomyChanges}
          onCancelEdit={cancelEditTaxonomy}
          onToggleStatus={toggleTaxonomyStatus}
        />

        <DeleteUnitDialog
          unit={selectedUnitToDelete}
          slotCount={selectedUnitToDelete ? (slotStatsByUnit.get(selectedUnitToDelete.id)?.total ?? 0) : 0}
          isDeleting={isDeleting}
          onClose={closeDeletePanel}
          onConfirm={confirmDelete}
        />

        <DeleteSlotDialog
          slot={selectedSlotToDelete}
          isDeletingSlot={isDeletingSlot}
          onClose={closeDeleteSlotDialog}
          onConfirm={confirmDeleteSlot}
        />

        <ImageLightbox src={lightboxImage} onClose={closeLightbox} />
      </div>
    </div>
  );
}