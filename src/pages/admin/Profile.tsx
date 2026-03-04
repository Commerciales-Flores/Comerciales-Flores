import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Phone, Lock, CheckCircle, AlertCircle, Camera } from 'lucide-react';

export default function AdminProfile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Avatar URL fallback (prefers user.avatarUrl, then generated initials based on first name)
  const avatarUrl =
      (user as any)?.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName || 'Admin')}&background=0D8ABC&color=fff&size=512`;

  const [profileForm, setProfileForm] = useState({
    first_name: user?.firstName || '',
    last_name: user?.lastName || '',
    email: user?.email || '',
    phone: user?.contactNumber || ''
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(profileForm);
      setEditing(false);
      showMessage('success', 'Profile updated successfully!');
    } catch (error) {
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
      // Pass both old and new passwords to match your AuthContext
      const success = await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      
      if (success !== false) {
        setChangingPassword(false);
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        showMessage('success', 'Password changed successfully!');
      } else {
        showMessage('error', 'Incorrect old password or update failed.');
      }
    } catch (error) {
      showMessage('error', 'Failed to change password. Make sure you are recently logged in.');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEditPictureClick = () => {
      fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
          const dataUrl = reader.result as string;
          // Note: Full image upload requires storage bucket in Supabase. This updates local/auth metadata.
          Promise.resolve(updateProfile({ avatarUrl: dataUrl } as any))
              .then(() => showMessage('success', 'Profile picture updated!'))
              .catch(() => showMessage('error', 'Failed to update profile picture'));
      };
      reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Profile</h1>
        <p className="text-gray-600">Manage your administrator account settings and security.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 shadow-sm ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="size-5 flex-shrink-0" /> : <AlertCircle className="size-5 flex-shrink-0" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Profile Information */}
        <div className="lg:flex-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      disabled // Usually email changes require a specific auth flow
                      value={profileForm.email}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Contact support to change your email address.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      placeholder="+63 900 000 0000"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setProfileForm({
                        first_name: user?.firstName || '',
                        last_name: user?.lastName || '',
                        email: user?.email || '',
                        phone: user?.contactNumber || ''
                      });
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <User className="size-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</p>
                    <p className="text-gray-900 font-medium text-lg">{user?.firstName} {user?.lastName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <Mail className="size-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</p>
                    <p className="text-gray-900 font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Phone className="size-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Number</p>
                    <p className="text-gray-900 font-medium">{user?.contactNumber || <span className="text-gray-400 italic">Not provided</span>}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Security</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update your password to keep your account secure</p>
              </div>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                >
                  Change Password
                </button>
              )}
            </div>

            {changingPassword ? (
              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPassword(false);
                      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100">
                   <Lock className="size-5 text-gray-400" />
                   <span className="font-mono tracking-widest text-lg mt-1">••••••••</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Avatar & Account Summary */}
        <div className="lg:w-80 space-y-6">
           
          {/* Avatar Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center text-center">
              <div className="relative group">
                 <img
                    src={avatarUrl}
                    alt={user?.firstName || 'Admin avatar'}
                    onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName || 'Admin')}&background=0D8ABC&color=fff&size=512`;
                    }}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                 />
                 <button
                    type="button"
                    onClick={handleEditPictureClick}
                    className="absolute bottom-0 right-0 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md border-2 border-white"
                    title="Change picture"
                 >
                    <Camera className="size-4" />
                 </button>
                 <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                 />
              </div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
              <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mt-1">{user?.role}</p>
          </div>

          {/* Account Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-blue-900 font-bold mb-2">Administrator Access</h3>
            <p className="text-sm text-blue-800/80 mb-5 leading-relaxed">
              You have full elevated privileges to manage properties, approve customer reservations, verify secure payments, and analyze system data.
            </p>
            <div className="space-y-4">
              <div className="bg-white/60 p-3 rounded-lg border border-blue-100/50">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Account Role</p>
                <p className="text-blue-900 font-medium capitalize">{user?.role}</p>
              </div>
              <div className="bg-white/60 p-3 rounded-lg border border-blue-100/50">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">System ID</p>
                <p className="text-blue-900 font-mono text-xs break-all">{user?.id}</p>
              </div>
            </div>
          </div>

          {/* Data Privacy */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center shadow-sm">
            <p className="text-xs text-gray-500 leading-relaxed">
              Your administrator data and actions are securely logged in compliance with the <strong className="text-gray-700">Philippine Data Privacy Act of 2012</strong>.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}