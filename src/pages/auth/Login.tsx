import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, AlertCircle, CheckCircle, X, ArrowLeft, Mail, Lock } from 'lucide-react';

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
    const { login, recoverPassword } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
    if (user) {
        navigate(user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard');
    }
    }, [user, navigate]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryError, setRecoveryError] = useState('');
    const [recoverySuccess, setRecoverySuccess] = useState('');
    const [recoveryLoading, setRecoveryLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const success = await login(formData.email, formData.password);
        console.log('Login success:', success);
  console.log('User after login (from context):', user);  // <-- check this
  console.log('User in localStorage:', localStorage.getItem('currentUser'));

        if (!success) {
            setError('Invalid email or password');
            setLoading(false);
            return;
        }

        // DO NOT read `user` immediately, let the effect handle redirect
        setLoading(false);
        };

    const handleRecoverPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecoveryError('');
        setRecoverySuccess('');
        setRecoveryLoading(true);

        const result = await recoverPassword(recoveryEmail);
        if (result) {
            setRecoverySuccess(`A recovery link has been sent to ${recoveryEmail}.`);
        } else {
            setRecoveryError('No account found with that email address.');
        }
        setRecoveryLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 antialiased">
            <div className="w-full max-w-[1000px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden border border-slate-200/60">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    
                    {/* Left Panel: Profile maintained */}
                    <div className="p-12 bg-slate-900 text-white flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-center gap-8">
                            <div className="size-48 rounded-[3rem] bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-2xl">
                                <svg viewBox="0 0 24 24" fill="none" className="size-24 text-blue-400" stroke="currentColor">
                                    <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M20 21v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
                                <p className="text-slate-400 mt-2 font-medium">
                                    {user?.name || 'Guest'}
                                </p>
                            </div>
                        </div>
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 size-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                    </div>

                    {/* Right Panel: Form maintained */}
                    <main className="p-12 md:p-16 flex flex-col justify-center bg-white">
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

                        <form onSubmit={handleSubmit} className="space-y-5 max-w-[400px] mx-auto w-full">
                            <div className="space-y-1.5 group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="email" required value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Password
                            </label>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                                placeholder="••••••••"
                                />
                            </div>

                            <div className="text-right">
                                <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="text-[11px] font-bold text-blue-600 hover:underline"
                                >
                                Forgot Password?
                                </button>
                            </div>
                            </div>

                            <button
                                type="submit" disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50 mt-2 active:scale-[0.98]"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        {/* Social Logins */}
                        <div className="mt-8 max-w-[400px] mx-auto w-full">
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

                        {/* Bigger Footer Links */}
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
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-10 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Recovery</h2>
                            <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
                                <X className="size-6 text-slate-400" />
                            </button>
                        </div>

                        {recoveryError && (
                            <div className="mb-6 p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-3">
                                <AlertCircle className="size-4" /> {recoveryError}
                            </div>
                        )}

                        {recoverySuccess ? (
                            <div className="text-center py-6">
                                <div className="size-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="size-8" />
                                </div>
                                <p className="text-slate-600 font-medium mb-8 leading-relaxed">{recoverySuccess}</p>
                                <button onClick={() => setIsModalOpen(false)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold">Close</button>
                            </div>
                        ) : (
                            <form onSubmit={handleRecoverPassword} className="space-y-6">
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">Enter your email and we'll send instructions to reset your password.</p>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        type="email" required value={recoveryEmail}
                                        onChange={(e) => setRecoveryEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none text-sm"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <button
                                    type="submit" disabled={recoveryLoading}
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