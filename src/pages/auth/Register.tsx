import { useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AddressPicker from '../../components/common/AddressPicker';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';
import FormField from '../../components/common/FormField';
import { isPasswordPolicyValid } from '../../utils/passwordStrength';
import supabase from '../../supabaseClient';
import {
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  normalizeName,
  normalizeEmail,
  normalizeAddress,
  normalizePHPhone,
  isValidEmail,
  isValidPHPhone,
  sanitizeNameInput,
  sanitizeEmailInput,
  sanitizeAddressInput,
  sanitizePhoneInput,
  sanitizePlainText,
} from '../../utils/DataNormalization';


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
  const [validIdFile, setValidIdFile] = useState<File | null>(null);
  const [validIdName, setValidIdName] = useState('');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const validIdInputRef = useRef<HTMLInputElement | null>(null);

    const triggerValidIdUpload = () => {
      validIdInputRef.current?.click();
    };

  const handleFieldChange = useCallback(
  (field: keyof typeof formData, value: string) => {
    let sanitized = value;

    switch (field) {
      case 'firstName':
      case 'lastName':
        sanitized = sanitizeNameInput(value);
        break;
      case 'email':
        sanitized = sanitizeEmailInput(value);
        break;
      case 'contactNumber':
        sanitized = sanitizePhoneInput(value);
        break;
      case 'address':
        sanitized = sanitizeAddressInput(value);
        break;
      default:
        sanitized = sanitizePlainText(value);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: sanitized,
    }));

    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  },
  []
);

  const handleBlur = useCallback((field: keyof typeof formData, value: string) => {
    let normalized = value;

    switch (field) {
      case 'firstName':
        normalized = normalizeName(value);
        break;
      case 'lastName':
        normalized = normalizeName(value);
        break;
      case 'email':
        normalized = normalizeEmail(value);
        break;
      case 'contactNumber':
        normalized = normalizePHPhone(value);
        break;
      case 'address':
        normalized = normalizeAddress(value);
        break;
      case 'password':
      case 'confirmPassword':
        normalized = value.trim();
        break;
      default:
        normalized = value.trim();
        break;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: normalized,
    }));
  }, []);

  const handleValidIdChange = useCallback((file: File | null) => {
  if (!file) {
    setValidIdFile(null);
    setValidIdName('');
    return;
  }

  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];

  if (!allowed.includes(file.type)) {
    setErrors(prev => ({
      ...prev,
      validId: 'Only JPG, PNG, or PDF allowed'
    }));
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setErrors(prev => ({
      ...prev,
      validId: 'File must be under 5MB'
    }));
    return;
  }

  setValidIdFile(file);
  setValidIdName(file.name);

  setErrors(prev => {
    const next = { ...prev };
    delete next.validId;
    return next;
  });

}, []);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};

    const cleanedFirstName = normalizeName(formData.firstName);
    const cleanedLastName = normalizeName(formData.lastName);
    const cleanedEmail = normalizeEmail(formData.email);
    const cleanedContactNumber = normalizePHPhone(formData.contactNumber);
    const cleanedAddress = normalizeAddress(formData.address);

    if (!cleanedFirstName) errs.firstName = 'First name is required.';
    if (!cleanedLastName) errs.lastName = 'Last name is required.';
    if (!validIdFile) {
      errs.validId = 'Valid ID is required.';
    }

    if (!cleanedEmail) {
      errs.email = 'Email is required.';
    } else if (!isValidEmail(cleanedEmail)) {
      errs.email = 'Enter a valid email address.';
    }

    if (formData.contactNumber.trim() && !isValidPHPhone(cleanedContactNumber)) {
      errs.contactNumber = 'Enter a valid Philippine mobile number.';
    }
    if (!agreedToPrivacy) {
      errs.privacy = 'You must agree to the Data Privacy Policy.';
    }

    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (!isPasswordPolicyValid(formData.password)) {
      errs.password =
        'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.';
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
  }, [formData, validIdFile, agreedToPrivacy]);

  const uploadValidId = async (userId: string) => {
  if (!validIdFile) return;

  const extension = validIdFile.name.split('.').pop();
  const filePath = `users/${userId}/${Date.now()}-valid-id.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('valid_ids')
    .upload(filePath, validIdFile);

  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from('users')
    .update({
      valid_id_file_path: filePath,
      valid_id_status: 'pending',
      valid_id_uploaded_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) throw updateError;
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authActionPending) return;

    const cleanedFirstName = normalizeName(formData.firstName);
    const cleanedLastName = normalizeName(formData.lastName);
    const cleanedEmail = normalizeEmail(formData.email);
    const cleanedContactNumber = normalizePHPhone(formData.contactNumber);
    const cleanedAddress = normalizeAddress(formData.address);

    setFormData((prev) => ({
      ...prev,
      firstName: cleanedFirstName,
      lastName: cleanedLastName,
      email: cleanedEmail,
      contactNumber: cleanedContactNumber,
      address: cleanedAddress,
      password: prev.password.trim(),
      confirmPassword: prev.confirmPassword.trim(),
    }));

    const isValid = validate();
    if (!isValid) return;

    setErrors({});

    try {
      const result = await register({
        firstName: cleanedFirstName,
        lastName: cleanedLastName,
        email: cleanedEmail,
        password: formData.password.trim(),
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

      try {
        if (result.userId) {
          await uploadValidId(result.userId);
        }
      } catch (err) {
        console.error('Valid ID upload failed:', err);
      }

      navigate('/login', {
        replace: true,
        state: {
          message: result.message,
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

  const addressConfirmed = Boolean(
    formData.address && formData.latitude && formData.longitude
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-100">
      <div className="bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[1100px] overflow-hidden border border-slate-200/60">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-12 bg-slate-900 flex flex-col justify-between relative overflow-hidden hidden md:flex">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-400/20 text-blue-400 text-[11px] font-bold uppercase tracking-[0.1em] mb-8">
                <Building2 className="size-3.5" />
                Commerciales Flores
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
                support@comercialesflores.com
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
                <FormField
                  field="firstName"
                  label="First Name"
                  value={formData.firstName}
                  onChange={(value) => handleFieldChange('firstName', value)}
                  onBlur={(value) => handleBlur('firstName', value)}
                  placeholder="Juan"
                  error={errors.firstName}
                  autoComplete="given-name"
                  maxLength={100}
                />

                <FormField
                  field="lastName"
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(value) => handleFieldChange('lastName', value)}
                  onBlur={(value) => handleBlur('lastName', value)}
                  placeholder="Dela Cruz"
                  error={errors.lastName}
                  autoComplete="family-name"
                  maxLength={100}
                />
              </div>

              <FormField
                field="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(value) => handleFieldChange('email', value)}
                onBlur={(value) => handleBlur('email', value)}
                placeholder="john@example.com"
                error={errors.email}
                autoComplete="email"
                maxLength={150}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  field="contactNumber"
                  label="Contact Number"
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(value) => handleFieldChange('contactNumber', value)}
                  onBlur={(value) => handleBlur('contactNumber', value)}
                  placeholder="+63 9xx... (Optional)"
                  error={errors.contactNumber}
                  autoComplete="tel"
                  maxLength={20}
                />

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
                        addressConfirmed ? 'text-emerald-600' : 'text-rose-500'
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
                onChange={({ address, latitude, longitude }) => {
                  setFormData((prev) => ({
                    ...prev,
                    address,
                    latitude,
                    longitude,
                  }));

                  setErrors((prev) => {
                    if (!prev.address) return prev;
                    const next = { ...prev };
                    delete next.address;
                    return next;
                  });
                }}
              />

              {errors.address ? (
                <p className="ml-1 text-xs font-medium text-rose-600">
                  {errors.address}
                </p>
              ) : null}

              <div className="space-y-1.5">
          <label
            htmlFor="valid-id"
            className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
          >
            Valid ID
          </label>

          <input
            ref={validIdInputRef}
            id="valid-id"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => handleValidIdChange(e.target.files?.[0] ?? null)}
            className="hidden"
          />

      {!validIdFile ? (
        <button
          type="button"
          onClick={triggerValidIdUpload}
          className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 hover:bg-slate-100 transition flex flex-col items-center justify-center gap-2"
        >
          <div className="text-sm font-semibold text-slate-700">
            Upload Valid ID
          </div>

          <p className="text-xs text-slate-400 font-medium">
            JPG, PNG, PDF • max 5MB
          </p>
        </button>
      ) : (
        <div className="flex items-center justify-between border border-slate-200 rounded-2xl px-4 py-3 bg-white">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-700">
              {validIdName}
            </span>

            <span className="text-xs text-slate-400">
              Valid ID uploaded
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleValidIdChange(null)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            Remove
          </button>
        </div>
      )}

      {errors.validId && (
        <p className="ml-1 text-xs font-medium text-rose-600">
          {errors.validId}
        </p>
      )}
    </div>

    <div className="space-y-2">
  <label className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed cursor-pointer">
    <input
      type="checkbox"
      checked={agreedToPrivacy}
      onChange={(e) => setAgreedToPrivacy(e.target.checked)}
      className="mt-1 size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
    />

    <span>
      I consent to the collection and processing of my personal data, including
      uploaded valid ID, for identity verification and reservation purposes in
      accordance with the{" "}
      <a
        href="/privacy-policy.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-blue-600 hover:underline"
      >
        Data Privacy Policy
      </a>.
    </span>
  </label>

  {errors.privacy && (
    <p className="ml-7 text-xs font-medium text-rose-600">
      {errors.privacy}
    </p>
  )}
</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Password
                  </label>

                  <div className="relative">
                    <input
                      name="new-password"
                      maxLength={100}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      onBlur={(e) => handleBlur('password', e.target.value)}
                      className={`w-full px-4 py-3 pr-10 bg-slate-50 border rounded-xl focus:ring-4 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300 ${
                        errors.password
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-blue-500 focus:ring-blue-50'
                      }`}
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

                  {errors.password ? (
                    <p className="ml-1 text-xs font-medium text-rose-600">
                      {errors.password}
                    </p>
                  ) : null}

                  <PasswordStrengthIndicator
                    password={formData.password}
                    confirmPassword={formData.confirmPassword}
                    showChecklist
                    showMatchStatus={false}
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Confirm Password
                  </label>

                  <div className="relative">
                    <input
                      name="confirm-password"
                      maxLength={100}
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleFieldChange('confirmPassword', e.target.value)
                      }
                      onBlur={(e) => handleBlur('confirmPassword', e.target.value)}
                      className={`w-full px-4 py-3 pr-10 bg-slate-50 border rounded-xl focus:ring-4 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300 ${
                        errors.confirmPassword
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-blue-500 focus:ring-blue-50'
                      }`}
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

                  {errors.confirmPassword ? (
                    <p className="ml-1 text-xs font-medium text-rose-600">
                      {errors.confirmPassword}
                    </p>
                  ) : null}

                  <PasswordStrengthIndicator
                    password={formData.password}
                    confirmPassword={formData.confirmPassword}
                    showChecklist={false}
                    showMatchStatus
                    compact
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  authActionPending ||
                  !isPasswordPolicyValid(formData.password) ||
                  !formData.confirmPassword ||
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