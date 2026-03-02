import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, AlertCircle, X, Eye, Camera, CheckCircle2, User, Mail, Phone, MapPin, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

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

    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [profilePreview, setProfilePreview] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const MAX_FILE_BYTES = 2 * 1024 * 1024;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileError(null);
        const file = e.target.files?.[0] ?? null;
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) {
            setProfileError('Image must be 2MB or smaller.');
            return;
        }
        const url = URL.createObjectURL(file);
        if (profilePreview) URL.revokeObjectURL(profilePreview);
        setProfileFile(file);
        setProfilePreview(url);
    };

    const removeProfileImage = () => {
        if (profilePreview) URL.revokeObjectURL(profilePreview);
        setProfileFile(null);
        setProfilePreview(null);
        setShowImageModal(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
        setLoading(true);
        // ... registration logic
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-100">
            <div className="bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[1000px] overflow-hidden border border-slate-200/60">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    
                    {/* Left Panel: Marketing (Position Maintained) */}
                    <div className="p-12 bg-slate-900 flex flex-col justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-400/20 text-blue-400 text-[11px] font-bold uppercase tracking-[0.1em] mb-8">
                                <Building2 className="size-3.5" />
                                Comerciales Flores
                            </div>
                            <h2 className="text-4xl font-bold text-white leading-[1.15] mb-6 tracking-tight">
                                Discover Your <br /><span className="text-blue-500">Perfect Space.</span>
                            </h2>
                            <p className="text-slate-400 mb-10 leading-relaxed font-medium">
                                Join our community to reserve premium commercial spaces, event venues, and secure parking effortlessly.
                            </p>

                            <div className="space-y-5">
                                {[
                                    'Browse and reserve spaces in real-time',
                                    'Secure and transparent payment system',
                                    'Instant reservation confirmations'
                                ].map((text, i) => (
                                    <div key={i} className="flex items-center gap-4 text-sm text-slate-300 font-medium group">
                                        <div className="size-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                            <CheckCircle2 className="size-4 text-blue-500" />
                                        </div>
                                        {text}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-800 relative z-10">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Need assistance?</p>
                            <p className="text-sm text-white font-semibold hover:text-blue-400 transition-colors cursor-pointer">support@comercialesflores.ph</p>
                        </div>

                        {/* Subtle background glow for "elevation" */}
                        <div className="absolute top-0 right-0 size-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                    </div>

                    {/* Right Panel: Form (Position Maintained) */}
                    <main className="p-12 bg-white">
                        <div className="mb-10">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h1>
                            <p className="text-slate-500 text-sm mt-1.5 font-medium">Please fill in your details to get started.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-bold animate-pulse">
                                <AlertCircle className="size-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Profile Image Upload */}
                            <div className="flex items-center gap-5 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-slate-200">
                                <div className="relative">
                                    {profilePreview ? (
                                        <img src={profilePreview} className="size-16 rounded-2xl object-cover ring-4 ring-white shadow-sm" alt="Preview" />
                                    ) : (
                                        <div className="size-16 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shadow-sm text-slate-400">
                                            <Camera className="size-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="profile-upload" className="block text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors">
                                        {profileFile ? 'Change Photo' : 'Upload Profile Photo'}
                                    </label>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">JPG or PNG, max 2MB</p>
                                    <input id="profile-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </div>
                                {profileFile && (
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setShowImageModal(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all"><Eye className="size-4"/></button>
                                        <button type="button" onClick={removeProfileImage} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"><X className="size-4"/></button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-5">
                                {/* Name Field */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text" required value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                        placeholder="John Doe"
                                    />
                                </div>

                                {/* Email Field */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        type="email" required value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                        placeholder="john@example.com"
                                    />
                                </div>

                                {/* Contact & Address Fields (Integrated) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                                        <input
                                            type="tel" required value={formData.contactNumber}
                                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                            placeholder="+63 9xx..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location / Address</label>
                                        <input
                                            type="text" required value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                            placeholder="Manila, PH"
                                        />
                                    </div>
                                </div>

                                {/* Password Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                        <input
                                            type="password" required value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm</label>
                                        <input
                                            type="password" required value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit" disabled={loading}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10 disabled:opacity-50 mt-6 active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                                {loading ? 'Creating Account...' : (
                                    <>Get Started <ArrowRight className="size-4" /></>
                                )}
                            </button>
                        </form>
                        <div className="mt-12 text-center space-y-3">
                            <p className="text-slate-500 text-sm font-medium">
                                Already have an account?{' '}
                                <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign in</Link>
                            </p>
                            <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-all group">
                                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> 
                                Back to Home
                            </Link>
                            
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}