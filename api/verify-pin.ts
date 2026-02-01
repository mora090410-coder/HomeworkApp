import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }
    try {
        const { childId, pin } = await request.json();
        if (!childId || !pin) return new Response('Missing params', { status: 400 });

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: profile } = await supabase.from('profiles').select('pin_hash').eq('id', childId).single();

        if (!profile) return new Response(JSON.stringify({ valid: false }), { status: 404 });

        // Mock hash comparison for MVP (assuming pin is hash or plain text for now)
        const isValid = profile.pin_hash === pin;

        return new Response(JSON.stringify({ valid: isValid }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 });
    }
}
