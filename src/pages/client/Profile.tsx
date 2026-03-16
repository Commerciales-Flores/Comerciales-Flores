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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);

  const fullName = useMemo(() => {
    return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'User';
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
      contactNumber: user?.contactNumber || '',
      address: user?.address || '',
    }),
    [user?.firstName, user?.lastName, user?.email, user?.contactNumber, user?.address]
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
          contactNumber: profileForm.contactNumber.trim(),
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage your identity and security preferences
          </p>
        </header>

        {message && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="size-5" />
            ) : (
              <AlertCircle className="size-5" />
            )}
            <p className="font-medium text-sm">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-800">Personal Information</h2>
                {!editing && (
                  <button
                    onClick={handleEditStart}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                  >
                    Edit Details
                  </button>
                )}
              </div>

              <div className="p-6">
                {editing ? (
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label="First Name"
                        icon={UserIcon}
                        type="text"
                        value={profileForm.firstName}
                        onChange={(value) => handleProfileFieldChange('firstName', value)}
                        required
                      />

                      <InputField
                        label="Last Name"
                        icon={UserIcon}
                        type="text"
                        value={profileForm.lastName}
                        onChange={(value) => handleProfileFieldChange('lastName', value)}
                        required
                      />

                      <InputField
                        label="Email Address"
                        icon={Mail}
                        type="email"
                        value={profileForm.email}
                        onChange={(value) => handleProfileFieldChange('email', value)}
                        required
                      />

                      <InputField
                        label="Contact Number"
                        icon={Phone}
                        type="tel"
                        value={profileForm.contactNumber}
                        onChange={(value) => handleProfileFieldChange('contactNumber', value)}
                        required
                      />
                    </div>

                    <TextAreaField
                      label="Residential Address"
                      icon={MapPin}
                      value={profileForm.address}
                      onChange={(value) => handleProfileFieldChange('address', value)}
                      required
                      rows={3}
                    />

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleEditCancel}
                        disabled={savingProfile}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
                      >
                        Discard
                      </button>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition disabled:opacity-60"
                      >
                        {savingProfile ? 'Saving...' : 'Save Updates'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    <ProfileDetail icon={UserIcon} label="Full Name" value={fullName} />
                    <ProfileDetail icon={Mail} label="Email Address" value={user?.email} />
                    <ProfileDetail icon={Phone} label="Contact" value={user?.contactNumber} />
                    <ProfileDetail icon={MapPin} label="Address" value={user?.address} />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-gray-800">Account Security</h2>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">
                    Password & Protection
                  </p>
                </div>
                {!changingPassword && (
                  <button
                    onClick={() => setChangingPassword(true)}
                    className="px-4 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
                  >
                    Update Password
                  </button>
                )}
              </div>

              <div className="p-6">
                {changingPassword ? (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                    <PasswordField
                      label="Current Password"
                      value={passwordForm.oldPassword}
                      onChange={(v) => handlePasswordFieldChange('oldPassword', v)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PasswordField
                        label="New Password"
                        value={passwordForm.newPassword}
                        onChange={(v) => handlePasswordFieldChange('newPassword', v)}
                      />
                      <PasswordField
                        label="Confirm New"
                        value={passwordForm.confirmPassword}
                        onChange={(v) => handlePasswordFieldChange('confirmPassword', v)}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handlePasswordCancel}
                        disabled={savingPassword}
                        className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-md shadow-blue-200 disabled:opacity-60"
                      >
                        {savingPassword ? 'Updating...' : 'Confirm Change'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-3 text-emerald-600">
                    <ShieldCheck className="size-5" />
                    <p className="text-sm font-medium">
                      Your account is secured with a unique password.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center flex flex-col items-center">
              <div
                className={`relative group cursor-pointer ${uploadingAvatar ? 'pointer-events-none opacity-70' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="size-32 rounded-3xl object-cover ring-4 ring-slate-50 shadow-xl transition-transform group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="text-white size-8" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              <h3 className="mt-4 font-bold text-gray-900 text-lg">{fullName}</h3>
              <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mt-1">
                Client Account
              </p>
              {uploadingAvatar && (
                <p className="mt-2 text-xs text-gray-500 font-medium">Uploading photo...</p>
              )}

              <div className="mt-6 w-full pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-2">
                  <span>Verification Status</span>
                  <span className="text-emerald-600">Verified</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full" />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-xl shadow-gray-200">
              <ShieldAlert className="size-6 text-blue-400 mb-4" />
              <h4 className="font-bold text-sm">Data Protection</h4>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Your account information is encrypted and managed in strict compliance with the
                Philippine Data Privacy Act of 2012.
              </p>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
              <h4 className="text-red-700 font-bold text-sm">Danger Zone</h4>
              <p className="text-[10px] text-red-600/70 mt-1 uppercase font-bold tracking-tight">
                Permanent Action
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-4 w-full py-2.5 border border-red-200 bg-white text-red-600 text-xs font-bold rounded-xl hover:bg-red-600 hover:text-white transition shadow-sm"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900">Delete Account</h3>

              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                This action is <span className="font-semibold text-red-600">permanent</span>.
                All reservations, payments, and account history will be permanently removed.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2.5 bg-gray-100 rounded-xl">
        <Icon className="size-4 text-gray-500" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-gray-900 font-medium text-sm mt-0.5">{value || 'Not provided'}</p>
      </div>
    </div>
  );
}

function InputField({
  label,
  icon: Icon,
  type,
  value,
  onChange,
  required = false,
}: {
  label: string;
  icon: LucideIcon;
  type: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative group">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition" />
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
        />
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  icon: Icon,
  value,
  onChange,
  required = false,
  rows = 3,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative group">
        <Icon className="absolute left-3 top-3 size-4 text-gray-400 group-focus-within:text-blue-500 transition" />
        <textarea
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
        />
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="relative group">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition" />
        <input
          type="password"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
          placeholder="••••••••"
        />
      </div>
    </div>
  );
}