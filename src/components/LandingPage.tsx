import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ──────────────────────────────────────
   Sub-Components
   ────────────────────────────────────── */

/**
 * Premium feature card for the Three Pillars of Worth
 */
const PillarCard: React.FC<{ title: string; body: string; delay?: string }> = ({ title, body, delay = '' }) => (
    <div className={`flex flex-col p-10 glass-card border border-photon-white/20 text-center items-center justify-center hover:border-amber-500/50 transition-all duration-500 ${delay}`}>
        <h3 className="text-2xl font-bold font-heading text-obsidian mb-4">{title}</h3>
        <p className="text-lg leading-relaxed text-neutral-text">{body}</p>
    </div>
);

/* ──────────────────────────────────────
   Data
   ────────────────────────────────────── */

const pillarCards = [
    {
        title: 'Agency.',
        body: 'Stop managing chores. Start mentoring founders. HomeWork gives children the agency to manage their own "hustle."',
    },
    {
        title: 'Worth.',
        body: 'Effort has a value. Every completed task is a transaction, reinforcing the direct link between quality work and reward.',
    },
    {
        title: 'Growth.',
        body: 'Capital management from day one. Children learn to allocate funds between immediate spending and long-term savings goals.',
    },
];

/* ──────────────────────────────────────
   Landing Page (Sovereign Vision)
   ────────────────────────────────────── */

export default function LandingPage() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-white font-sans text-obsidian selection:bg-amber-500/30">

            {/* ── Minimal Header ── */}
            <header className="absolute top-0 w-full z-50">
                <div className="max-w-[1240px] mx-auto px-6 sm:px-10 h-24 flex items-center justify-end">
                    <Link to="/login" className="text-sm font-bold text-catalyst-blue hover:opacity-80 transition-colors">
                        Sign In
                    </Link>
                </div>
            </header>

            {/* ── Main Content ── */}
            <div className="relative z-10 mx-auto max-w-[1240px] px-6 sm:px-10 flex flex-col min-h-screen justify-center">
                <main className="flex flex-col items-center text-center">

                    {/* ═══════════════ HERO ═══════════════ */}
                    <div className="flex flex-col items-center max-w-[900px] mb-24 px-4 animate-fade-in-up">

                        {/* Logo: Ascendant H */}
                        <div className="mb-12 flex justify-center w-full">
                           <div className="text-7xl font-bold font-heading luminary-glow" data-text="H↗">
                               H↗
                           </div>
                        </div>

                        {/* H1 */}
                        <h1 className="text-6xl sm:text-[80px] font-bold font-heading text-obsidian tracking-tight mb-8 leading-[1.1]">
                            The Family Economy.<br />
                            Redefined.
                        </h1>

                        {/* Subtitle */}
                        <p className="text-2xl leading-relaxed text-neutral-text max-w-[760px] mb-16 font-medium">
                            HomeWork is the definitive system for teaching children the value of time and the weight of a dollar. It transforms daily responsibilities into personal capital, providing the structure every modern home requires.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col items-center gap-6 w-full justify-center">
                            <Link to="/signup" className="tactile-button h-16 px-12 text-xl flex items-center justify-center gap-3 shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1 transform transition-all duration-300">
                                Get Started
                                <ArrowRight className="w-6 h-6" />
                            </Link>
                        </div>
                    </div>

                    {/* ═══════════════ PILLARS OF WORTH ═══════════════ */}
                    <section className="w-full mt-12 pb-32">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {pillarCards.map((card, idx) => (
                                <PillarCard key={idx} title={card.title} body={card.body} />
                            ))}
                        </div>
                    </section>

                </main>
            </div>
        </div>
    );
}
