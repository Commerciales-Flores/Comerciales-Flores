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
import type { Unit, UnitType } from '../data/types';
import { useRecords } from './RecordsContext';
import { useAuth } from './AuthContext';
import { getChangedFields, buildAuditSnapshot } from '../utils/auditHelpers';

interface UnitsContextType {
  units: Unit[];
  loadingUnits: boolean;
  addUnit: (unit: Omit<Unit, 'id'>) => Promise<void>;
  updateUnit: (id: string, unit: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  uploadUnitImage: (file: File) => Promise<string | null>;
  getUnitById: (id: string) => Unit | undefined;
  refreshUnits: () => Promise<void>;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const { addAuditLog } = useRecords();
  const { user } = useAuth();

  const refreshUnits = useCallback(async () => {
  setLoadingUnits(true);

  try {
    const { data: baseUnits, error: baseError } = await supabase
      .from('units')
      .select('unit_id, property_id, unit_type, title, description, is_available, location');

    if (baseError) throw baseError;
    if (!baseUnits) {
      setUnits([]);
      return;
    }

    const propertyIds = [...new Set(baseUnits.map((u) => u.property_id).filter(Boolean))];

    let propertiesData: any[] = [];
    if (propertyIds.length > 0) {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, address')
        .in('id', propertyIds);

      if (error) throw error;
      propertiesData = data ?? [];
    }

    const propertiesMap = Object.fromEntries(propertiesData.map((p) => [p.id, p]));

    const [rentalRes, functionRes, parkingRes, mediaRes] = await Promise.all([
      supabase
        .from('rental_units')
        .select('unit_id, rental_price, features, policies, description'),
      supabase
        .from('function_units')
        .select('unit_id, price_per_day, capacity, features, policies, description'),
      supabase
        .from('parking_units')
        .select('unit_id, price_per_day, price_per_hour, features, policies, description'),
      supabase
        .from('media')
        .select('unit_id, url, media_type'),
    ]);

    if (rentalRes.error) throw rentalRes.error;
    if (functionRes.error) throw functionRes.error;
    if (parkingRes.error) throw parkingRes.error;
    if (mediaRes.error) throw mediaRes.error;

    const rentalUnits = rentalRes.data ?? [];
    const functionUnits = functionRes.data ?? [];
    const parkingUnits = parkingRes.data ?? [];
    const media = mediaRes.data ?? [];

    const combinedUnits: Unit[] = baseUnits.map((base) => {
      let specific: any = null;

      if (base.unit_type === 'rental_space') {
        specific = rentalUnits.find((r) => r.unit_id === base.unit_id);
      } else if (base.unit_type === 'function_hall') {
        specific = functionUnits.find((f) => f.unit_id === base.unit_id);
      } else if (base.unit_type === 'parking_slot') {
        specific = parkingUnits.find((p) => p.unit_id === base.unit_id);
      }

      const unitMediaRecords = media.filter((m) => m.unit_id === base.unit_id);
      const imagesArray: string[] = [];

      unitMediaRecords.forEach((record) => {
        if (!record.url) return;

        const rawUrl = record.url;

        if (typeof rawUrl === 'string') {
          if (rawUrl.startsWith('http')) {
            imagesArray.push(rawUrl);
          } else {
            try {
              const parsed = JSON.parse(rawUrl);
              imagesArray.push(
                ...(Object.values(parsed).filter((v) => typeof v === 'string') as string[])
              );
            } catch {
              // ignore malformed legacy JSON strings
            }
          }
        } else if (typeof rawUrl === 'object' && rawUrl !== null) {
          imagesArray.push(
            ...(Object.values(rawUrl).filter((v) => typeof v === 'string') as string[])
          );
        }
      });

      let parsedFeatures: string[] = [];
      if (Array.isArray(specific?.features)) {
        parsedFeatures = specific.features;
      } else if (typeof specific?.features === 'string') {
        parsedFeatures = specific.features
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      const property = propertiesMap[base.property_id];

      return {
        id: base.unit_id,
        propertyId: base.property_id,
        name: base.title || '',
        type: base.unit_type as UnitType,
        description: base.description || specific?.description || '',
        price:
          base.unit_type === 'rental_space'
            ? Number(specific?.rental_price || 0)
            : base.unit_type === 'function_hall'
              ? Number(specific?.price_per_day || 0)
              : Number(specific?.price_per_day || specific?.price_per_hour || 0),
        images:
          imagesArray.length > 0
            ? imagesArray
            : ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'],
        policies: specific?.policies || '',
        available: base.is_available,
        features: parsedFeatures,
        location: base.location || '',
        property: property
          ? {
              id: property.id,
              title: property.title || '',
              address: property.address || '',
            }
          : null,
        ...(typeof specific?.capacity === 'number' ? { capacity: specific.capacity } : {}),
      };
    });

    setUnits(combinedUnits);
  } catch (error) {
    console.error('Error loading units from Supabase:', error);
    setUnits([]);
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
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `units/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('unit_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('unit_images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading unit image:', error);
      return null;
    }
  }, []);

  const addUnit = useCallback(async (unitData: Omit<Unit, 'id'>): Promise<void> => {
    try {
      const { data: baseUnit, error: baseError } = await supabase
        .from('units')
        .insert([
          {
            property_id: unitData.propertyId,
            unit_type: unitData.type,
            title: unitData.name,
            description: unitData.description,
            is_available: unitData.available,
            location: unitData.location,
          },
        ])
        .select()
        .single();

      if (baseError) throw baseError;
      const newUnitId = baseUnit.unit_id;

      const specificData: any = { unit_id: newUnitId };

      if (unitData.type === 'rental_space') {
        specificData.rental_price = unitData.price;
      }
      if (unitData.type === 'function_hall') {
        specificData.price_per_day = unitData.price;
        if (unitData.capacity !== undefined) specificData.capacity = unitData.capacity;
      }
      if (unitData.type === 'parking_slot') {
        specificData.price_per_day = unitData.price;
      }

      let targetTable = '';
      if (unitData.type === 'rental_space') targetTable = 'rental_units';
      else if (unitData.type === 'function_hall') targetTable = 'function_units';
      else if (unitData.type === 'parking_slot') targetTable = 'parking_units';

      if (targetTable) {
        const { error } = await supabase.from(targetTable).insert([specificData]);
        if (error) {
          await supabase.from('units').delete().eq('unit_id', newUnitId);
          throw error;
        }
      }

      if (unitData.images.length > 0) {
        const jsonbUrls = unitData.images.reduce((acc, url, index) => {
          acc[`image_${index + 1}`] = url;
          return acc;
        }, {} as Record<string, string>);

        const { error: mediaError } = await supabase.from('media').insert([
          {
            unit_id: newUnitId,
            url: jsonbUrls,
            media_type: 'image',
          },
        ]);

        if (mediaError) throw mediaError;
      }

      await refreshUnits();

      const createdUnit: Unit = {
        ...unitData,
        id: newUnitId,
      };

      try {
        if (user?.id) {
        await addAuditLog({
          userId: user?.id,
          action: 'CREATE',
          targetTable: 'units',
          targetId: newUnitId,
          beforeValue: undefined, 
          afterValue: createdUnit,
          changedFields: Object.keys(createdUnit),
          notes: `Created unit ${createdUnit.name}`,
        });
      }
      } catch (auditError) {
        console.error('Failed to audit unit creation:', auditError);
      }
    } catch (error) {
      console.error('Error adding unit:', error);
      throw error;
    }
  }, [addAuditLog, refreshUnits, user?.id]);

  const updateUnit = useCallback(async (id: string, unitUpdate: Partial<Unit>): Promise<void> => {
    try {
      const existingUnit = units.find((u) => u.id === id);
      if (!existingUnit) return;

      const basePayload: any = {};
      if (unitUpdate.name !== undefined) basePayload.title = unitUpdate.name;
      if (unitUpdate.description !== undefined) basePayload.description = unitUpdate.description;
      if (unitUpdate.available !== undefined) basePayload.is_available = unitUpdate.available;
      if (unitUpdate.location !== undefined) basePayload.location = unitUpdate.location;

      if (Object.keys(basePayload).length > 0) {
        const { error } = await supabase.from('units').update(basePayload).eq('unit_id', id);
        if (error) throw error;
      }

      const specificPayload: any = {};
      if (existingUnit.type === 'rental_space' && unitUpdate.price !== undefined) {
        specificPayload.rental_price = unitUpdate.price;
      }
      if (existingUnit.type === 'function_hall') {
        if (unitUpdate.price !== undefined) specificPayload.price_per_day = unitUpdate.price;
        if (unitUpdate.capacity !== undefined) specificPayload.capacity = unitUpdate.capacity;
      }
      if (existingUnit.type === 'parking_slot' && unitUpdate.price !== undefined) {
        specificPayload.price_per_day = unitUpdate.price;
      }

      if (Object.keys(specificPayload).length > 0) {
        let tableName = '';
        if (existingUnit.type === 'rental_space') tableName = 'rental_units';
        else if (existingUnit.type === 'function_hall') tableName = 'function_units';
        else if (existingUnit.type === 'parking_slot') tableName = 'parking_units';

        if (tableName) {
          const { error } = await supabase.from(tableName).update(specificPayload).eq('unit_id', id);
          if (error) throw error;
        }
      }

      if (unitUpdate.images !== undefined) {
        const { error: deleteMediaError } = await supabase.from('media').delete().eq('unit_id', id);
        if (deleteMediaError) throw deleteMediaError;

        if (unitUpdate.images.length > 0) {
          const jsonbUrls = unitUpdate.images.reduce((acc, url, index) => {
            acc[`image_${index + 1}`] = url;
            return acc;
          }, {} as Record<string, string>);

          const { error: insertMediaError } = await supabase.from('media').insert([
            {
              unit_id: id,
              url: jsonbUrls,
              media_type: 'image',
            },
          ]);

          if (insertMediaError) throw insertMediaError;
        }
      }

      const updatedUnit = buildAuditSnapshot(existingUnit, unitUpdate);
      const changedFields = getChangedFields(existingUnit, unitUpdate);

      await refreshUnits();

      if (changedFields.length === 0) return;

      try {
        if (user?.id) {
        await addAuditLog({
          userId: user?.id,
          action: 'UPDATE',
          targetTable: 'units',
          targetId: id,
          beforeValue: existingUnit,
          afterValue: updatedUnit,
          changedFields,
          notes: `Updated unit ${existingUnit.name}`,
        });
      }
      } catch (auditError) {
        console.error('Failed to audit unit update:', auditError);
      }
    } catch (error) {
      console.error('Error updating unit:', error);
      throw error;
    }
  }, [addAuditLog, refreshUnits, units, user?.id]);

  const deleteUnit = useCallback(async (id: string): Promise<void> => {
    try {
      const existingUnit = units.find((u) => u.id === id);
      if (!existingUnit) return;

      const { error: mediaError } = await supabase.from('media').delete().eq('unit_id', id);
      if (mediaError) throw mediaError;

      let tableName = '';
      if (existingUnit.type === 'rental_space') tableName = 'rental_units';
      else if (existingUnit.type === 'function_hall') tableName = 'function_units';
      else if (existingUnit.type === 'parking_slot') tableName = 'parking_units';

      if (tableName) {
        const { error: specificError } = await supabase.from(tableName).delete().eq('unit_id', id);
        if (specificError) throw specificError;
      }

      const { error } = await supabase.from('units').delete().eq('unit_id', id);
      if (error) throw error;

      setUnits((prev) => prev.filter((u) => u.id !== id));

      try {
        if (user?.id) {
        await addAuditLog({
          userId: user?.id,
          action: 'DELETE',
          targetTable: 'units',
          targetId: id,
          beforeValue: existingUnit,
          afterValue: undefined,
          changedFields: Object.keys(existingUnit),
          notes: `Deleted unit ${existingUnit.name}`,
        });
      }
      } catch (auditError) {
        console.error('Failed to audit unit deletion:', auditError);
      }
    } catch (error) {
      console.error('Error deleting unit:', error);
      throw error;
    }
  }, [addAuditLog, units, user?.id]);

  const getUnitById = useCallback(
    (id: string) => units.find((u) => u.id === id),
    [units]
  );

  const value = useMemo(
    () => ({
      units,
      loadingUnits,
      addUnit,
      updateUnit,
      deleteUnit,
      uploadUnitImage,
      getUnitById,
      refreshUnits,
    }),
    [units, loadingUnits, addUnit, updateUnit, deleteUnit, uploadUnitImage, getUnitById, refreshUnits]
  );

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (!context) throw new Error('useUnits must be used within UnitsProvider');
  return context;
}