import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { householdService } from '../services/householdService';

interface AuthScreenProps {
  onSuccess: () => void;
  initialMode?: 'LOGIN' | 'SIGNUP_CREATE' | 'SIGNUP_JOIN';
}

const ACTIVE_PROFILE_STORAGE_KEY = 'homework-active-profile';

const normalizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected authentication failure.';
};

const persistHouseholdSession = (householdId: string): void => {
  const existingRaw = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);

  if (!existingRaw) {
    localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, JSON.stringify({ householdId, familyId: householdId }));
    return;
  }

  try {
    const existing = JSON.parse(existingRaw) as Record<string, unknown>;
    localStorage.setItem(
      ACTIVE_PROFILE_STORAGE_KEY,
      JSON.stringify({
        ...existing,
        householdId,
        familyId: householdId,
      }),
    );
  } catch {
    localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, JSON.stringify({ householdId, familyId: householdId }));
  }
};

export default function AuthScreen({ onSuccess, initialMode = 'LOGIN' }: AuthScreenProps) {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP_INIT' | 'SIGNUP_CREATE' | 'SIGNUP_JOIN'>(
    initialMode === 'LOGIN' ? 'LOGIN' : initialMode,
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setMode(initialMode === 'LOGIN' ? 'LOGIN' : initialMode);
  }, [initialMode]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase Auth is not configured. Add VITE_FIREBASE_* keys first.');
      }

      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password);
      const household = await householdService.getCurrentHousehold(credentials.user.uid);

      if (!household) {
        throw new Error('No household is linked to this account. Ask an admin for an invite.');
      }

      persistHouseholdSession(household.id);
      onSuccess();
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase Auth is not configured. Add VITE_FIREBASE_* keys first.');
      }

      const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);

      if (mode === 'SIGNUP_CREATE') {
        const { household, profile } = await householdService.createHouseholdForUser(
          credentials.user.uid,
          householdName.trim(),
          name.trim(),
        );

        localStorage.setItem(
          ACTIVE_PROFILE_STORAGE_KEY,
          JSON.stringify({
            householdId: household.id,
            familyId: household.id,
            profileId: profile.id,
            role: profile.role,
          }),
        );
      }

      if (mode === 'SIGNUP_JOIN') {
        if (inviteCode.trim().length === 0) {
          throw new Error('Invite code is required to join an existing household.');
        }

        const profile = await householdService.acceptInvite(
          inviteCode.trim(),
          name.trim(),
          credentials.user.uid,
        );
        localStorage.setItem(
          ACTIVE_PROFILE_STORAGE_KEY,
          JSON.stringify({
            householdId: profile.householdId,
            familyId: profile.householdId,
            profileId: profile.id,
            role: profile.role,
          }),
        );
      }

      onSuccess();
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-white font-sans relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}></div>
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-2xl">
            <ShieldCheck className="w-8 h-8 text-[#b30000]" />
          </div>
          <h1 className="text-3xl font-[590] tracking-tight mb-2">
            {mode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-[#888]">
            {mode === 'LOGIN' ? 'Sign in to manage your family economy' : 'Start your household workspace'}
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#b30000]" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Password</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#b30000]" required />
              </div>

              {errorMessage && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">{errorMessage}</div>}

              <button type="submit" disabled={loading} className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </button>

              <div className="text-center mt-4">
                <Link to="/signup" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Don&apos;t have an account? <span className="text-[#b30000] font-medium">Sign Up</span>
                </Link>
              </div>
            </form>
          )}

          {mode === 'SIGNUP_INIT' && (
            <div className="space-y-4">
              <button onClick={() => setMode('SIGNUP_CREATE')} className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors group">
                <div className="font-bold text-white mb-1 flex items-center justify-between">
                  Create New Household <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                </div>
                <div className="text-xs text-gray-500">I am setting up a family for the first time.</div>
              </button>

              <button onClick={() => setMode('SIGNUP_JOIN')} className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors group">
                <div className="font-bold text-white mb-1 flex items-center justify-between">
                  Join Existing Household <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                </div>
                <div className="text-xs text-gray-500">I have an invite token.</div>
              </button>

              <div className="text-center mt-6">
                <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Already have an account? <span className="text-[#b30000] font-medium">Log In</span>
                </Link>
              </div>
            </div>
          )}

          {(mode === 'SIGNUP_CREATE' || mode === 'SIGNUP_JOIN') && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#b30000]" required />
              </div>

              {mode === 'SIGNUP_CREATE' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Household Name</label>
                  <input type="text" value={householdName} onChange={(event) => setHouseholdName(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#b30000]" required />
                </div>
              )}

              {mode === 'SIGNUP_JOIN' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Invite Code</label>
                  <input type="text" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#b30000]" required />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#b30000]" required />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Password</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#b30000]" required minLength={6} />
              </div>

              {errorMessage && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">{errorMessage}</div>}

              <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-[#b30000] to-[#7a0000] text-white font-bold rounded-xl shadow-lg hover:shadow-[#b30000]/20 transition-all flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'SIGNUP_CREATE' ? 'Create Account & Household' : 'Create Account'}
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

      {!isFirebaseConfigured && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#b30000] text-white px-4 py-2 rounded-lg text-xs tracking-wide">
          Configure Firebase keys in `.env` to enable sign-in.
        </div>
      )}
    </div>
  );
}
