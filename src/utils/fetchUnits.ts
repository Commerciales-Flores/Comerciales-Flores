import supabase from '../supabaseClient';
import type { Unit, UnitType } from '../contexts/DataContext';

// url column is a jsonb object: { "room": "https://...", "main_hall": "https://..." }
function resolveUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') return [raw];
  if (typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>)
      .filter((v): v is string => typeof v === 'string');
  }
  return [];
}

export async function fetchUnits(limit = 3): Promise<Unit[]> {
  // Step 1: fetch base units
  const { data: unitsData, error: unitsError } = await supabase
    .from('units')
    .select('unit_id, property_id, unit_type, title, description, is_available, location')
    .eq('is_available', true)
    .limit(limit);

  if (unitsError || !unitsData?.length) {
    console.error('fetchUnits error:', unitsError?.message);
    return [];
  }

  const unitIds = unitsData.map((u) => u.unit_id);
  const propertyIds = [...new Set(unitsData.map((u) => u.property_id).filter(Boolean))];

  // Step 2: fetch related data in parallel
  const [
    { data: propertiesData },
    { data: rentalData },
    { data: functionData },
    { data: parkingData },
    { data: mediaData },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('property_id, title, address')
      .in('property_id', propertyIds),

    supabase
      .from('rental_units')
      .select('unit_id, rental_price')
      .in('unit_id', unitIds),

    supabase
      .from('function_units')
      .select('unit_id, price_per_day, capacity')
      .in('unit_id', unitIds),

    supabase
      .from('parking_units')
      .select('unit_id, price_per_hour, price_per_day')
      .in('unit_id', unitIds),

    supabase
      .from('media')
      .select('unit_id, url')
      .in('unit_id', unitIds),
  ]);

  // Step 3: index related data
  const propertiesMap = Object.fromEntries(
    (propertiesData ?? []).map((r) => [r.property_id, r])
  );
  const rentalMap = Object.fromEntries(
    (rentalData ?? []).map((r) => [r.unit_id, r])
  );
  const functionMap = Object.fromEntries(
    (functionData ?? []).map((r) => [r.unit_id, r])
  );
  const parkingMap = Object.fromEntries(
    (parkingData ?? []).map((r) => [r.unit_id, r])
  );

  const mediaMap = (mediaData ?? []).reduce<Record<string, string[]>>((acc, m) => {
    const urls = resolveUrls(m.url);
    if (urls.length > 0) {
      if (!acc[m.unit_id]) acc[m.unit_id] = [];
      acc[m.unit_id].push(...urls);
    }
    return acc;
  }, {});

  const typeMap: Record<string, UnitType> = {
    rental_space: 'rental_space',
    function_hall: 'function_hall',
    parking_slot: 'parking_slot',
  };

  // Step 4: assemble Unit objects
  return unitsData.map((row): Unit => {
  const property = propertiesMap[row.property_id];

  const unitType = typeMap[row.unit_type] ?? 'rental_space';

  const price =
    unitType === 'rental_space'
      ? Number(rentalMap[row.unit_id]?.rental_price ?? 0)
      : unitType === 'function_hall'
      ? Number(functionMap[row.unit_id]?.price_per_day ?? 0)
      : Number(
          parkingMap[row.unit_id]?.price_per_day ??
          parkingMap[row.unit_id]?.price_per_hour ??
          0
        );

  const capacity =
    unitType === 'function_hall'
      ? functionMap[row.unit_id]?.capacity
      : undefined;

  const images =
    mediaMap[row.unit_id] && mediaMap[row.unit_id].length > 0
      ? mediaMap[row.unit_id]
      : ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'];

  return {
    id: row.unit_id,
    propertyId: row.property_id,
    location: row.location ?? '',
    name: row.title ?? 'Untitled Unit',
    type: unitType,
    description: row.description ?? '',
    price,
    images,
    imagePaths: images, // <- add this
    policies: '',
    capacity,
    available: row.is_available,
    features: [],
    property: property
      ? {
          id: property.property_id,
          title: property.title ?? '',
          address: property.address ?? '',
        }
      : null,
  };
});
}