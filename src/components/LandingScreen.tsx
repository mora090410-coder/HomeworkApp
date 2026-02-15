import React from 'react';
import { Loader2, LogOut, Shield, UserRound, Users } from 'lucide-react';
import { Profile } from '../types';

interface LandingScreenProps {
  profiles: Profile[];
  isLoading: boolean;
  selectedProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
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

export default function LandingScreen({
  profiles,
  isLoading,
  selectedProfileId,
  onSelectProfile,
  onSignOut,
}: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}></div>
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-12 pt-8">
        <header className="flex items-center justify-between mb-16">
          <div className="text-xl font-[590] tracking-tight">HomeWork</div>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/10"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
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
            </div>
          )}

          {!isLoading && profiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile) => {
                const isSelected = profile.id === selectedProfileId;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => onSelectProfile(profile.id)}
                    className={`group rounded-2xl border p-6 text-left transition-all ${isSelected
                      ? 'border-[#b30000] bg-[#b30000]/10 shadow-[0_0_0_1px_rgba(179,0,0,0.5)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-[#b30000]/50 hover:bg-white/[0.06]'
                      }`}
                    aria-label={`Select profile ${profile.name}`}
                  >
                    <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border ${profile.role === 'ADMIN' ? 'border-[#b30000]/60 bg-[#b30000]/20 text-[#ff8a8a]' : 'border-white/20 bg-white/10 text-white'}`}>
                      {profileIcon(profile.role)}
                    </div>
                    <div className="text-lg font-semibold text-white">{profile.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-gray-400">{profile.role}</div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
