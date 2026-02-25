import supabase from '../supabaseClient';
import type { Unit, UnitType } from '../contexts/DataContext';

// url column is a jsonb object: { "room": "https://...", "main_hall": "https://..." }
// so we extract ALL values from the object as an array of URLs
function resolveUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') return [raw]; // plain string fallback
  if (typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>)
      .filter((v): v is string => typeof v === 'string');
  }
  return [];
}

export async function fetchUnits(limit = 3): Promise<Unit[]> {

  // ── Step 1: fetch base units ──────────────────────────────────────────────
  const { data: unitsData, error: unitsError } = await supabase
    .from('units')
    .select('unit_id, unit_type, price, is_available')
    .eq('is_available', true)
    .limit(limit);

  if (unitsError || !unitsData?.length) {
    console.error('fetchUnits error:', unitsError?.message);
    return [];
  }

  const unitIds = unitsData.map((u) => u.unit_id);

  // ── Step 2: fetch all detail tables + ALL media rows in parallel ───────────
  const [
    { data: propertiesData },
    { data: rentalData },
    { data: parkingData },
    { data: mediaData },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('unit_id, title, description, policies, features')
      .in('unit_id', unitIds),

    supabase
      .from('rental_units')
      .select('unit_id, title, description, policies, features')
      .in('unit_id', unitIds),

    supabase
      .from('parking_units')
      .select('unit_id, title, description, policies, features')
      .in('unit_id', unitIds),

    supabase
      .from('media')
      .select('unit_id, url')   // ✅ fetch ALL media rows, no type filtering
      .in('unit_id', unitIds),
  ]);

  // ── Step 3: index detail tables by unit_id ────────────────────────────────
  const propertiesMap = Object.fromEntries((propertiesData ?? []).map((r) => [r.unit_id, r]));
  const rentalMap     = Object.fromEntries((rentalData     ?? []).map((r) => [r.unit_id, r]));
  const parkingMap    = Object.fromEntries((parkingData    ?? []).map((r) => [r.unit_id, r]));

  // ✅ each media row's url is a jsonb object — extract all values and flatten
  const mediaMap = (mediaData ?? []).reduce<Record<string, string[]>>((acc, m) => {
    const urls = resolveUrls(m.url);
    if (urls.length > 0) {
      if (!acc[m.unit_id]) acc[m.unit_id] = [];
      acc[m.unit_id].push(...urls);  // spread all urls from this row into the array
    } else {
      console.warn(`⚠️ No urls found for unit ${m.unit_id}:`, m.url);
    }
    return acc;
  }, {});

  console.log('🔍 mediaMap:', mediaMap); // should show unit_id → [url1, url2, ...]

  const typeMap: Record<string, UnitType> = {
    rental_space:  'rental_space',
    function_hall: 'function_hall',
    parking_slot:  'parking_slot',
  };

  // ── Step 4: assemble Unit objects ─────────────────────────────────────────
  return unitsData.map((row): Unit => {
    const detail =
      row.unit_type === 'rental_space'  ? propertiesMap[row.unit_id] :
      row.unit_type === 'function_hall' ? rentalMap[row.unit_id]     :
      row.unit_type === 'parking_slot'  ? parkingMap[row.unit_id]    :
      undefined;

    const images = mediaMap[row.unit_id] ?? [];

    console.log(`✅ unit ${row.unit_id} (${row.unit_type}) → ${images.length} image(s)`);

    return {
      id:          row.unit_id,
      name:        detail?.title       ?? 'Untitled Unit',
      type:        typeMap[row.unit_type] ?? 'rental_space',
      description: detail?.description ?? '',
      price:       row.price,
      images:      images.length > 0 ? images : [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
      ],
      policies:    detail?.policies    ?? '',
      features:    detail?.features    ?? [],
      available:   row.is_available,
    };
  });
}