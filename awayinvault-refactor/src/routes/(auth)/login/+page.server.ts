import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const actions: Actions = {
  login: async (event) => {
    const data = await event.request.formData();
    const email = data.get("email") as string;
    const password = data.get("password") as string;

    if (!email || !password) {
      return fail(400, { message: "No email or passwords or" });
    }

    const result = await event.locals.supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (result.error) {
      return fail(400, { message: result.error.message });
    }
    throw redirect(303, "/passwords");
  },
  logout: async (event) => {
    await event.locals.supabase.auth.signOut();
    throw redirect(303, "/login");
  },

  loginWithGithub: async (event) => {
    const result = await event.locals.supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${event.url.origin}/auth/callback`,
      },
    });

    if (result.error) {
      return fail(500, {
        message: "Github login failed: ",
        error: result.error.message,
      });
    }

    if (result.data.url) {
      redirect(303, result.data.url);
    }
  },
};

export const load: PageServerLoad = async (event) => {
  const sessionData = await event.locals.safeGetSession();

  if (sessionData.session) {
    throw redirect(303, "/passwords");
  }
  return {};
};
