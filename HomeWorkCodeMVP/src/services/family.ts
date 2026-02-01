import { supabase } from './supabase';
import { Child, Task, Transaction, Subject, Grade } from '../types';

// We'll define DB types here or import them (simplified for MVP)
export interface DBProfile {
    id: string;
    name: string;
    pin_hash?: string;
    grade_level: string;
    balance: number;
    subjects: any;
    rates: any;
    role: 'CHILD' | 'PARENT';
}

export const FamilyService = {
    /**
     * Fetch all children profiles
     */
    async getChildren(): Promise<Child[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'CHILD');

        if (error) throw error;

        // Map DB structure to App structure
        // Fetch custom tasks separately or via join? Separate for simplicity now.
        const childrenPromises = data.map(async (p: DBProfile) => {
            // 1. Fetch Active Tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('profile_id', p.id)
                .neq('status', 'PAID'); // Assuming paid tasks are deleted or archived

            // 2. Fetch Recent History (Limit 20)
            const { data: history } = await supabase
                .from('ledger')
                .select('*')
                .eq('profile_id', p.id)
                .order('created_at', { ascending: false })
                .limit(20);

            return {
                id: p.id,
                name: p.name,
                pin: '****', // Don't return pin hash to client directly if not needed, use verification endpoint
                gradeLevel: p.grade_level,
                balance: p.balance,
                subjects: p.subjects as Subject[],
                rates: p.rates as Record<Grade, number>,
                customTasks: (tasks || []).map(t => ({
                    id: t.id,
                    name: t.name,
                    baselineMinutes: t.baseline_minutes,
                    status: t.status,
                    rejectionComment: t.rejection_comment
                })),
                history: (history || []).map(h => ({
                    id: h.id,
                    date: h.created_at,
                    amount: h.amount,
                    memo: h.memo,
                    type: h.type as any,
                    category: h.category as any
                }))
            } as Child;
        });

        return Promise.all(childrenPromises);
    },

    /**
     * Create a new child
     */
    async createChild(child: Partial<Child>, pin: string): Promise<Child> {
        // PIN hashing should happen on server or edge. 
        // Ideally we call an Edge Function: POST /api/create-child
        // For MVP, we might call DB directly if we accept lesser security or use pgcrypto.
        // Let's assume we call an arbitrary Edge Function or just insert for now (unsafe PIN storage if not hashed).
        // BETTER: Use Supabase Auth for users, but if these are "profiles" under one account...

        // Using a utility RPC or just inserting for now.
        // NOTE: In production, do NOT send plain text PIN to 'profiles' if 'pin_hash' column expects a hash.
        // We'll leave PIN blank here and assume User sets it up via secure flow, or we implement the Edge Function for creation too.

        const { data, error } = await supabase
            .from('profiles')
            .insert({
                name: child.name,
                grade_level: child.gradeLevel,
                balance: 0,
                subjects: child.subjects,
                rates: child.rates,
                role: 'CHILD'
                // pin_hash: ... // TODO: Handle via Edge Function
            })
            .select()
            .single();

        if (error) throw error;
        return { ...child, id: data.id } as Child; // Return optimistic or partial
    },

    /**
     * Secure PIN Verification via Edge Function
     */
    async verifyPin(childId: string, pin: string): Promise<boolean> {
        const response = await fetch('/api/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId, pin })
        });
        if (!response.ok) return false;
        const { valid } = await response.json();
        return valid;
    },

    /**
     * Assign a task
     */
    async assignTask(childId: string, task: Task) {
        // If childId is null, it's an OPEN task (not linked to profile? or special profile?)
        // Our schema requires profile_id. Open tasks might need a 'null' profile_id or a special 'FAMILY' profile.
        // For now assuming assigned to child.
        const { error } = await supabase
            .from('tasks')
            .insert({
                profile_id: childId,
                name: task.name,
                baseline_minutes: task.baselineMinutes,
                status: 'ASSIGNED'
            });
        if (error) throw error;
    },

    /**
     * Update task status (Submit/Approve/Reject)
     */
    async updateTaskStatus(taskId: string, status: string, comment?: string) {
        const { error } = await supabase
            .from('tasks')
            .update({ status, rejection_comment: comment })
            .eq('id', taskId);
        if (error) throw error;
    },

    /**
     * ATOMIC PAY: Calls Supabase RPC
     */
    async payTask(childId: string, taskId: string, amount: number, memo: string) {
        const { error } = await supabase.rpc('pay_task', {
            p_child_id: childId,
            p_task_id: taskId,
            p_amount: amount,
            p_memo: memo
        });
        if (error) throw error;
    }
};
