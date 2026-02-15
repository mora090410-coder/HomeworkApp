# HomeWork App - Family Economy System

A multi-tenant application for managing family chores, allowances, and tasks.

## Features

- **Multi-Tenancy**: Support for multiple families.
- **Roles**: Admin (Parent), Member, and Child roles.
- **Task Management**: Create open tasks, assign tasks, and track status (Open, Assigned, Pending Approval, Paid).
- **Draft Tasks**: Admins can draft tasks without immediate assignment.
- **Financial Ledger**: Track earnings, spending, and balance history.
- **Secure Invites**: Invite co-parents via secure links.
- **PIN Verification**: Secure access for parents and children.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend/Database**: Firebase Auth + Firestore + Messaging
- **State Management**: TanStack Query (React Query)
- **Deployment**: Vercel

## Getting Started

1.  **Clone the repository**
2.  **Install dependencies**: `npm install`
3.  **Environment Setup**: Copy `.env.example` to `.env` and fill in your Firebase credentials.
4.  **Run Locally**: `npm run dev`

## Deployment

Refer to `walkthrough.md` for recent changes and deployment status.
