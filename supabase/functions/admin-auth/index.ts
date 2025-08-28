import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// File-based admin configuration
const ADMIN_CONFIG = {
  EMAIL: Deno.env.get('ADMIN_EMAIL') ?? "iqraf2001@gmail.com",
  PASSWORD_HASH: Deno.env.get('ADMIN_PASSWORD_HASH') ?? "$2a$12$Jjj6wFVyMoYNWIT1qvcIOOpfOFRXFDfGRNcSabdHHaiM8NWZjfM5q", // Default: "password"
};

async function validateAdminCredentials(email: string, password: string): Promise<boolean> {
  if (email !== ADMIN_CONFIG.EMAIL) {
    return false;
  }

  try {
    // Import bcrypt dynamically
    const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
    return await bcrypt.compare(password, ADMIN_CONFIG.PASSWORD_HASH);
  } catch (error) {
    console.error('Failed to validate admin credentials:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isValid = await validateAdminCredentials(email, password);
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create or get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Check if admin profile exists, if not create one
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', 'admin')
      .single();

    if (!existingProfile) {
      await supabase
        .from('profiles')
        .insert({
          user_id: 'admin',
          full_name: 'System Administrator',
          role: 'admin'
        });
    }

    // Return success with admin token (simplified for demo)
    const adminToken = btoa(`admin:${Date.now()}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: 'admin', 
          email: ADMIN_CONFIG.EMAIL,
          role: 'admin'
        },
        token: adminToken
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in admin-auth function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
