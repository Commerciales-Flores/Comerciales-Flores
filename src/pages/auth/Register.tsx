import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, AlertCircle, X, Eye } from 'lucide-react';

const GoogleLogo = () => (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        <path d="M1 1h22v22H1z" fill="none" />
    </svg>
);

const FacebookLogo = () => (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
);

export default function Register() {
    // ✅ Destructured loginWithFacebook
    const { register, loginWithGoogle, loginWithFacebook } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', contactNumber: '', address: '', password: '', confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [profilePreview, setProfilePreview] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const MAX_FILE_BYTES = 2 * 1024 * 1024;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileError(null);
        const file = e.target.files?.[0] ?? null;
        if (!file) {
            setProfileFile(null);
            if (profilePreview) { try { URL.revokeObjectURL(profilePreview); } catch { } }
            setProfilePreview(null);
            return;
        }
        if (!file.type.startsWith('image/')) { setProfileError('Selected file is not an image.'); return; }
        if (file.size > MAX_FILE_BYTES) { setProfileError('Image must be 2MB or smaller.'); return; }
        const url = URL.createObjectURL(file);
        if (profilePreview) { try { URL.revokeObjectURL(profilePreview); } catch { } }
        setProfileFile(file);
        setProfilePreview(url);
    };

    const removeProfileImage = () => {
        if (profilePreview) { try { URL.revokeObjectURL(profilePreview); } catch { } }
        setProfileFile(null);
        setProfilePreview(null);
        setProfileError(null);
        setShowImageModal(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        const success = await register({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            role: 'client',
            contactNumber: formData.contactNumber,
            address: formData.address,
            profileFile: profileFile 
        });

        setLoading(false);

        if (success) {
            setMessage('Account created successfully!');
            setTimeout(() => navigate('/client/dashboard'), 2000);
        } else {
            setError('An account with this email already exists.');
        }
    };

    return (
        <>
            {(message || error) && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-lg shadow-lg text-white text-sm transition-all ${message ? 'bg-green-500' : 'bg-red-500'}`}>
                    <div className="flex items-center gap-3">
                        <span>{message || error}</span>
                        <button onClick={() => { setMessage(''); setError(''); }} className="ml-2 text-white font-bold hover:opacity-70">✕</button>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-start justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-lg shadow-xl w-[70vw] max-w-[1000px] my-8">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="p-8 bg-white text-gray-800 flex flex-col justify-center gap-4 border-r border-gray-100">
                            <h2 className="text-2xl font-bold leading-snug text-blue-700">Discover Your Perfect Space with <br />Commerciales Flores</h2>
                            <p className="text-sm opacity-90">
                                Reserve premium commercial spaces, event venues, and secure parking effortlessly - all in one place.
                            </p>
                            <ul className="mt-2 space-y-2 text-sm">
                                <li className="flex items-start gap-2"><span className="font-semibold">•</span><span>Browse and reserve spaces with ease.</span></li>
                                <li className="flex items-start gap-2"><span className="font-semibold">•</span><span>Secure payments and reservation system.</span></li>
                                <li className="flex items-start gap-2"><span className="font-semibold">•</span><span>Stay updated with reservation confirmations and notifications.</span></li>
                            </ul>
                            <div className="mt-4 text-sm opacity-90">
                                <p className="mb-1">Need help?</p>
                                <p className="text-xs">Contact support at <strong>support@comercialesflores.ph</strong></p>
                            </div>
                        </div>

                        <main className="p-8 flex flex-col justify-center">
                            <div className="text-center mb-4">
                                <div className="flex justify-center mb-3">
                                    <Building2 className="size-12 text-blue-600" />
                                </div>
                                <h1 className="text-blue-600 text-lg font-semibold">Create your account</h1>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm text-gray-700 mb-2">Profile Photo (optional)</label>
                                <input id="profile-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                {profileFile ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-800 truncate">{profileFile.name}</div>
                                            <div className="text-xs text-gray-500">{profileFile.type || 'image'}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setShowImageModal(true)} className="p-2 rounded-md bg-gray-50 border hover:bg-gray-100 transition-colors" title="View image">
                                                <Eye className="size-5 text-gray-700" />
                                            </button>
                                            <button type="button" onClick={removeProfileImage} className="p-2 rounded-md bg-white border hover:bg-red-50 hover:border-red-300 transition-colors" title="Remove image">
                                                <X className="size-5 text-gray-700" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full flex items-center gap-3">
                                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border overflow-hidden">
                                            {profilePreview ? (
                                                <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none">
                                                    <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M20 21v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                        <div>
                                            <label htmlFor="profile-upload" className="inline-flex items-center px-3 py-2 border rounded-lg cursor-pointer text-sm bg-white hover:bg-blue-50">
                                                <span className="ml-2 text-sm text-gray-700">Upload</span>
                                            </label>
                                            <div className="text-xs text-gray-500 mt-1">JPG, PNG — max 2MB</div>
                                            {profileError && <div className="text-xs text-red-600 mt-1">{profileError}</div>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">First Name</label>
                                        <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Juan" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Last Name</label>
                                        <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Dela Cruz" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Email Address</label>
                                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Contact Number</label>
                                    <input type="tel" required value={formData.contactNumber} onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+63 912 345 6789" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Address</label>
                                    <input type="text" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="City, Province" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Password</label>
                                    <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Confirm Password</label>
                                    <input type="password" required value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                                    {formData.password !== formData.confirmPassword && formData.confirmPassword && (
                                        <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                                    )}
                                </div>

                                <button type="submit" disabled={loading || formData.password !== formData.confirmPassword} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </button>
                            </form>

                            <div className="mt-4">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="bg-white px-2 text-gray-500">Or continue with</span>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={loginWithGoogle}
                                        className="w-full inline-flex justify-center items-center gap-3 py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <GoogleLogo />
                                        <span>Google</span>
                                    </button>

                                    {/* ✅ Facebook button hooked up */}
                                    <button
                                        type="button"
                                        onClick={loginWithFacebook}
                                        className="w-full inline-flex justify-center items-center gap-3 py-2 px-4 border border-transparent rounded-lg shadow-sm bg-[#1877F2] text-sm font-medium text-white hover:bg-[#166fe5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2]"
                                    >
                                        <FacebookLogo />
                                        <span>Facebook</span>
                                    </button>
                                </div>
                            </div>

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

                {showImageModal && profilePreview && (
                    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/80 overflow-auto" onClick={() => setShowImageModal(false)} role="dialog" aria-modal="true">
                        <button onClick={() => setShowImageModal(false)} className="fixed top-4 right-4 z-[10001] bg-white rounded-full p-2 hover:bg-gray-100" aria-label="Close image">
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
        </>
    );
}