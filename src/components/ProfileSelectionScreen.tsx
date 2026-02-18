import React from 'react';
import { Link2, Loader2, LogOut, Plus, Shield, Trash2, UserRound, Users, X } from 'lucide-react';
import { Button } from './ui/Button';
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
  // Default to a semantic color class or a compatible hex. 
  // To avoid breaking backend if it expects hex, let's stick to the hex values 
  // but ensure we visually style things with our theme where possible.
  // Actually, the previous file used hex strings for `avatarColor`.
  const [avatarColor, setAvatarColor] = React.useState('#ef4444');
  const [formError, setFormError] = React.useState<string | null>(null);

  // We keep these hex values for the avatar persistence, but we should make sure they look good.
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
    // Background: Changed from static #0a0a0a to bg-gray-950
    <div className="min-h-screen bg-white text-neutral-black relative overflow-hidden font-sans selection:bg-primary-500/30">

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-12 pt-8">
        <header className="flex items-center justify-between mb-16">
          <div className="text-xl font-[590] tracking-tight text-neutral-black font-heading">HomeWork</div>
          <div className="flex items-center gap-3">
            {canAddProfile && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddProfileOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Profile
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign Out
            </Button>
          </div>
        </header>

        <main>
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight mb-3 text-neutral-black">Who&apos;s watching?</h1>
            <p className="text-neutral-500 font-sans">Choose a profile to continue to your household dashboard.</p>
          </div>

          {isLoading && (
            <div className="mx-auto flex max-w-xl items-center justify-center rounded-none border border-neutral-200 bg-neutral-50 p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-cardinal" />
              <span className="ml-3 text-sm text-neutral-900">Loading profiles...</span>
            </div>
          )}

          {!isLoading && profiles.length === 0 && (
            <div className="mx-auto max-w-xl rounded-none border border-neutral-200 bg-neutral-50 p-8 text-center text-neutral-500">
              <p className="text-sm">No profiles found in this household yet.</p>
              {profilesError && (
                <p className="mt-3 text-xs text-red-500" aria-label="Profile load error">
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
                    // Card: Standard clean style
                    className={`group rounded-none border p-6 text-left transition-all ${isSelected
                      ? 'border-primary-cardinal bg-primary-gold/5 shadow-md'
                      : 'bg-white border-neutral-200 hover:border-primary-gold/50 hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectProfile(profile.id)}
                      className="w-full text-left"
                      aria-label={`Select profile ${profile.name}`}
                    >
                      <div
                        className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border transition-transform group-hover:scale-105 ${profile.role === 'ADMIN'
                          ? 'border-primary-gold bg-primary-gold/10 text-primary-cardinal'
                          : 'border-neutral-200 bg-neutral-100 text-neutral-500'
                          }`}
                        style={{
                          backgroundColor:
                            profile.role === 'ADMIN'
                              ? undefined
                              : profile.avatarColor ?? undefined,
                          color: profile.avatarColor ? 'white' : undefined,
                          borderColor: profile.avatarColor ? 'transparent' : undefined
                        }}
                      >
                        {profileIcon(profile.role)}
                      </div>
                      <div className="text-lg font-bold font-heading text-neutral-black group-hover:text-primary-cardinal transition-colors">{profile.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-neutral-500 font-bold">{profile.role}</div>
                    </button>

                    {isAdminUser && profile.role === 'CHILD' && (
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card selection
                            void onGenerateSetupLink(profile);
                          }}
                          leftIcon={<Link2 className="h-3.5 w-3.5" />}
                          className="text-xs uppercase tracking-wide px-3 py-1.5 h-auto text-neutral-900 hover:text-white"
                        >
                          Generate Link
                        </Button>
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card selection
                            void onDeleteProfile(profile);
                          }}
                          className="px-2.5 py-1.5 h-auto text-red-300 hover:text-red-200 hover:bg-red-500/20 border-red-500/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeAddProfile}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-none border border-neutral-200 bg-white p-6 shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-neutral-50 p-2 text-neutral-500 hover:bg-white/10 hover:text-white transition-colors"
              onClick={closeAddProfile}
              aria-label="Close add profile modal"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-semibold text-neutral-900">Add Profile</h2>
            <p className="mt-1 text-sm text-neutral-500">Create a child profile for this household.</p>

            <form className="mt-6 space-y-4" onSubmit={handleCreateProfile}>
              <div>
                <label htmlFor="profile-name" className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">
                  Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                  className="w-full rounded-none border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900 outline-none placeholder:text-gray-500 focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/60 transition-all"
                  placeholder="Emily"
                  aria-label="Profile name"
                />
              </div>

              <div>
                <label htmlFor="profile-pin" className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">
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
                  className="w-full rounded-none border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900 outline-none placeholder:text-gray-500 focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/60 transition-all"
                  placeholder="0000"
                  aria-label="Profile PIN"
                />
              </div>

              <div>
                <span className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">Avatar Color</span>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      className={`h-9 w-9 rounded-full border transition-transform hover:scale-110 ${avatarColor === color ? 'border-white scale-110 ring-2 ring-white/20' : 'border-white/20'
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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full shadow-lg shadow-primary-900/20"
                isLoading={isCreatingProfile}
              >
                Save Profile
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
