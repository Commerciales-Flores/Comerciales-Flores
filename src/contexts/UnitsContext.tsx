import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';
import type { Unit, UnitType, ParkingSlot } from '../data/types';
import { useRecords } from './RecordsContext';
import { useAuth } from './AuthContext';
import { getChangedFields, buildAuditSnapshot } from '../utils/auditHelpers';
import { makePublicId } from '../utils/publicId';

const DEFAULT_LOCATION = 'Quezon City';
const LOCATION_OPTIONS = ['Quezon City'];
const DEFAULT_UNIT_IMAGE =
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800';

const UNIT_CONFIG: Record<
  UnitType,
  { table: 'rental_units' | 'function_units' | 'parking_units'; prefix: string }
> = {
  rental_space: {
    table: 'rental_units',
    prefix: 'RNT',
  },
  function_hall: {
    table: 'function_units',
    prefix: 'FUN',
  },
  parking_slot: {
    table: 'parking_units',
    prefix: 'PAR',
  },
};

interface AddParkingSlotPayload {
  unitId: string;
  slotCode: string;
  label?: string;
  status: 'active' | 'inactive' | 'maintenance';
  vehicleType?: string;
  imagePath?: string;
  notes?: string;
}

interface UpdateParkingSlotPayload {
  unitId?: string;
  slotCode?: string;
  label?: string;
  status?: 'active' | 'inactive' | 'maintenance';
  vehicleType?: string;
  imagePath?: string;
  notes?: string;
}

