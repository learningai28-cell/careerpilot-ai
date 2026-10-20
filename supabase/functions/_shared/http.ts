// supabase/functions/_shared/http.ts
//
// Boilerplate shared by every Edge Function: JSON responses (with and
// without CORS), the OPTIONS preflight, caller authentication, and the
// service-role client.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

/** Plain JSON response, no CORS headers (server-to-server, e.g. razorpay-webhook). */
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** JSON response with CORS headers, for browser-called functions. */
export function cors(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

/** Returns the preflight response for an OPTIONS request, otherwise null. */
export function handleOptions(req: Request): Response | null {
  return req.method === "OPTIONS" ? cors({}, 200) : null;
}

/**
 * Authenticates the caller. Returns a client bound to the caller's JWT (so
 * RLS applies to every query) and the user, or a ready 401 Response:
 *
 *   const auth = await requireUser(req);
 *   if (auth instanceof Response) return auth;
 *   const { supabase, user } = auth;
 */
export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return cors({ error: "Missing authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return cors({ error: "Invalid session" }, 401);

  return { supabase, user };
}

/** Service-role client; bypasses RLS, so only use it for server-side work. */
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}
