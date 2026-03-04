import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
    Building2, AlertCircle, X, Eye, EyeOff, Camera, CheckCircle2, 
    User, Mail, Phone, MapPin, Lock, ArrowRight, ArrowLeft 
} from 'lucide-react';

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

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [profilePreview, setProfilePreview] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const MAX_FILE_BYTES = 2 * 1024 * 1024;

    // --- Password Strength Logic ---
    const passwordStrength = useMemo(() => {
        const { password } = formData;
        if (!password) return '';
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        switch(score) {
            case 0: case 1: return 'Very Weak';
            case 2: return 'Weak';
            case 3: return 'Medium';
            case 4: return 'Strong';
            default: return '';
        }
    }, [formData.password]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setErrors(prev => ({ ...prev, profile: '' }));
        const file = e.target.files?.[0] ?? null;
        if (!file) return;

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setErrors(prev => ({ ...prev, profile: 'Only JPG or PNG files allowed.' }));
            return;
        }

        if (file.size > MAX_FILE_BYTES) {
            setErrors(prev => ({ ...prev, profile: 'Image must be 2MB or smaller.' }));
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

    const validate = () => {
        const errs: { [key: string]: string } = {};

        if (!formData.name.trim()) errs.name = 'Name is required.';
        if (!formData.email.trim()) errs.email = 'Email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email format.';
        
        if (!formData.contactNumber.trim()) errs.contactNumber = 'Contact number is required.';
        else if (!/^\+?\d{7,15}$/.test(formData.contactNumber.trim()))
        errs.contactNumber = 'Invalid phone number.';
        if (!formData.address.trim()) errs.address = 'Address is required.';

        if (!formData.password) errs.password = 'Password is required.';
        else if (formData.password.length < 8) errs.password = 'Password must be at least 8 characters.';
        else if (!/[A-Z]/.test(formData.password)) errs.password = 'Include an uppercase letter.';
        else if (!/[0-9]/.test(formData.password)) errs.password = 'Include a number.';
        else if (!/[^A-Za-z0-9]/.test(formData.password)) errs.password = 'Include a special character.';

        if (formData.password !== formData.confirmPassword) {
            errs.confirmPassword = 'Passwords do not match.';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Prevent execution if already loading (Double-tap protection)
        if (loading) return; 

        if (!validate()) return;

        setLoading(true);
        try {
            const success = await register({
                name: formData.name.trim(),
                email: formData.email.trim(),
                contactNumber: formData.contactNumber.trim(),
                address: formData.address.trim(),
                password: formData.password,
            });

            if (!success) {
                setErrors({ email: 'Email already exists.' });
                setLoading(false); // Only re-enable if failed
                return;
            }
            
            // On success, we don't setLoading(false) because we are navigating away
            navigate('/client/dashboard', { replace: true });
        } catch (err) {
            setErrors({ submit: 'An unexpected error occurred. Please try again.' });
            setLoading(false);
        }
    };

    const handleBlur = (field: keyof typeof formData) => {
        setFormData(prev => ({ ...prev, [field]: prev[field].trim() }));
    };

    useEffect(() => {
    return () => {
        if (profilePreview) URL.revokeObjectURL(profilePreview);
    };
    }, [profilePreview]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-100">
            <div className="bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[1000px] overflow-hidden border border-slate-200/60">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    
                    {/* Left Panel */}
                    <div className="p-12 bg-slate-900 flex flex-col justify-between relative overflow-hidden hidden md:flex">
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
                        <div className="absolute top-0 right-0 size-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                    </div>

                    {/* Right Panel */}
                    <main className="p-6 md:p-12 bg-white">
                        <div className="mb-10">
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Create Account</h1>
                            <p className="text-slate-500 text-sm mt-1.5 font-medium">Please fill in your details to get started.</p>
                        </div>

                        {/* Error Summary */}
                        {Object.keys(errors).length > 0 && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-1 animate-in fade-in slide-in-from-top-2">
                                {Object.values(errors).map((err, i) => (
                                    err && (
                                        <div key={i} className="flex items-center gap-3 text-rose-700 text-xs font-bold">
                                            <AlertCircle className="size-4 flex-shrink-0" />
                                            {err}
                                        </div>
                                    )
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Profile Image Upload */}
                            <div className="flex flex-col sm:flex-row items-center gap-5 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-slate-200">
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
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text" value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        onBlur={() => handleBlur('name')}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        type="email" value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        onBlur={() => handleBlur('email')}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                                        <input
                                            type="tel" value={formData.contactNumber}
                                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                            onBlur={() => handleBlur('contactNumber')}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                            placeholder="+63 9xx..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location / Address</label>
                                        <input
                                            type="text" value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            onBlur={() => handleBlur('address')}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                            placeholder="Manila, PH"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 relative">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                                                placeholder="••••••••"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                        {/* Password Strength Bar UI */}
                                        {formData.password && (
                                            <div className="mt-2 space-y-1.5">
                                                <div className="flex gap-1 h-1">
                                                    {[1, 2, 3, 4].map((step) => {
                                                        const score = 
                                                            (formData.password.length >= 8 ? 1 : 0) +
                                                            (/[A-Z]/.test(formData.password) ? 1 : 0) +
                                                            (/[0-9]/.test(formData.password) ? 1 : 0) +
                                                            (/[^A-Za-z0-9]/.test(formData.password) ? 1 : 0);
                                                        
                                                        return (
                                                            <div 
                                                                key={step}
                                                                className={`h-full flex-1 rounded-full transition-all duration-500 ${
                                                                    score >= step 
                                                                        ? (score <= 2 ? 'bg-rose-500' : score === 3 ? 'bg-amber-500' : 'bg-emerald-500')
                                                                        : 'bg-slate-200'
                                                                }`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                                <p className={`text-[9px] font-bold uppercase tracking-tighter ${
                                                    passwordStrength === 'Strong' ? 'text-emerald-500' : 
                                                    passwordStrength === 'Medium' ? 'text-amber-500' : 'text-rose-500'
                                                }`}>
                                                    Security: {passwordStrength}
                                                </p>
                                            </div>
                                        )}
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