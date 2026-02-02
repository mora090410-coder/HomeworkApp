
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { FamilyService } from '../services/family';
import { Mail, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface AuthScreenProps {
    onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP_INIT' | 'SIGNUP_CREATE' | 'SIGNUP_JOIN'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sign Up Only
    const [name, setName] = useState('');
    const [familyName, setFamilyName] = useState(''); // For Create
    const [inviteCode, setInviteCode] = useState(''); // For Join (future proofing)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // Success is handled by App.tsx listener
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin, // Force redirect to current origin (e.g. localhost:5173) instead of Supabase default (localhost:3000)
                    data: {
                        full_name: name,
                        family_name: mode === 'SIGNUP_CREATE' ? familyName : undefined,
                        // We can add metadata like 'intent: create' or 'intent: join'
                        intent: mode === 'SIGNUP_CREATE' ? 'create_family' : 'join_family'
                    }
                }
            });
            if (error) throw error;

            // If we have a session (auto-confirm), initialize data
            if (data.session && data.user) {
                if (mode === 'SIGNUP_CREATE') {
                    try {
                        const { profile } = await FamilyService.createFamilyForUser(data.user.id, familyName, name);
                        // Store profile in local storage to "Login" to this profile immediately
                        localStorage.setItem('homework-active-profile', JSON.stringify({
                            familyId: profile.family_id,
                            profileId: profile.id,
                            role: 'ADMIN'
                        }));
                    } catch (createError) {
                        console.error("Failed to init family", createError);
                        // Continue anyway, Auth listener will pick up user, but might lack profile.
                        // Ideal: Revert auth? For MVP, we proceed.
                    }
                }
            } else {
                setError('Please check your email to confirm your account.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-cardinal selection:text-white relative">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}></div>

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-2xl">
                        <ShieldCheck className="w-8 h-8 text-gold" />
                    </div>
                    <h1 className="text-3xl font-[590] tracking-tight mb-2">
                        {mode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-[#888]">
                        {mode === 'LOGIN' ? 'Sign in to manage your family economy' : 'Start your journey to financial literacy'}
                    </p>
                </div>

                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {mode === 'LOGIN' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold transition-colors"
                                    required
                                />
                            </div>

                            {error && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Sign In
                            </button>

                            <div className="text-center mt-4">
                                <button type="button" onClick={() => setMode('SIGNUP_INIT')} className="text-sm text-gray-400 hover:text-white transition-colors">
                                    Don't have an account? <span className="text-gold font-medium">Sign Up</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* SIGNUP SELECTION STEP */}
                    {mode === 'SIGNUP_INIT' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => setMode('SIGNUP_CREATE')}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors group cursor-pointer"
                            >
                                <div className="font-bold text-white mb-1 flex items-center justify-between">
                                    Create New Household <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                                </div>
                                <div className="text-xs text-gray-500">I am setting up a family for the first time.</div>
                            </button>

                            <button
                                onClick={() => setMode('SIGNUP_JOIN')} // We can reuse SIGNUP_CREATE but with diff intent, but explicit is better
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors group cursor-pointer"
                            >
                                <div className="font-bold text-white mb-1 flex items-center justify-between">
                                    Join Existing Household <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                                </div>
                                <div className="text-xs text-gray-500">I have an invite code or link.</div>
                            </button>

                            <div className="text-center mt-6">
                                <button type="button" onClick={() => setMode('LOGIN')} className="text-sm text-gray-400 hover:text-white transition-colors">
                                    Already have an account? <span className="text-gold font-medium">Log In</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SIGNUP FORM (CREATE/JOIN) */}
                    {(mode === 'SIGNUP_CREATE' || mode === 'SIGNUP_JOIN') && (
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={name} onChange={e => setName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold transition-colors"
                                    required
                                />
                            </div>

                            {mode === 'SIGNUP_CREATE' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Family Name</label>
                                    <input
                                        type="text"
                                        value={familyName} onChange={e => setFamilyName(e.target.value)}
                                        placeholder="The Smiths"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold transition-colors"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold transition-colors"
                                    required
                                    minLength={6}
                                />
                            </div>

                            {error && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-cardinal to-[#800000] text-white font-bold rounded-xl shadow-lg hover:shadow-cardinal/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {mode === 'SIGNUP_CREATE' ? 'Create Account & Family' : 'Create Account'}
                            </button>

                            <div className="text-center mt-4">
                                <button type="button" onClick={() => setMode('SIGNUP_INIT')} className="text-sm text-gray-500 hover:text-white transition-colors">
                                    Back
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