interface UnitsContextType {
  units: Unit[];
  parkingSlots: ParkingSlot[];
  loadingUnits: boolean;
  locationOptions: string[];
  defaultLocation: string;
  addUnit: (unit: Omit<Unit, 'id' | 'property' | 'images'> & { images?: string[] }) => Promise<void>;
  updateUnit: (id: string, unit: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  uploadUnitImage: (file: File) => Promise<string | null>;
  getUnitById: (id: string) => Unit | undefined;
  refreshUnits: () => Promise<void>;

  getParkingSlotsByUnit: (unitId: string) => ParkingSlot[];
  addParkingSlot: (slot: AddParkingSlotPayload) => Promise<void>;
  updateParkingSlot: (slotId: string, slot: UpdateParkingSlotPayload) => Promise<void>;
  deleteParkingSlot: (slotId: string) => Promise<void>;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

function getSafeLocation(location?: string) {
  return LOCATION_OPTIONS.includes(location || '') ? location! : DEFAULT_LOCATION;
}

function getUnitConfig(type: UnitType) {
  return UNIT_CONFIG[type];
}

function getPublicId(type: UnitType, uuid: string) {
  const config = getUnitConfig(type);
  return makePublicId(config.prefix, { uuid, length: 5 });
}

function getPublicImageUrl(path: string) {
  const { data } = supabase.storage.from('property_images').getPublicUrl(path);
  return data.publicUrl;
}

function mapParkingSlotRow(row: any): ParkingSlot {
  return {
    id: row.slot_id,
    unitId: row.unit_id,
    slotCode: row.slot_code,
    label: row.label,
    status: row.status,
    vehicleType: row.vehicle_type,
    imagePath: row.image_path,
    imageUrl: row.image_path ? getPublicImageUrl(row.image_path) : null,
    notes: row.notes,
  };
}

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const { addAuditLog } = useRecords();
  const { user } = useAuth();

 const refreshUnits = useCallback(async () => {
  setLoadingUnits(true);

  try {
    const { data: baseUnits, error: baseError } = await supabase
      .from('units')
      .select('unit_id, public_id, unit_type, title, is_available, price, location, images');

    if (baseError) throw baseError;

    const [rentalRes, functionRes, parkingRes, parkingSlotsRes] = await Promise.all([
      supabase.from('rental_units').select('unit_id, title, description, policies, features'),
      supabase.from('function_units').select('unit_id, title, description, policies, features, capacity'),
      supabase.from('parking_units').select('unit_id, title, description, policies, features'),
      supabase
        .from('parking_slots')
        .select('slot_id, unit_id, slot_code, label, status, vehicle_type, image_path, notes')
        .order('slot_code', { ascending: true }),
    ]);

    if (rentalRes.error) console.error('rental_units error:', rentalRes.error);
    if (functionRes.error) console.error('function_units error:', functionRes.error);
    if (parkingRes.error) console.error('parking_units error:', parkingRes.error);
    if (parkingSlotsRes.error) console.error('parking_slots error:', parkingSlotsRes.error);

    const rentalUnits = rentalRes.data ?? [];
    const functionUnits = functionRes.data ?? [];
    const parkingUnits = parkingRes.data ?? [];
    const slotRows = parkingSlotsRes.data ?? [];

    const combinedUnits: Unit[] = (baseUnits ?? []).map((base) => {
      let specific:
        | {
            unit_id: string;
            title: string | null;
            description: string | null;
            policies: string | null;
            features: string[] | null;
            capacity?: number | null;
          }
        | null = null;

      if (base.unit_type === 'rental_space') {
        specific = rentalUnits.find((item) => item.unit_id === base.unit_id) ?? null;
      } else if (base.unit_type === 'function_hall') {
        specific = functionUnits.find((item) => item.unit_id === base.unit_id) ?? null;
      } else if (base.unit_type === 'parking_slot') {
        specific = parkingUnits.find((item) => item.unit_id === base.unit_id) ?? null;
      }

      const resolvedType = base.unit_type as UnitType;
      const imagePaths = Array.isArray(base.images) ? base.images.filter(Boolean) : [];

      return {
        id: base.unit_id,
        propertyId: base.public_id || getPublicId(resolvedType, base.unit_id),
        name: base.title || specific?.title || '',
        type: resolvedType,
        description: specific?.description || '',
        price: Number(base.price || 0),
        imagePaths,
        images:
          imagePaths.length > 0
            ? imagePaths.map((path) => getPublicImageUrl(path))
            : [DEFAULT_UNIT_IMAGE],
        policies: specific?.policies || '',
        capacity:
          resolvedType === 'function_hall'
            ? Number(specific?.capacity || 0) || undefined
            : undefined,
        available: Boolean(base.is_available),
        features: Array.isArray(specific?.features) ? specific.features : [],
        location: base.location || DEFAULT_LOCATION,
        property: null,
      };
    });

    setUnits(combinedUnits);
    setParkingSlots(slotRows.map(mapParkingSlotRow));
  } catch (error) {
    console.error('Error loading base units from Supabase:', error);
    setUnits([]);
    setParkingSlots([]);
  } finally {
    setLoadingUnits(false);
  }
}, []);

  useEffect(() => {
    void refreshUnits();
  }, [refreshUnits]);

  const uploadUnitImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `units/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading unit image:', error);
      return null;
    }
  }, []);

  const addUnit = useCallback(
    async (
      unitData: Omit<Unit, 'id' | 'property' | 'images'> & { images?: string[] }
    ): Promise<void> => {
      try {
        const newUnitId = crypto.randomUUID();
        const safeLocation = getSafeLocation(unitData.location);
        const publicId = getPublicId(unitData.type, newUnitId);
        const config = getUnitConfig(unitData.type);

        const imagePaths = Array.isArray(unitData.imagePaths)
          ? unitData.imagePaths
          : Array.isArray(unitData.images)
            ? unitData.images
            : [];

        const { error: baseError } = await supabase.from('units').insert([
          {
            unit_id: newUnitId,
            public_id: publicId,
            unit_type: unitData.type,
            title: unitData.name,
            is_available: unitData.available,
            price: unitData.price,
            location: safeLocation,
            images: imagePaths,
          },
        ]);

        if (baseError) throw baseError;

        const specificPayload: Record<string, unknown> = {
          unit_id: newUnitId,
          title: unitData.name,
          description: unitData.description,
          policies: unitData.policies,
          features: unitData.features,
        };

        if (unitData.type === 'function_hall') {
          specificPayload.capacity = unitData.capacity ?? null;
        }

        const { error: specificError } = await supabase
          .from(config.table)
          .insert([specificPayload]);

        if (specificError) {
          await supabase.from('units').delete().eq('unit_id', newUnitId);
          throw specificError;
        }

        await refreshUnits();

        const createdUnit: Unit = {
          id: newUnitId,
          propertyId: publicId,
          name: unitData.name,
          type: unitData.type,
          description: unitData.description,
          price: unitData.price,
          imagePaths,
          images:
            imagePaths.length > 0
              ? imagePaths.map((path) => getPublicImageUrl(path))
              : [DEFAULT_UNIT_IMAGE],
          policies: unitData.policies,
          capacity: unitData.type === 'function_hall' ? unitData.capacity : undefined,
          available: unitData.available,
          features: unitData.features,
          location: safeLocation,
          property: null,
        };

        if (user?.id) {
          try {
            await addAuditLog({
              userId: user.id,
              action: 'CREATE',
              targetTable: 'units',
              targetId: newUnitId,
              beforeValue: undefined,
              afterValue: createdUnit,
              changedFields: Object.keys(createdUnit),
              notes: `Created unit ${createdUnit.name} (${publicId})`,
            });
          } catch (auditError) {
            console.error('Failed to audit unit creation:', auditError);
          }
        }
      } catch (error) {
        console.error('Error adding unit:', error);
        throw error;
      }
    },
    [addAuditLog, refreshUnits, user?.id]
  );

  const updateUnit = useCallback(
    async (id: string, unitUpdate: Partial<Unit>): Promise<void> => {
      try {
        const existingUnit = units.find((unit) => unit.id === id);
        if (!existingUnit) return;

        const basePayload: Record<string, unknown> = {};

        if (unitUpdate.name !== undefined) basePayload.title = unitUpdate.name;
        if (unitUpdate.available !== undefined) basePayload.is_available = unitUpdate.available;
        if (unitUpdate.price !== undefined) basePayload.price = unitUpdate.price;
        if (unitUpdate.location !== undefined) {
          basePayload.location = getSafeLocation(unitUpdate.location);
        }
        if (unitUpdate.imagePaths !== undefined) {
          basePayload.images = unitUpdate.imagePaths;
        }

        if (Object.keys(basePayload).length > 0) {
          const { error } = await supabase.from('units').update(basePayload).eq('unit_id', id);
          if (error) throw error;
        }

        const specificPayload: Record<string, unknown> = {};

        if (unitUpdate.name !== undefined) specificPayload.title = unitUpdate.name;
        if (unitUpdate.description !== undefined) {
          specificPayload.description = unitUpdate.description;
        }
        if (unitUpdate.policies !== undefined) specificPayload.policies = unitUpdate.policies;
        if (unitUpdate.features !== undefined) specificPayload.features = unitUpdate.features;

        if (existingUnit.type === 'function_hall' && unitUpdate.capacity !== undefined) {
          specificPayload.capacity = unitUpdate.capacity ?? null;
        }

        if (Object.keys(specificPayload).length > 0) {
          const tableName = getUnitConfig(existingUnit.type).table;
          const { error } = await supabase.from(tableName).update(specificPayload).eq('unit_id', id);
          if (error) throw error;
        }

        const sanitizedUpdate: Partial<Unit> = {
          ...unitUpdate,
          ...(unitUpdate.location !== undefined
            ? { location: getSafeLocation(unitUpdate.location) }
            : {}),
          ...(unitUpdate.imagePaths !== undefined
            ? {
                images:
                  unitUpdate.imagePaths.length > 0
                    ? unitUpdate.imagePaths.map((path) => getPublicImageUrl(path))
                    : [DEFAULT_UNIT_IMAGE],
              }
            : {}),
        };

        const updatedUnit = buildAuditSnapshot(existingUnit, sanitizedUpdate);
        const changedFields = getChangedFields(existingUnit, sanitizedUpdate);

        await refreshUnits();

        if (changedFields.length === 0) return;

        if (user?.id) {
          try {
            await addAuditLog({
              userId: user.id,
              action: 'UPDATE',
              targetTable: 'units',
              targetId: id,
              beforeValue: existingUnit,
              afterValue: updatedUnit,
              changedFields,
              notes: `Updated unit ${existingUnit.name} (${existingUnit.propertyId})`,
            });
          } catch (auditError) {
            console.error('Failed to audit unit update:', auditError);
          }
        }
      } catch (error) {
        console.error('Error updating unit:', error);
        throw error;
      }
    },
    [addAuditLog, refreshUnits, units, user?.id]
  );

  const deleteUnit = useCallback(
    async (id: string): Promise<void> => {
      try {
        const existingUnit = units.find((unit) => unit.id === id);
        if (!existingUnit) return;

        if (existingUnit.type === 'parking_slot') {
          const { error: slotDeleteError } = await supabase
            .from('parking_slots')
            .delete()
            .eq('unit_id', id);

          if (slotDeleteError) throw slotDeleteError;
        }

        const tableName = getUnitConfig(existingUnit.type).table;

        const { error: specificError } = await supabase.from(tableName).delete().eq('unit_id', id);
        if (specificError) throw specificError;

        const { error: baseError } = await supabase.from('units').delete().eq('unit_id', id);
        if (baseError) throw baseError;

        setUnits((prev) => prev.filter((unit) => unit.id !== id));
        setParkingSlots((prev) => prev.filter((slot) => slot.unitId !== id));

        if (user?.id) {
          try {
            await addAuditLog({
              userId: user.id,
              action: 'DELETE',
              targetTable: 'units',
              targetId: id,
              beforeValue: existingUnit,
              afterValue: undefined,
              changedFields: Object.keys(existingUnit),
              notes: `Deleted unit ${existingUnit.name} (${existingUnit.propertyId})`,
            });
          } catch (auditError) {
            console.error('Failed to audit unit deletion:', auditError);
          }
        }
      } catch (error) {
        console.error('Error deleting unit:', error);
        throw error;
      }
    },
    [addAuditLog, units, user?.id]
  );

  const getUnitById = useCallback(
    (id: string) => units.find((unit) => unit.id === id),
    [units]
  );

  const getParkingSlotsByUnit = useCallback(
    (unitId: string) => parkingSlots.filter((slot) => slot.unitId === unitId),
    [parkingSlots]
  );

  const addParkingSlot = useCallback(
    async (slot: AddParkingSlotPayload): Promise<void> => {
      try {
        const slotId = crypto.randomUUID();

        const payload = {
          slot_id: slotId,
          unit_id: slot.unitId,
          slot_code: slot.slotCode.trim().toUpperCase(),
          label: slot.label?.trim() || null,
          status: slot.status,
          vehicle_type: slot.vehicleType?.trim() || null,
          image_path: slot.imagePath?.trim() || null,
          notes: slot.notes?.trim() || null,
        };

        const { error } = await supabase.from('parking_slots').insert([payload]);
        if (error) throw error;

        await refreshUnits();

        if (user?.id) {
          try {
            await addAuditLog({
              userId: user.id,
              action: 'CREATE',
              targetTable: 'parking_slots',
              targetId: slotId,
              beforeValue: undefined,
              afterValue: payload,
              changedFields: Object.keys(payload),
              notes: `Created parking slot ${payload.slot_code}`,
            });
          } catch (auditError) {
            console.error('Failed to audit parking slot creation:', auditError);
          }
        }
      } catch (error) {
        console.error('Error adding parking slot:', error);
        throw error;
      }
    },
    [addAuditLog, refreshUnits, user?.id]
  );

  const updateParkingSlot = useCallback(
    async (slotId: string, slotUpdate: UpdateParkingSlotPayload): Promise<void> => {
      try {
        const existingSlot = parkingSlots.find((slot) => slot.id === slotId);
        if (!existingSlot) return;

        const payload: Record<string, unknown> = {};

        if (slotUpdate.unitId !== undefined) payload.unit_id = slotUpdate.unitId;
        if (slotUpdate.slotCode !== undefined) payload.slot_code = slotUpdate.slotCode.trim().toUpperCase();
        if (slotUpdate.label !== undefined) payload.label = slotUpdate.label.trim() || null;
        if (slotUpdate.status !== undefined) payload.status = slotUpdate.status;
        if (slotUpdate.vehicleType !== undefined) payload.vehicle_type = slotUpdate.vehicleType.trim() || null;
        if (slotUpdate.imagePath !== undefined) payload.image_path = slotUpdate.imagePath.trim() || null;
        if (slotUpdate.notes !== undefined) payload.notes = slotUpdate.notes.trim() || null;

        if (Object.keys(payload).length === 0) return;

        const { error } = await supabase
          .from('parking_slots')
          .update(payload)
          .eq('slot_id', slotId);

        if (error) throw error;

        await refreshUnits();

        if (user?.id) {
          try {
            await addAuditLog({
              userId: user.id,
              action: 'UPDATE',
              targetTable: 'parking_slots',
              targetId: slotId,
              beforeValue: existingSlot,
              afterValue: { ...existingSlot, ...slotUpdate },
              changedFields: Object.keys(payload),
              notes: `Updated parking slot ${existingSlot.slotCode}`,
            });
          } catch (auditError) {
            console.error('Failed to audit parking slot update:', auditError);
          }
        }
      } catch (error) {
        console.error('Error updating parking slot:', error);
        throw error;
      }
    },
    [addAuditLog, parkingSlots, refreshUnits, user?.id]
  );

  const deleteParkingSlot = useCallback(
    async (slotId: string): Promise<void> => {
      try {
        const existingSlot = parkingSlots.find((slot) => slot.id === slotId);
        if (!existingSlot) return;

        const { error } = await supabase
          .from('parking_slots')
          .delete()
          .eq('slot_id', slotId);

        if (error) throw error;

        setParkingSlots((prev) => prev.filter((slot) => slot.id !== slotId));

        if (user?.id) {
          try {
            await addAuditLog({
              userId: user.id,
              action: 'DELETE',
              targetTable: 'parking_slots',
              targetId: slotId,
              beforeValue: existingSlot,
              afterValue: undefined,
              changedFields: Object.keys(existingSlot),
              notes: `Deleted parking slot ${existingSlot.slotCode}`,
            });
          } catch (auditError) {
            console.error('Failed to audit parking slot deletion:', auditError);
          }
        }
      } catch (error) {
        console.error('Error deleting parking slot:', error);
        throw error;
      }
    },
    [addAuditLog, parkingSlots, user?.id]
  );

  const value = useMemo(
    () => ({
      units,
      parkingSlots,
      loadingUnits,
      locationOptions: LOCATION_OPTIONS,
      defaultLocation: DEFAULT_LOCATION,
      addUnit,
      updateUnit,
      deleteUnit,
      uploadUnitImage,
      getUnitById,
      refreshUnits,
      getParkingSlotsByUnit,
      addParkingSlot,
      updateParkingSlot,
      deleteParkingSlot,
    }),
    [
      units,
      parkingSlots,
      loadingUnits,
      addUnit,
      updateUnit,
      deleteUnit,
      uploadUnitImage,
      getUnitById,
      refreshUnits,
      getParkingSlotsByUnit,
      addParkingSlot,
      updateParkingSlot,
      deleteParkingSlot,
    ]
  );

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error('useUnits must be used within UnitsProvider');
  }
  return context;
}