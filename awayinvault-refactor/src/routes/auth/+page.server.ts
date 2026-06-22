import { supabase } from "$lib/utils/supabaseClient";
import { error, redirect } from "@sveltejs/kit";

export const GET = async (event) => {
    const { url, locals: { supabase } } = event;
    const code = url.searchParams.get('code') as string;
    const next = url.searchParams.get('next') ?? '/passwords';

    if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        if (!result.error) {
            throw redirect(303, `/${next.slice(1)}`)
        }
    }
    throw redirect(303, "/login")
}