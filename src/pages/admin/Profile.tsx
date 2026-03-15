import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminProfile() {
  const { user, updateProfile, changePassword, uploadProfilePicture } = useAuth();

  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);

  const fullName = useMemo(() => {
    return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'User';
  }, [user?.firstName, user?.lastName]);

  const avatarUrl = useMemo(() => {
    return (
      (user as any)?.avatarUrl ||
      (user as any)?.photoURL ||
      user?.profilePictureUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0ea5e9&color=fff&size=512`
    );
  }, [user?.profilePictureUrl, fullName, user]);

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    address: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      contactNumber: user?.contactNumber || '',
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

  const handleProfileSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsPending(true);

      try {
        await updateProfile(profileForm);
        setEditing(false);
        showMessage('success', 'Profile updated successfully!');
      } catch {
        showMessage('error', 'Failed to update profile.');
      } finally {
        setIsPending(false);
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

      setIsPending(true);

      try {
        const success = await changePassword(passwordForm.newPassword);

        if (success) {
          setChangingPassword(false);
          setPasswordForm({
            oldPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          showMessage('success', 'Password changed successfully!');
        } else {
          showMessage('error', 'Failed to change password');
        }
      } catch {
        showMessage('error', 'Failed to change password');
      } finally {
        setIsPending(false);
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

      setIsPending(true);

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
        setIsPending(false);
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
      contactNumber: user?.contactNumber || '',
      address: user?.address || '',
    });
  }, [user]);

  const togglePasswordPanel = useCallback(() => {
    setChangingPassword((prev) => !prev);
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-500">Manage your administrative identity and security preferences.</p>
        </div>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-sm border ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="size-4" />
              ) : (
                <AlertCircle className="size-4" />
              )}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-semibold text-slate-800">Profile Information</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2 transition-colors"
                >
                  <Edit3 className="size-4" /> Edit Details
                </button>
              )}
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.form
                    key="edit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleProfileSubmit}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="First Name"
                        icon={<User />}
                        value={profileForm.firstName}
                        onChange={(v) => setProfileForm((prev) => ({ ...prev, firstName: v }))}
                      />
                      <FormInput
                        label="Last Name"
                        icon={<User />}
                        value={profileForm.lastName}
                        onChange={(v) => setProfileForm((prev) => ({ ...prev, lastName: v }))}
                      />
                      <FormInput
                        label="Email"
                        icon={<Mail />}
                        type="email"
                        value={profileForm.email}
                        onChange={(v) => setProfileForm((prev) => ({ ...prev, email: v }))}
                      />
                      <FormInput
                        label="Phone"
                        icon={<Phone />}
                        value={profileForm.contactNumber}
                        onChange={(v) => setProfileForm((prev) => ({ ...prev, contactNumber: v }))}
                      />

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">
                          Address
                        </label>
                        <textarea
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          rows={2}
                          value={profileForm.address}
                          onChange={(e) =>
                            setProfileForm((prev) => ({ ...prev, address: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 shadow-md transition-all"
                      >
                        {isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div
                    key="view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                  >
                    <InfoBlock label="Full Name" value={fullName} icon={<User />} />
                    <InfoBlock label="Email" value={user?.email} icon={<Mail />} />
                    <InfoBlock label="Phone" value={user?.contactNumber} icon={<Phone />} />
                    <InfoBlock label="Address" value={user?.address} icon={<MapPin />} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Lock className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Security</h2>
                  <p className="text-sm text-slate-500">Update your access credentials</p>
                </div>
              </div>

              <button
                onClick={togglePasswordPanel}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all"
              >
                {changingPassword ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {changingPassword && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                onSubmit={handlePasswordSubmit}
                className="px-6 pb-6 border-t border-slate-50 pt-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormInput
                    label="Current Password"
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(v) => setPasswordForm((prev) => ({ ...prev, oldPassword: v }))}
                  />
                  <FormInput
                    label="New Password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(v) => setPasswordForm((prev) => ({ ...prev, newPassword: v }))}
                  />
                  <FormInput
                    label="Confirm New"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(v) => setPasswordForm((prev) => ({ ...prev, confirmPassword: v }))}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50"
                >
                  {isPending ? 'Updating...' : 'Update Password'}
                </button>
              </motion.form>
            )}
          </section>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-blue-900 font-bold mb-2">Administrator Account</h3>
            <p className="text-sm text-blue-700 mb-4 leading-relaxed">
              You have full access to all system features including customer management, booking
              approvals, payment verification, and analytics.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-600 font-bold text-[10px] uppercase tracking-wider">
                  Account Type
                </p>
                <p className="text-blue-900 font-semibold italic">Administrator</p>
              </div>
              <div>
                <p className="text-blue-600 font-bold text-[10px] uppercase tracking-wider">
                  User ID
                </p>
                <p className="text-blue-900 font-mono text-xs mt-1 truncate">{user?.id}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <img
                src={avatarUrl}
                alt="Profile"
                className="size-32 rounded-3xl object-cover ring-4 ring-slate-50 shadow-xl transition-transform group-hover:scale-[1.02]"
                loading="lazy"
                decoding="async"
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

            <h3 className="mt-4 font-bold text-xl text-slate-900">{fullName}</h3>
            <span className="mt-1 px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-100">
              {user?.role || 'Administrator'}
            </span>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
            <h4 className="font-semibold flex items-center gap-2">
              <ShieldCheck className="size-4 text-blue-400" /> Compliance Note
            </h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              This account is regulated under the Philippine Data Privacy Act of 2012. All
              administrative actions are logged for security auditing.
            </p>
          </div>
        </div>
      </div>
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
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="p-2 bg-white text-slate-400 rounded-lg border border-slate-200 shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-slate-900 font-semibold mt-0.5">{value || '---'}</p>
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
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 text-sm`}
        />
      </div>
    </div>
  );
}