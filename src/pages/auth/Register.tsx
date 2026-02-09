import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, AlertCircle, X, Eye } from 'lucide-react';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contactNumber: '',
        address: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Profile image states
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [profilePreview, setProfilePreview] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);

    // view modal for full image
    const [showImageModal, setShowImageModal] = useState(false);

    const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

    const readFileAsDataURL = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => reject(new Error('Failed to read file'));
            fr.readAsDataURL(file);
        });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileError(null);
        const file = e.target.files?.[0] ?? null;
        if (!file) {
            setProfileFile(null);
            if (profilePreview) {
                try { URL.revokeObjectURL(profilePreview); } catch { }
            }
            setProfilePreview(null);
            return;
        }

        if (!file.type.startsWith('image/')) {
            setProfileError('Selected file is not an image.');
            return;
        }

        if (file.size > MAX_FILE_BYTES) {
            setProfileError('Image must be 2MB or smaller.');
            return;
        }

        // Create preview url
        const url = URL.createObjectURL(file);
        // Revoke previous preview if any
        if (profilePreview) {
            try { URL.revokeObjectURL(profilePreview); } catch { }
        }

        setProfileFile(file);
        setProfilePreview(url);
    };

    const removeProfileImage = () => {
        if (profilePreview) {
            try { URL.revokeObjectURL(profilePreview); } catch { }
        }
        setProfileFile(null);
        setProfilePreview(null);
        setProfileError(null);
        setShowImageModal(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Basic validations
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        // If a profile image was selected, convert to data URL for the mock register payload
        let profileImageDataUrl: string | undefined;
        if (profileFile) {
            try {
                profileImageDataUrl = await readFileAsDataURL(profileFile);
            } catch (err) {
                console.error('Failed to read profile image', err);
                setError('Failed to process profile image.');
                setLoading(false);
                return;
            }
        }

        const success = await register({
            name: formData.name,
            email: formData.email,
            contactNumber: formData.contactNumber,
            address: formData.address,
            password: formData.password,
            // Pass image data URL (backend / auth context may ignore it if not supported)
            profileImage: profileImageDataUrl
        } as any);

        if (success) {
            navigate('/client/dashboard');
        } else {
            setError('Email already exists');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-[70vw] max-w-[1000px]">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left marketing panel */}
                    <div className="p-8 bg-white text-gray-800 flex flex-col justify-center gap-4">

                        <h2 className="text-2xl font-bold leading-snug text-blue-700">Discover Your Perfect Space with <br></br>Commerciales Flores</h2>
                        <p className="text-sm opacity-90">
                            Reserve premium commercial spaces, event venues, and secure parking <br></br> effortlessly - all in one place.
                        </p>

                        <ul className="mt-2 space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="font-semibold">•</span>
                                <span>Browse and reserve spaces with ease.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-semibold">•</span>
                                <span>Secure payments and reservation system.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-semibold">•</span>
                                <span>Stay updated with reservation confirmations and notifications.</span>
                            </li>
                        </ul>

                        <div className="mt-4 text-sm opacity-90">
                            <p className="mb-1">Need help?</p>
                            <p className="text-xs">Contact support at <strong>support@comercialesflores.ph</strong></p>
                        </div>
                    </div>

                    {/* Right form panel */}
                    <main className="p-8 flex flex-col justify-center">
                        <div className="text-center mb-4">
                            <div className="flex justify-center mb-3">
                                <Building2 className="size-12 text-blue-600" />
                            </div>
                            <h1 className="text-blue-600 text-lg font-semibold">Create your account</h1>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                                <AlertCircle className="size-5" />
                                {error}
                            </div>
                        )}

                        {/* Profile upload (file name + type + view/remove) */}
                        <div className="mb-4">
                            <label className="block text-sm text-gray-700 mb-2">Profile Photo (optional)</label>

                            {/* hidden file input - always present */}
                            <input
                                id="profile-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {profileFile ? (
                                // Show filename + type, with view (eye) and remove (x)
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-800 truncate">{profileFile.name}</div>
                                        <div className="text-xs text-gray-500">{profileFile.type || 'image'}</div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowImageModal(true)}
                                            className="p-2 rounded-md bg-gray-50 border hover:bg-gray-100 transition-colors"
                                            title="View image"
                                            aria-label="View uploaded image"
                                        >
                                            <Eye className="size-5 text-gray-700" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={removeProfileImage}
                                            className="p-2 rounded-md bg-white border hover:bg-red-50 hover:border-red-300 transition-colors"
                                            title="Remove image"
                                            aria-label="Remove uploaded image"
                                        >
                                            <X className="size-5 text-gray-700" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Upload button if no file
                                <div className="w-full flex items-center gap-3">
                                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border">
                                        <svg
                                            className="w-8 h-8 text-gray-400"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M20 21v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="profile-upload"
                                            className="inline-flex items-center px-3 py-2 border rounded-lg cursor-pointer text-sm bg-white hover:bg-blue-50"
                                        >
                                            <svg className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span className="ml-2 text-sm text-gray-700">Upload</span>
                                        </label>
                                        <div className="text-xs text-gray-500 mt-1">JPG, PNG — max 2MB</div>
                                        {profileError && <div className="text-xs text-red-600 mt-1">{profileError}</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Juan Dela Cruz"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Contact Number</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.contactNumber}
                                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="+63 912 345 6789"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="City, Province"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>

                            {/*<div>*/}
                            {/*    <label className="block text-sm text-gray-700 mb-1">Confirm Password</label>*/}
                            {/*    <input*/}
                            {/*        type="password"*/}
                            {/*        required*/}
                            {/*        value={formData.confirmPassword}*/}
                            {/*        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}*/}
                            {/*        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"*/}
                            {/*        placeholder="••••••••"*/}
                            {/*    />*/}
                            {/*</div>*/}

                            <div className="mt-8"></div>
                            <label className="invisible select-none pointer-events-none opacity-0 cursor-default">
                                xxxxxxxxxxxxxxxxxxxxxxxxxxx
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>

                        <div className="mt-4 text-center space-y-1">
                            <p className="text-gray-600 text-sm">
                                Already have an account?{' '}
                                <Link to="/login" className="text-blue-600 hover:text-blue-700">Sign in</Link>
                            </p>
                            <Link to="/" className="block text-blue-600 hover:text-blue-700 text-sm">Back to Home</Link>
                        </div>
                    </main>
                </div>
            </div>

            {/* Image modal */}
            {showImageModal && profilePreview && (
                <div
                    className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/80 overflow-auto"
                    onClick={() => setShowImageModal(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Close button pinned to viewport top-right */}
                    <button
                        onClick={() => setShowImageModal(false)}
                        className="fixed top-4 right-4 z-[10001] bg-white rounded-full p-2 hover:bg-gray-100"
                        aria-label="Close image"
                    >
                        <X className="size-5 text-gray-800" />
                    </button>

                    <div className="flex items-center justify-center min-h-[100vh] p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="max-w-[95vw] max-h-[95vh] overflow-auto bg-transparent p-2 rounded">
                            <img src={profilePreview} alt="Full preview" className="w-auto h-auto max-w-full max-h-full object-contain rounded-md shadow-2xl" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PlusIcon() {
    return (
        <svg className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}