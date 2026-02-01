import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { familyId, role = 'MEMBER', email } = await request.json();

        if (!familyId) {
            return new Response('Missing familyId', { status: 400 });
        }

        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Generate Token
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

        // Insert Invite
        const { data, error } = await supabase
            .from('invites')
            .insert({
                family_id: familyId,
                token,
                role,
                email: email || null, // Optional
                expires_at: expiresAt
            })
            .select()
            .single();

        if (error) throw error;

        return new Response(JSON.stringify({
            token: data.token,
            url: `${new URL(request.url).origin}/?join=${data.token}`
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
