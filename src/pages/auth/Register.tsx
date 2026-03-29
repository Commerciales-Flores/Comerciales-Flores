import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AddressPicker from '../../components/common/AddressPicker';
import {
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ');
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeAddress = (value: string) => value.trim().replace(/\s+/g, ' ');

const normalizePhone = (value: string) => {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('09') && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }

  if (digits.startsWith('639') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('9') && digits.length === 10) {
    return `+63${digits}`;
  }

  if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return raw;
};

export default function Register() {
  const { register, authActionPending } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    address: '',
    latitude: '',
    longitude: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = useMemo(() => {
    const { password } = formData;
    if (!password) return '';

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
        return 'Very Weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Medium';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  }, [formData.password]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (formData.password.length >= 8) score++;
    if (/[A-Z]/.test(formData.password)) score++;
    if (/[0-9]/.test(formData.password)) score++;
    if (/[^A-Za-z0-9]/.test(formData.password)) score++;
    return score;
  }, [formData.password]);

  const handleBlur = useCallback((field: keyof typeof formData) => {
    setFormData((prev) => {
      const next = { ...prev };

      switch (field) {
        case 'firstName':
          next.firstName = normalizeName(prev.firstName);
          break;
        case 'lastName':
          next.lastName = normalizeName(prev.lastName);
          break;
        case 'email':
          next.email = normalizeEmail(prev.email);
          break;
        case 'contactNumber':
          next.contactNumber = normalizePhone(prev.contactNumber);
          break;
        case 'address':
          next.address = normalizeAddress(prev.address);
          break;
        case 'password':
        case 'confirmPassword':
          next[field] = prev[field].trim();
          break;
        default:
          break;
      }

      return next;
    });
  }, []);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};

    const cleanedFirstName = normalizeName(formData.firstName);
    const cleanedLastName = normalizeName(formData.lastName);
    const cleanedEmail = normalizeEmail(formData.email);
    const cleanedContactNumber = normalizePhone(formData.contactNumber);
    const cleanedAddress = normalizeAddress(formData.address);

    if (!cleanedFirstName) errs.firstName = 'First name is required.';
    if (!cleanedLastName) errs.lastName = 'Last name is required.';

    if (!cleanedEmail) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
      errs.email = 'Invalid email format.';
    }

    if (cleanedContactNumber && !/^\+\d{10,15}$/.test(cleanedContactNumber)) {
      errs.contactNumber = 'Invalid phone number.';
    }

    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/[A-Z]/.test(formData.password)) {
      errs.password = 'Include an uppercase letter.';
    } else if (!/[0-9]/.test(formData.password)) {
      errs.password = 'Include a number.';
    } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
      errs.password = 'Include a special character.';
    }

    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (cleanedAddress && (!formData.latitude || !formData.longitude)) {
      errs.address = 'Please confirm your address on the map.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authActionPending) return;

    const cleanedFirstName = normalizeName(formData.firstName);
    const cleanedLastName = normalizeName(formData.lastName);
    const cleanedEmail = normalizeEmail(formData.email);
    const cleanedContactNumber = normalizePhone(formData.contactNumber);
    const cleanedAddress = normalizeAddress(formData.address);

    setFormData((prev) => ({
      ...prev,
      firstName: cleanedFirstName,
      lastName: cleanedLastName,
      email: cleanedEmail,
      contactNumber: cleanedContactNumber,
      address: cleanedAddress,
    }));

    const isValid = validate();
    if (!isValid) return;

    setErrors({});

    try {
      const result = await register({
        firstName: cleanedFirstName,
        lastName: cleanedLastName,
        email: cleanedEmail,
        password: formData.password,
        ...(cleanedContactNumber ? { contactNumber: cleanedContactNumber } : {}),
        address: cleanedAddress || '',
      });

      if (!result.success) {
        switch (result.error) {
          case 'busy':
            setErrors({ submit: 'Please wait a moment and try again.' });
            break;
          case 'registration_failed':
          default:
            setErrors({
              submit: 'Unable to create your account right now. Please try again.',
            });
            break;
        }
        return;
      }

      navigate('/login', {
        replace: true,
        state: {
          message:
            result.message,
          email: cleanedEmail,
        },
      });
    } catch (err) {
      console.error('Unexpected registration error:', err);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    }
  };

  const visibleErrors = useMemo(
    () => Object.values(errors).filter(Boolean),
    [errors]
  );

  const addressConfirmed = Boolean(formData.address && formData.latitude && formData.longitude);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-100">
      <div className="bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[1100px] overflow-hidden border border-slate-200/60">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-12 bg-slate-900 flex flex-col justify-between relative overflow-hidden hidden md:flex">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-400/20 text-blue-400 text-[11px] font-bold uppercase tracking-[0.1em] mb-8">
                <Building2 className="size-3.5" />
                Comerciales Flores
              </div>

              <h2 className="text-4xl font-bold text-white leading-[1.15] mb-6 tracking-tight">
                Discover Your <br />
                <span className="text-blue-500">Perfect Space.</span>
              </h2>

              <p className="text-slate-400 mb-10 leading-relaxed font-medium">
                Join our community to reserve premium commercial spaces, event venues,
                and secure parking effortlessly.
              </p>

              <div className="space-y-5">
                {[
                  'Browse and reserve spaces in real-time',
                  'Secure and transparent payment system',
                  'Instant reservation confirmations',
                ].map((text, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 text-sm text-slate-300 font-medium"
                  >
                    <div className="size-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <CheckCircle2 className="size-4 text-blue-500" />
                    </div>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-800 relative z-10">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                Need assistance?
              </p>
              <p className="text-sm text-white font-semibold transition-colors">
                support@comercialesflores.ph
              </p>
            </div>

            <div className="absolute top-0 right-0 size-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
          </div>

          <main className="p-6 md:p-10 bg-white">
            <div className="mb-10">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Create Account
              </h1>
              <p className="text-slate-500 text-sm mt-1.5 font-medium">
                Please fill in your details to get started.
              </p>
            </div>

            {visibleErrors.length > 0 && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-1 animate-in fade-in slide-in-from-top-2">
                {visibleErrors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-rose-700 text-xs font-bold"
                  >
                    <AlertCircle className="size-4 flex-shrink-0" />
                    {err}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    onBlur={() => handleBlur('firstName')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                    placeholder="Juan Dela"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    onBlur={() => handleBlur('lastName')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                    placeholder="Cruz"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  onBlur={() => handleBlur('email')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                  placeholder="john@example.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Contact Number
                  </label>
                  <input
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    value={formData.contactNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactNumber: e.target.value,
                      }))
                    }
                    onBlur={() => handleBlur('contactNumber')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                    placeholder="+63 9xx... (Optional)"
                  />
                </div>

                {/* Address Status */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Address Status
                  </label>

                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <p
                      className={`text-sm font-medium ${
                        addressConfirmed ? 'text-emerald-600' : 'text-slate-500'
                      }`}
                    >
                      {addressConfirmed ? 'Confirmed on map' : 'Not confirmed yet'}
                    </p>

                    <div
                      className={`flex items-center justify-center ${
                        addressConfirmed
                          ? 'text-emerald-600'
                          : 'text-rose-500'
                      }`}
                    >
                      <CheckCircle2 className="size-4" />
                    </div>
                  </div>
                </div>
              </div>

              <AddressPicker
                value={formData.address}
                latitude={formData.latitude}
                longitude={formData.longitude}
                onChange={({ address, latitude, longitude }) =>
                  setFormData((prev) => ({
                    ...prev,
                    address,
                    latitude,
                    longitude,
                  }))
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      name="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>

                  {formData.password && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`h-full flex-1 rounded-full transition-all duration-500 ${
                              passwordScore >= step
                                ? passwordScore <= 2
                                  ? 'bg-rose-500'
                                  : passwordScore === 3
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>

                      <p
                        className={`text-[9px] font-bold uppercase tracking-tighter ${
                          passwordStrength === 'Strong'
                            ? 'text-emerald-500'
                            : passwordStrength === 'Medium'
                            ? 'text-amber-500'
                            : 'text-rose-500'
                        }`}
                      >
                        Security: {passwordStrength}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      name="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>

                  {formData.confirmPassword && (
                    <p
                      className={`text-[9px] font-bold uppercase tracking-tighter ${
                        formData.password === formData.confirmPassword
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {formData.password === formData.confirmPassword
                        ? 'Passwords match'
                        : 'Passwords do not match'}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  authActionPending ||
                  !formData.password ||
                  formData.password !== formData.confirmPassword
                }
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10 disabled:opacity-50 mt-6 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {authActionPending ? (
                  'Creating Account...'
                ) : (
                  <>
                    Get Started <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 text-center space-y-3">
              <p className="text-slate-500 text-sm font-medium">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 font-bold hover:underline">
                  Sign in
                </Link>
              </p>

              <Link
                to="/"
                className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-all group"
              >
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                Back to Home
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}