import { redirect, type Handle } from "@sveltejs/kit";
import { createServerClient } from "@supabase/ssr";
import { sequence } from "@sveltejs/kit/hooks";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from "$env/static/public";

const supabaseHandle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) =>
					event.cookies.set(name, value, { ...options, path: "/" }),
				);
			},
		},
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { session },
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error,
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};
	return resolve(event);
};

// Gamle Handle funktion
export const authHandle: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.user = user;

	const path = event.url.pathname;
	const isPublicPage =
		path === "/" || path === "/login" || path === "/register" || path === "/auth/callback";

	if (!session && !isPublicPage) {
		throw redirect(303, "/login");
	}

	if (session && isPublicPage && event.request.method === "GET") {
		throw redirect(303, "/passwords");
	}

	return resolve(event);
};

export const handle = sequence(supabaseHandle, authHandle);
