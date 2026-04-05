import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';
import type { Unit, UnitType, ParkingSlot } from '../data/types';
import { useRecords } from './RecordsContext';
import { useAuth } from './AuthContext';
import { getChangedFields, buildAuditSnapshot } from '../utils/auditHelpers';

import {
  normalizeText,
  normalizeAddress,
  normalizeMoneyString,
  normalizeUppercaseText,
} from '../utils/DataNormalization';

const DEFAULT_LOCATION = 'Quezon City';
const LOCATION_OPTIONS = ['Quezon City'];
const DEFAULT_UNIT_IMAGE =
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800';

const UNIT_CONFIG: Record<
  UnitType,
  { table: 'rental_units' | 'function_units' | 'parking_units' }
> = {
  rental_space: {
    table: 'rental_units',
  },
  function_hall: {
    table: 'function_units',
  },
  parking_slot: {
    table: 'parking_units',
  },
};
const PROPERTY_MEDIA_BUCKET = 'property_media';
const UNIT_CONTRACTS_BUCKET = 'unit_contracts';

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
  unitsVersion: number;
  parkingSlots: ParkingSlot[];
  loadingUnits: boolean;
  locationOptions: string[];
  defaultLocation: string;
  addUnit: (
    unit: Omit<Unit, 'id' | 'property' | 'images'> & { images?: string[] }
  ) => Promise<void>;
  updateUnit: (id: string, unit: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  uploadUnitImage: (file: File) => Promise<string | null>;
  uploadUnitVideo: (file: File) => Promise<string | null>;
  uploadUnitContract: (file: File) => Promise<{ path: string; name: string } | null>;
  getUnitById: (id: string) => Unit | undefined;
  refreshUnits: () => Promise<void>;
  getParkingSlotById: (slotId: string) => ParkingSlot | undefined;
  getParkingSlotsByUnit: (unitId: string) => ParkingSlot[];
  addParkingSlot: (slot: AddParkingSlotPayload) => Promise<void>;
  updateParkingSlot: (slotId: string, slot: UpdateParkingSlotPayload) => Promise<void>;
  deleteParkingSlot: (slotId: string) => Promise<void>;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

type SpecificUnitRow = {
  unit_id: string;
  title: string | null;
  description: string | null;
  policies: string | null;
  features: string[] | null;
  capacity?: number | null;
};

function getSafeLocation(location?: string) {
  return LOCATION_OPTIONS.includes(location || '') ? location! : DEFAULT_LOCATION;
}

function getUnitConfig(type: UnitType) {
  return UNIT_CONFIG[type];
}


function getPublicImageUrl(path: string) {
  const { data } = supabase.storage.from(PROPERTY_MEDIA_BUCKET).getPublicUrl(path);
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
    imagePath: row.image_url,
    imageUrl: row.image_url ? getPublicImageUrl(row.image_url) : null,
    notes: row.notes,
  };
}

function toUnitMap<T extends { unit_id: string }>(rows: T[] | null | undefined) {
  return new Map((rows ?? []).map((row) => [row.unit_id, row]));
}

function toOccupancyMap(rows: any[] | null | undefined) {
  const map = new Map<string, any>();

  for (const row of rows ?? []) {
    const slotId = row?.details?.slotId;
    if (slotId) {
      map.set(slotId, row);
    }
  }

  return map;
}

