import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, AlertCircle, CheckCircle, X } from 'lucide-react';

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

export default function Login() {
    const { login, recoverPassword } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

        if (success) {
            // Check user role and redirect
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (user.role === 'admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/client/dashboard');
                }
            }
        } else {
            setError('Invalid email or password');
            setLoading(false);
        }
    };

    // ✅ START: New function to handle the recovery form submission
    const handleRecoverPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecoveryError('');
        setRecoverySuccess('');
        setRecoveryLoading(true);

        const result = await recoverPassword(recoveryEmail);

        if (result) {
            // For demo purposes, we show the password in an alert.
            alert(`DEMO ONLY:\nYour password is: ${result.password}`);
            setRecoverySuccess(`A recovery link has been sent to ${recoveryEmail} (simulation). You can now close this window.`);
        } else {
            setRecoveryError('No account found with that email address.');
        }
        setRecoveryLoading(false);
    };

    const openModal = () => {
        // Reset modal state when opening
        setRecoveryEmail('');
        setRecoveryError('');
        setRecoverySuccess('');
        setIsModalOpen(true);
    }
    // ✅ END: New function


    return (
        <div className="h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-12">
            <div className="w-[800px] md:w-[1000px] bg-white rounded-lg shadow-xl">

                <div className="grid grid-cols-1 md:grid-cols-2 w-full">
                    {/* Left panel: Profile */}
                    <div className="p-12 bg-gradient-to-b from-blue-100 to-blue-200 text-blue-900 flex flex-col justify-center gap-6 w-full">
                        <div className="flex flex-col items-center gap-4 mx-8">
                            <div className="rounded-full bg-gray-100 flex items-center justify-center border-2 border-blue-300"
                                style={{ width: '200px', height: '200px' }}>
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    style={{ width: '120px', height: '120px' }}
                                >
                                    <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M20 21v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-center">Welcome, User</h2>
                        </div>
                    </div>

                    {/* Right form panel */}
                    <main className="p-12 flex flex-col justify-center w-full">
                        <div className="text-center mb-8">
                            <div className="flex justify-center mb-4">
                                <Building2 className="size-16 text-blue-600" />
                            </div>
                            <h1 className="text-blue-600 mb-2">Commerciales Flores</h1>
                            <p className="text-gray-600">Sign in to your account</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                                <AlertCircle className="size-5" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 w-[400px] max-w-full">

                            <div>
                                <label className="block text-sm text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="you@example.com"
                                />

                                <label className="invisible select-none pointer-events-none opacity-0 cursor-default">
                                    xxxxxxxxxxxxxxxxxxxxxxxxxxx
                                </label>

                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>

                            {/* ✅ START: NEW FORGOT PASSWORD LINK */}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={openModal}
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            {/* ✅ END: NEW FORGOT PASSWORD LINK */}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-4">
                                {/* Google Button */}
                                <button
                                    type="button"
                                    onClick={() => alert("Google login not implemented")}
                                    className="w-full inline-flex justify-center items-center gap-3 py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <GoogleLogo />
                                    <span>Google</span>
                                </button>

                                {/* Facebook Button */}
                                <button
                                    type="button"
                                    onClick={() => alert("Facebook login not implemented")}
                                    className="w-full inline-flex justify-center items-center gap-3 py-2 px-4 border border-transparent rounded-lg shadow-sm bg-[#1877F2] text-sm font-medium text-white hover:bg-[#166fe5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2]"
                                >
                                    <FacebookLogo />
                                    <span>Facebook</span>
                                </button>
                            </div>
                        </div>
                        {/* ✅ END: Social Login Section */}


                        <div className="mt-6 text-center space-y-2">
                            <p className="text-gray-600">
                                Don't have an account?{' '}
                                <Link to="/register" className="text-blue-600 hover:text-blue-700">
                                    Sign up
                                </Link>
                            </p>
                            <Link to="/" className="block text-blue-600 hover:text-blue-700">
                                Back to Home
                            </Link>
                        </div>

                        {/*<div className="mt-8 pt-6 border-t border-gray-200">*/}
                        {/*    <p className="text-sm text-gray-500 mb-2">Demo Accounts:</p>*/}
                        {/*    <div className="text-xs space-y-1 text-gray-600">*/}
                        {/*        <p>Admin: admin@flores.com / admin123</p>*/}
                        {/*        <p>Client: client@example.com / client123</p>*/}
                        {/*    </div>*/}
                        {/*</div>*/}
                    </main>
                </div>
            </div>

            {/* ✅ START: FORGOT PASSWORD MODAL JSX */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center p-4">          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Password Recovery</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="size-6" />
                        </button>
                    </div>

                    {recoveryError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                            <AlertCircle className="size-5" />
                            {recoveryError}
                        </div>
                    )}

                    {recoverySuccess && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                            <CheckCircle className="size-5" />
                            {recoverySuccess}
                        </div>
                    )}

                    {!recoverySuccess && (
                        <form onSubmit={handleRecoverPassword} className="space-y-4">
                            <p className="text-sm text-gray-600">Enter your account's email address and we will send you a password recovery link (simulation).</p>
                            <div>
                                <label className="block text-sm text-gray-700 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={recoveryEmail}
                                    onChange={(e) => setRecoveryEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={recoveryLoading}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {recoveryLoading ? 'Searching...' : 'Recover Password'}
                            </button>
                        </form>
                    )}
                </div>
                </div>
            )}
            {/* ✅ END: FORGOT PASSWORD MODAL JSX */}
        </div>
    );
}