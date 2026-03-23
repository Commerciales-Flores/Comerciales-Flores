import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import type { JSX } from 'react';
import { useUnits } from '../../contexts/UnitsContext';
import type { UnitType } from '../../data/types';
import supabase from '../../supabaseClient';
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
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/date';


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

const INITIAL_FORM_STATE = {
  name: '',
  type: '' as UnitType | '',
  description: '',
  price: '',
  images: '',
  policies: '',
  capacity: '',
  available: true,
  features: '',
  propertyId: '',
  location: '',
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
  description: string;
  price: number;
  imagePaths?: string[];
  images?: string[];
  policies: string;
  capacity?: number | null;
  available: boolean;
  features: string[];
  propertyId?: string | null;
  location?: string | null;
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

  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }

  let normalizedPath = path.trim();

  if (normalizedPath.startsWith('property_images/')) {
    normalizedPath = normalizedPath.replace(/^property_images\//, '');
  }

  const { data } = supabase.storage.from('property_images').getPublicUrl(normalizedPath);
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

      <p className="ml-1 text-[11px] text-slate-400">Select one or more images.</p>
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
      description: string;
      price: number;
      imagePaths: string[];
      policies: string;
      capacity?: number;
      available: boolean;
      features: string[];
      propertyId: string;
      location: string;
    };
  }) => Promise<void>;
  uploadUnitImage: (file: File) => Promise<string | null | undefined>;
  onOpenLightbox: (src: string) => void;
};

