import React from 'react';

interface AdminSetupRailProps {
  completedSteps: number;
  onStartAddChild: () => void;
}

const STEPS = ['Child Basics', 'Current Grades', 'Review & Finish'];

export default function AdminSetupRail({ completedSteps, onStartAddChild }: AdminSetupRailProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-2xl font-[590] text-white">Set up your first child in under 2 minutes</h2>
          <p className="mt-2 text-sm text-gray-400">
            Build your Family Economy foundation with a guided 3-step setup.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {STEPS.map((stepLabel, index) => {
              const stepNumber = index + 1;
              const isComplete = completedSteps >= stepNumber;

              return (
                <div
                  key={stepLabel}
                  className={`rounded-xl border px-3 py-3 ${
                    isComplete
                      ? 'border-emerald-400/40 bg-emerald-400/10'
                      : 'border-white/10 bg-black/20'
                  }`}
                >
                  <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-gray-400">
                    Step {stepNumber}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">{stepLabel}</p>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onStartAddChild}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#b30000] to-[#7a0000] px-6 py-3.5 text-sm font-semibold text-white hover:brightness-110"
          >
            Add First Child
          </button>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">What Unlocks Next</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-300">
            <li>Centralized ledger visibility</li>
            <li>Sunday grade-lock automation</li>
            <li>Task assignment and approvals</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
