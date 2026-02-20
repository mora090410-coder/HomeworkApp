import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AdminSetupRailProps {
  completedSteps: number;
  onStartAddChild: () => void;
}

const STEPS = ['Child Basics', 'Current Grades', 'Review & Finish'];

export default function AdminSetupRail({ completedSteps, onStartAddChild }: AdminSetupRailProps) {
  return (
    <section className="bg-surface border border-border-base p-6 md:p-8 relative overflow-hidden group rounded-3xl shadow-sm">

      {/* Background decoration - subtle brand accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr] relative z-10">
        <div>
          <h2 className="text-2xl font-bold font-heading text-primary tracking-tight">Set up your first child in under 2 minutes</h2>
          <p className="mt-2 text-[0.9375rem] text-muted leading-relaxed max-w-lg font-sans">
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
                    border px-4 py-3.5 transition-all duration-300 rounded-none
                    ${isComplete
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : isCurrent
                        ? 'border-amber-500 ring-1 ring-amber-500 bg-surface shadow-sm'
                        : 'border-border-base bg-surface-2'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-[0.6875rem] font-bold uppercase tracking-wider font-sans ${isComplete ? 'text-emerald-500' : isCurrent ? 'text-blue-500' : 'text-muted'}`}>
                      Step {stepNumber}
                    </p>
                    {isComplete && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <p className={`text-sm font-semibold font-sans ${isComplete || isCurrent ? 'text-primary' : 'text-muted'}`}>
                    {stepLabel}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <Button
              variant="primary"
              size="lg"
              onClick={onStartAddChild}
              className="pl-6 pr-8 shadow-md shadow-primary-700/20"
            >
              Add First Child
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        <aside className="border border-border-base bg-surface-2 p-6 self-start rounded-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-4 font-sans">What Unlocks Next</p>
          <ul className="space-y-3">
            {[
              "Centralized ledger visibility",
              "Sunday grade-lock automation",
              "Task assignment and approvals"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[0.8125rem] text-muted font-medium font-sans">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
