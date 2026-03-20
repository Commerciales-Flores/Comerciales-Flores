import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Search,
  Trash2,
} from 'lucide-react';

type AddressResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type AddressPickerProps = {
  value: string;
  latitude?: string;
  longitude?: string;
  onChange: (payload: {
    address: string;
    latitude: string;
    longitude: string;
  }) => void;
};

const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function RecenterMap({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  return null;
}

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default function AddressPicker({
  value,
  latitude,
  longitude,
  onChange,
}: AddressPickerProps) {
  const parsedLat = latitude ? Number(latitude) : NaN;
  const parsedLng = longitude ? Number(longitude) : NaN;

  const [query, setQuery] = useState(value);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [selectedAddress, setSelectedAddress] = useState(value);
  const [showMap, setShowMap] = useState(true);

  const [position, setPosition] = useState<[number, number] | null>(
    Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
      ? [parsedLat, parsedLng]
      : null
  );

  useEffect(() => {
    setQuery(value);
    setSelectedAddress(value);
  }, [value]);

  useEffect(() => {
    const lat = latitude ? Number(latitude) : NaN;
    const lng = longitude ? Number(longitude) : NaN;

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setPosition([lat, lng]);
    }
  }, [latitude, longitude]);

  const mapCenter = useMemo<[number, number]>(() => {
    return position ?? DEFAULT_CENTER;
  }, [position]);

  const mapZoom = position ? 16 : 12;
  const addressConfirmed = Boolean(selectedAddress && position);

  const clearSelection = () => {
    setQuery('');
    setResults([]);
    setSelectedAddress('');
    setPosition(null);
    setShowMap(true);

    onChange({
      address: '',
      latitude: '',
      longitude: '',
    });
  };

  const hasConfirmedAddress =
  selectedAddress.trim().length > 0 && position !== null;

  const searchAddress = async () => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        q: trimmed,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to search address');
      }

      const data: AddressResult[] = await res.json();
      setResults(data);
      setShowMap(true);
    } catch (error) {
      console.error('Address search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'jsonv2',
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to reverse geocode');
      }

      const data = await res.json();
      const displayName = data?.display_name ?? `${lat}, ${lng}`;

      setSelectedAddress(displayName);
      setQuery(displayName);

      onChange({
        address: displayName,
        latitude: String(lat),
        longitude: String(lng),
      });
    } catch (error) {
      console.error('Reverse geocoding failed:', error);

      const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setSelectedAddress(fallback);
      setQuery(fallback);

      onChange({
        address: fallback,
        latitude: String(lat),
        longitude: String(lng),
      });
    }
  };

  const selectResult = (item: AddressResult) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);

    setSelectedAddress(item.display_name);
    setQuery(item.display_name);
    setPosition([lat, lng]);
    setResults([]);
    setShowMap(true);

    onChange({
      address: item.display_name,
      latitude: item.lat,
      longitude: item.lon,
    });
  };

  const handleMapPick = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setResults([]);
    setShowMap(true);
    await reverseGeocode(lat, lng);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          Confirm Address
        </label>

        <div className="relative">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void searchAddress();
                  }
                }}
                className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                placeholder="Search address, building, street, or landmark"
              />
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>

            <div className="flex gap-2">
              <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => void searchAddress()}
                    disabled={loading}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                    <Search className="size-3.5" />
                    {loading ? 'Searching...' : 'Search'}
                </button>

                <button
                    type="button"
                    onClick={clearSelection}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition inline-flex items-center justify-center gap-1.5"
                >
                    <Trash2 className="size-3.5" />
                    Clear
                </button>
                </div>
            </div>
          </div>

          {(results.length > 0 || query) && (
            <div className="absolute left-0 right-0 top-full mt-2 z-[1000] rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xl">
                {results.length > 0 ? (
                results.map((item, index) => (
                    <button
                    key={`${item.lat}-${item.lon}-${index}`}
                    type="button"
                    onClick={() => selectResult(item)}
                    className="w-full text-left px-4 py-3 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition"
                    >
                    <p className="text-sm font-semibold text-slate-800">
                        {item.display_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {Number(item.lat).toFixed(6)}, {Number(item.lon).toFixed(6)}
                    </p>
                    </button>
                ))
                ) : (
                <div className="px-4 py-4 text-sm text-slate-500 flex items-center gap-2">
                    <MapPin className="size-4 text-slate-400" />
                    No results found. Try a more specific address or click the map.
                </div>
                )}
            </div>
            )}
        </div>

        <p className="text-xs text-slate-500">
          Search your address, choose the closest result, then drag the pin if needed.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-sm font-bold text-slate-900">Map Preview</p>
            <p className="text-xs text-slate-500">
              {addressConfirmed
                ? 'Address confirmed. You can still adjust the pin.'
                : 'Use the map to verify the exact location.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowMap((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            {showMap ? (
              <>
                <ChevronUp className="size-4" />
                Hide Map
              </>
            ) : (
              <>
                <ChevronDown className="size-4" />
                Show Map
              </>
            )}
          </button>
        </div>

        {showMap && (
          <div className="h-[280px] w-full">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom
              className="h-full w-full"
            >
              <RecenterMap center={mapCenter} zoom={mapZoom} />

              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapClickHandler onPick={handleMapPick} />

              {position && (
                <Marker
                  position={position}
                  draggable
                  icon={markerIcon}
                  eventHandlers={{
                    dragend: async (e) => {
                      const marker = e.target as L.Marker;
                      const next = marker.getLatLng();
                      await handleMapPick(next.lat, next.lng);
                    },
                  }}
                >
                  <Popup>Selected address</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        )}

            {hasConfirmedAddress && (
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-emerald-100 p-1.5">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                    </div>

                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
                        Confirmed Address
                        </p>
                        <p className="text-sm font-medium text-slate-700 mt-1 break-words">
                        {selectedAddress}
                        </p>

                        {position && (
                        <p className="text-xs text-slate-500 mt-1">
                            Lat: {position[0].toFixed(6)} | Lng: {position[1].toFixed(6)}
                        </p>
                        )}
                    </div>
                    </div>
                </div>
                )}
            </div>
      </div>
  );
}