const UnitFormModal = React.memo(function UnitFormModal({
  open,
  editingUnit,
  defaultLocation,
  locationOptions,
  onClose,
  onSave,
  uploadUnitImage,
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

  const previewsRef = useRef<ImagePreviewItem[]>([]);

  useEffect(() => {
    previewsRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    if (!open) return;

    revokePreviewUrls(previewsRef.current);

    if (editingUnit) {
      const existingPaths =
        Array.isArray(editingUnit.imagePaths) && editingUnit.imagePaths.length
          ? editingUnit.imagePaths
          : Array.isArray(editingUnit.images)
            ? editingUnit.images
            : [];

      setImagePreviews(
        existingPaths.map((path, index) => ({
          id: `${path}-${index}`,
          path,
          previewUrl: getPublicImageUrl(path),
        }))
      );

      setUnitForm({
        name: editingUnit.name,
        type: editingUnit.type,
        description: editingUnit.description,
        price: editingUnit.price.toString(),
        images: existingPaths.join(', '),
        policies: editingUnit.policies,
        capacity:
          editingUnit.type === 'function_hall' ? editingUnit.capacity?.toString() || '' : '',
        available: editingUnit.available,
        features: editingUnit.features.join(', '),
        propertyId: editingUnit.propertyId || '',
        location: editingUnit.location || defaultLocation,
      });
    } else {
      setImagePreviews([]);
      setUnitForm({
        ...INITIAL_FORM_STATE,
        location: defaultLocation,
      });
    }

    setIsSubmitting(false);
    setIsUploadingImages(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [open, editingUnit, defaultLocation]);

  useEffect(() => {
    if (!open) return;

    return () => {
      revokePreviewUrls(previewsRef.current);
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

  const updateFormField = useCallback(
    <K extends keyof typeof INITIAL_FORM_STATE>(key: K, value: (typeof INITIAL_FORM_STATE)[K]) => {
      setUnitForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

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

  const handleFilesSelected = useCallback(
    async (filesList: FileList | null) => {
      const files = Array.from(filesList || []);
      if (!files.length) return;

      setIsUploadingImages(true);

      try {
        const uploadResults = await Promise.all(
          files.map(async (file) => {
            const previewUrl = URL.createObjectURL(file);
            const uploadedPath = await uploadUnitImage(file);

            if (!uploadedPath) {
              URL.revokeObjectURL(previewUrl);
              return null;
            }

            return {
              path: uploadedPath,
              previewUrl,
            };
          })
        );

        const validResults = uploadResults.filter(Boolean) as {
          path: string;
          previewUrl: string;
        }[];

        if (!validResults.length) return;

        setImagePreviews((prev) => [
          ...prev,
          ...validResults.map((item) => ({
            id: `${item.path}-${crypto.randomUUID()}`,
            path: item.path,
            previewUrl: item.previewUrl,
          })),
        ]);

        setUnitForm((prev) => {
          const existing = parseCommaSeparated(prev.images);
          return {
            ...prev,
            images: [...existing, ...validResults.map((r) => r.path)].join(', '),
          };
        });
      } catch (err) {
        console.error('Image upload failed', err);
        alert('Image upload failed. See console for details.');
      } finally {
        setIsUploadingImages(false);
      }
    },
    [uploadUnitImage]
  );

  const handleClose = useCallback(() => {
    if (isSubmitting || isUploadingImages) return;
    onClose();
  }, [isSubmitting, isUploadingImages, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting || !unitForm.type || isUploadingImages) return;

      setIsSubmitting(true);

      try {
        const parsedPrice = Number(unitForm.price);
        const parsedCapacity =
          unitForm.type === 'function_hall' && unitForm.capacity
            ? parseInt(unitForm.capacity, 10)
            : undefined;

        await onSave({
          unitId: editingUnit?.id,
          data: {
            name: unitForm.name.trim(),
            type: unitForm.type,
            description: unitForm.description.trim(),
            price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
            imagePaths: parseCommaSeparated(unitForm.images),
            policies: unitForm.policies.trim(),
            capacity: parsedCapacity,
            available: unitForm.available,
            features: parseCommaSeparated(unitForm.features),
            propertyId: unitForm.propertyId,
            location: unitForm.location || defaultLocation,
          },
        });

        onClose();
      } catch (error) {
        console.error('Failed to save unit:', error);
        setIsSubmitting(false);
      }
    },
    [isSubmitting, unitForm, isUploadingImages, onSave, editingUnit?.id, defaultLocation, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 p-0 bg-slate-900/50 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-slate-200/60 bg-white shadow-xl sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between bg-slate-900 p-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {editingUnit ? 'Edit Unit' : 'Add New Unit'}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {editingUnit
                ? 'Update the selected unit details for Comerciales Flores'
                : 'Create a new rentable unit profile for Comerciales Flores'}
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
                type="number"
                required
                min="0"
                step="0.01"
                value={unitForm.price}
                onChange={(e) => updateFormField('price', e.target.value)}
                placeholder="e.g. 25000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
              <p className="ml-1 text-[11px] text-slate-400">
                {unitForm.type === 'rental_space' && 'Monthly Rate'}
                {unitForm.type === 'function_hall' && 'Daily Rate'}
                {unitForm.type === 'parking_slot' && 'Parking Area Rate (Monthly)'}
                {unitForm.type === '' && 'Rate depends on unit type'}
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
                  placeholder="Optional"
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
              htmlFor="features"
              className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              Features
            </label>
            <input
              id="features"
              type="text"
              placeholder="WiFi, Aircon, Parking, Stage"
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
              required
              rows={3}
              value={unitForm.policies}
              onChange={(e) => updateFormField('policies', e.target.value)}
              placeholder="Enter terms and policies..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
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
  );
});

type UnitListProps = {
  units: UnitRecord[];
  slotStatsByUnit: Map<string, { total: number; active: number }>;
  onEdit: (unitId: string) => void;
  onDelete: (unitId: string) => void;
  onManageSlots: (unitId: string) => void;
};

const UnitsList = React.memo(function UnitsList({
  units,
  slotStatsByUnit,
  onEdit,
  onDelete,
  onManageSlots,
}: UnitListProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Public ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {units.map((unit) => {
              const slotStats = slotStatsByUnit.get(unit.id) ?? { total: 0, active: 0 };

              return (
                <tr key={unit.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div>
                      <p>{unit.name}</p>

                      {unit.type === 'function_hall' && unit.capacity ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <Users className="size-3.5" />
                          Capacity: {unit.capacity}
                        </p>
                      ) : null}

                      {unit.type === 'parking_slot' ? (
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
                      ) : null}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    {unit.propertyId || '—'}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <UnitTypeDisplay type={unit.type} />
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-4 text-red-400" />
                      {unit.location || '—'}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(unit.price)}</td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        unit.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {unit.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-3">
                      {unit.type === 'parking_slot' && (
                        <button
                          onClick={() => onManageSlots(unit.id)}
                          className="rounded-lg p-2 text-orange-600 hover:bg-orange-50"
                          title="Manage Slots"
                        >
                          <Settings2 className="size-5" />
                        </button>
                      )}

                      <button
                        onClick={() => onEdit(unit.id)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="size-5" />
                      </button>

                      <button
                        onClick={() => onDelete(unit.id)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-gray-200 md:hidden">
        {units.map((unit) => {
          const slotStats = slotStatsByUnit.get(unit.id) ?? { total: 0, active: 0 };

          return (
            <div key={unit.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{unit.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <UnitTypeDisplay type={unit.type} />
                    {unit.propertyId ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                        <Hash className="size-3" />
                        {unit.propertyId}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-1">
                  {unit.type === 'parking_slot' && (
                    <button
                      onClick={() => onManageSlots(unit.id)}
                      className="rounded-full p-3 text-orange-600 active:bg-orange-50"
                    >
                      <Settings2 className="size-5" />
                    </button>
                  )}

                  <button
                    onClick={() => onEdit(unit.id)}
                    className="rounded-full p-3 text-blue-600 active:bg-blue-50"
                  >
                    <Edit className="size-5" />
                  </button>

                  <button
                    onClick={() => onDelete(unit.id)}
                    className="rounded-full p-3 text-red-600 active:bg-red-50"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-red-400" />
                  <span>{unit.location || '—'}</span>
                </div>

                {unit.type === 'function_hall' && unit.capacity ? (
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-gray-400" />
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

              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="font-medium text-gray-500">{formatCurrency(unit.price)}</span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                    unit.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {unit.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                </span>
              </div>
            </div>
          );
        })}
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
};

const SlotManagerModal = React.memo(function SlotManagerModal({
  open,
  selectedParkingUnit,
  selectedParkingUnitSlots,
  editingSlotId,
  slotForm,
  slotImagePreview,
  isSavingSlot,
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

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 sm:p-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Existing Slots</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedParkingUnitSlots.length} total slot(s)
                  </p>
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
    locationOptions,
    defaultLocation,
    parkingSlots = [],
    getParkingSlotsByUnit,
    addParkingSlot,
    updateParkingSlot,
    deleteParkingSlot,
  } = useUnits();

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [unitToDelete, setUnitToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showSlotManager, setShowSlotManager] = useState(false);
  const [selectedParkingUnitId, setSelectedParkingUnitId] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState(INITIAL_SLOT_FORM);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<string | null>(null);
  const [isDeletingSlot, setIsDeletingSlot] = useState(false);
  const [slotImagePreview, setSlotImagePreview] = useState<string>('');
  const slotFileInputRef = useRef<HTMLInputElement | null>(null);

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

  const closeDeletePanel = useCallback(() => {
    if (isDeleting) return;
    setUnitToDelete(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!unitToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      await deleteUnit(unitToDelete);
      setUnitToDelete(null);
    } catch (error) {
      console.error('Failed to delete unit:', error);
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
    <K extends keyof typeof INITIAL_SLOT_FORM>(key: K, value: (typeof INITIAL_SLOT_FORM)[K]) => {
      setSlotForm((prev) => ({ ...prev, [key]: value }));
    },
    []
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
        alert('Slot image upload failed. See console for details.');
      }
    },
    [uploadUnitImage]
  );

  const handleEditSlot = useCallback(
    (slotId: string) => {
      const slot = selectedParkingUnitSlots.find((item) => item.id === slotId);
      if (!slot) return;

      if (slot.isOccupied) {
        alert('Cannot edit an occupied parking slot.');
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
      alert('Cannot delete an occupied parking slot.');
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
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Unit Management</h1>
            <p className="text-sm text-gray-500">
              Manage all your rentable units and parking areas.
            </p>
          </div>

          {!loadingUnits && (
            <button
              onClick={openAddModal}
              className="hidden cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all active:scale-95 hover:bg-blue-700 lg:flex"
            >
              <Plus className="size-5" />
              Add Unit
            </button>
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
            <UnitsList
              units={units}
              slotStatsByUnit={slotStatsByUnit}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onManageSlots={openSlotManager}
            />
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