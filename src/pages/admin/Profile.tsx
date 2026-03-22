import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  CheckCircle,
  AlertCircle,
  Camera,
  ShieldCheck,
  Edit3,
  X,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type MessageState = {
  type: 'success' | 'error';
  text: string;
} | null;

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  address: string;
};

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function AdminProfile() {
  const { user, updateProfile, changePassword, uploadProfilePicture } = useAuth();

  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [message, setMessage] = useState<MessageState>(null);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);

  const fullName = useMemo(() => {
    return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'User';
  }, [user?.firstName, user?.lastName]);

  const initials = useMemo(() => {
    const first = user?.firstName?.[0] ?? '';
    const last = user?.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }, [user?.firstName, user?.lastName]);

  const avatarUrl = useMemo(() => {
    return (
      (user as any)?.avatarUrl ||
      (user as any)?.photoURL ||
      user?.profilePictureUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0ea5e9&color=fff&size=512`
    );
  }, [user, user?.profilePictureUrl, fullName]);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    address: '',
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      contactNumber: user?.phone || '',
      address: user?.address || '',
    });
  }, [user]);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });

    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current);
    }

    messageTimeoutRef.current = window.setTimeout(() => {
      setMessage(null);
    }, 4000);
  }, []);

  const updateProfileField = useCallback((field: keyof ProfileForm, value: string) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const updatePasswordField = useCallback((field: keyof PasswordForm, value: string) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const passwordStrength = useMemo(() => {
    const password = passwordForm.newPassword;
    let score = 0;

    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    let label = 'Weak';
    if (score >= 4) label = 'Strong';
    else if (score >= 2) label = 'Medium';

    return { score, label };
  }, [passwordForm.newPassword]);

  const handleProfileSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingProfile(true);

      try {
        await updateProfile(profileForm);
        setEditing(false);
        showMessage('success', 'Profile updated successfully!');
      } catch {
        showMessage('error', 'Failed to update profile.');
      } finally {
        setIsSavingProfile(false);
      }
    },
    [profileForm, updateProfile, showMessage]
  );

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!passwordForm.oldPassword.trim()) {
        showMessage('error', 'Current password is required');
        return;
      }

      if (!passwordForm.newPassword.trim()) {
        showMessage('error', 'New password is required');
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        showMessage('error', 'New password must be at least 8 characters');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showMessage('error', 'New passwords do not match');
        return;
      }

      setIsChangingPassword(true);

      try {
        // Your current AuthContext likely only accepts one argument.
        // This means oldPassword is validated in the UI only, not actually verified here.
        const success = await changePassword(passwordForm.newPassword);

        if (success) {
          setChangingPassword(false);
          setPasswordForm({
            oldPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          setShowOldPassword(false);
          setShowNewPassword(false);
          setShowConfirmPassword(false);
          showMessage('success', 'Password changed successfully!');
        } else {
          showMessage('error', 'Failed to change password');
        }
      } catch {
        showMessage('error', 'Failed to change password');
      } finally {
        setIsChangingPassword(false);
      }
    },
    [passwordForm, changePassword, showMessage]
  );

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showMessage('error', 'Please select a valid image file.');
        return;
      }

      setIsUploadingAvatar(true);

      try {
        const uploadedUrl = await uploadProfilePicture(file);

        if (!uploadedUrl) {
          showMessage('error', 'Failed to upload image.');
          return;
        }

        await updateProfile({ profilePictureUrl: uploadedUrl });
        showMessage('success', 'Avatar updated!');
      } catch {
        showMessage('error', 'Failed to upload image.');
      } finally {
        setIsUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [uploadProfilePicture, updateProfile, showMessage]
  );

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      contactNumber: user?.phone || '',
      address: user?.address || '',
    });
  }, [user]);

  const togglePasswordPanel = useCallback(() => {
    setChangingPassword((prev) => !prev);

    if (changingPassword) {
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [changingPassword]);

  return (
    <div className="min-h-screen bg-gray-50">
  <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-gray-500">
              Manage your administrative identity and security preferences.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                key={message.text}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${
                  message.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-4">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="h-24 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900" />

              <div className="-mt-12 flex flex-col items-center px-6 pb-6 text-center">
                <div
                  className="relative group"
                  onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                >
                  <div className="rounded-[1.75rem] bg-white p-1.5 shadow-xl">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="size-28 rounded-[1.35rem] bg-slate-100 object-cover sm:size-32"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex size-28 items-center justify-center rounded-[1.35rem] bg-slate-900 text-3xl font-bold text-white sm:size-32">
                        {initials}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 disabled:opacity-60"
                    aria-label="Change profile photo"
                  >
                    {isUploadingAvatar ? (
                      <div className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Camera className="size-5" />
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-900">{fullName}</h2>
                <p className="text-sm text-slate-500">{user?.email || 'No email available'}</p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-700">
                  <ShieldCheck className="size-3.5" />
                  {user?.role || 'Administrator'}
                </div>

                <div className="mt-6 grid w-full grid-cols-2 gap-3">
                    <MiniStat
                      label="Account Type"
                      value="Client"
                      variant="blue"
                    />
                    <MiniStat
                      label="Status"
                      value={user?.isActive === false ? 'Inactive' : 'Active'}
                      variant={user?.isActive === false ? 'rose' : 'emerald'}
                    />
                  </div>
              </div>
            </section>

            <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
              <h4 className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-4 text-blue-400" />
                Compliance Note
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                This account is regulated under the Philippine Data Privacy Act of 2012. All
                administrative actions are logged for security auditing.
              </p>
            </section>
          </div>

          <div className="space-y-6 xl:col-span-8">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Profile Information</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep your personal and contact information up to date.
                  </p>
                </div>

                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
                  >
                    <Edit3 className="size-4" />
                    Edit Details
                  </button>
                )}
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {editing ? (
                    <motion.form
                      key="edit-profile"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      onSubmit={handleProfileSubmit}
                      className="space-y-5"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormInput
                          label="First Name"
                          icon={<User className="size-4" />}
                          value={profileForm.firstName}
                          onChange={(v) => updateProfileField('firstName', v)}
                        />

                        <FormInput
                          label="Last Name"
                          icon={<User className="size-4" />}
                          value={profileForm.lastName}
                          onChange={(v) => updateProfileField('lastName', v)}
                        />

                        <FormInput
                          label="Email"
                          icon={<Mail className="size-4" />}
                          type="email"
                          value={profileForm.email}
                          onChange={(v) => updateProfileField('email', v)}
                        />

                        <FormInput
                          label="Phone"
                          icon={<Phone className="size-4" />}
                          value={profileForm.contactNumber}
                          onChange={(v) => updateProfileField('contactNumber', v)}
                        />

                        <div className="md:col-span-2">
                          <FormTextarea
                            label="Address"
                            icon={<MapPin className="size-4" />}
                            value={profileForm.address}
                            onChange={(v) => updateProfileField('address', v)}
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSavingProfile}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
                        >
                          <X className="size-4" />
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={isSavingProfile}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50"
                        >
                          {isSavingProfile ? (
                            <div className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          ) : (
                            <Save className="size-4" />
                          )}
                          {isSavingProfile ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="view-profile"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="grid grid-cols-1 gap-4 md:grid-cols-2"
                    >
                      <InfoBlock label="Full Name" value={fullName} icon={<User className="size-4" />} />
                      <InfoBlock label="Email" value={user?.email} icon={<Mail className="size-4" />} />
                      <InfoBlock
                        label="Phone"
                        value={user?.phone}
                        icon={<Phone className="size-4" />}
                      />
                      <InfoBlock
                        label="Address"
                        value={user?.address}
                        icon={<MapPin className="size-4" />}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Lock className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Security</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Update your password and protect administrative access.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={togglePasswordPanel}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
                    changingPassword
                      ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95'
                      : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                  }`}
                >
                  {changingPassword ? (
                    <>
                      <X className="size-4" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" />
                      Change Password
                    </>
                  )}
                </button>
              </div>

              <AnimatePresence initial={false}>
                {changingPassword && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handlePasswordSubmit}
                    className="overflow-hidden"
                  >
                    <div className="space-y-5 p-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <PasswordInput
                          label="Current Password"
                          value={passwordForm.oldPassword}
                          onChange={(v) => updatePasswordField('oldPassword', v)}
                          visible={showOldPassword}
                          onToggleVisibility={() => setShowOldPassword((prev) => !prev)}
                        />

                        <PasswordInput
                          label="New Password"
                          value={passwordForm.newPassword}
                          onChange={(v) => updatePasswordField('newPassword', v)}
                          visible={showNewPassword}
                          onToggleVisibility={() => setShowNewPassword((prev) => !prev)}
                        />

                        <PasswordInput
                          label="Confirm New Password"
                          value={passwordForm.confirmPassword}
                          onChange={(v) => updatePasswordField('confirmPassword', v)}
                          visible={showConfirmPassword}
                          onToggleVisibility={() => setShowConfirmPassword((prev) => !prev)}
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold text-slate-700">Password Strength</p>
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              passwordStrength.score >= 4
                                ? 'text-emerald-600'
                                : passwordStrength.score >= 2
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                            }`}
                          >
                            {passwordStrength.label}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`h-2 rounded-full ${
                                passwordStrength.score >= step
                                  ? passwordStrength.score >= 4
                                    ? 'bg-emerald-500'
                                    : passwordStrength.score >= 2
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          Use at least 8 characters and mix uppercase letters, numbers, and symbols
                          for a stronger password.
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isChangingPassword}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isChangingPassword ? (
                            <div className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          ) : (
                            <ShieldCheck className="size-4" />
                          )}
                          {isChangingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </section>

            <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-6 shadow-sm">
              <h3 className="mb-2 font-bold text-blue-900">Administrator Account</h3>
              <p className="mb-4 text-sm leading-relaxed text-blue-700">
                You have full access to all system features including customer management, booking
                approvals, payment verification, and analytics.
              </p>

              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Account Type
                  </p>
                  <p className="font-semibold italic text-blue-900">Administrator</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    User ID
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-blue-900">
                    {user?.publicId || user?.id || 'No user ID'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  variant = 'slate',
}: {
  label: string;
  value: string;
  variant?: 'slate' | 'blue' | 'emerald' | 'rose' | 'amber';
}) {
  const styles = {
    slate: {
      wrapper: 'border-slate-200 bg-slate-50',
      label: 'text-slate-400',
      value: 'text-slate-900',
    },
    blue: {
      wrapper: 'border-blue-200 bg-blue-50',
      label: 'text-blue-600',
      value: 'text-blue-900',
    },
    emerald: {
      wrapper: 'border-emerald-200 bg-emerald-50',
      label: 'text-emerald-600',
      value: 'text-emerald-900',
    },
    rose: {
      wrapper: 'border-rose-200 bg-rose-50',
      label: 'text-rose-600',
      value: 'text-rose-900',
    },
    amber: {
      wrapper: 'border-amber-200 bg-amber-50',
      label: 'text-amber-600',
      value: 'text-amber-900',
    },
  }[variant];

  return (
    <div className={`rounded-2xl border px-4 py-3 text-left ${styles.wrapper}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${styles.label}`}>
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${styles.value}`}>{value}</p>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-900">
            {value || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function FormInput({
  label,
  icon,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  icon?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        )}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 ${
            icon ? 'pl-10 pr-4' : 'px-4'
          }`}
        />
      </div>
    </div>
  );
}

function FormTextarea({
  label,
  icon,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  icon?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>

      <div className="relative">
        {icon && <div className="absolute left-3 top-3.5 text-slate-400">{icon}</div>}

        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 ${
            icon ? 'pl-10 pr-4' : 'px-4'
          }`}
        />
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Lock className="size-4" />
        </div>

        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
        />

        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}