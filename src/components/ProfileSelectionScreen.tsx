import React from 'react';
import React from 'react';
import { Child, Profile } from '@/types';
import { User, LogOut, Plus } from 'lucide-react';

interface ProfileSelectionScreenProps {
    profiles: ((Profile & { id: string }) | Child)[];
    onSelectProfile: (profileId: string) => void;
    onManageProfiles?: () => void;
    isLoading?: boolean;
    onSignOut?: () => void;
}

const ProfileSelectionScreen: React.FC<ProfileSelectionScreenProps> = ({
    profiles,
    onSelectProfile,
    onManageProfiles,
    isLoading = false,
    onSignOut
}) => {
    const { logout } = useFamilyAuth();

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="w-full max-w-4xl flex flex-col items-center gap-12">

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-900 text-white shadow-xl mb-4">
                        <span className="font-heading font-black text-3xl tracking-tighter">HW</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-heading font-black text-neutral-900 tracking-tight">
                        Who's working?
                    </h1>
                    <p className="text-neutral-500 text-lg font-medium">Select your profile to continue</p>
                </div>

                {/* Grid */}
                <div className="flex flex-wrap justify-center gap-8 w-full">
                    {/* Admin Profile (Hardcoded for visual or logic separation if needed, or part of profiles list) */}
                    {/* Typically Admin comes from profiles list too, but if separate: */}
                    {profiles.map((profile) => {
                        const isChild = 'role' in profile && profile.role === 'CHILD'; // Though types might differ
                        // Helper to get color
                        const color = (profile as any).avatarColor || '#64748B'; // Default slate
                        const name = (profile as any).name || 'Unknown';
                        const initial = name.charAt(0);

                        return (
                            <button
                                key={profile.id}
                                onClick={() => onSelectProfile(profile.id)}
                                className="group flex flex-col items-center gap-4 transition-transform hover:scale-105 focus:outline-none"
                            >
                                <div
                                    className="relative w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-bold text-white shadow-lg transition-all group-hover:shadow-2xl group-hover:-translate-y-1"
                                    style={{ backgroundColor: color }}
                                >
                                    <span className="drop-shadow-md">{initial}</span>
                                    {/* Role Badge */}
                                    {(profile as any).role === 'PARENT' && (
                                        <div className="absolute -bottom-3 px-3 py-1 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full border-2 border-white shadow-sm">
                                            Parent
                                        </div>
                                    )}
                                </div>
                                <span className="text-xl font-bold text-neutral-700 group-hover:text-neutral-900">{name}</span>
                            </button>
                        );
                    })}

                    {/* Add Profile Button (if allowed) */}
                    {onManageProfiles && (
                        <button
                            onClick={onManageProfiles}
                            className="group flex flex-col items-center gap-4 transition-transform hover:scale-105 focus:outline-none opacity-60 hover:opacity-100"
                        >
                            <div className="w-32 h-32 rounded-3xl bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 group-hover:border-neutral-400 group-hover:text-neutral-600 transition-colors">
                                <Plus className="w-10 h-10" />
                            </div>
                            <span className="text-xl font-bold text-neutral-500 group-hover:text-neutral-700">Add Profile</span>
                        </button>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="mt-12">
                    <button
                        onClick={onSignOut}
                        className="flex items-center gap-2 text-neutral-400 hover:text-neutral-600 font-bold uppercase tracking-wider text-xs transition-colors px-6 py-3 rounded-full hover:bg-neutral-100"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out of Household
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ProfileSelectionScreen;
