import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Lock,
  CheckCircle,
  AlertCircle,
  Camera,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  X,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type MessageState = { type: 'success' | 'error'; text: string } | null;

const INITIAL_PASSWORD_FORM = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function ClientProfile() {
  const { user, updateProfile, changePassword, deleteAccount, logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
      (user as any)?.profilePictureUrl ||
      (user as any)?.avatarUrl ||
      (user as any)?.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        fullName
      )}&background=0D8ABC&color=fff&size=512`
    );
  }, [user, fullName]);

  const initialProfileForm = useMemo(
    () => ({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      contactNumber: user?.phone || '',
      address: user?.address || '',
    }),
    [user?.firstName, user?.lastName, user?.email, user?.phone, user?.address]
  );

  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM);

  useEffect(() => {
    setProfileForm(initialProfileForm);
  }, [initialProfileForm]);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current);
    }

    setMessage({ type, text });

    messageTimeoutRef.current = window.setTimeout(() => {
      setMessage(null);
      messageTimeoutRef.current = null;
    }, 4000);
  }, []);

  const resetPasswordForm = useCallback(() => {
    setPasswordForm(INITIAL_PASSWORD_FORM);
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }, []);

  const handleEditStart = useCallback(() => {
    setProfileForm(initialProfileForm);
    setEditing(true);
  }, [initialProfileForm]);

  const handleEditCancel = useCallback(() => {
    setProfileForm(initialProfileForm);
    setEditing(false);
  }, [initialProfileForm]);

  const handlePasswordCancel = useCallback(() => {
    resetPasswordForm();
    setChangingPassword(false);
  }, [resetPasswordForm]);

  const handleProfileFieldChange = useCallback(
    (field: keyof typeof profileForm, value: string) => {
      setProfileForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handlePasswordFieldChange = useCallback(
    (field: keyof typeof passwordForm, value: string) => {
      setPasswordForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

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
      if (savingProfile) return;

      try {
        setSavingProfile(true);

        await updateProfile({
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.contactNumber.trim(),
          address: profileForm.address.trim(),
        });

        setEditing(false);
        showMessage('success', 'Profile information updated!');
      } catch {
        showMessage('error', 'Failed to update profile.');
      } finally {
        setSavingProfile(false);
      }
    },
    [profileForm, savingProfile, showMessage, updateProfile]
  );

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (savingPassword) return;

      if (!passwordForm.oldPassword.trim()) {
        showMessage('error', 'Current password is required');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showMessage('error', 'New passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        showMessage('error', 'Password must be at least 6 characters');
        return;
      }

      try {
        setSavingPassword(true);

        const success = await changePassword(passwordForm.newPassword);

        if (success) {
          setChangingPassword(false);
          resetPasswordForm();
          showMessage('success', 'Password updated securely.');
        } else {
          showMessage('error', 'Failed to update password.');
        }
      } catch {
        showMessage('error', 'Failed to update password.');
      } finally {
        setSavingPassword(false);
      }
    },
    [changePassword, passwordForm, resetPasswordForm, savingPassword, showMessage]
  );

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || uploadingAvatar) return;

      if (!file.type.startsWith('image/')) {
        showMessage('error', 'Please select a valid image file.');
        return;
      }

      try {
        setUploadingAvatar(true);

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(file);
        });

        await Promise.resolve(updateProfile({ profilePictureUrl: dataUrl }));
        showMessage('success', 'Profile picture updated!');
      } catch {
        showMessage('error', 'Failed to upload image');
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [showMessage, updateProfile, uploadingAvatar]
  );

  const handleDeleteAccount = useCallback(async () => {
    try {
      if (!user || deleting) return;

      setDeleting(true);
      await deleteAccount(user.id);
      await logout();
      window.location.href = '/';
    } catch {
      showMessage('error', 'Failed to delete account.');
      setDeleting(false);
    }
  }, [deleteAccount, deleting, logout, showMessage, user]);

  return (
    <div className="min-h-screen bg-gray-50">
  <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account Settings</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Manage your identity and security preferences.
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
                  className={`relative group ${uploadingAvatar ? 'pointer-events-none opacity-70' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
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
                    disabled={uploadingAvatar}
                    className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 disabled:opacity-60"
                    aria-label="Change profile photo"
                  >
                    {uploadingAvatar ? (
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
                  Client
                </div>

                {uploadingAvatar && (
                  <p className="mt-3 text-xs font-medium text-slate-500">Uploading photo...</p>
                )}

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
                <ShieldAlert className="size-4 text-blue-400" />
                Compliance Note
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Your account information is encrypted and managed in strict compliance with the
                Philippine Data Privacy Act of 2012.
              </p>
            </section>

            <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-6 shadow-sm">
              <h3 className="mb-2 font-bold text-blue-900">Client Account</h3>
              <p className="mb-4 text-sm leading-relaxed text-blue-700">
                You can manage your profile, update contact information, maintain account security,
                and track your personal account details.
              </p>

              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Account Type
                  </p>
                  <p className="font-semibold italic text-blue-900">Client</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    User ID
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-blue-900">
                    {(user as any)?.publicId || user?.id || 'No user ID'}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-rose-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-rose-700">Danger Zone</h3>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-rose-400">
                Permanent Action
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Deleting your account permanently removes your personal account access and related
                records.
              </p>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-5 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-all hover:bg-rose-100"
              >
                Delete My Account
              </button>
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
                    onClick={handleEditStart}
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
                          icon={<UserIcon className="size-4" />}
                          value={profileForm.firstName}
                          onChange={(v) => handleProfileFieldChange('firstName', v)}
                        />

                        <FormInput
                          label="Last Name"
                          icon={<UserIcon className="size-4" />}
                          value={profileForm.lastName}
                          onChange={(v) => handleProfileFieldChange('lastName', v)}
                        />

                        <FormInput
                          label="Email"
                          icon={<Mail className="size-4" />}
                          type="email"
                          value={profileForm.email}
                          onChange={(v) => handleProfileFieldChange('email', v)}
                        />

                        <FormInput
                          label="Phone"
                          icon={<Phone className="size-4" />}
                          value={profileForm.contactNumber}
                          onChange={(v) => handleProfileFieldChange('contactNumber', v)}
                        />

                        <div className="md:col-span-2">
                          <FormTextarea
                            label="Address"
                            icon={<MapPin className="size-4" />}
                            value={profileForm.address}
                            onChange={(v) => handleProfileFieldChange('address', v)}
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={handleEditCancel}
                          disabled={savingProfile}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
                        >
                          <X className="size-4" />
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50"
                        >
                          {savingProfile ? (
                            <div className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          ) : (
                            <Save className="size-4" />
                          )}
                          {savingProfile ? 'Saving...' : 'Save Changes'}
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
                      <InfoBlock label="Full Name" value={fullName} icon={<UserIcon className="size-4" />} />
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
                      Update your password and protect your account access.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => (changingPassword ? handlePasswordCancel() : setChangingPassword(true))}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
                    changingPassword
                      ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
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
                {changingPassword ? (
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
                          onChange={(v) => handlePasswordFieldChange('oldPassword', v)}
                          visible={showOldPassword}
                          onToggleVisibility={() => setShowOldPassword((prev) => !prev)}
                        />

                        <PasswordInput
                          label="New Password"
                          value={passwordForm.newPassword}
                          onChange={(v) => handlePasswordFieldChange('newPassword', v)}
                          visible={showNewPassword}
                          onToggleVisibility={() => setShowNewPassword((prev) => !prev)}
                        />

                        <PasswordInput
                          label="Confirm New Password"
                          value={passwordForm.confirmPassword}
                          onChange={(v) => handlePasswordFieldChange('confirmPassword', v)}
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
                          disabled={savingPassword}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingPassword ? (
                            <div className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          ) : (
                            <ShieldCheck className="size-4" />
                          )}
                          {savingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </div>
                  </motion.form>
                ) : (
                  <div className="p-6">
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-emerald-700">
                      <ShieldCheck className="size-5 shrink-0" />
                      <p className="text-sm font-medium">
                        Your account is secured with a unique password.
                      </p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </section>
          </div>
        </div>

        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl"
              >
                <h3 className="text-lg font-bold text-gray-900">Delete Account</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  This action is <span className="font-semibold text-red-600">permanent</span>. All
                  reservations, payments, and account history will be permanently removed.
                </p>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteAccount}
                    className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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