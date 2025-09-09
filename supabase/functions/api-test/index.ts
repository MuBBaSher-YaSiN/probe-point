import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = createClient(supabaseUrl, serviceKey);

    // 1) Try to authenticate via Supabase session (Authorization header)
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const authClient = createClient(
        supabaseUrl,
        anonKey,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: userErr } = await authClient.auth.getUser();
      if (userErr) console.error('auth.getUser error:', userErr);
      userId = user?.id ?? null;
    }

    // 2) If no session, fall back to x-api-key (programmatic access)
    if (!userId) {
      const apiKey = req.headers.get('x-api-key');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'Missing credentials: provide Authorization (logged-in) or x-api-key (programmatic)' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { data: validationData, error: validationError } =
        await service.functions.invoke('validate-api-key', { headers: { 'x-api-key': apiKey } });
      if (validationError || !validationData?.success) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = validationData.user_id;
    }

    // 3) Parse input
    const { url, device = 'mobile', region = 'us' } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4) Create test_run row
    const { data: testRun, error: testError } = await service
      .from('test_runs')
      .insert({
        user_id: userId,
        url,
        device,
        region,
        status: 'queued',
        queued_at: new Date().toISOString()
      })
      .select()
      .single();
    if (testError) throw testError;

    // 5) Invoke worker immediately
    await service.functions.invoke('process-performance-test', {
      body: { testRunId: testRun.id, url, device }
    });

    return new Response(
      JSON.stringify({ success: true, test_run_id: testRun.id, status: 'queued' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-test function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});