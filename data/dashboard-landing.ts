import { Clock, Shield, Star } from 'lucide-react';

export const landingData = {
    featureCards: [
        {
            icon: Clock,
            title: "Sunday Night Lock",
            body: "Room within one time block until Sunday Night Lock."
        },
        {
            icon: Shield,
            title: "Family Ledger",
            body: "Enable your installable payments and fill the family ledger."
        },
        {
            icon: Star,
            title: "Progress Visibility",
            body: "Progress while your progress visibility for earning stars."
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
