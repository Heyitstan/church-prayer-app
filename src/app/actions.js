'use server';

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updateBanner(formData) {
  console.log("service role key exists: ", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabaseURL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseURL || !serviceRoleKey) {
    throw new Error('Supabase environment variables are missing on the server.');
  }

  const cookieStore = await cookies();
  const ssrClient = createServerClient(
    supabaseURL,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({name, value, options}) => { 
              cookieStore.set(name, value, options)
            });
          } catch {}
        },
      },
    }
  );

  const { data: { user }, error: authError } = await ssrClient.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Invalid or missing user session.');
  }

  const { data: roleData, error: roleError } = await ssrClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError || roleData?.role !== 'admin') {
    throw new Error('Unauthorized: You do not have permission to perform this action.');
  }

  const adminClient = createClient(supabaseURL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, },
  });

  const text = formData.get('banner_text');
  const reference = formData.get('banner_reference');

  const {error} = await adminClient
    .from('site_settings')
    .update({banner_text: text, banner_reference: reference})
    .eq('id', 1);
  
  if (error) {
    throw new Error(`Failed to update site settings: ${error.message}`);
  }

  revalidatePath('/');
}
