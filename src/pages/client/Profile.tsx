import { useState, useRef } from 'react';
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

export default function ClientProfile() {
  const { user, updateProfile, changePassword, deleteAccount, logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'User';

  const avatarUrl =
    (user as any)?.profilePictureUrl ||
    (user as any)?.avatarUrl ||
    (user as any)?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff&size=512`;

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    contactNumber: user?.contactNumber || '',
    address: user?.address || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        email: profileForm.email,
        contactNumber: profileForm.contactNumber,
        address: profileForm.address,
      });

      setEditing(false);
      showMessage('success', 'Profile information updated!');
    } catch {
      showMessage('error', 'Failed to update profile.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters');
      return;
    }

    try {
      const success = await changePassword(passwordForm.newPassword);

      if (success) {
        setChangingPassword(false);
        setPasswordForm({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        showMessage('success', 'Password updated securely.');
      } else {
        showMessage('error', 'Failed to update password.');
      }
    } catch {
      showMessage('error', 'Failed to update password.');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      Promise.resolve(updateProfile({ profilePictureUrl: dataUrl }))
        .then(() => showMessage('success', 'Profile picture updated!'))
        .catch(() => showMessage('error', 'Failed to upload image'));
    };

    reader.readAsDataURL(file);
  };

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
                    onClick={() => setEditing(true)}
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
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          First Name
                        </label>
                        <div className="relative group">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition" />
                          <input
                            type="text"
                            required
                            value={profileForm.firstName}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, firstName: e.target.value })
                            }
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Last Name
                        </label>
                        <div className="relative group">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition" />
                          <input
                            type="text"
                            required
                            value={profileForm.lastName}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, lastName: e.target.value })
                            }
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Email Address
                        </label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition" />
                          <input
                            type="email"
                            required
                            value={profileForm.email}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, email: e.target.value })
                            }
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Contact Number
                        </label>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition" />
                          <input
                            type="tel"
                            required
                            value={profileForm.contactNumber}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, contactNumber: e.target.value })
                            }
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Residential Address
                      </label>
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-3 size-4 text-gray-400 group-focus-within:text-blue-500 transition" />
                        <textarea
                          required
                          value={profileForm.address}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, address: e.target.value })
                          }
                          rows={3}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                      >
                        Discard
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition"
                      >
                        Save Updates
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
                      onChange={(v) => setPasswordForm({ ...passwordForm, oldPassword: v })}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PasswordField
                        label="New Password"
                        value={passwordForm.newPassword}
                        onChange={(v) => setPasswordForm({ ...passwordForm, newPassword: v })}
                      />
                      <PasswordField
                        label="Confirm New"
                        value={passwordForm.confirmPassword}
                        onChange={(v) => setPasswordForm({ ...passwordForm, confirmPassword: v })}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setChangingPassword(false)}
                        className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-md shadow-blue-200"
                      >
                        Confirm Change
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
                className="relative group cursor-pointer"
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
                  className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>

                <button
                  disabled={deleting}
                  onClick={async () => {
                    try {
                      if (!user) return;
                      setDeleting(true);

                      await deleteAccount(user.id);
                      await logout();

                      window.location.href = '/';
                    } catch {
                      showMessage('error', 'Failed to delete account.');
                      setDeleting(false);
                    }
                  }}
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
  icon: any;
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