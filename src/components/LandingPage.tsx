import React from 'react';
import { Link } from 'react-router-dom';

const PillarCard: React.FC<{ title: string; body: string }> = ({ title, body }) => (
    <div className="flex flex-col p-10 glass-card border-0 text-center items-center justify-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl h-full">
        <h3 className="text-2xl font-bold text-charcoal dark:text-cream mb-4 font-sans tracking-tighter">{title}</h3>
        <p className="text-lg leading-relaxed text-neutral-text dark:text-neutral-400">{body}</p>
    </div>
);

export default function LandingPage() {
    return (
        <div className="relative min-h-screen w-full bg-app selection:bg-crimson/30 overflow-x-hidden text-primary leading-relaxed font-sans transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 w-full z-50 backdrop-blur-xl bg-app/70 border-b border-border-base transition-colors duration-300">
                <div className="max-w-[1240px] mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/images/HomeWorkAssets/homework-icon-new.svg" alt="HomeWork" className="h-8 w-auto" />
                        <span className="text-xl font-serif text-charcoal dark:text-cream tracking-tight"><span className="font-normal">Home</span><span className="font-bold">Work</span></span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link to="/login" className="text-sm font-semibold text-primary hover:text-crimson transition-colors">
                            Sign In
                        </Link>
                        <Link to="/signup" className="text-sm font-bold bg-crimson text-white px-5 py-2.5 rounded-full hover:bg-burgundy transition-colors shadow-sm hidden sm:inline-block">
                            Start Free Trial
                        </Link>
                    </div>
                </div>
            </header>

            {/* 1. HERO */}
            <main className="relative z-10 flex flex-col items-center pt-24 pb-16 px-6 text-center">
                <div className="mb-6 flex flex-col items-center gap-4">
                    <img
                        src="/images/HomeWorkAssets/homework-icon-new.svg"
                        alt="HomeWork Icon"
                        className="w-24 md:w-32 h-auto relative z-10"
                    />
                    <span className="text-4xl md:text-5xl font-serif text-primary tracking-tight leading-none">
                        <span className="font-normal">Home</span><span className="font-bold">Work</span>
                    </span>
                </div>

                <h1 className="text-xl text-muted font-light mb-2 font-sans tracking-tighter">
                    "Can I have money?"
                </h1>

                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-primary font-sans tracking-tighter max-w-4xl leading-tight">
                    HomeWork turns that question into a contract.
                </h2>

                <h3 className="text-sm tracking-[0.2em] font-semibold text-gold mb-12 font-sans uppercase">
                    The Family Economy. Redefined.
                </h3>

                <Link to="/signup" className="tactile-button text-xl px-12 py-5">
                    Start Free Trial
                </Link>

                <p className="text-muted text-xs mt-6 font-light tracking-wide leading-relaxed">
                    14 days free, then $14.99/mo. Cancel anytime.
                </p>
            </main>

            {/* 2. THE SHIFT */}
            <section className="w-full py-32 px-6 bg-transparent flex flex-col items-center border-t border-b border-cream-mid dark:border-white/5">
                <div className="max-w-4xl text-center">
                    <h2 className="text-3xl md:text-5xl font-bold text-primary mb-8 font-sans tracking-tighter">
                        Your child doesn't lack motivation.
                    </h2>
                    <p className="text-2xl md:text-3xl text-primary leading-relaxed font-sans tracking-tighter">
                        They lack a system where effort has visible, immediate value.<br />
                        <span className="text-primary font-bold">HomeWork is that system.</span><br />
                        Parents assign contracts. Children earn capital. Everyone understands why.
                    </p>
                </div>
            </section>

            {/* 3. HOW IT WORKS */}
            <section className="w-full max-w-[1240px] mx-auto px-6 py-32">
                <h2 className="text-4xl md:text-5xl font-bold text-primary text-center mb-6 font-sans tracking-tighter">
                    For you. Done in under a minute.
                </h2>
                <p className="text-center text-xl text-muted mb-20 font-sans tracking-tight">
                    That's the whole system. It runs itself.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { num: '01', title: 'Create a Contract', desc: 'Choose a task from the Household Catalog or write your own. Set the time. Set the rate. Post it to your child\'s Market.' },
                        { num: '02', title: 'Your Child Earns', desc: 'They accept the contract, complete the work, and claim their capital. Every task is a transaction. Every transaction builds the habit.' },
                        { num: '03', title: 'Capital Gets Allocated', desc: 'Earned funds split automatically between Spend, Save, and Goals. Your child sees their Vault grow. They learn why it grows.' }
                    ].map((step) => (
                        <div key={step.num} className="glass-card p-12 flex flex-col items-center text-center h-full hover:shadow-2xl transition-all duration-500">
                            <span className="text-7xl font-black bg-ascendant-gradient bg-clip-text text-transparent mb-8 leading-none">
                                {step.num}
                            </span>
                            <h3 className="text-2xl font-bold text-primary mb-4 font-sans tracking-tighter">{step.title}</h3>
                            <p className="text-lg text-primary leading-relaxed">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. THE THREE PILLARS */}
            <section className="w-full max-w-[1240px] mx-auto px-6 py-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <PillarCard
                        title="Agency"
                        body="Stop managing chores. Start mentoring founders. Your child learns to manage their own hustle — on their terms, inside your rules."
                    />
                    <PillarCard
                        title="Worth"
                        body="Effort has a price. Every task completed is a transaction that reinforces one truth: quality work has real value. That lesson compounds for decades."
                    />
                    <PillarCard
                        title="Growth"
                        body="From day one, your child allocates their own capital. Spend or save. Now or later. Small decisions made at 10 become instincts at 30."
                    />
                </div>
            </section>

            {/* 5. SOCIAL PROOF */}
            <section className="w-full max-w-[1240px] mx-auto px-6 py-32">
                <div className="glass-card w-full p-16 md:p-24 flex flex-col items-center text-center">
                    <p className="text-3xl md:text-5xl text-charcoal dark:text-cream leading-[1.4] italic mb-10 font-serif">
                        "My son stopped asking for money. He started asking for contracts. That was week two."
                    </p>
                    <span className="text-lg font-bold text-neutral-text dark:text-neutral-400 uppercase tracking-[0.3em] font-sans">
                        — Parent of a 4th grader, Chicago
                    </span>
                </div>
            </section>

            {/* 6. PRICING */}
            <section className="w-full max-w-[1240px] mx-auto px-6 py-32 flex justify-center">
                <div className="glass-card w-full max-w-5xl p-20 md:p-32 flex flex-col items-center text-center relative overflow-hidden">
                    <h2 className="text-lg font-bold text-crimson mb-10 font-sans tracking-[0.4em] uppercase">
                        One plan. One family. Everything included.
                    </h2>
                    <div className="flex items-baseline justify-center mb-16">
                        <span className="text-8xl md:text-[10rem] font-black text-primary tracking-tighter font-sans leading-none">
                            $14.99
                        </span>
                        <span className="text-3xl text-neutral-500 ml-4 font-sans tracking-tight">/mo</span>
                    </div>

                    <div className="flex flex-col md:flex-row flex-wrap justify-center gap-x-12 gap-y-6 text-xl text-primary font-medium mb-16 leading-relaxed max-w-4xl text-left md:text-center">
                        <span className="flex items-center"><span className="text-gold mr-2">✦</span> Unlimited children</span>
                        <span className="flex items-center"><span className="text-gold mr-2">✦</span> Full contract catalog</span>
                        <span className="flex items-center"><span className="text-gold mr-2">✦</span> Capital allocation system</span>
                        <span className="flex items-center"><span className="text-gold mr-2">✦</span> Grade-level rate engine</span>
                        <span className="flex items-center"><span className="text-gold mr-2">✦</span> Vault dashboard for every child</span>
                    </div>

                    <Link to="/signup" className="tactile-button text-2xl px-20 py-6 mb-4">
                        Start Your Family's Free Trial
                    </Link>

                    <p className="text-muted text-sm font-medium leading-relaxed">
                        14 days free. No credit card required to start.<br />
                        Cancel before day 14 and pay nothing. Ever.
                    </p>
                </div>
            </section>

            {/* 7. CLOSING CTA (Gradient Transition) */}
            <section className="w-full py-48 px-6 flex flex-col items-center text-center mt-12 bg-cream-to-charcoal">
                <h2 className="text-5xl md:text-7xl font-bold text-primary mb-10 font-sans tracking-tighter max-w-4xl leading-tight">
                    The habits formed at 10 determine the decisions made at 30.
                </h2>

                <p className="text-2xl md:text-3xl text-primary font-sans tracking-tighter max-w-3xl leading-relaxed mb-16">
                    Most parents hope their kids figure it out.<br />
                    <span className="text-primary font-bold">HomeWork parents build the system that makes it inevitable.</span>
                </p>

                <h3 className="text-3xl font-bold text-primary mb-8 font-sans tracking-tighter">
                    Start building today.
                </h3>

                <Link to="/signup" className="tactile-button text-2xl px-16 py-6 mb-6">
                    Start Free Trial →
                </Link>

                <p className="text-muted text-sm font-medium tracking-wide leading-relaxed">
                    14 days free · $14.99/month after · Cancel anytime
                </p>
            </section>
        </div >
    );
}