async function removeStorageFile(bucket: string, path?: string | null) {
  if (!path) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

async function removeStorageFiles(bucket: string, paths?: Array<string | null | undefined>) {
  const cleanPaths = (paths ?? []).filter((path): path is string => Boolean(path?.trim()));
  if (cleanPaths.length === 0) return;

  const { error } = await supabase.storage.from(bucket).remove(cleanPaths);
  if (error) throw error;
}

function getRemovedPaths(previous: string[] = [], next: string[] = []) {
  const nextSet = new Set(next);
  return previous.filter((path) => !nextSet.has(path));
}

function sortUnits(items: Unit[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function sortParkingSlots(items: ParkingSlot[]) {
  return [...items].sort((a, b) => a.slotCode.localeCompare(b.slotCode));
}

function extractSlotId(row: any): string | null {
  return row?.details?.slotId ?? null;
}

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitsVersion, setUnitsVersion] = useState(0);

  const parkingSlotsRef = useRef<ParkingSlot[]>([]);
const refreshTimersRef = useRef<Map<string, number>>(new Map());
const recentUnitInsertionsRef = useRef<Map<string, number>>(new Map());

  const { addAuditLog } = useRecords();
  const { user } = useAuth();

  useEffect(() => {
    parkingSlotsRef.current = parkingSlots;
  }, [parkingSlots]);

  const mapBaseUnitRow = useCallback((base: any): Unit => {
    const resolvedType = base.unit_type as UnitType;

    const imagePaths: string[] = Array.isArray(base.images)
      ? base.images.filter(
          (path: unknown): path is string =>
            typeof path === 'string' && path.length > 0
        )
      : [];

    const videoPaths: string[] = Array.isArray(base.videos)
      ? base.videos.filter(
          (path: unknown): path is string =>
            typeof path === 'string' && path.length > 0
        )
      : [];

    return {
      id: base.unit_id,
      propertyId: base.public_id,
      name: normalizeText(base.title || ''),
      type: resolvedType,
      description: '',
      price: Number(base.price || 0),
      imagePaths,
      images:
        imagePaths.length > 0
          ? imagePaths.map((path: string) => getPublicImageUrl(path))
          : [DEFAULT_UNIT_IMAGE],
      videoPaths,
      videos: videoPaths.map((path: string) => getPublicImageUrl(path)),
      policies: '',
      capacity: undefined,
      available: Boolean(base.is_available),
      features: [],
      location: getSafeLocation(normalizeAddress(base.location)),
      property: null,
      minimumPaymentPercent: base.minimum_payment_percent ?? null,
      contractFilePath: base.contract_file_path ?? null,
      contractFileName: base.contract_file_name ?? null,
    };
  }, []);

  const refreshParkingSlotsForUnit = useCallback(async (unitId: string) => {
    const { data: slotRows, error: slotsError } = await supabase
      .from('parking_slots')
      .select('slot_id, unit_id, slot_code, label, status, vehicle_type, image_url, notes')
      .eq('unit_id', unitId)
      .order('slot_code', { ascending: true });

    if (slotsError) {
      console.error('Error loading parking slots for unit:', slotsError);
      return;
    }

    const slotIds = (slotRows ?? []).map((slot) => slot.slot_id);
    let occupancyRows: any[] = [];

    if (slotIds.length > 0) {
      const occupancyFilter = slotIds
        .map((slotId) => `details->>slotId.eq.${slotId}`)
        .join(',');

      const { data, error: occupancyError } = await supabase
        .from('reservations')
        .select(`
          user_id,
          start_date,
          details,
          users (
            first_name,
            last_name,
            public_id
          )
        `)
        .eq('unit_type', 'parking_slot')
        .in('status', ['approved', 'confirmed'])
        .or(occupancyFilter);

      if (occupancyError) {
        console.error('Error loading parking occupancy:', occupancyError);
      } else {
        occupancyRows = data ?? [];
      }
    }

    const occupancyMap = toOccupancyMap(occupancyRows);

    const mappedSlots = (slotRows ?? []).map((slot) => {
      const occupancy = occupancyMap.get(slot.slot_id);
      const userInfo = occupancy?.users?.[0];

      return {
        ...mapParkingSlotRow(slot),
        isOccupied: Boolean(occupancy),
        occupiedByUserId: occupancy?.user_id ?? null,
        occupiedByName: userInfo
          ? `${userInfo.first_name ?? ''} ${userInfo.last_name ?? ''}`.trim()
          : null,
        occupiedByPublicId: userInfo?.public_id ?? null,
        occupiedSince: occupancy?.start_date ?? null,
      };
    });

    setParkingSlots((prev) => {
      const others = prev.filter((slot) => slot.unitId !== unitId);
      return sortParkingSlots([...others, ...mappedSlots]);
    });
  }, []);

  const queueParkingUnitRefresh = useCallback(
    (unitId: string) => {
      const existing = refreshTimersRef.current.get(unitId);
      if (existing) {
        window.clearTimeout(existing);
      }

      const timeoutId = window.setTimeout(async () => {
        refreshTimersRef.current.delete(unitId);
        await refreshParkingSlotsForUnit(unitId);
        setUnitsVersion((prev) => prev + 1);
      }, 150);

      refreshTimersRef.current.set(unitId, timeoutId);
    },
    [refreshParkingSlotsForUnit]
  );

  const refreshSpecificUnitDetails = useCallback(async (unitId: string) => {
    const { data: base, error: baseError } = await supabase
      .from('units')
      .select(`
        unit_id,
        public_id,
        unit_type,
        title,
        is_available,
        price,
        location,
        images,
        videos,
        minimum_payment_percent,
        contract_file_path,
        contract_file_name
      `)
      .eq('unit_id', unitId)
      .maybeSingle();

    if (baseError) {
      console.error('Error loading base unit:', baseError);
      return;
    }

    if (!base) {
      setUnits((prev) => prev.filter((unit) => unit.id !== unitId));
      setParkingSlots((prev) => prev.filter((slot) => slot.unitId !== unitId));
      return;
    }

    const resolvedType = base.unit_type as UnitType;
    const specificTable = getUnitConfig(resolvedType).table;

    let specificRow: SpecificUnitRow | null = null;

    if (resolvedType === 'function_hall') {
      const { data, error } = await supabase
        .from(specificTable)
        .select('unit_id, title, description, policies, features, capacity')
        .eq('unit_id', unitId)
        .maybeSingle();

      if (error) {
        console.error('Error loading specific unit details:', error);
      } else {
        specificRow = (data as SpecificUnitRow | null) ?? null;
      }
    } else {
      const { data, error } = await supabase
        .from(specificTable)
        .select('unit_id, title, description, policies, features')
        .eq('unit_id', unitId)
        .maybeSingle();

      if (error) {
        console.error('Error loading specific unit details:', error);
      } else {
        specificRow = (data as SpecificUnitRow | null) ?? null;
      }
    }

    const imagePaths: string[] = Array.isArray(base.images)
      ? base.images.filter(
          (path: unknown): path is string =>
            typeof path === 'string' && path.length > 0
        )
      : [];

    const videoPaths: string[] = Array.isArray(base.videos)
      ? base.videos.filter(
          (path: unknown): path is string =>
            typeof path === 'string' && path.length > 0
        )
      : [];

    const nextUnit: Unit = {
      id: base.unit_id,
      propertyId: base.public_id,
      name: normalizeText(base.title || specificRow?.title || ''),
      type: resolvedType,
      description: normalizeText(specificRow?.description || ''),
      price: Number(base.price || 0),
      imagePaths,
      images:
        imagePaths.length > 0
          ? imagePaths.map((path: string) => getPublicImageUrl(path))
          : [DEFAULT_UNIT_IMAGE],
      videoPaths,
      videos: videoPaths.map((path: string) => getPublicImageUrl(path)),
      policies: normalizeText(specificRow?.policies || ''),
      capacity:
        resolvedType === 'function_hall'
          ? Number(specificRow?.capacity || 0) || undefined
          : undefined,
      available: Boolean(base.is_available),
      features: Array.isArray(specificRow?.features)
        ? specificRow.features.map((feature) => normalizeText(feature)).filter(Boolean)
        : [],
      location: getSafeLocation(normalizeAddress(base.location)),
      property: null,
      minimumPaymentPercent: base.minimum_payment_percent ?? null,
      contractFilePath: base.contract_file_path ?? null,
      contractFileName: base.contract_file_name ?? null,
    };

    setUnits((prev) => {
      const exists = prev.some((unit) => unit.id === unitId);
      const next = exists
        ? prev.map((unit) => (unit.id === unitId ? nextUnit : unit))
        : [...prev, nextUnit];

      return sortUnits(next);
    });
  }, []);

  const refreshUnits = useCallback(async () => {
    setLoadingUnits(true);

    try {
      const [
        baseRes,
        rentalRes,
        functionRes,
        parkingRes,
        parkingSlotsRes,
        activeParkingRes,
      ] = await Promise.all([
        supabase.from('units').select(`
          unit_id,
          public_id,
          unit_type,
          title,
          is_available,
          price,
          location,
          images,
          videos,
          minimum_payment_percent,
          contract_file_path,
          contract_file_name
        `),
        supabase.from('rental_units').select('unit_id, title, description, policies, features'),
        supabase.from('function_units').select(
          'unit_id, title, description, policies, features, capacity'
        ),
        supabase.from('parking_units').select('unit_id, title, description, policies, features'),
        supabase
          .from('parking_slots')
          .select('slot_id, unit_id, slot_code, label, status, vehicle_type, image_url, notes')
          .order('slot_code', { ascending: true }),
        supabase
          .from('reservations')
          .select(`
            user_id,
            start_date,
            details,
            users (
              first_name,
              last_name,
              public_id
            )
          `)
          .eq('unit_type', 'parking_slot')
          .in('status', ['approved', 'confirmed']),
      ]);

      if (baseRes.error) throw baseRes.error;
      if (rentalRes.error) console.error('rental_units error:', rentalRes.error);
      if (functionRes.error) console.error('function_units error:', functionRes.error);
      if (parkingRes.error) console.error('parking_units error:', parkingRes.error);
      if (parkingSlotsRes.error) console.error('parking_slots error:', parkingSlotsRes.error);
      if (activeParkingRes.error) {
        console.error('reservations occupancy error:', activeParkingRes.error);
      }

      const rentalMap = toUnitMap(rentalRes.data);
      const functionMap = toUnitMap(functionRes.data);
      const parkingMap = toUnitMap(parkingRes.data);
      const occupancyBySlotId = toOccupancyMap(activeParkingRes.data);

      const combinedUnits: Unit[] = (baseRes.data ?? []).map((base) => {
        const resolvedType = base.unit_type as UnitType;

        const specific =
          resolvedType === 'rental_space'
            ? rentalMap.get(base.unit_id)
            : resolvedType === 'function_hall'
              ? functionMap.get(base.unit_id)
              : parkingMap.get(base.unit_id);

        const imagePaths: string[] = Array.isArray(base.images)
          ? base.images.filter(
              (path: unknown): path is string =>
                typeof path === 'string' && path.length > 0
            )
          : [];

        const videoPaths: string[] = Array.isArray(base.videos)
          ? base.videos.filter(
              (path: unknown): path is string =>
                typeof path === 'string' && path.length > 0
            )
          : [];

        return {
          id: base.unit_id,
          propertyId: base.public_id,
          name: normalizeText(base.title || specific?.title || ''),
          type: resolvedType,
          description: normalizeText(specific?.description || ''),
          price: Number(base.price || 0),
          imagePaths,
          images:
            imagePaths.length > 0
              ? imagePaths.map((path) => getPublicImageUrl(path))
              : [DEFAULT_UNIT_IMAGE],
          videoPaths,
          videos: videoPaths.map((path) => getPublicImageUrl(path)),
          policies: normalizeText(specific?.policies || ''),
          capacity:
            resolvedType === 'function_hall'
              ? Number((specific as SpecificUnitRow | undefined)?.capacity || 0) || undefined
              : undefined,
          available: Boolean(base.is_available),
          features: Array.isArray(specific?.features)
            ? specific.features.map((feature) => normalizeText(feature)).filter(Boolean)
            : [],
          location: getSafeLocation(normalizeAddress(base.location)),
          property: null,
          minimumPaymentPercent: base.minimum_payment_percent ?? null,
          contractFilePath: base.contract_file_path ?? null,
          contractFileName: base.contract_file_name ?? null,
        };
      });

      const mappedSlots: ParkingSlot[] = (parkingSlotsRes.data ?? []).map((slot) => {
        const occupancy = occupancyBySlotId.get(slot.slot_id);
        const userInfo = occupancy?.users?.[0];

        return {
          ...mapParkingSlotRow(slot),
          isOccupied: Boolean(occupancy),
          occupiedByUserId: occupancy?.user_id ?? null,
          occupiedByName: userInfo
            ? `${userInfo.first_name ?? ''} ${userInfo.last_name ?? ''}`.trim()
            : null,
          occupiedByPublicId: userInfo?.public_id ?? null,
          occupiedSince: occupancy?.start_date ?? null,
        };
      });

      setUnits(sortUnits(combinedUnits));
      setParkingSlots(sortParkingSlots(mappedSlots));
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

  useEffect(() => {
    const channel = supabase
      .channel('units-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'units' },
        async (payload) => {
          const baseUnit = payload.new as { unit_id: string; unit_type: UnitType };

          await refreshSpecificUnitDetails(baseUnit.unit_id);

          if (baseUnit.unit_type === 'parking_slot') {
            queueParkingUnitRefresh(baseUnit.unit_id);
          }

          setUnitsVersion((prev) => prev + 1);
        }
      )
      .on(
  'postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'units' },
  async (payload) => {
    const inserted = payload.new as {
      unit_id: string;
      unit_type: UnitType;
    };

    const unitId = inserted.unit_id;
    const unitType = inserted.unit_type;

    recentUnitInsertionsRef.current.set(unitId, Date.now());

    await refreshSpecificUnitDetails(unitId);

    if (unitType === 'parking_slot') {
      queueParkingUnitRefresh(unitId);
    }

    setUnitsVersion((prev) => prev + 1);

    window.setTimeout(() => {
      recentUnitInsertionsRef.current.delete(unitId);
    }, 800);
  }
)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'units' },
        (payload) => {
          const deletedId = payload.old.unit_id as string | undefined;
          if (!deletedId) return;

          setUnits((prev) => prev.filter((unit) => unit.id !== deletedId));
          setParkingSlots((prev) => prev.filter((slot) => slot.unitId !== deletedId));
          setUnitsVersion((prev) => prev + 1);
        }
      )
      .on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'rental_units' },
  async (payload) => {
    const nextRow = payload.new as { unit_id?: string } | null;
    const oldRow = payload.old as { unit_id?: string } | null;
    const unitId = nextRow?.unit_id ?? oldRow?.unit_id;

    if (!unitId) return;

    if (recentUnitInsertionsRef.current.has(unitId)) return;

    await refreshSpecificUnitDetails(unitId);
    setUnitsVersion((prev) => prev + 1);
  }
)
      .on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'parking_units' },
  async (payload) => {
    const nextRow = payload.new as { unit_id?: string } | null;
    const oldRow = payload.old as { unit_id?: string } | null;
    const unitId = nextRow?.unit_id ?? oldRow?.unit_id;

    if (!unitId) return;

    if (recentUnitInsertionsRef.current.has(unitId)) return;

    await refreshSpecificUnitDetails(unitId);
    queueParkingUnitRefresh(unitId);
    setUnitsVersion((prev) => prev + 1);
  }
)
      .on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'function_units' },
  async (payload) => {
    const nextRow = payload.new as { unit_id?: string } | null;
    const oldRow = payload.old as { unit_id?: string } | null;
    const unitId = nextRow?.unit_id ?? oldRow?.unit_id;

    if (!unitId) return;

    if (recentUnitInsertionsRef.current.has(unitId)) return;

    await refreshSpecificUnitDetails(unitId);
    setUnitsVersion((prev) => prev + 1);
  }
) 
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parking_slots' },
        async (payload) => {
          const nextRow = payload.new as { unit_id?: string } | null;
          const oldRow = payload.old as { unit_id?: string } | null;
          const unitId = nextRow?.unit_id ?? oldRow?.unit_id;

          if (!unitId) return;

          queueParkingUnitRefresh(unitId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        async (payload) => {
          const nextRow = payload.new as any;
          const oldRow = payload.old as any;
          const unitType = nextRow?.unit_type ?? oldRow?.unit_type;

          if (unitType !== 'parking_slot') return;

          const nextSlotId = extractSlotId(nextRow);
          const oldSlotId = extractSlotId(oldRow);
          const currentSlots = parkingSlotsRef.current;

          const affectedUnitIds = new Set<string>();

          if (nextSlotId) {
            const nextUnitId = currentSlots.find((slot) => slot.id === nextSlotId)?.unitId;
            if (nextUnitId) affectedUnitIds.add(nextUnitId);
          }

          if (oldSlotId) {
            const oldUnitId = currentSlots.find((slot) => slot.id === oldSlotId)?.unitId;
            if (oldUnitId) affectedUnitIds.add(oldUnitId);
          }

          affectedUnitIds.forEach((unitId) => queueParkingUnitRefresh(unitId));
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log('Units realtime status:', status);
        }
      });

    return () => {
      refreshTimersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      refreshTimersRef.current.clear();
      recentUnitInsertionsRef.current.clear();
      void supabase.removeChannel(channel);
    };
  }, [
    mapBaseUnitRow,
    queueParkingUnitRefresh,
    refreshSpecificUnitDetails,
  ]);

  const uploadUnitImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `units/images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(PROPERTY_MEDIA_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading unit image:', error);
      return null;
    }
  }, []);

  const uploadUnitVideo = useCallback(async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `units/videos/${fileName}`;

      const { error } = await supabase.storage
        .from(PROPERTY_MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'video/mp4',
        });

      if (error) throw error;
      return filePath;
    } catch (error) {
      console.error('Error uploading unit video:', error);
      return null;
    }
  }, []);

  const uploadUnitContract = useCallback(
    async (file: File): Promise<{ path: string; name: string } | null> => {
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `contracts/${fileName}`;

        const { error } = await supabase.storage
          .from(UNIT_CONTRACTS_BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/pdf',
          });

        if (error) throw error;

        return {
          path: filePath,
          name: file.name,
        };
      } catch (error) {
        console.error('Error uploading contract:', error);
        return null;
      }
    },
    []
  );

  const addUnit = useCallback(
  async (
    unitData: Omit<Unit, 'id' | 'property' | 'images'> & { images?: string[] }
  ): Promise<void> => {
    try {
      const normalizedName = normalizeText(unitData.name);
      const normalizedDescription = normalizeText(unitData.description ?? '');
      const normalizedPolicies = normalizeText(unitData.policies ?? '');
      const normalizedPrice = Number(normalizeMoneyString(String(unitData.price)));
      const normalizedFeatures = Array.isArray(unitData.features)
        ? unitData.features.map((feature) => normalizeText(feature)).filter(Boolean)
        : [];
      const normalizedLocation = getSafeLocation(normalizeAddress(unitData.location));
      const newUnitId = crypto.randomUUID();
      const config = getUnitConfig(unitData.type);

      const imagePaths = Array.isArray(unitData.imagePaths)
        ? unitData.imagePaths
        : Array.isArray(unitData.images)
          ? unitData.images
          : [];

      const videoPaths = Array.isArray(unitData.videoPaths)
        ? unitData.videoPaths
        : Array.isArray(unitData.videos)
          ? unitData.videos
          : [];

      const basePayload = {
        unit_id: newUnitId,
        unit_type: unitData.type,
        title: normalizedName,
        is_available: unitData.available,
        price: normalizedPrice,
        location: normalizedLocation,
        images: imagePaths,
        videos: videoPaths,
        minimum_payment_percent: unitData.minimumPaymentPercent ?? null,
        contract_file_path: unitData.contractFilePath ?? null,
        contract_file_name: unitData.contractFileName ?? null,
      };

      const { data: insertedBase, error: baseError } = await supabase
        .from('units')
        .insert([basePayload])
        .select('unit_id, public_id')
        .single();

      if (baseError) {
        console.log('BASE ERROR RAW:', baseError);
        console.log('BASE ERROR CODE:', baseError.code);
        console.log('BASE ERROR MESSAGE:', baseError.message);
        console.log('BASE ERROR DETAILS:', baseError.details);
        console.log('BASE ERROR HINT:', baseError.hint);
        console.log('BASE PAYLOAD:', JSON.stringify(basePayload, null, 2));

        throw new Error(
          [
            `code=${baseError.code ?? 'n/a'}`,
            `message=${baseError.message ?? 'n/a'}`,
            `details=${baseError.details ?? 'n/a'}`,
            `hint=${baseError.hint ?? 'n/a'}`,
          ].join(' | ')
        );
      }

      if (!insertedBase?.public_id) {
        throw new Error('Unit insert succeeded but public_id was not returned.');
      }

      const specificPayload: Record<string, unknown> = {
        unit_id: newUnitId,
        title: normalizedName,
        description: normalizedDescription,
        policies: normalizedPolicies,
        features: normalizedFeatures,
      };

      if (unitData.type === 'function_hall') {
        specificPayload.capacity = unitData.capacity ?? null;
      }

      const { error: specificError } = await supabase
        .from(config.table)
        .insert([specificPayload]);

      if (specificError) {
        console.error('Specific unit insert failed:', {
          table: config.table,
          code: specificError.code,
          message: specificError.message,
          details: specificError.details,
          hint: specificError.hint,
          payload: specificPayload,
        });

        await supabase.from('units').delete().eq('unit_id', newUnitId);
        throw specificError;
      }

      const createdUnit: Unit = {
        id: newUnitId,
        propertyId: insertedBase.public_id,
        name: normalizedName,
        type: unitData.type,
        description: normalizedDescription,
        price: normalizedPrice,
        imagePaths,
        images:
          imagePaths.length > 0
            ? imagePaths.map((path) => getPublicImageUrl(path))
            : [DEFAULT_UNIT_IMAGE],
        videoPaths,
        videos: videoPaths.map((path) => getPublicImageUrl(path)),
        policies: normalizedPolicies,
        capacity: unitData.type === 'function_hall' ? unitData.capacity : undefined,
        available: unitData.available,
        features: normalizedFeatures,
        location: normalizedLocation,
        property: null,
        minimumPaymentPercent: unitData.minimumPaymentPercent ?? null,
        contractFilePath: unitData.contractFilePath ?? null,
        contractFileName: unitData.contractFileName ?? null,
      };

      if (user?.id) {
        try {
          await addAuditLog({
            userId: user.id,
            action: 'CREATE',
            targetTable: 'units',
            targetId: newUnitId,
            targetPublicId: insertedBase.public_id,
            beforeValue: null,
            afterValue: createdUnit,
            changedFields: Object.keys(createdUnit),
            notes: `Created unit ${createdUnit.name}`,
          });
        } catch (auditError) {
          console.error('Failed to audit unit creation:', auditError);
        }
      }
    } catch (error: any) {
      console.error('Error adding unit:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        error,
      });
      throw error;
    }
  },
  [addAuditLog, user?.id]
);

  const updateUnit = useCallback(
    async (id: string, unitUpdate: Partial<Unit>): Promise<void> => {
      try {
        const existingUnit = units.find((unit) => unit.id === id);
        if (!existingUnit) return;

        const oldContractPath = existingUnit.contractFilePath ?? null;
        const nextContractPath =
          unitUpdate.contractFilePath !== undefined
            ? unitUpdate.contractFilePath ?? null
            : oldContractPath;

        const shouldDeletePreviousContract =
          unitUpdate.contractFilePath !== undefined &&
          oldContractPath &&
          oldContractPath !== nextContractPath;

        const previousImagePaths = existingUnit.imagePaths ?? [];
        const nextImagePaths =
          unitUpdate.imagePaths !== undefined ? unitUpdate.imagePaths : previousImagePaths;

        const previousVideoPaths = existingUnit.videoPaths ?? [];
        const nextVideoPaths =
          unitUpdate.videoPaths !== undefined ? unitUpdate.videoPaths : previousVideoPaths;

        const removedImagePaths =
          unitUpdate.imagePaths !== undefined
            ? getRemovedPaths(previousImagePaths, nextImagePaths)
            : [];

        const removedVideoPaths =
          unitUpdate.videoPaths !== undefined
            ? getRemovedPaths(previousVideoPaths, nextVideoPaths)
            : [];

        const basePayload: Record<string, unknown> = {};

        if (unitUpdate.name !== undefined) {
          basePayload.title = normalizeText(unitUpdate.name);
        }
        if (unitUpdate.available !== undefined) basePayload.is_available = unitUpdate.available;
        if (unitUpdate.price !== undefined) {
          basePayload.price = Number(normalizeMoneyString(String(unitUpdate.price)));
        }
        if (unitUpdate.minimumPaymentPercent !== undefined) {
          basePayload.minimum_payment_percent = unitUpdate.minimumPaymentPercent;
        }
        if (unitUpdate.location !== undefined) {
          basePayload.location = getSafeLocation(normalizeAddress(unitUpdate.location));
        }
        if (unitUpdate.imagePaths !== undefined) {
          basePayload.images = unitUpdate.imagePaths;
        }
        if (unitUpdate.videoPaths !== undefined) {
          basePayload.videos = unitUpdate.videoPaths;
        }
        if (unitUpdate.contractFilePath !== undefined) {
          basePayload.contract_file_path = unitUpdate.contractFilePath;
        }
        if (unitUpdate.contractFileName !== undefined) {
          basePayload.contract_file_name = unitUpdate.contractFileName;
        }

        if (Object.keys(basePayload).length > 0) {
          const { error } = await supabase.from('units').update(basePayload).eq('unit_id', id);
          if (error) throw error;
        }

        if (removedImagePaths.length > 0) {
          try {
            await removeStorageFiles(PROPERTY_MEDIA_BUCKET, removedImagePaths);
          } catch (storageError) {
            console.error('Failed to remove replaced unit images:', storageError);
          }
        }

        if (removedVideoPaths.length > 0) {
          try {
            await removeStorageFiles(PROPERTY_MEDIA_BUCKET, removedVideoPaths);
          } catch (storageError) {
            console.error('Failed to remove replaced unit videos:', storageError);
          }
        }

        if (shouldDeletePreviousContract) {
          try {
            await removeStorageFile(UNIT_CONTRACTS_BUCKET, oldContractPath);
          } catch (storageError) {
            console.error('Failed to remove previous contract file:', storageError);
          }
        }

        const specificPayload: Record<string, unknown> = {};

        if (unitUpdate.name !== undefined) {
          specificPayload.title = normalizeText(unitUpdate.name);
        }
        if (unitUpdate.description !== undefined) {
          specificPayload.description = normalizeText(unitUpdate.description);
        }
        if (unitUpdate.policies !== undefined) {
          specificPayload.policies = normalizeText(unitUpdate.policies);
        }
        if (unitUpdate.features !== undefined) {
          specificPayload.features = unitUpdate.features
            .map((feature) => normalizeText(feature))
            .filter(Boolean);
        }

        if (existingUnit.type === 'function_hall' && unitUpdate.capacity !== undefined) {
          specificPayload.capacity = unitUpdate.capacity ?? null;
        }

        if (Object.keys(specificPayload).length > 0) {
          const tableName = getUnitConfig(existingUnit.type).table;
          const { error } = await supabase
            .from(tableName)
            .update(specificPayload)
            .eq('unit_id', id);

          if (error) throw error;
        }

        const sanitizedUpdate: Partial<Unit> = {
        ...unitUpdate,
        ...(unitUpdate.name !== undefined
          ? { name: normalizeText(unitUpdate.name) }
          : {}),
        ...(unitUpdate.description !== undefined
          ? { description: normalizeText(unitUpdate.description) }
          : {}),
        ...(unitUpdate.policies !== undefined
          ? { policies: normalizeText(unitUpdate.policies) }
          : {}),
        ...(unitUpdate.price !== undefined
          ? { price: Number(normalizeMoneyString(String(unitUpdate.price))) }
          : {}),
        ...(unitUpdate.features !== undefined
          ? {
              features: unitUpdate.features
                .map((feature) => normalizeText(feature))
                .filter(Boolean),
            }
          : {}),
        ...(unitUpdate.location !== undefined
          ? { location: getSafeLocation(normalizeAddress(unitUpdate.location)) }
          : {}),
        ...(unitUpdate.imagePaths !== undefined
          ? {
              images:
                unitUpdate.imagePaths.length > 0
                  ? unitUpdate.imagePaths.map((path) => getPublicImageUrl(path))
                  : [DEFAULT_UNIT_IMAGE],
            }
          : {}),
        ...(unitUpdate.videoPaths !== undefined
          ? {
              videos: unitUpdate.videoPaths.map((path) => getPublicImageUrl(path)),
            }
          : {}),
      };

        const updatedUnit = buildAuditSnapshot(existingUnit, sanitizedUpdate);
        const changedFields = getChangedFields(existingUnit, sanitizedUpdate);

        if (changedFields.length === 0) return;

        // ✅ Immediate UI update
        setUnits((prev) => {
          const next = prev.map((unit) =>
            unit.id === id
              ? {
                  ...unit,
                  ...sanitizedUpdate,
                }
              : unit
          );

          return sortUnits(next);
        });

        setUnitsVersion((prev) => prev + 1);

        if (user?.id) {
          try {
            await addAuditLog({
              userId: user.id,
              action: 'UPDATE',
              targetTable: 'units',
              targetId: id,
              targetPublicId: existingUnit.propertyId,
              beforeValue: existingUnit,
              afterValue: updatedUnit,
              changedFields,
              notes: `Updated unit ${existingUnit.name}`,
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
    [addAuditLog, units, user?.id]
  );

  const deleteUnit = useCallback(
    async (id: string): Promise<void> => {
      try {
        const existingUnit = units.find((unit) => unit.id === id);
        if (!existingUnit) return;

        const contractPathToDelete = existingUnit.contractFilePath ?? null;
        const imagePathsToDelete = existingUnit.imagePaths ?? [];
        const videoPathsToDelete = existingUnit.videoPaths ?? [];

        const slotImagesToDelete = parkingSlots
          .filter((slot) => slot.unitId === id)
          .map((slot) => slot.imagePath)
          .filter((path): path is string => Boolean(path));

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

        if (imagePathsToDelete.length > 0) {
          try {
            await removeStorageFiles(PROPERTY_MEDIA_BUCKET, imagePathsToDelete);
          } catch (storageError) {
            console.error('Failed to remove unit images during unit deletion:', storageError);
          }
        }

        if (videoPathsToDelete.length > 0) {
          try {
            await removeStorageFiles(PROPERTY_MEDIA_BUCKET, videoPathsToDelete);
          } catch (storageError) {
            console.error('Failed to remove unit videos during unit deletion:', storageError);
          }
        }

        if (slotImagesToDelete.length > 0) {
          try {
            await removeStorageFiles(PROPERTY_MEDIA_BUCKET, slotImagesToDelete);
          } catch (storageError) {
            console.error(
              'Failed to remove parking slot images during unit deletion:',
              storageError
            );
          }
        }

        if (contractPathToDelete) {
          try {
            await removeStorageFile(UNIT_CONTRACTS_BUCKET, contractPathToDelete);
          } catch (storageError) {
            console.error('Failed to remove contract file during unit deletion:', storageError);
          }
        }

        setUnits((prev) => prev.filter((unit) => unit.id !== id));
        setParkingSlots((prev) => prev.filter((slot) => slot.unitId !== id));

        if (user?.id) {
          try {
            await addAuditLog({
              userId: user.id,
              action: 'DELETE',
              targetTable: 'units',
              targetId: id,
              targetPublicId: existingUnit.propertyId,
              beforeValue: existingUnit,
              afterValue: undefined,
              changedFields: Object.keys(existingUnit),
              notes: `Deleted unit ${existingUnit.name}`,
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
    [addAuditLog, parkingSlots, units, user?.id]
  );

  const getUnitById = useCallback(
    (id: string) => units.find((unit) => unit.id === id),
    [units]
  );

  const getParkingSlotsByUnit = useCallback(
    (unitId: string) => parkingSlots.filter((slot) => slot.unitId === unitId),
    [parkingSlots]
  );

  const getParkingSlotById = useCallback(
    (slotId: string) => parkingSlots.find((slot) => slot.id === slotId),
    [parkingSlots]
  );

  const addParkingSlot = useCallback(
    async (slot: AddParkingSlotPayload): Promise<void> => {
      try {
        const slotId = crypto.randomUUID();

        const payload = {
          slot_id: slotId,
          unit_id: slot.unitId,
          slot_code: normalizeUppercaseText(slot.slotCode),
          label: slot.label ? normalizeText(slot.label) : null, 
          status: slot.status,
          vehicle_type: slot.vehicleType ? normalizeText(slot.vehicleType) : null,
          image_url: slot.imagePath ? normalizeText(slot.imagePath) : null,
          notes: slot.notes ? normalizeText(slot.notes) : null,
        };

        const { error } = await supabase.from('parking_slots').insert([payload]);
        if (error) throw error;

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
    [addAuditLog, user?.id]
  );

  const updateParkingSlot = useCallback(
    async (slotId: string, slotUpdate: UpdateParkingSlotPayload): Promise<void> => {
      try {
        const existingSlot = parkingSlots.find((slot) => slot.id === slotId);
        if (!existingSlot) return;

        const oldImagePath = existingSlot.imagePath ?? null;
        const nextImagePath =
          slotUpdate.imagePath !== undefined
            ? (slotUpdate.imagePath ? normalizeText(slotUpdate.imagePath) : null)
            : oldImagePath;

        const shouldDeletePreviousImage =
          slotUpdate.imagePath !== undefined &&
          oldImagePath &&
          oldImagePath !== nextImagePath;

        const payload: Record<string, unknown> = {};

        if (slotUpdate.unitId !== undefined) payload.unit_id = slotUpdate.unitId;
        if (slotUpdate.slotCode !== undefined) {
          payload.slot_code = normalizeUppercaseText(slotUpdate.slotCode);
        }
        if (slotUpdate.label !== undefined) {
          payload.label = slotUpdate.label ? normalizeText(slotUpdate.label) : null;
        }
        if (slotUpdate.vehicleType !== undefined) {
          payload.vehicle_type = slotUpdate.vehicleType
            ? normalizeText(slotUpdate.vehicleType)
            : null;
        }
        if (slotUpdate.imagePath !== undefined) {
          payload.image_url = slotUpdate.imagePath
            ? normalizeText(slotUpdate.imagePath)
            : null;
        }
        if (slotUpdate.notes !== undefined) {
          payload.notes = slotUpdate.notes ? normalizeText(slotUpdate.notes) : null;
        }

        if (Object.keys(payload).length === 0) return;

        const { error } = await supabase
          .from('parking_slots')
          .update(payload)
          .eq('slot_id', slotId);

        if (error) throw error;

        if (shouldDeletePreviousImage) {
          try {
            await removeStorageFile(PROPERTY_MEDIA_BUCKET, oldImagePath);
          } catch (storageError) {
            console.error('Failed to remove previous parking slot image:', storageError);
          }
        }

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
    [addAuditLog, parkingSlots, user?.id]
  );

  const deleteParkingSlot = useCallback(
    async (slotId: string): Promise<void> => {
      try {
        const existingSlot = parkingSlots.find((slot) => slot.id === slotId);
        if (!existingSlot) return;

        const slotImagePath = existingSlot.imagePath ?? null;

        const { error } = await supabase.from('parking_slots').delete().eq('slot_id', slotId);
        if (error) throw error;

        if (slotImagePath) {
          try {
            await removeStorageFile(PROPERTY_MEDIA_BUCKET, slotImagePath);
          } catch (storageError) {
            console.error('Failed to remove parking slot image during slot deletion:', storageError);
          }
        }

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
      unitsVersion,
      parkingSlots,
      loadingUnits,
      locationOptions: LOCATION_OPTIONS,
      defaultLocation: DEFAULT_LOCATION,
      addUnit,
      updateUnit,
      deleteUnit,
      uploadUnitImage,
      uploadUnitVideo,
      uploadUnitContract,
      getUnitById,
      refreshUnits,
      getParkingSlotsByUnit,
      getParkingSlotById,
      addParkingSlot,
      updateParkingSlot,
      deleteParkingSlot,
    }),
    [
      units,
      unitsVersion,
      parkingSlots,
      loadingUnits,
      addUnit,
      updateUnit,
      deleteUnit,
      uploadUnitImage,
      uploadUnitVideo,
      uploadUnitContract,
      getUnitById,
      refreshUnits,
      getParkingSlotsByUnit,
      getParkingSlotById,
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