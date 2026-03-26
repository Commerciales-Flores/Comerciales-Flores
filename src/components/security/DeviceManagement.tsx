import { useEffect, useState } from 'react';
import {
  Laptop,
  Smartphone,
  ShieldCheck,
  Trash2,
  MonitorSmartphone,
  RefreshCw,
} from 'lucide-react';
import supabase from '../../supabaseClient';

type TrustedDevice = {
  trusted_device_id: string;
  device_name: string | null;
  device_fingerprint: string | null;
  user_agent: string | null;
  is_trusted: boolean;
  last_ip: string | null;
  last_seen_at: string;
  created_at: string;
  location_label?: string | null;
};

function isMobileDevice(userAgent?: string | null) {
  const ua = userAgent?.toLowerCase() ?? '';
  return ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
}

function getOperatingSystem(userAgent?: string | null) {
  const ua = userAgent?.toLowerCase() ?? '';

  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os')) return 'macOS';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS';
  if (ua.includes('linux')) return 'Linux';

  return 'Unknown OS';
}

function getOrCreateDeviceFingerprint() {
  const storageKey = 'device_fingerprint';
  let fingerprint = localStorage.getItem(storageKey);

  if (!fingerprint) {
    fingerprint = crypto.randomUUID();
    localStorage.setItem(storageKey, fingerprint);
  }

  return fingerprint;
}

function isCurrentDevice(device: TrustedDevice) {
  if (!device.device_fingerprint) return false;
  return device.device_fingerprint === getOrCreateDeviceFingerprint();
}

function getBrowserName(userAgent?: string | null) {
  const ua = userAgent?.toLowerCase() ?? '';

  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('opr') || ua.includes('opera')) return 'Opera';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';

  return 'Browser';
}

function getReadableDeviceName(device: TrustedDevice) {
  if (device.device_name?.trim()) return device.device_name.trim();

  const browser = getBrowserName(device.user_agent);
  const os = getOperatingSystem(device.user_agent);

  return `${browser} on ${os}`;
}

function getReadableDeviceType(device: TrustedDevice) {
  return isMobileDevice(device.user_agent) ? 'Mobile device' : 'Desktop browser';
}

function maskIpAddress(ip?: string | null) {
  if (!ip) return 'Unavailable';

  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }

  return ip;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Unavailable';

  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTimeOnly(value?: string | null) {
  if (!value) return 'Unavailable';

  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateOnly(value?: string | null) {
  if (!value) return 'Unavailable';

  return new Date(value).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DeviceManagement() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadDevices = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);

    setError('');

    const { data, error } = await supabase.rpc('get_my_trusted_devices');

    if (error) {
      setError('Failed to load trusted devices.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setDevices(Array.isArray(data) ? data : []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void loadDevices();
  }, []);

  const handleRemove = async (trustedDeviceId: string) => {
    setRemovingId(trustedDeviceId);
    setError('');

    const { data, error } = await supabase.rpc('remove_my_trusted_device', {
      p_trusted_device_id: trustedDeviceId,
    });

    if (error || !data) {
      setError('Failed to remove trusted device.');
      setRemovingId(null);
      return;
    }

    setDevices((prev) => prev.filter((item) => item.trusted_device_id !== trustedDeviceId));
    setRemovingId(null);
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck className="size-5" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">Trusted Devices</h3>
            <p className="mt-1 text-sm text-slate-500">
              Manage browsers and devices that can sign in without another verification step.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadDevices('refresh')}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Loading trusted devices...
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No trusted devices found yet.
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {devices.length} trusted {devices.length === 1 ? 'device' : 'devices'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Remove a device to require verification again on its next sign-in.
                </p>
              </div>

              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                <MonitorSmartphone className="size-5" />
              </div>
            </div>

            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {devices.map((device) => {
                const mobile = isMobileDevice(device.user_agent);

                return (
                  <div
                    key={device.trusted_device_id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                        {mobile ? (
                          <Smartphone className="size-5" />
                        ) : (
                          <Laptop className="size-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-bold text-slate-900">
                            {getReadableDeviceName(device)}
                          </h4>

                          {device.is_trusted && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                              Trusted
                            </span>
                          )}

                            {isCurrentDevice(device) && (
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                                Current Device
                            </span>
                            )}
                        </div>

                        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                          {getReadableDeviceType(device)}
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-6 text-sm text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl bg-white px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Last Seen
                            </p>
                            <div className="mt-1 flex flex-col leading-tight text-slate-700">
                            <span className="font-medium">
                                {formatDateOnly(device.last_seen_at)}
                            </span>
                            <span className="text-xs text-slate-500">
                                {formatTimeOnly(device.last_seen_at)}
                            </span>
                            </div>
                          </div>

                          <div className="rounded-xl bg-white px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Added
                            </p>
                            <p className="mt-1 font-medium text-slate-700">
                              {formatDateOnly(device.created_at)}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Location
                            </p>
                            <div className="mt-1 flex flex-col leading-tight text-slate-700">
                              <span className="font-medium">
                                {device.location_label || 'Unknown'}
                              </span>
                              <span className="text-xs text-slate-500">
                                Approximate
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl bg-white px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              IP Address
                            </p>
                            <p className="mt-1 font-medium text-slate-700">
                              {maskIpAddress(device.last_ip)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={removingId === device.trusted_device_id}
                      onClick={() => handleRemove(device.trusted_device_id)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="size-4" />
                      {removingId === device.trusted_device_id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}