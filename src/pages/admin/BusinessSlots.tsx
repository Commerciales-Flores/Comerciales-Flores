import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
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


const UnitTypeDisplay = ({ type }: { type: UnitType }) => {
  const { icon, label, color } = UNIT_TYPE_MAP[type];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${color}`}>
      {icon}
      {label}
    </span>
  );
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

  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  let normalizedPath = path.trim();

  if (normalizedPath.startsWith('property_images/')) {
    normalizedPath = normalizedPath.replace(/^property_images\//, '');
  }

  const { data } = supabase.storage.from('property_images').getPublicUrl(normalizedPath);
  return data.publicUrl;
}

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

  const [imagePreviews, setImagePreviews] = useState<ImagePreviewItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [hoveredButtonIndex, setHoveredButtonIndex] = useState<number | null>(null);
  const [unitForm, setUnitForm] = useState({
    ...INITIAL_FORM_STATE,
    location: defaultLocation,
  });
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setUnitForm((prev) =>
      prev.location
        ? prev
        : {
            ...prev,
            location: defaultLocation,
          }
    );
  }, [defaultLocation]);

  useEffect(() => {
    if (unitForm.type !== 'function_hall' && unitForm.capacity !== '') {
      setUnitForm((prev) => ({
        ...prev,
        capacity: '',
      }));
    }
  }, [unitForm.type, unitForm.capacity]);

  const imagePreviewsRef = useRef<ImagePreviewItem[]>([]);

  useEffect(() => {
    imagePreviewsRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      revokePreviewUrls(imagePreviewsRef.current);
    };
  }, []);

  const parsedImages = useMemo(() => parseCommaSeparated(unitForm.images), [unitForm.images]);

  const selectedUnitToDelete = useMemo(
    () => units.find((unit) => unit.id === unitToDelete) ?? null,
    [units, unitToDelete]
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
    return (parkingSlots ?? []).filter((slot: ParkingSlotRecord) => slot.unitId === selectedParkingUnitId);
  }, [selectedParkingUnitId, getParkingSlotsByUnit, parkingSlots]);

  const selectedSlotToDelete = useMemo(
    () => selectedParkingUnitSlots.find((slot) => slot.id === slotToDelete) ?? null,
    [selectedParkingUnitSlots, slotToDelete]
  );

  const resetForm = useCallback(() => {
    revokePreviewUrls(imagePreviewsRef.current);

    setImagePreviews([]);
    setUnitForm({
      ...INITIAL_FORM_STATE,
      location: defaultLocation,
    });
    setEditingUnitId(null);
    setShowModal(false);
    setLightboxImage(null);
    setHoveredButtonIndex(null);
    setIsSubmitting(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [defaultLocation]);

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

  const closeSlotManager = useCallback(() => {
    if (isSavingSlot || isDeletingSlot) return;
    resetSlotForm();
    setSlotToDelete(null);
    setSelectedParkingUnitId(null);
    setShowSlotManager(false);
  }, [isSavingSlot, isDeletingSlot, resetSlotForm]);

  const updateFormField = useCallback(
    <K extends keyof typeof INITIAL_FORM_STATE>(key: K, value: (typeof INITIAL_FORM_STATE)[K]) => {
      setUnitForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateSlotFormField = useCallback(
    <K extends keyof typeof INITIAL_SLOT_FORM>(key: K, value: (typeof INITIAL_SLOT_FORM)[K]) => {
      setSlotForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting || !unitForm.type) return;

      setIsSubmitting(true);

      try {
        const parsedPrice = Number(unitForm.price);
        const parsedCapacity =
          unitForm.type === 'function_hall' && unitForm.capacity
            ? parseInt(unitForm.capacity, 10)
            : undefined;

        const unitData = {
          name: unitForm.name.trim(),
          type: unitForm.type,
          description: unitForm.description.trim(),
          price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
          imagePaths: parsedImages,
          policies: unitForm.policies.trim(),
          capacity: parsedCapacity,
          available: unitForm.available,
          features: parseCommaSeparated(unitForm.features),
          propertyId: unitForm.propertyId,
          location: unitForm.location || defaultLocation,
        };

        if (editingUnitId) {
          await updateUnit(editingUnitId, unitData);
        } else {
          await addUnit(unitData);
        }

        resetForm();
      } catch (error) {
        console.error('Failed to save unit:', error);
        setIsSubmitting(false);
      }
    },
    [editingUnitId, unitForm, parsedImages, addUnit, updateUnit, resetForm, isSubmitting, defaultLocation]
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

  const handleEdit = useCallback(
    (unitId: string) => {
      const unit = units.find((u) => u.id === unitId);
      if (!unit) return;

      revokePreviewUrls(imagePreviewsRef.current);

      const existingPaths = Array.isArray(unit.imagePaths) && unit.imagePaths.length
        ? unit.imagePaths
        : Array.isArray(unit.images)
          ? unit.images
          : [];

      setImagePreviews(
        existingPaths.map((path, index) => ({
          id: `${path}-${index}`,
          path,
          previewUrl: getPublicImageUrl(path),
        }))
      );

      setUnitForm({
        name: unit.name,
        type: unit.type,
        description: unit.description,
        price: unit.price.toString(),
        images: existingPaths.join(', '),
        policies: unit.policies,
        capacity: unit.type === 'function_hall' ? unit.capacity?.toString() || '' : '',
        available: unit.available,
        features: unit.features.join(', '),
        propertyId: unit.propertyId || '',
        location: unit.location || defaultLocation,
      });

      setEditingUnitId(unitId);
      setShowModal(true);
    },
    [units, defaultLocation]
  );

  const handleDelete = useCallback((unitId: string) => {
    setUnitToDelete(unitId);
  }, []);

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

  const handleEditSlot = useCallback(
    (slotId: string) => {
      const slot = selectedParkingUnitSlots.find((item) => item.id === slotId);
      if (!slot) return;

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

  const confirmDeleteSlot = useCallback(async () => {
    if (!slotToDelete || isDeletingSlot) return;

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
  }, [slotToDelete, isDeletingSlot, deleteParkingSlot, editingSlotId, resetSlotForm]);

  const handleFilesSelected = useCallback(
    async (filesList: FileList | null) => {
      const files = Array.from(filesList || []);
      if (!files.length) return;

      try {
        const newPreviewItems: ImagePreviewItem[] = [];
        const uploadedPaths: string[] = [];

        for (const file of files) {
          const previewUrl = URL.createObjectURL(file);
          const uploadedPath = await uploadUnitImage(file);

          if (uploadedPath) {
            uploadedPaths.push(uploadedPath);

            newPreviewItems.push({
              id: `${uploadedPath}-${crypto.randomUUID()}`,
              path: uploadedPath,
              previewUrl,
            });
          } else {
            URL.revokeObjectURL(previewUrl);
          }
        }

        if (!uploadedPaths.length) return;

        setImagePreviews((prev) => [...prev, ...newPreviewItems]);

        setUnitForm((prev) => {
          const existing = parseCommaSeparated(prev.images);
          return {
            ...prev,
            images: [...existing, ...uploadedPaths].join(', '),
          };
        });
      } catch (err) {
        console.error('Image upload failed', err);
        alert('Image upload failed. See console for details.');
      }
    },
    [uploadUnitImage]
  );

  const openLightbox = useCallback((src: string) => setLightboxImage(src), []);
  const closeLightbox = useCallback(() => setLightboxImage(null), []);

  const getUnitSlotCount = useCallback(
    (unitId: string) => {
      if (typeof getParkingSlotsByUnit === 'function') {
        return (getParkingSlotsByUnit(unitId) ?? []).length;
      }
      return (parkingSlots ?? []).filter((slot: ParkingSlotRecord) => slot.unitId === unitId).length;
    },
    [getParkingSlotsByUnit, parkingSlots]
  );

  const getUnitActiveSlotCount = useCallback(
    (unitId: string) => {
      const slots =
        typeof getParkingSlotsByUnit === 'function'
          ? getParkingSlotsByUnit(unitId) ?? []
          : (parkingSlots ?? []).filter((slot: ParkingSlotRecord) => slot.unitId === unitId);

      return slots.filter((slot: ParkingSlotRecord) => slot.status === 'active').length;
    },
    [getParkingSlotsByUnit, parkingSlots]
  );

  return (
    <div className="min-h-screen bg-gray-50">
  <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Unit Management</h1>
          <p className="text-sm text-gray-500">Manage all your rentable units and parking areas.</p>
        </div>

        {!loadingUnits && (
          <button
            onClick={() => setShowModal(true)}
            className="hidden lg:flex items-center justify-center cursor-pointer gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-100 transition-all text-sm font-bold active:scale-95"
                    >
           <Plus className="size-5" />
            Add Unit
          </button>
        )}
      </div>

      {!loadingUnits && (
        <button
          onClick={() => setShowModal(true)}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
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
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Public ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
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
                                {getUnitSlotCount(unit.id)} slot(s)
                              </span>
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="size-3.5" />
                                {getUnitActiveSlotCount(unit.id)} active
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-gray-700">
                        {unit.propertyId || '—'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <UnitTypeDisplay type={unit.type} />
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-4 text-red-400" />
                          {unit.location || '—'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(unit.price)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-bold ${
                            unit.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {unit.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-3">
                          {unit.type === 'parking_slot' && (
                            <button
                              onClick={() => openSlotManager(unit.id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                              title="Manage Slots"
                            >
                              <Settings2 className="size-5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleEdit(unit.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="size-5" />
                          </button>

                          <button
                            onClick={() => handleDelete(unit.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="size-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200">
              {units.map((unit) => (
                <div key={unit.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
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
                          onClick={() => openSlotManager(unit.id)}
                          className="p-3 text-orange-600 active:bg-orange-50 rounded-full"
                        >
                          <Settings2 className="size-5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleEdit(unit.id)}
                        className="p-3 text-blue-600 active:bg-blue-50 rounded-full"
                      >
                        <Edit className="size-5" />
                      </button>

                      <button
                        onClick={() => handleDelete(unit.id)}
                        className="p-3 text-red-600 active:bg-red-50 rounded-full"
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
                          {getUnitSlotCount(unit.id)} slot(s)
                        </span>
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="size-3.5" />
                          {getUnitActiveSlotCount(unit.id)} active
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex justify-between items-center text-sm border-t pt-3">
                    <span className="text-gray-500 font-medium">{formatCurrency(unit.price)}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        unit.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {unit.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 transition-all duration-300">
          <div className="bg-white w-full sm:max-w-4xl h-[92vh] sm:h-auto sm:max-h-[92vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200/60 animate-in fade-in zoom-in-95 slide-in-from-bottom duration-300 flex flex-col">
            <div className="bg-slate-900 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {editingUnitId ? 'Edit Unit' : 'Add New Unit'}
                </h2>
                <p className="text-slate-400 text-xs font-medium mt-1">
                  {editingUnitId
                    ? 'Update the selected unit details for Comerciales Flores'
                    : 'Create a new rentable unit profile for Comerciales Flores'}
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 pb-28 sm:pb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Unit Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={unitForm.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    placeholder="Enter unit name"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="type" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Unit Type
                  </label>
                  <select
                    id="type"
                    required
                    value={unitForm.type}
                    onChange={(e) => updateFormField('type', e.target.value as UnitType | '')}
                    disabled={Boolean(editingUnitId)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">Select a type</option>
                    <option value="rental_space">Rental Space (e.g., Office/Retail)</option>
                    <option value="function_hall">Function Hall (e.g., Event Venue)</option>
                    <option value="parking_slot">Parking Area (container for multiple slots)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="location" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Location
                  </label>
                  <select
                    id="location"
                    required
                    value={unitForm.location}
                    onChange={(e) => updateFormField('location', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                  >
                    <option value="">Select a location</option>
                    {locationOptions.map((loc: string) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 ml-1">
                    Choose the assigned branch/location for this unit.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="price" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Price
                  </label>
                  <input
                    id="price"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 25000"
                    value={unitForm.price}
                    onChange={(e) => updateFormField('price', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                  />
                  <p className="text-[11px] text-slate-400 ml-1">
                    {unitForm.type === 'rental_space' && 'Monthly Rate'}
                    {unitForm.type === 'function_hall' && 'Daily Rate'}
                    {unitForm.type === 'parking_slot' && 'Parking Area Rate'}
                    {unitForm.type === '' && 'Rate depends on unit type'}
                  </p>
                </div>

                {unitForm.type === 'function_hall' && (
                  <div className="space-y-1.5">
                    <label htmlFor="capacity" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      Capacity
                    </label>
                    <input
                      id="capacity"
                      type="number"
                      min="1"
                      placeholder="Optional"
                      value={unitForm.capacity}
                      onChange={(e) => updateFormField('capacity', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                    />
                    <p className="text-[11px] text-slate-400 ml-1">
                      Number of guests the function hall can accommodate.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Public ID
                  </label>
                  <div className="flex min-h-[50px] items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    {editingUnitId
                      ? unitForm.propertyId || 'Public ID unavailable'
                      : 'Automatically generated after unit creation'}
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Status
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-all">
                    <input
                      id="available"
                      type="checkbox"
                      checked={unitForm.available}
                      onChange={(e) => updateFormField('available', e.target.checked)}
                      className="size-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Available for reservation
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="description" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Description
                </label>
                <textarea
                  id="description"
                  required
                  rows={4}
                  value={unitForm.description}
                  onChange={(e) => updateFormField('description', e.target.value)}
                  placeholder="Describe the unit..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="images" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
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

                {imagePreviews.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 overflow-x-auto py-1">
                      {imagePreviews.map((item, i) => (
                        <div
                          key={item.id}
                          className="relative flex-shrink-0 w-[170px] h-[150px] rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden group shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(item.path);
                            }}
                            onMouseEnter={() => setHoveredButtonIndex(i)}
                            onMouseLeave={() => setHoveredButtonIndex(null)}
                            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full shadow-lg transition-all"
                            style={{
                              backgroundColor: hoveredButtonIndex === i ? '#ef4444' : 'white',
                              color: hoveredButtonIndex === i ? 'white' : '#475569',
                            }}
                            aria-label="Remove image"
                            title="Remove image"
                          >
                            <X className="size-4" />
                          </button>

                          <img
                            src={item.previewUrl}
                            alt={`preview-${i}`}
                            onClick={() => openLightbox(item.previewUrl)}
                            className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-all flex items-center justify-center"
                        title="Add more images"
                        aria-label="Add more images"
                      >
                        <Plus className="size-6" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 ml-1">
                      Uploaded images. Click a photo to preview it.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600"
                    >
                      <Plus className="size-5" />
                      <span className="text-sm font-semibold">Upload Images</span>
                    </button>
                    <p className="text-[11px] text-slate-400 ml-1">
                      Select one or more images.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="features" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Features
                </label>
                <input
                  id="features"
                  type="text"
                  placeholder="WiFi, Aircon, Parking, Stage"
                  value={unitForm.features}
                  onChange={(e) => updateFormField('features', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="policies" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Policies / Terms
                </label>
                <textarea
                  id="policies"
                  required
                  rows={3}
                  value={unitForm.policies}
                  onChange={(e) => updateFormField('policies', e.target.value)}
                  placeholder="Enter terms and policies..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium resize-none"
                />
              </div>

              {unitForm.type === 'parking_slot' && (
                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4 text-sm text-orange-800">
                  This parking area acts as the parent listing. After saving it, use{' '}
                  <span className="font-semibold">Manage Slots</span> to add the actual physical
                  parking spaces like A1, A2, or B1.
                </div>
              )}

              <div className="fixed bottom-0 left-0 right-0 sm:static bg-white/95 backdrop-blur border-t border-slate-200 sm:border-0 p-4 sm:p-0">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="hidden sm:block flex-1 py-4 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting
                      ? editingUnitId
                        ? 'Updating...'
                        : 'Adding...'
                      : editingUnitId
                        ? 'Update Unit'
                        : 'Add Unit'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSlotManager && selectedParkingUnit && (
        <div className="fixed inset-0 z-[105] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-5xl h-[92vh] sm:h-auto sm:max-h-[92vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200/60 flex flex-col">
            <div className="bg-slate-900 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Manage Parking Slots
                </h2>
                <p className="text-slate-400 text-xs font-medium mt-1">
                  {selectedParkingUnit.name} • {selectedParkingUnit.propertyId || 'Parking Area'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSlotManager}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Existing Slots</h3>
                      <p className="text-xs text-slate-500 mt-1">
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
                            className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
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
                                {slot.notes ? <span className="truncate max-w-[220px]">Notes: {slot.notes}</span> : null}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditSlot(slot.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Edit slot"
                              >
                                <Edit className="size-4.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete slot"
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
                    <p className="text-xs text-slate-500 mt-1">
                      Each slot corresponds to one physical parking space.
                    </p>
                  </div>

                  <form onSubmit={handleSaveSlot} className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                          Slot Code
                        </label>
                        <input
                          type="text"
                          required
                          value={slotForm.slotCode}
                          onChange={(e) => updateSlotFormField('slotCode', e.target.value)}
                          placeholder="e.g. A1"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white transition-all outline-none text-sm font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={slotForm.label}
                          onChange={(e) => updateSlotFormField('label', e.target.value)}
                          placeholder="Optional display name"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white transition-all outline-none text-sm font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                          Status
                        </label>
                        <select
                          value={slotForm.status}
                          onChange={(e) => updateSlotFormField('status', e.target.value as any)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white transition-all outline-none text-sm font-medium"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                          Vehicle Type
                        </label>
                        <input
                          type="text"
                          value={slotForm.vehicleType}
                          onChange={(e) => updateSlotFormField('vehicleType', e.target.value)}
                          placeholder="e.g. Car, SUV, Motorcycle"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white transition-all outline-none text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
    Slot Image
  </label>

  <input
    ref={slotFileInputRef}
    type="file"
    accept="image/*"
    onChange={(e) => handleSlotImageSelected(e.target.files)}
    className="hidden"
  />

  {slotImagePreview ? (
    <div className="space-y-3">
      <div className="relative w-full h-44 rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden">
        <img
          src={slotImagePreview}
          alt="Slot preview"
          className="w-full h-full object-cover"
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
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-600 shadow-lg hover:bg-red-500 hover:text-white transition-all"
          aria-label="Remove slot image"
        >
          <X className="size-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => slotFileInputRef.current?.click()}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
      >
        Replace Image
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => slotFileInputRef.current?.click()}
      className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50 transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-orange-600"
    >
      <Plus className="size-5" />
      <span className="text-sm font-semibold">Upload Slot Image</span>
    </button>
  )}
</div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        value={slotForm.notes}
                        onChange={(e) => updateSlotFormField('notes', e.target.value)}
                        placeholder="Optional notes for this slot"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white transition-all outline-none text-sm font-medium resize-none"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      {editingSlotId ? (
                        <button
                          type="button"
                          onClick={resetSlotForm}
                          className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-2xl font-semibold text-sm hover:bg-slate-50 transition-all"
                        >
                          Cancel Edit
                        </button>
                      ) : null}

                      <button
                        type="submit"
                        disabled={isSavingSlot}
                        className="flex-1 py-3 bg-orange-600 text-white rounded-2xl font-semibold text-sm hover:bg-orange-700 transition-all disabled:opacity-50"
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
      )}

      {unitToDelete && selectedUnitToDelete && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={closeDeletePanel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-unit-title"
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-slate-200/60 bg-white shadow-2xl sm:rounded-[2rem]"
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
                  onClick={closeDeletePanel}
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
                    <h3 className="truncate text-base font-semibold text-slate-900">
                      {selectedUnitToDelete.name}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <UnitTypeDisplay type={selectedUnitToDelete.type} />

                      {selectedUnitToDelete.propertyId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                          <Hash className="size-3" />
                          {selectedUnitToDelete.propertyId}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      selectedUnitToDelete.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {selectedUnitToDelete.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Location
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {selectedUnitToDelete.location || '—'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Price
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatCurrency(selectedUnitToDelete.price)}
                    </p>
                  </div>

                  {selectedUnitToDelete.type === 'function_hall' &&
                  selectedUnitToDelete.capacity ? (
                    <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Capacity
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {selectedUnitToDelete.capacity} guests
                      </p>
                    </div>
                  ) : null}

                  {selectedUnitToDelete.type === 'parking_slot' ? (
                    <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Parking Slots
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {getUnitSlotCount(selectedUnitToDelete.id)} slot(s)
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm leading-relaxed text-red-700">
                  This action cannot be undone. Any records that still depend on this unit may be affected.
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeDeletePanel}
                  disabled={isDeleting}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Unit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {slotToDelete && selectedSlotToDelete && (
        <div
          className="fixed inset-0 z-[115] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => {
            if (!isDeletingSlot) setSlotToDelete(null);
          }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-slate-200/60 bg-white shadow-2xl sm:rounded-[2rem]"
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
                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                      Remove this slot?
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      This will permanently remove the physical parking space record.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!isDeletingSlot) setSlotToDelete(null);
                  }}
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
                  {selectedSlotToDelete.slotCode}
                  {selectedSlotToDelete.label ? ` • ${selectedSlotToDelete.label}` : ''}
                </h3>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${SLOT_STATUS_STYLES[selectedSlotToDelete.status].chip}`}
                  >
                    {SLOT_STATUS_STYLES[selectedSlotToDelete.status].icon}
                    {SLOT_STATUS_STYLES[selectedSlotToDelete.status].label}
                  </span>

                  {selectedSlotToDelete.vehicleType ? (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                      {selectedSlotToDelete.vehicleType}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setSlotToDelete(null)}
                  disabled={isDeletingSlot}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteSlot}
                  disabled={isDeletingSlot}
                  className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingSlot ? 'Deleting...' : 'Delete Slot'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          style={{ zIndex: 2147483647 }}
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-[2147483648] bg-white bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition-colors shadow-md"
            aria-label="Close image"
          >
            <X className="size-5 text-gray-800" />
          </button>

          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Enlarged preview"
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
              decoding="async"
            />
          </div>
        </div>
      )}
    </div>
    </div>
  );
}