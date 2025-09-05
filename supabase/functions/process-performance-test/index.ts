import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PSI_API_KEY = Deno.env.get('PAGESPEED_API_KEY') || 'AIzaSyBOTI0m-B7X0bcIntWqYswE9fzplZi-lOg';
const PSI_URL = 'https://www.googleapis.com/pagespeedinsights/v5/runPagespeed';

async function getPageSpeedInsights(url: string, strategy: 'mobile' | 'desktop') {
  const apiUrl = new URL(PSI_URL);
  apiUrl.searchParams.set('url', url);
  apiUrl.searchParams.set('key', PSI_API_KEY);
  apiUrl.searchParams.set('strategy', strategy);
  apiUrl.searchParams.set('category', 'performance');
  apiUrl.searchParams.set('category', 'accessibility');
  apiUrl.searchParams.set('category', 'best-practices');
  apiUrl.searchParams.set('category', 'seo');

  const response = await fetch(apiUrl.toString());
  
  if (!response.ok) {
    throw new Error(`PageSpeed Insights API error: ${response.statusText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { testRunId, url, device } = await req.json();

    // Update test status to running
    await supabase
      .from('test_runs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', testRunId);

    try {
      // Get PageSpeed Insights data
      const psiData = await getPageSpeedInsights(url, device);
      const lighthouse = psiData.lighthouseResult;
      const audits = lighthouse.audits;
      const categories = lighthouse.categories;

      // Calculate metrics
      const networkRequests = audits['network-requests'];
      const totalBytes = audits['total-byte-weight']?.numericValue || 0;
      const totalRequests = networkRequests?.details?.items?.length || 0;

      // Update test run with results
      const { error: updateError } = await supabase
        .from('test_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          performance_score: Math.round(categories.performance.score * 100),
          accessibility_score: Math.round(categories.accessibility.score * 100),
          best_practices_score: Math.round(categories['best-practices'].score * 100),
          seo_score: Math.round(categories.seo.score * 100),
          first_contentful_paint: audits['first-contentful-paint']?.numericValue || 0,
          largest_contentful_paint: audits['largest-contentful-paint']?.numericValue || 0,
          cumulative_layout_shift: audits['cumulative-layout-shift']?.numericValue || 0,
          total_blocking_time: audits['total-blocking-time']?.numericValue || 0,
          time_to_interactive: audits['interactive']?.numericValue || 0,
          speed_index: audits['speed-index']?.numericValue || 0,
          total_requests: totalRequests,
          total_bytes: Math.round(totalBytes),
          raw_data: lighthouse
        })
        .eq('id', testRunId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, testRunId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (testError) {
      console.error('Test execution error:', testError);
      
      // Update test status to failed
      await supabase
        .from('test_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: testError.message
        })
        .eq('id', testRunId);

      throw testError;
    }

  } catch (error) {
    console.error('Error in process-performance-test function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});