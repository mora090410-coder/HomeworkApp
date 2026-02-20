import React from 'react';
import { Link } from 'react-router-dom';

const PillarCard: React.FC<{ title: string; body: string }> = ({ title, body }) => (
    <div className="flex flex-col p-10 glass-card border-0 text-center items-center justify-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
        <h3 className="text-2xl font-bold text-obsidian dark:text-white mb-4">{title}</h3>
        <p className="text-lg leading-relaxed text-neutral-text dark:text-neutral-400">{body}</p>
    </div>
);

export default function LandingPage() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-photon-white dark:bg-obsidian selection:bg-momentum-orange/30">
            {/* Header */}
            <header className="absolute top-0 w-full z-50">
                <div className="max-w-[1240px] mx-auto px-6 sm:px-10 h-24 flex items-center justify-end">
                    <Link to="/login" className="text-sm font-semibold text-obsidian dark:text-white hover:text-blue-500 transition-colors">
                        Sign In
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center pt-32 pb-24 px-6 text-center">
                <div className="mb-16 luminary-glow">
                    <img
                        src="/images/homework-icon-transparent.png"
                        alt="HomeWork"
                        className="w-48 md:w-64 h-auto relative z-10"
                    />
                </div>

                <h1 className="text-5xl md:text-7xl font-bold text-obsidian dark:text-white tracking-tighter leading-[1.1] mb-8 font-sans">
                    The Family Economy.<br />Redefined.
                </h1>

                <p className="text-xl text-neutral-text dark:text-neutral-400 leading-loose max-w-[760px] font-light mb-12">
                    HomeWork is the definitive system for teaching children the value of time and the weight of a dollar. It transforms daily responsibilities into personal capital.
                </p>

                <Link to="/signup" className="tactile-button text-lg">
                    Get Started
                </Link>
            </main>

            {/* Features/Pillars */}
            <section className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">
                <PillarCard title="Agency" body="Stop managing chores. Start mentoring founders. Give your children the agency to manage their own hustle." />
                <PillarCard title="Worth" body="Effort has a value. Every completed task is a transaction, reinforcing the link between quality work and reward." />
                <PillarCard title="Growth" body="Capital management from day one. Children learn to allocate funds between spending and long-term goals." />
            </section>
        </div>
    );
}
