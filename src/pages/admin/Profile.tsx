import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DeviceManagement from '../../components/security/DeviceManagement';
import AddressPicker from '../../components/common/AddressPicker';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';
import { isPasswordPolicyValid } from '../../utils/passwordStrength';
import FormField from '../../components/common/FormField';
import {
  normalizeName,
  normalizeEmail,
  normalizeAddress,
  normalizePHPhone,
  isValidPHPhone,
  isValidEmail,
} from '../../utils/DataNormalization';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Lock,
  CheckCircle,
  AlertCircle,
  Camera,
  ShieldCheck,
  ShieldAlert,
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
  newPassword: '',
  confirmPassword: '',
};

export default function AdminProfile() {
  const {
    user,
    updateProfile,
    changePassword,
    changeEmail,
    uploadProfilePicture,
    deleteProfilePicture,
  } = useAuth();

  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);

  const [message, setMessage] = useState<MessageState>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);

  const fullName = useMemo(() => {
    return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Administrator';
  }, [user?.firstName, user?.lastName]);

  const initials = useMemo(() => {
    const first = user?.firstName?.[0] ?? '';
    const last = user?.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'A';
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

  const hasCustomAvatar = useMemo(() => {
  return Boolean(
    (user as any)?.profilePictureUrl ||
    (user as any)?.avatarUrl ||
    (user as any)?.photoURL
  );
}, [user]);

  const initialProfileForm = useMemo(
    () => ({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      contactNumber: user?.phone || '',
      address: user?.address || '',
      latitude: String((user as any)?.latitude ?? ''),
      longitude: String((user as any)?.longitude ?? ''),
    }),
    [
      user?.firstName,
      user?.lastName,
      user?.email,
      user?.phone,
      user?.address,
      (user as any)?.latitude,
      (user as any)?.longitude,
    ]
  );

  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM);
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    confirmEmail: '',
    currentPassword: '',
  });

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
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }, []);

  const handleEditStart = useCallback(() => {
    setProfileForm(initialProfileForm);
    setEditing(true);
  }, [initialProfileForm]);

  const handleEditCancel = useCallback(() => {
    setProfileForm(initialProfileForm);
    setChangingEmail(false);
    setEmailForm({
      newEmail: '',
      confirmEmail: '',
      currentPassword: '',
    });
    setShowEmailPassword(false);
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

  const handleProfileSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (savingProfile) return;

      try {
        setSavingProfile(true);

        const cleanedFirstName = normalizeName(profileForm.firstName);
        const cleanedLastName = normalizeName(profileForm.lastName);
        const cleanedPhone = normalizePHPhone(profileForm.contactNumber);
        const cleanedAddress = normalizeAddress(profileForm.address);

        if (profileForm.contactNumber.trim() && !isValidPHPhone(cleanedPhone)) {
          showMessage('error', 'Please enter a valid Philippine mobile number.');
          return;
        }

        await updateProfile({
          firstName: cleanedFirstName,
          lastName: cleanedLastName,
          phone: cleanedPhone,
          address: cleanedAddress,
          latitude: profileForm.latitude ? Number(profileForm.latitude) : null,
          longitude: profileForm.longitude ? Number(profileForm.longitude) : null,
        });

        setEditing(false);
        showMessage('success', 'Profile information updated.');
      } catch {
        showMessage('error', 'Failed to update profile.');
      } finally {
        setSavingProfile(false);
      }
    },
    [profileForm, savingProfile, showMessage, updateProfile]
  );

  const handleEmailSubmit = useCallback(async () => {
    if (savingEmail) return;

    const newEmail = normalizeEmail(emailForm.newEmail);
    const confirmEmail = normalizeEmail(emailForm.confirmEmail);
    const currentEmail = normalizeEmail(user?.email ?? '');

    if (!newEmail) {
      showMessage('error', 'New email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showMessage('error', 'Please enter a valid email address.');
      return;
    }

    if (newEmail !== confirmEmail) {
      showMessage('error', 'Email addresses do not match.');
      return;
    }

    if (newEmail === currentEmail) {
      showMessage('error', 'Please enter a different email address.');
      return;
    }

    if (!emailForm.currentPassword.trim()) {
      showMessage('error', 'Current password is required.');
      return;
    }

    try {
      setSavingEmail(true);

      const result = await changeEmail({
        newEmail,
        currentPassword: emailForm.currentPassword,
      });

      if (!result?.success) {
        showMessage('error', result?.message || 'Failed to start email change.');
        return;
      }

      setChangingEmail(false);
      setEmailForm({
        newEmail: '',
        confirmEmail: '',
        currentPassword: '',
      });
      setShowEmailPassword(false);

      showMessage(
        'success',
        'Email change started. Please confirm the new email address from your inbox.'
      );
    } catch {
      showMessage('error', 'Failed to start email change.');
    } finally {
      setSavingEmail(false);
    }
  }, [changeEmail, emailForm, savingEmail, showMessage, user?.email]);

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (savingPassword) return;

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showMessage('error', 'New passwords do not match.');
        return;
      }

      if (!isPasswordPolicyValid(passwordForm.newPassword)) {
        showMessage(
          'error',
          'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.'
        );
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

        const uploadedUrl = await uploadProfilePicture(file);

        if (!uploadedUrl) {
          showMessage('error', 'Failed to upload image.');
          return;
        }

        await updateProfile({ profilePictureUrl: uploadedUrl });
        showMessage('success', 'Profile picture updated.');
      } catch {
        showMessage('error', 'Failed to upload image.');
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [showMessage, updateProfile, uploadProfilePicture, uploadingAvatar]
  );

  const handleRemoveImage = useCallback(async () => {
  if (uploadingAvatar || removingAvatar) return;

  try {
    setRemovingAvatar(true);

    const success = await deleteProfilePicture();

    if (!success) {
      showMessage('error', 'Failed to remove profile picture.');
      return;
    }

    showMessage('success', 'Profile picture removed.');
  } catch {
    showMessage('error', 'Failed to remove profile picture.');
  } finally {
    setRemovingAvatar(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
}, [deleteProfilePicture, removingAvatar, showMessage, uploadingAvatar]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account Settings</h1>
            <p className="mt-0.5 text-sm text-gray-500">
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
  <div className="flex flex-col items-center">
    <div
      className={`relative group ${
        uploadingAvatar || removingAvatar ? 'pointer-events-none opacity-70' : ''
      }`}
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
        disabled={uploadingAvatar || removingAvatar}
        onClick={() => fileInputRef.current?.click()}
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

    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {hasCustomAvatar && (
        <button
          type="button"
          disabled={uploadingAvatar || removingAvatar}
          onClick={() => void handleRemoveImage()}
          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
        >
          {removingAvatar ? (
            <div className="size-4 animate-spin rounded-full border-2 border-rose-300 border-t-rose-700" />
          ) : (
            <X className="size-4" />
          )}
          {removingAvatar ? 'Removing...' : 'Remove Photo'}
        </button>
      )}
    </div>
  </div>

  <h2 className="mt-4 text-xl font-bold text-slate-900">{fullName}</h2>
  <p className="text-sm text-slate-500">{user?.email || 'No email available'}</p>

  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-700">
    <ShieldCheck className="size-3.5" />
    Administrator
  </div>

  {(uploadingAvatar || removingAvatar) && (
    <p className="mt-3 text-xs font-medium text-slate-500">
      {uploadingAvatar ? 'Uploading photo...' : 'Removing photo...'}
    </p>
  )}

  <div className="mt-6 grid w-full grid-cols-2 gap-3">
    <MiniStat label="Account Type" value="Administrator" variant="blue" />
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
                This account is regulated under the Philippine Data Privacy Act of 2012.
                Administrative actions may affect reservations, payments, customer access,
                and operational records.
              </p>
            </section>

            <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-6 shadow-sm">
              <h3 className="mb-2 font-bold text-blue-900">Administrator Account</h3>
              <p className="mb-4 text-sm leading-relaxed text-blue-700">
                You have access to customer management, reservation approvals, payment
                verification, inquiries, and administrative records.
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
                    {(user as any)?.publicId || user?.id || 'No user ID'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6 xl:col-span-8">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-4 py-5 sm:px-6">
  <div>
    <h3 className="text-base font-bold text-slate-900">Profile Information</h3>
    <p className="mt-1 text-sm text-slate-500">
      Keep your personal and contact information up to date.
    </p>
  </div>

  {!editing ? (
    <div className="flex w-full sm:justify-end">
      <button
        type="button"
        onClick={handleEditStart}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto"
      >
        <Edit3 className="size-4" />
        Edit Details
      </button>
    </div>
  ) : (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={handleEditCancel}
        disabled={savingProfile}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
      >
        <X className="size-4" />
        Cancel
      </button>

      <button
        type="submit"
        form="admin-profile-form"
        disabled={savingProfile}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50 sm:w-auto"
      >
        {savingProfile ? (
          <div className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <Save className="size-4" />
        )}
        {savingProfile ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )}
</div>

              <div className="p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  {editing ? (
                    <motion.form
                      id="admin-profile-form"
                      key="edit-profile"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      onSubmit={handleProfileSubmit}
                      className="space-y-5"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          field="firstName"
                          label="First Name"
                          value={profileForm.firstName}
                          onChange={(v) => handleProfileFieldChange('firstName', v)}
                          icon={<UserIcon className="size-4" />}
                        />

                       <FormField
                        field="lastName"
                        label="Last Name"
                        value={profileForm.lastName}
                        onChange={(v) => handleProfileFieldChange('lastName', v)}
                        icon={<UserIcon className="size-4" />}
                      />
                        <div className="space-y-3 md:col-span-2">
                          <label className="ml-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Email
                          </label>

                          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex min-w-0 items-center gap-3">
    <Mail className="size-4 shrink-0 text-slate-400" />
    <p className="truncate text-sm font-medium text-slate-800">
      {profileForm.email || '—'}
    </p>
  </div>

  <button
    type="button"
    onClick={() => {
      if (changingEmail) {
        setEmailForm({
          newEmail: '',
          confirmEmail: '',
          currentPassword: '',
        });
        setShowEmailPassword(false);
      }
      setChangingEmail((prev) => !prev);
    }}
    className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border px-3.5 py-2.5 text-xs font-bold transition sm:w-auto ${
      changingEmail
        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
        : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
    }`}
  >
    {changingEmail ? 'Cancel' : 'Change Email'}
  </button>
</div>

                          <AnimatePresence initial={false}>
                            {changingEmail && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                                  <p className="text-sm text-slate-600">
                                    Your current email is{' '}
                                    <span className="font-semibold text-slate-900">
                                      {user?.email || '—'}
                                    </span>
                                    . The new email will only be used after verification.
                                  </p>

                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <FormField
                                      field="newEmail"
                                      label="New Email"
                                      type="email"
                                      value={emailForm.newEmail}
                                      onChange={(v) =>
                                        setEmailForm((prev) => ({ ...prev, newEmail: v }))
                                      }
                                      icon={<Mail className="size-4" />}
                                    />

                                    <FormField
                                      field="confirmEmail"
                                      label="Confirm New Email"
                                      type="email"
                                      value={emailForm.confirmEmail}
                                      onChange={(v) =>
                                        setEmailForm((prev) => ({ ...prev, confirmEmail: v }))
                                      }
                                      icon={<Mail className="size-4" />}
                                    />
                                  </div>

                                  <PasswordInput
                                    label="Current Password"
                                    value={emailForm.currentPassword}
                                    onChange={(v) =>
                                      setEmailForm((prev) => ({ ...prev, currentPassword: v }))
                                    }
                                    visible={showEmailPassword}
                                    onToggleVisibility={() =>
                                      setShowEmailPassword((prev) => !prev)
                                    }
                                  />

                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => void handleEmailSubmit()}
                                      disabled={savingEmail}
                                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50 sm:w-auto"
                                    >
                                      {savingEmail ? 'Submitting...' : 'Send Verification'}
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <FormField
                          field="contactNumber"
                          label="Phone"
                          type="tel"
                          value={profileForm.contactNumber}
                          onChange={(v) => handleProfileFieldChange('contactNumber', v)}
                          onBlur={(v) => handleProfileFieldChange('contactNumber', v)}
                          icon={<Phone className="size-4" />}
                        />

                        <div className="md:col-span-2 space-y-4">
                          <div className="space-y-1.5">
                            <label className="ml-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Location Status
                            </label>

                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p
                                className={`text-sm font-medium ${
                                  profileForm.address && profileForm.latitude && profileForm.longitude
                                    ? 'text-emerald-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                {profileForm.address && profileForm.latitude && profileForm.longitude
                                  ? 'Verified on map'
                                  : 'Not verified on map'}
                              </p>

                              <div
                                className={`flex items-center justify-center ${
                                  profileForm.address && profileForm.latitude && profileForm.longitude
                                    ? 'text-emerald-600'
                                    : 'text-rose-500'
                                }`}
                              >
                                <CheckCircle className="size-4" />
                              </div>
                            </div>
                          </div>

                          <AddressPicker
                            value={profileForm.address}
                            latitude={profileForm.latitude}
                            longitude={profileForm.longitude}
                            onChange={({ address, latitude, longitude }) =>
                              setProfileForm((prev) => ({
                                ...prev,
                                address,
                                latitude,
                                longitude,
                              }))
                            }
                          />
                        </div>
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
                      <InfoBlock label="Phone" value={user?.phone} icon={<Phone className="size-4" />} />
                      <InfoBlock label="Address" value={user?.address} icon={<MapPin className="size-4" />} />
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
                  onClick={() => setChangingPassword((prev) => !prev)}
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
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <PasswordInput
                          label="New Password"
                          value={passwordForm.newPassword}
                          onChange={(v) => handlePasswordFieldChange('newPassword', v)}
                          visible={showNewPassword}
                          onToggleVisibility={() => setShowNewPassword((prev) => !prev)}
                          maxLength={100}
                        />

                        <PasswordInput
                          label="Confirm New Password"
                          value={passwordForm.confirmPassword}
                          onChange={(v) => handlePasswordFieldChange('confirmPassword', v)}
                          visible={showConfirmPassword}
                          onToggleVisibility={() => setShowConfirmPassword((prev) => !prev)}
                          maxLength={100}
                        />
                      </div>

                      <PasswordStrengthIndicator password={passwordForm.newPassword} />

                      <p className="text-xs leading-relaxed text-slate-500">
                        Use at least 8 characters and include an uppercase letter, a number,
                        and a special character for stronger administrative security.
                      </p>

                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={handlePasswordCancel}
                          disabled={savingPassword}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
                        >
                          <X className="size-4" />
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={
                            savingPassword ||
                            !passwordForm.newPassword ||
                            !passwordForm.confirmPassword
                          }
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
                )}
              </AnimatePresence>
            </section>

            <DeviceManagement />
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


function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggleVisibility,
  maxLength = 100,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
  maxLength?: number;
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
          maxLength={maxLength}
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