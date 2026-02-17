import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
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

interface PersistHouseholdSessionInput {
  householdId: string;
  profileId?: string;
  role?: 'ADMIN' | 'CHILD' | 'MEMBER';
}

const persistHouseholdSession = ({ householdId, profileId, role }: PersistHouseholdSessionInput): void => {
  const existingRaw = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);

  if (!existingRaw) {
    localStorage.setItem(
      ACTIVE_PROFILE_STORAGE_KEY,
      JSON.stringify({
        householdId,
        familyId: householdId,
        ...(profileId ? { profileId } : {}),
        ...(role ? { role } : {}),
      }),
    );
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
        ...(profileId ? { profileId } : {}),
        ...(role ? { role } : {}),
      }),
    );
  } catch {
    localStorage.setItem(
      ACTIVE_PROFILE_STORAGE_KEY,
      JSON.stringify({
        householdId,
        familyId: householdId,
        ...(profileId ? { profileId } : {}),
        ...(role ? { role } : {}),
      }),
    );
  }
};

export default function AuthScreen({ onSuccess, initialMode = 'LOGIN' }: AuthScreenProps) {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP_INIT' | 'SIGNUP_CREATE' | 'SIGNUP_JOIN'>(
    initialMode === 'LOGIN' ? 'LOGIN' : initialMode,
  );
  const [loginVariant, setLoginVariant] = useState<'PARENT' | 'CHILD'>('PARENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childUsername, setChildUsername] = useState('');
  const [childPin, setChildPin] = useState('');
  const [name, setName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setMode(initialMode === 'LOGIN' ? 'LOGIN' : initialMode);
    setLoginVariant('PARENT');
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

      const membership = await householdService.getUserHouseholdMembership(
        credentials.user.uid,
        household.id,
      );

      persistHouseholdSession({
        householdId: household.id,
        ...(membership?.profileId ? { profileId: membership.profileId } : {}),
        ...(membership?.role ? { role: membership.role } : {}),
      });
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

  const handleChildLogin = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase Auth is not configured. Add VITE_FIREBASE_* keys first.');
      }

      const childSession = await householdService.childLogin({
        username: childUsername,
        pin: childPin,
      });

      await signInWithCustomToken(auth, childSession.token);
      persistHouseholdSession({
        householdId: childSession.householdId,
        profileId: childSession.profileId,
        role: childSession.role,
      });
      onSuccess();
    } catch (error: unknown) {
      let displayMessage = 'Username or PIN is incorrect.';
      if (error instanceof Error && 'code' in error && typeof error.message === 'string') {
        const colonIndex = error.message.indexOf(': ');
        displayMessage = colonIndex >= 0 ? error.message.slice(colonIndex + 2) : error.message;
      }
      setErrorMessage(displayMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}></div>
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-dark border border-white/10 mb-6 shadow-2xl backdrop-blur-xl">
            <ShieldCheck className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-3xl font-[590] tracking-tight mb-2 text-white">
            {mode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-400">
            {mode === 'LOGIN' ? 'Sign in to manage your family economy' : 'Start your household workspace'}
          </p>
        </div>

        <div className="glass-dark border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
          {mode === 'LOGIN' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-black/40 p-1.5">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-300 ${loginVariant === 'PARENT'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  onClick={() => {
                    setLoginVariant('PARENT');
                    setErrorMessage(null);
                  }}
                  aria-label="Parent sign in"
                >
                  Parent
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-300 ${loginVariant === 'CHILD'
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  onClick={() => {
                    setLoginVariant('CHILD');
                    setErrorMessage(null);
                  }}
                  aria-label="Child sign in"
                >
                  Child
                </button>
              </div>

              {loginVariant === 'PARENT' ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Email</label>
                      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all focus:bg-white/10" placeholder="name@example.com" required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Password</label>
                      <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all focus:bg-white/10" placeholder="••••••••" required />
                    </div>
                  </div>

                  {errorMessage && <div className="text-red-300 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                    <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-red-400 shrink-0" />
                    {errorMessage}
                  </div>}

                  <Button
                    type="submit"
                    variant="primary" // Changed to primary for better visibility/consistency or keep white if intended
                    className="w-full py-6 bg-white text-black hover:bg-gray-100 shadow-md transform hover:-translate-y-0.5" // Custom override for the specific 'Parent' white button style if we want to keep it distinctive
                    isLoading={loading}
                  >
                    Sign In as Parent
                  </Button>

                  <div className="text-center pt-2">
                    <Link to="/signup" className="text-sm text-gray-400 hover:text-white transition-colors">
                      Don&apos;t have an account? <span className="text-primary-400 font-semibold hover:text-primary-300 underline decoration-primary-400/30 underline-offset-4">Sign Up</span>
                    </Link>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleChildLogin} className="space-y-5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Username</label>
                      <input
                        type="text"
                        value={childUsername}
                        onChange={(event) => setChildUsername(event.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                        placeholder="Your username"
                        required
                        aria-label="Child username"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">PIN (4 digits)</label>
                      <input
                        type="password"
                        value={childPin}
                        onChange={(event) => setChildPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                        inputMode="numeric"
                        maxLength={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono tracking-widest text-center text-lg"
                        placeholder="••••"
                        required
                        aria-label="Child PIN"
                      />
                    </div>
                  </div>

                  {errorMessage && <div className="text-red-300 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                    <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-red-400 shrink-0" />
                    {errorMessage}
                  </div>}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full py-6 shadow-glow-primary"
                    isLoading={loading}
                  >
                    Sign In as Child
                  </Button>
                </form>
              )}
            </div>
          )}

          {mode === 'SIGNUP_INIT' && (
            <div className="space-y-4">
              <button onClick={() => setMode('SIGNUP_CREATE')} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 hover:border-white/20 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="font-bold text-white mb-1.5 flex items-center justify-between text-lg">
                    New Household <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="text-sm text-gray-400 group-hover:text-gray-300">Set up a family workspace from scratch</div>
                </div>
              </button>

              <button onClick={() => setMode('SIGNUP_JOIN')} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 hover:border-white/20 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="font-bold text-white mb-1.5 flex items-center justify-between text-lg">
                    Join Household <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="text-sm text-gray-400 group-hover:text-gray-300">I have an invite code</div>
                </div>
              </button>

              <div className="text-center mt-8">
                <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Already have an account? <span className="text-primary-400 font-semibold hover:text-primary-300 underline decoration-primary-400/30 underline-offset-4">Log In</span>
                </Link>
              </div>
            </div>
          )}

          {(mode === 'SIGNUP_CREATE' || mode === 'SIGNUP_JOIN') && (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Full Name</label>
                  <input type="text" value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" placeholder="John Doe" required />
                </div>

                {mode === 'SIGNUP_CREATE' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Household Name</label>
                    <input type="text" value={householdName} onChange={(event) => setHouseholdName(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" placeholder="The Smith Family" required />
                  </div>
                )}

                {mode === 'SIGNUP_JOIN' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Invite Code</label>
                    <input type="text" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" placeholder="Enter code" required />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Email</label>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" placeholder="name@example.com" required />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Password</label>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" placeholder="min. 6 characters" required minLength={6} />
                </div>
              </div>

              {errorMessage && <div className="text-red-300 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-red-400 shrink-0" />
                {errorMessage}
              </div>}

              <Button
                type="submit"
                variant="primary"
                className="w-full py-6 shadow-glow-primary"
                isLoading={loading}
              >
                {mode === 'SIGNUP_CREATE' ? 'Create Household' : 'Create Account'}
              </Button>

              <div className="text-center mt-2">
                <button type="button" onClick={() => setMode('SIGNUP_INIT')} className="text-sm text-gray-500 hover:text-white transition-colors">
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {!isFirebaseConfigured && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-primary-500/50 text-white px-4 py-2 rounded-full text-xs tracking-wide shadow-glow-primary backdrop-blur-md">
          Configure Firebase keys in `.env` to enable sign-in.
        </div>
      )}
    </div>
  );
}
