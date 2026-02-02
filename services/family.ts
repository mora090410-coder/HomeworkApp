import { supabase } from './supabase';
import { Child, Task, Transaction, Subject, Grade } from '../types';

export interface DBProfile {
    id: string;
    family_id: string;
    name: string;
    pin_hash?: string;
    grade_level: string;
    balance: number;
    subjects: any;
    rates: any;
    role: 'CHILD' | 'ADMIN' | 'MEMBER';
}



export const FamilyService = {
    async getCurrentFamily(): Promise<{ id: string, name: string } | null> {
        // 1. Try to get from persisted active profile (Fast Path)
        const storedProfile = localStorage.getItem('homework-active-profile');
        if (storedProfile) {
            try {
                const { profileId } = JSON.parse(storedProfile);
                if (profileId) {
                    const { data: profile } = await supabase.from('profiles').select('family:families(id, name)').eq('id', profileId).single();
                    // @ts-ignore
                    if (profile && profile.family) return profile.family;
                }
            } catch (e) {
                console.error("Failed to parse stored profile", e);
            }
        }

        // 2. Fallback: Authenticated User Check (Source of Truth)
        // If no local session, check if we have a valid Supabase Auth user and get their profiles
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Find the first profile linked to this user (for MVP, we assume 1:1 or prioritize first)
            // Note: In this MVP schema, we don't strictly link auth.users to profiles yet (it's invites based).
            // But if we DID, this is where it would be.
            // Since we are "Invite/Device based" for this beta without full Auth UI, we rely on the Profile ID being stored.
            // IF we had auth, we'd do:
            // const { data } = await supabase.from('profiles').select('family:families(*)').eq('user_id', user.id).limit(1).single();
        }

        // 3. FINAL HARDENING: Return null if no session.
        // DO NOT return the first family in the DB.
        return null;
    },

    async generateInvite(familyId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER'): Promise<string> {
        const response = await fetch('/api/generate-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ familyId, role })
        });
        if (!response.ok) throw new Error('Failed to create invite');
        const { url } = await response.json();
        return url;
    },

    async acceptInvite(token: string, name: string): Promise<DBProfile> {
        // 1. Verify Token
        const { data: invite, error: inviteError } = await supabase
            .from('invites')
            .select('*')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (inviteError || !invite) throw new Error('Invalid or expired invite');

        // 2. Create Profile in that Family
        // In a real Auth flow, we'd link to auth.users.id here.
        // For this MVP refactor, we just create a profile.
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
                family_id: invite.family_id,
                name: name,
                role: invite.role, // 'ADMIN' or 'MEMBER'
                grade_level: 'Adult', // Default
                balance: 0,
                subjects: [],
                rates: {}
            })
            .select()
            .single();

        if (profileError) throw profileError;

        // 3. Delete Invite (Access One-Time)
        await supabase.from('invites').delete().eq('id', invite.id);

        return profile;
    },

    async getOpenTasks(familyId: string): Promise<Task[]> {
        const { data } = await supabase.from('tasks')
            .select('*')
            .eq('family_id', familyId)
            .is('profile_id', null)
            .eq('status', 'OPEN');
        return (data || []).map(t => ({
            id: t.id,
            familyId: t.family_id,
            name: t.name,
            baselineMinutes: t.baseline_minutes,
            status: 'OPEN',
            rejectionComment: t.rejection_comment,
            assigneeId: null
        }));
    },

    async getDraftTasks(familyId: string): Promise<Task[]> {
        const { data } = await supabase.from('tasks')
            .select('*')
            .eq('family_id', familyId)
            .eq('status', 'DRAFT'); // Drafts can have null or specific profile I guess, but usually null
        return (data || []).map(t => ({
            id: t.id,
            familyId: t.family_id,
            name: t.name,
            baselineMinutes: t.baseline_minutes,
            status: 'DRAFT',
            rejectionComment: t.rejection_comment,
            assigneeId: t.profile_id
        }));
    },

    async getChildren(familyId: string): Promise<Child[]> {
        // 1. Fetch all children profiles
        const { data: profiles } = await supabase.from('profiles')
            .select('*')
            .eq('family_id', familyId)
            .eq('role', 'CHILD');

        if (!profiles || profiles.length === 0) return [];

        const profileIds = profiles.map(p => p.id);

        // 2. Bulk fetch tasks for all these children
        const { data: allTasks } = await supabase.from('tasks')
            .select('*')
            .in('profile_id', profileIds)
            .neq('status', 'PAID');

        // 3. Bulk fetch history (limit 20 per child is hard in simple SQL without lateral join, 
        // so we fetch last 100 global for family or just fetch recent by date and filter).
        // Optimization: Fetch last 200 items for these profiles.
        const { data: allHistory } = await supabase.from('ledger')
            .select('*')
            .in('profile_id', profileIds)
            .order('created_at', { ascending: false })
            .limit(200);

        // 4. Map data in memory
        return profiles.map((p: DBProfile) => {
            const childTasks = (allTasks || []).filter(t => t.profile_id === p.id);
            const childHistory = (allHistory || []).filter(h => h.profile_id === p.id).slice(0, 20); // Enforce limit in memory

            return {
                id: p.id,
                familyId: p.family_id,
                name: p.name,
                pin: '****', // Masked
                gradeLevel: p.grade_level,
                balance: p.balance,
                subjects: p.subjects as Subject[],
                rates: p.rates as Record<Grade, number>,
                role: p.role,
                customTasks: childTasks.map(t => ({
                    id: t.id,
                    familyId: t.family_id,
                    name: t.name,
                    baselineMinutes: t.baseline_minutes,
                    status: t.status,
                    rejectionComment: t.rejection_comment,
                    assigneeId: t.profile_id
                })),
                history: childHistory.map(h => ({
                    id: h.id,
                    date: h.created_at,
                    amount: h.amount,
                    memo: h.memo,
                    type: h.type as any,
                    category: h.category as any
                }))
            } as Child;
        });
    },

    async createChild(familyId: string, child: Partial<Child>): Promise<Child> {
        const { data, error } = await supabase
            .from('profiles')
            .insert({
                family_id: familyId,
                name: child.name,
                grade_level: child.gradeLevel,
                balance: 0,
                subjects: child.subjects,
                rates: child.rates,
                role: 'CHILD'
            })
            .select()
            .single();
        if (error) throw error;
        // Return full structure matching mapped type
        return {
            ...child,
            id: data.id,
            familyId: data.family_id,
            balance: 0,
            history: [],
            customTasks: [],
            role: 'CHILD'
        } as Child;
    },

    async createOpenTask(familyId: string, task: Task) {
        const { error } = await supabase.from('tasks').insert({
            family_id: familyId,
            profile_id: null,
            name: task.name,
            baseline_minutes: task.baselineMinutes,
            status: 'OPEN'
        });
        if (error) throw error;
    },

    async saveDraftTask(familyId: string, task: Task) {
        const { error } = await supabase.from('tasks').insert({
            family_id: familyId,
            profile_id: task.assigneeId || null,
            name: task.name,
            baseline_minutes: task.baselineMinutes,
            status: 'DRAFT'
        });
        if (error) throw error;
    },

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

    async assignTask(childId: string, task: Task, familyId: string) {
        const { error } = await supabase.from('tasks').insert({
            family_id: familyId,
            profile_id: childId,
            name: task.name,
            baseline_minutes: task.baselineMinutes,
            status: 'ASSIGNED'
        });
        if (error) throw error;
    },

    async claimTask(childId: string, taskId: string) {
        // Move from Open (null) to Child
        const { error } = await supabase
            .from('tasks')
            .update({ profile_id: childId, status: 'ASSIGNED' })
            .eq('id', taskId);
        if (error) throw error;
    },

    async updateTaskStatus(taskId: string, status: string, comment?: string) {
        const { error } = await supabase.from('tasks').update({ status, rejection_comment: comment }).eq('id', taskId);
        if (error) throw error;
    },

    async updateChild(childId: string, updates: Partial<Child>) {
        // Map updates to DB columns if necessary
        const dbUpdates: any = {};
        if (updates.subjects) dbUpdates.subjects = updates.subjects;
        if (updates.rates) dbUpdates.rates = updates.rates;
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.gradeLevel) dbUpdates.grade_level = updates.gradeLevel;

        const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', childId);
        if (error) throw error;
    },

    async payTask(childId: string, taskId: string, amount: number, memo: string) {
        const { error } = await supabase.rpc('pay_task', {
            p_child_id: childId,
            p_task_id: taskId,
            p_amount: amount,
            p_memo: memo
        });
        if (error) throw error;
    },

    async addAdvance(childId: string, amount: number, memo: string, category: string) {
        const { error } = await supabase.rpc('add_advance', {
            p_child_id: childId,
            p_amount: amount,
            p_memo: memo,
            p_category: category
        });
        if (error) throw error;
    }
};
