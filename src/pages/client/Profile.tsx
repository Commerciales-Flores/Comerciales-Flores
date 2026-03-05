import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Phone, MapPin, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ClientProfile() {
    // ✅ FIX: Brought in uploadProfilePicture
    const { user, updateProfile, changePassword, uploadProfilePicture } = useAuth();
    const [editing, setEditing] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';
    
    // ✅ FIX: Updated to use profilePictureUrl which maps directly from your DB
    const avatarUrl =
        user?.profilePictureUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff&size=512`;

    const [profileForm, setProfileForm] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        contactNumber: user?.contactNumber || '',
        address: user?.address || ''
    });

    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfile(profileForm);
        setEditing(false);
        showMessage('success', 'Profile updated successfully!');
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

        const success = await changePassword(passwordForm.oldPassword, passwordForm.newPassword);

        if (success) {
            setChangingPassword(false);
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            showMessage('success', 'Password changed successfully!');
        } else {
            showMessage('error', 'Incorrect old password');
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleEditPictureClick = () => {
        fileInputRef.current?.click();
    };

    // ✅ FIX: Integrated the real Supabase upload logic
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Ensure file size is reasonable (e.g., max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showMessage('error', 'Image must be 2MB or smaller.');
            return;
        }

        setIsUploadingImage(true);
        try {
            const newUrl = await uploadProfilePicture(file);
            if (newUrl) {
                await updateProfile({ profilePictureUrl: newUrl });
                showMessage('success', 'Profile picture updated successfully!');
            } else {
                showMessage('error', 'Failed to upload profile picture.');
            }
        } catch (error) {
            showMessage('error', 'An unexpected error occurred during upload.');
        } finally {
            setIsUploadingImage(false);
            // Reset input so the same file can be uploaded again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4">

            <div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-gray-600">Manage your account information</p>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="size-5" /> : <AlertCircle className="size-5" />}
                    {message.text}
                </div>
            )}

            <div className="flex flex-col lg:flex-row">
                {/* Left: Personal Information card */}
                <div className="lg:flex-1">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                            {!editing && (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>

                        {editing ? (
                            <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                                            <input
                                                type="text"
                                                required
                                                value={profileForm.firstName}
                                                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                                            <input
                                                type="text"
                                                required
                                                value={profileForm.lastName}
                                                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address <span className="text-xs text-gray-400 font-normal">(Cannot be changed here)</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                                        <input
                                            type="email"
                                            disabled
                                            value={user?.email || ''}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            required
                                            value={profileForm.contactNumber}
                                            onChange={(e) => setProfileForm({ ...profileForm, contactNumber: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 size-5 text-gray-400" />
                                        <textarea
                                            required
                                            value={profileForm.address}
                                            onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                                            rows={2}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditing(false);
                                            setProfileForm({
                                                firstName: user?.firstName || '',
                                                lastName: user?.lastName || '',
                                                contactNumber: user?.contactNumber || '',
                                                address: user?.address || ''
                                            });
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <User className="size-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Full Name</p>
                                        <p className="text-gray-900 font-medium">{fullName}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Mail className="size-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Email Address</p>
                                        <p className="text-gray-900 font-medium">{user?.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Phone className="size-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Contact Number</p>
                                        <p className="text-gray-900 font-medium">{user?.contactNumber || 'Not provided'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <MapPin className="size-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Address</p>
                                        <p className="text-gray-900 font-medium">{user?.address || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Larger avatar placed outside the personal information box */}
                <div className="mt-6 lg:mt-0 lg:w-80 lg:pl-10 flex justify-center items-start pt-6">
                    <div className="flex flex-col items-center relative">
                        {isUploadingImage && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-full w-32 h-32 lg:w-48 lg:h-48 backdrop-blur-sm">
                                <Loader2 className="size-8 text-blue-600 animate-spin" />
                            </div>
                        )}
                        <img
                            src={avatarUrl}
                            alt={fullName}
                            onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.onerror = null;
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff&size=512`;
                            }}
                            className="w-32 h-32 lg:w-48 lg:h-48 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={handleEditPictureClick}
                                disabled={isUploadingImage}
                                className="px-5 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors disabled:opacity-50"
                            >
                                {isUploadingImage ? 'Uploading...' : 'Edit Picture'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm max-w-3xl">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                        <p className="text-sm text-gray-500 mt-1">Update your password to keep your account secure</p>
                    </div>
                    {!changingPassword && (
                        <button
                            onClick={() => setChangingPassword(true)}
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            Change Password
                        </button>
                    )}
                </div>

                {changingPassword ? (
                    <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.oldPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Update Password
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-6">
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <Lock className="size-4" />
                            •••••••• (Password hidden for security)
                        </p>
                    </div>
                )}
            </div>

            {/* Account Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 max-w-3xl">
                <p className="text-sm text-gray-700">
                    <strong className="font-semibold">Account Type:</strong> Client
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    Your data is protected in compliance with the Philippine Data Privacy Act of 2012.
                </p>
            </div>
        </div>
    );
}