import { useEffect, useState } from 'react';
import {
  Laptop,
  Smartphone,
  ShieldCheck,
  Trash2,
  MonitorSmartphone,
  RefreshCw,
  ShieldAlert,
  Wifi,
  Globe,
  Clock3,
  Server,
  ChevronDown,
  ChevronUp,
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
  location_label: string | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  location_timezone: string | null;
  network_isp: string | null;
  network_asn: string | null;
  is_proxy: boolean;
  is_vpn: boolean;
  is_hosting: boolean;
  suspicious_login: boolean;
  suspicious_reason: string | null;
  location_confidence: number | null;
  location_source: string | null;
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

function getConfidenceTone(confidence?: number | null) {
  if (typeof confidence !== 'number') {
    return {
      badge: 'bg-slate-100 text-slate-700',
      label: 'Unknown',
    };
  }

  if (confidence >= 80) {
    return {
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'High',
    };
  }

  if (confidence >= 50) {
    return {
      badge: 'bg-amber-100 text-amber-700',
      label: 'Medium',
    };
  }

  return {
    badge: 'bg-rose-100 text-rose-700',
    label: 'Low',
  };
}

function DetailField({
  label,
  value,
  subvalue,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  subvalue?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <div className="mt-1 min-w-0">
        <p className="text-[13px] font-semibold leading-[1.45] text-slate-800 break-words">
          {value}
        </p>

        {subvalue ? (
          <p className="mt-0.5 text-[11px] leading-[1.4] text-slate-500 break-words">
            {subvalue}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ConfidenceField({
  label,
  toneClass,
  toneLabel,
  value,
  className = '',
}: {
  label: string;
  toneClass: string;
  toneLabel: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <div className="mt-1 min-w-0">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${toneClass}`}
        >
          {toneLabel}
        </span>

        <p className="mt-0.5 text-[11px] leading-[1.4] text-slate-500">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function DeviceManagement() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

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

  const toggleDetails = (trustedDeviceId: string) => {
    setExpandedDetails((prev) => ({
      ...prev,
      [trustedDeviceId]: !prev[trustedDeviceId],
    }));
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck className="size-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-900">Trusted Devices</h3>
            <p className="mt-1 text-[13px] text-slate-500">
              Manage browsers and devices that can sign in without another verification step.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Location is approximate and based on network IP.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadDevices('refresh')}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-[13px] text-slate-500">
            Loading trusted devices...
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-[13px] text-slate-500">
            No trusted devices found yet.
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900">
                  {devices.length} trusted {devices.length === 1 ? 'device' : 'devices'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Remove a device to require verification again on its next sign-in.
                </p>
              </div>

              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm sm:flex">
                <MonitorSmartphone className="size-5" />
              </div>
            </div>

            <div className="max-h-[440px] space-y-4 overflow-y-auto pr-1">
              {devices.map((device) => {
                const mobile = isMobileDevice(device.user_agent);
                const current = isCurrentDevice(device);
                const confidenceTone = getConfidenceTone(device.location_confidence);
                const showExtra = !!expandedDetails[device.trusted_device_id];

                return (
                  <div
                    key={device.trusted_device_id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                            {mobile ? <Smartphone className="size-5" /> : <Laptop className="size-5" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="min-w-0 text-[14px] font-bold text-slate-900 break-words">
                                {getReadableDeviceName(device)}
                              </h4>

                              {device.is_trusted && (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                                  Trusted
                                </span>
                              )}

                              {current && (
                                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                                  Current Device
                                </span>
                              )}

                              {device.suspicious_login && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                                  Suspicious
                                </span>
                              )}

                              {device.is_vpn && (
                                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">
                                  VPN
                                </span>
                              )}

                              {device.is_proxy && (
                                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">
                                  Proxy
                                </span>
                              )}

                              {device.is_hosting && (
                                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">
                                  Hosting Network
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                              {getReadableDeviceType(device)}
                            </p>

                            {device.suspicious_login && device.suspicious_reason && (
                              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                                <div className="flex items-start gap-2">
                                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                                      Security Note
                                    </p>
                                    <p className="mt-1 text-[13px] text-amber-800">
                                      {device.suspicious_reason}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-6">
  <DetailField
    label="Last Seen"
    value={formatDateOnly(device.last_seen_at)}
    subvalue={formatTimeOnly(device.last_seen_at)}
  />

  <DetailField
    label="Added"
    value={formatDateOnly(device.created_at)}
    subvalue={formatTimeOnly(device.created_at)}
  />

  <DetailField
    label="Location"
    value={device.location_label || 'Unknown'}
    subvalue="Approximate"
    className="xl:col-span-1"
  />

  <DetailField
    label="IP Address"
    value={maskIpAddress(device.last_ip)}
  />
</div>

                            <div className="relative mt-5 border-t border-slate-200 pt-5">
                              <button
                                type="button"
                                onClick={() => toggleDetails(device.trusted_device_id)}
                                className="absolute left-1/2 top-0 inline-flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                                aria-label={showExtra ? 'Hide extra details' : 'Show extra details'}
                              >
                                {showExtra ? (
                                  <ChevronUp className="size-4" />
                                ) : (
                                  <ChevronDown className="size-4" />
                                )}
                              </button>

                              {showExtra && (
                                <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-6">
                                  <DetailField
                                    label="Network"
                                    value={device.network_isp || 'Unavailable'}
                                    subvalue={device.network_asn || 'ASN unavailable'}
                                  />

                                  <DetailField
                                    label="Timezone"
                                    value={device.location_timezone || 'Unavailable'}
                                  />

                                  <ConfidenceField
                                    label="Confidence"
                                    toneClass={confidenceTone.badge}
                                    toneLabel={confidenceTone.label}
                                    value={
                                      typeof device.location_confidence === 'number'
                                        ? `${device.location_confidence}%`
                                        : 'N/A'
                                    }
                                  />

                                  <DetailField
                                    label="Source"
                                    value={device.location_source || 'Unavailable'}
                                  />
                                </div>
                              )}
                            </div>

                            {(device.is_vpn || device.is_proxy || device.is_hosting) && (
                              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <div className="flex items-start gap-2">
                                  <Server className="mt-0.5 size-4 shrink-0 text-slate-500" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      Network Flags
                                    </p>
                                    <p className="mt-1 text-[13px] text-slate-700">
                                      {[
                                        device.is_vpn ? 'VPN detected' : null,
                                        device.is_proxy ? 'Proxy detected' : null,
                                        device.is_hosting ? 'Hosting network detected' : null,
                                      ]
                                        .filter(Boolean)
                                        .join(' • ')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="xl:pl-5">
                        <button
                          type="button"
                          disabled={removingId === device.trusted_device_id}
                          onClick={() => handleRemove(device.trusted_device_id)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
                        >
                          <Trash2 className="size-4" />
                          {removingId === device.trusted_device_id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
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