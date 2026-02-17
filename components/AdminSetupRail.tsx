
import React from 'react';
import { ArrowRight, Check } from 'lucide-react';

interface AdminSetupRailProps {
  completedSteps: number;
  onStartAddChild: () => void;
}

const STEPS = ['Child Basics', 'Current Grades', 'Review & Finish'];

export default function AdminSetupRail({ completedSteps, onStartAddChild }: AdminSetupRailProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 md:p-8 relative overflow-hidden group">

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr] relative z-10">
        <div>
          <h2 className="text-2xl font-[590] text-white tracking-tight">Set up your first child in under 2 minutes</h2>
          <p className="mt-2 text-[0.9375rem] text-gray-400 leading-relaxed max-w-lg">
            Build your Family Economy foundation with a guided 3-step setup to unlock task tracking and financial management.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((stepLabel, index) => {
              const stepNumber = index + 1;
              const isComplete = completedSteps >= stepNumber;
              const isCurrent = completedSteps === stepNumber - 1;

              return (
                <div
                  key={stepLabel}
                  className={`
                    rounded-xl border px-4 py-3.5 transition-all duration-300
                    ${isComplete
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : isCurrent
                        ? 'border-primary-500/40 bg-primary-500/10 shadow-[0_0_15px_rgba(var(--primary-500),0.1)]'
                        : 'border-white/5 bg-white/[0.02]'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-[0.6875rem] font-bold uppercase tracking-wider ${isComplete ? 'text-emerald-400' : isCurrent ? 'text-primary-400' : 'text-gray-500'}`}>
                      Step {stepNumber}
                    </p>
                    {isComplete && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className={`text-sm font-semibold ${isComplete || isCurrent ? 'text-white' : 'text-gray-500'}`}>
                    {stepLabel}
                  </p>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onStartAddChild}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-700 to-primary-500 px-6 py-3.5 text-[0.9375rem] font-semibold text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
          >
            Add First Child
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-black/20 p-5 self-start">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">What Unlocks Next</p>
          <ul className="space-y-3">
            {[
              "Centralized ledger visibility",
              "Sunday grade-lock automation",
              "Task assignment and approvals"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[0.8125rem] text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
