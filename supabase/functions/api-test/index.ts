import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Validate API key first
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required in x-api-key header' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call validate-api-key function
    const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-api-key', {
      headers: { 'x-api-key': apiKey }
    });

    if (validationError || !validationData.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = validationData.user_id;

    // Parse request body for test parameters
    const { url, device = 'mobile', region = 'us' } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create a test run
    const { data: testRun, error: testError } = await supabase
      .from('test_runs')
      .insert({
        user_id: userId,
        url: url,
        device: device,
        region: region,
        status: 'queued'
      })
      .select()
      .single();

    if (testError) {
      throw testError;
    }

    // Queue the test for processing
    await supabase.functions.invoke('job-queue', {
      body: {
        type: 'performance_test',
        payload: {
          test_run_id: testRun.id,
          url: url,
          device: device,
          region: region,
          user_id: userId
        }
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        test_run_id: testRun.id,
        status: 'queued',
        message: 'Performance test queued successfully'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in api-test function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});