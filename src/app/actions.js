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
    throw new Error('Server configuration error.');
  }

  const adminClient = createClient(
    supabaseURL,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
    }
  );

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

  const { data: { user } } = await ssrClient.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: No user session.');
  }

  const { data: roleData, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError || roleData?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required.');
  }

  const {error} = await adminClient
    .from('site_settings')
    .update({
      banner_text: formData.get('banner_text'), 
      banner_reference: formData.get('banner_reference')
    })
    .eq('id', 1);
  
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  revalidatePath('/');
}
