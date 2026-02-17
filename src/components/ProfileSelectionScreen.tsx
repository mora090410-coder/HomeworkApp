import React from 'react';
import { Link2, Loader2, LogOut, Plus, Shield, Trash2, UserRound, Users, X } from 'lucide-react';
import { Profile } from '../types';

interface LandingScreenProps {
  profiles: Profile[];
  isLoading: boolean;
  selectedProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
  canAddProfile: boolean;
  isAdminUser: boolean;
  isCreatingProfile: boolean;
  createProfileError: string | null;
  profilesError: string | null;
  onCreateProfile: (payload: { name: string; pin?: string; avatarColor: string }) => Promise<void>;
  onDeleteProfile: (profile: Profile) => Promise<void>;
  onGenerateSetupLink: (profile: Profile) => Promise<void>;
  onSignOut: () => void;
}

const profileIcon = (role: Profile['role']) => {
  if (role === 'ADMIN') {
    return <Shield className="w-8 h-8" aria-hidden="true" />;
  }

  if (role === 'CHILD') {
    return <UserRound className="w-8 h-8" aria-hidden="true" />;
  }

  return <Users className="w-8 h-8" aria-hidden="true" />;
};

export default function ProfileSelectionScreen({
  profiles,
  isLoading,
  selectedProfileId,
  onSelectProfile,
  canAddProfile,
  isAdminUser,
  isCreatingProfile,
  createProfileError,
  profilesError,
  onCreateProfile,
  onDeleteProfile,
  onGenerateSetupLink,
  onSignOut,
}: LandingScreenProps) {
  const [isAddProfileOpen, setIsAddProfileOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [avatarColor, setAvatarColor] = React.useState('#ef4444');
  const [formError, setFormError] = React.useState<string | null>(null);

  const colorOptions = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  const resetForm = () => {
    setName('');
    setPin('');
    setAvatarColor('#ef4444');
    setFormError(null);
  };

  const closeAddProfile = () => {
    if (isCreatingProfile) {
      return;
    }
    setIsAddProfileOpen(false);
    resetForm();
  };

  const handleCreateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError('Name is required.');
      return;
    }

    if (pin.length > 0 && !/^\d{4}$/.test(pin)) {
      setFormError('PIN must be exactly 4 digits when provided.');
      return;
    }

    setFormError(null);
    try {
      await onCreateProfile({ name: trimmedName, pin: pin.length > 0 ? pin : undefined, avatarColor });
      closeAddProfile();
    } catch {
      // Parent owns surfaced errors.
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}></div>
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-12 pt-8">
        <header className="flex items-center justify-between mb-16">
          <div className="text-xl font-[590] tracking-tight">HomeWork</div>
          <div className="flex items-center gap-3">
            {canAddProfile && (
              <button
                type="button"
                onClick={() => setIsAddProfileOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[#b30000]/40 bg-[#b30000]/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#ffb4b4] hover:bg-[#b30000]/25"
                aria-label="Add profile"
              >
                <Plus className="w-4 h-4" />
                Add Profile
              </button>
            )}
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/10"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>

        <main>
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-[590] tracking-tight mb-3">Who&apos;s watching?</h1>
            <p className="text-gray-400">Choose a profile to continue to your household dashboard.</p>
          </div>

          {isLoading && (
            <div className="mx-auto flex max-w-xl items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#b30000]" />
              <span className="ml-3 text-sm text-gray-300">Loading profiles...</span>
            </div>
          )}

          {!isLoading && profiles.length === 0 && (
            <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-gray-300">No profiles found in this household yet.</p>
              {profilesError && (
                <p className="mt-3 text-xs text-red-400" aria-label="Profile load error">
                  {profilesError}
                </p>
              )}
            </div>
          )}

          {!isLoading && profiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile) => {
                const isSelected = profile.id === selectedProfileId;
                return (
                  <div
                    key={profile.id}
                    className={`group rounded-2xl border p-6 text-left transition-all ${isSelected
                      ? 'border-[#b30000] bg-[#b30000]/10 shadow-[0_0_0_1px_rgba(179,0,0,0.5)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-[#b30000]/50 hover:bg-white/[0.06]'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectProfile(profile.id)}
                      className="w-full text-left"
                      aria-label={`Select profile ${profile.name}`}
                    >
                      <div
                        className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border ${profile.role === 'ADMIN'
                            ? 'border-[#b30000]/60 text-[#ff8a8a]'
                            : 'border-white/20 text-white'
                          }`}
                        style={{
                          backgroundColor:
                            profile.role === 'ADMIN'
                              ? 'rgba(179, 0, 0, 0.2)'
                              : profile.avatarColor ?? 'rgba(255,255,255,0.1)',
                        }}
                      >
                        {profileIcon(profile.role)}
                      </div>
                      <div className="text-lg font-semibold text-white">{profile.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-gray-400">{profile.role}</div>
                    </button>

                    {isAdminUser && profile.role === 'CHILD' && (
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void onGenerateSetupLink(profile);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-200 hover:bg-white/10"
                          aria-label={`Generate setup link for ${profile.name}`}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Generate Setup Link
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void onDeleteProfile(profile);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-300 hover:bg-red-500/20"
                          aria-label={`Delete profile ${profile.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {isAddProfileOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/80"
            aria-label="Close add profile modal backdrop"
            onClick={closeAddProfile}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#171717] p-6">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white"
              onClick={closeAddProfile}
              aria-label="Close add profile modal"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-semibold text-white">Add Profile</h2>
            <p className="mt-1 text-sm text-gray-400">Create a child profile for this household.</p>

            <form className="mt-6 space-y-4" onSubmit={handleCreateProfile}>
              <div>
                <label htmlFor="profile-name" className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                  Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none placeholder:text-gray-500 focus:border-[#b30000]/60"
                  placeholder="Emily"
                  aria-label="Profile name"
                />
              </div>

              <div>
                <label htmlFor="profile-pin" className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                  4-digit PIN (optional)
                </label>
                <input
                  id="profile-pin"
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none placeholder:text-gray-500 focus:border-[#b30000]/60"
                  placeholder="0000"
                  aria-label="Profile PIN"
                />
              </div>

              <div>
                <span className="mb-2 block text-xs uppercase tracking-wide text-gray-400">Avatar Color</span>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      className={`h-9 w-9 rounded-full border ${avatarColor === color ? 'border-white' : 'border-white/20'
                        }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select avatar color ${color}`}
                    />
                  ))}
                </div>
              </div>

              {(formError || createProfileError) && (
                <p className="text-sm text-red-400">{formError ?? createProfileError}</p>
              )}

              <button
                type="submit"
                disabled={isCreatingProfile}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#b30000] px-4 py-2 font-semibold text-white hover:bg-[#8f0000] disabled:opacity-60"
                aria-label="Save profile"
              >
                {isCreatingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
