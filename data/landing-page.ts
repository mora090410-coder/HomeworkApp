import { Clock, Shield, Star, CheckCircle2 } from 'lucide-react';

export const landingData = {
    header: {
        logo: "HW",
        brand: "HomeWork",
        loginLabel: "Log In",
        signupLabel: "Sign Up"
    },
    hero: {
        badge: "FAMILY ECONOMY SYSTEM",
        title: "Build discipline without the chaos.",
        subtext: "HomeWork gives parents a premium command center for chores, learning effort, and allowance outcomes.",
        primaryCTA: "Get Started",
        secondaryCTA: "I Have an Account",
        phoneMockup: "/images/phone-mockup.png"
    },
    heroMedia: {
        title: "THIS WEEK AT A GLANCE",
        items: [
            { label: "Tasks Completed 14/18", completed: true },
            { label: "Allowance Approved $92.00", completed: true },
            { label: "Reading Streak 6 days", completed: true }
        ]
    },
    featureCards: [
        {
            icon: Clock,
            title: "Sunday Night Lock",
            body: "Plan chores, allowances, and expectations before the week starts so everyone knows."
        },
        {
            icon: Shield,
            title: "Family Ledger",
            body: "Track earnings, advances, and balance history in one place with clean accountability."
        },
        {
            icon: Star,
            title: "Progress Visibility",
            body: "Turn everyday work into visible progress your kids can understand and stay motivated by."
        }
    ],
    footer: {
        leftText: "HomeWork. Built for high-trust family systems.",
        rightLinks: [
            { label: "Log in", href: "/login" },
            { label: "Sign Up", href: "/signup" }
        ]
    }
};
