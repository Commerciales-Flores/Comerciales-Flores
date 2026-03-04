import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
    Building2, 
    AlertCircle, 
    CheckCircle, 
    X, 
    ArrowLeft, 
    Mail, 
    Lock, 
    Eye, 
    EyeOff,
    UserCircle2,
    User 
} from 'lucide-react';
import { useIndicator } from '../../contexts/IndicatorContext';

const GoogleLogo = () => (
    <svg className="size-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const FacebookLogo = () => (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
);

export default function Login() {
    const { login, recoverPassword, user } = useAuth();
    const { showIndicator } = useIndicator();
    const navigate = useNavigate();

    // Form States
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [previousUser, setPreviousUser] = useState<{name: string} | null>(null);

    const emailRef = useRef<HTMLInputElement>(null);
    const passRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
    // Clear form whenever user logs out
    if (!user) {
        setFormData({ email: '', password: '' });
    }
    }, [user]);


    // Recovery Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryStatus, setRecoveryStatus] = useState({ type: '', msg: '' });
    const [recoveryLoading, setRecoveryLoading] = useState(false);

    const { formKey } = useAuth();

    // Redirect if already logged in
    if (user) {
        const path = user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
        return <Navigate to={path} replace />;
    }

    useEffect(() => {
        const savedName = localStorage.getItem('last_user_name');
        console.log("CHECKING STORAGE:", savedName);

        if (savedName) {
            setPreviousUser({ name: savedName });
        } else {
            setPreviousUser(null); // Ensure it clears if storage is empty
        }

        if (!user) {
            setFormData({ email: '', password: '' });
        }
    }, [user, formKey]); // Add formKey here!

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);   

        console.log("3. Attempting login for:", formData.email);

        const success = await login(formData.email.trim(), formData.password);

        if (success) {
            const nameToSave = formData.email.split('@')[0];
            console.log("4. Login Success! Saving to storage:", nameToSave);
            localStorage.setItem('last_user_name', nameToSave);
            console.log("5. Verified storage after save:", localStorage.getItem('last_user_name'));
            setFormData({ email: '', password: '' });
        }else {
            setError('Invalid email or password');
            setLoading(false);
            return;
        }

        showIndicator(`Login by ${formData.email} at ${new Date().toLocaleTimeString()}`, 'login');
    };

    const handleRecoverPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecoveryStatus({ type: '', msg: '' });
        setRecoveryLoading(true);

        const result = await recoverPassword(recoveryEmail);
        if (result) {
            setRecoveryStatus({ 
                type: 'success', 
                msg: `A recovery link has been sent to ${recoveryEmail}.` 
            });
        } else {
            setRecoveryStatus({ 
                type: 'error', 
                msg: 'No account found with that email address.' 
            });
        }
        setRecoveryLoading(false);
    };

    const openRecoveryModal = () => {
        setRecoveryStatus({ type: '', msg: '' });
        setRecoveryEmail('');
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 antialiased">
            <div className="w-full max-w-5xl lg:max-w-6xl bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden border border-slate-200/60">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    
                    {/* Left Panel: Brand Experience (Dynamic) */}
                    <div className="p-12 bg-slate-900 text-white flex flex-col items-center justify-center relative overflow-hidden hidden lg:flex transition-all duration-500">
                        <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
                            
                            {/* Dynamic Icon/Avatar */}
                            <div className="size-48 rounded-[3rem] bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-2xl animate-in zoom-in duration-700">
                                {previousUser ? (
                                    <div className="flex flex-col items-center">
                                        {/* Swapped UserCircle2 for User, removed status dot */}
                                        <User className="size-24 text-blue-400" strokeWidth={1} />
                                    </div>
                                ) : (
                                    <Lock className="size-24 text-blue-400" strokeWidth={1.5} />
                                )}
                            </div>

                            {/* Dynamic Text */}
                            <div className="mt-8 text-center space-y-2">
                            <h2 className="text-3xl font-bold tracking-tight text-white animate-in slide-in-from-bottom-2 duration-700 delay-150">
                                {previousUser ? `Welcome Back, ${previousUser.name}` : 'Welcome'}
                            </h2>
                            <p className="text-blue-200/60 font-medium tracking-wide uppercase text-xs animate-in slide-in-from-bottom-2 duration-700 delay-300">
                                {previousUser ? 'Login to your account' : 'Secure Access Portal'}
                            </p>
                            </div>
                        </div>

                        {/* Background blobs */}
                        <div className="absolute top-0 right-0 size-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                        <div className="absolute bottom-0 left-0 size-64 bg-blue-900/20 blur-[100px] rounded-full -ml-32 -mb-32" />
                    </div>

                    {/* Right Panel: Auth Form */}
                    <main className="p-8 sm:p-10 lg:p-16 flex flex-col justify-center bg-white">
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-sm">
                                <Building2 className="size-10" />
                            </div>
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Comerciales Flores</h1>
                            <p className="text-slate-500 font-medium">Sign in to your account</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="size-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <form key={formKey} onSubmit={handleLogin} className="space-y-5 max-w-md mx-auto w-full" autoComplete="off">
                        {/* 1. Sacrificial Hidden Fields: Browsers fill these instead of your real ones */}
                        <div className="sr-only" aria-hidden="true">
                            <input type="text" name="fake_email_remembered" tabIndex={-1} />
                            <input type="password" name="fake_password_remembered" tabIndex={-1} />
                        </div>

                        {/* Email Field */}
                        <div className="space-y-1.5 group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="email" 
                                    required 
                                    ref={emailRef}
                                    autoComplete="username"
                                    value={formData.email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value });
                                        if (error) setError('');
                                    }}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1.5 group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    ref={passRef}
                                    autoComplete="current-password"
                                    value={formData.password}
                                    onChange={(e) => {
                                        setFormData({ ...formData, password: e.target.value });
                                        if (error) setError('');
                                    }}
                                    className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                                    placeholder="••••••••"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                        
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={openRecoveryModal}
                                        className="text-[11px] font-bold text-blue-600 hover:underline"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50 mt-2 active:scale-[0.98]"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        {/* Social Logins */}
                        <div className="mt-8 max-w-md mx-auto w-full">
                            <div className="relative flex items-center justify-center mb-6">
                                <div className="w-full border-t border-slate-100" />
                                <span className="absolute bg-white px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Or login with</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button className="flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs text-slate-700 shadow-sm active:scale-95">
                                    <GoogleLogo /> Google
                                </button>
                                <button className="flex items-center justify-center gap-3 py-3 bg-[#1877F2] text-white rounded-xl hover:bg-[#166fe5] transition-all font-bold text-xs shadow-sm active:scale-95">
                                    <FacebookLogo /> Facebook
                                </button>
                            </div>
                        </div>

                        {/* Footer Links */}
                        <div className="mt-12 text-center space-y-3">
                            <p className="text-slate-500 text-sm font-medium">
                                Don't have an account?{' '}
                                <Link to="/register" className="text-blue-600 font-bold hover:underline">Sign up</Link>
                            </p>
                            <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-all group">
                                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> 
                                Back to Home
                            </Link>
                        </div>
                    </main>
                </div>
            </div>

            {/* Password Recovery Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-10 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Recovery</h2>
                            <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
                                <X className="size-6 text-slate-400" />
                            </button>
                        </div>

                        {recoveryStatus.type === 'error' && (
                            <div className="mb-6 p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-3">
                                <AlertCircle className="size-4" /> {recoveryStatus.msg}
                            </div>
                        )}

                        {recoveryStatus.type === 'success' ? (
                            <div className="text-center py-6">
                                <div className="size-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="size-8" />
                                </div>
                                <p className="text-slate-600 font-medium mb-8 leading-relaxed">{recoveryStatus.msg}</p>
                                <button onClick={() => setIsModalOpen(false)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-colors">Close</button>
                            </div>
                        ) : (
                            <form onSubmit={handleRecoverPassword} className="space-y-6">
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">Enter your email and we'll send instructions to reset your password.</p>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        type="email" 
                                        required 
                                        value={recoveryEmail}
                                        onChange={(e) => setRecoveryEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none text-sm font-medium"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <button
                                    type="submit" 
                                    disabled={recoveryLoading}
                                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/10 transition-all disabled:opacity-50"
                                >
                                    {recoveryLoading ? 'Processing...' : 'Send Recovery Link'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}