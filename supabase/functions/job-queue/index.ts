import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { action, ...params } = await req.json();

    switch (action) {
      case 'enqueue': {
        const { type, payload, maxAttempts = 3 } = params;
        
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            type,
            payload,
            status: 'queued',
            attempts: 0,
            max_attempts: maxAttempts,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (error) throw error;
        
        return new Response(
          JSON.stringify({ jobId: data.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateStatus': {
        const { jobId, status, error: jobError } = params;
        
        const updates: any = {
          status,
          updated_at: new Date().toISOString()
        };
        
        if (jobError) {
          updates.error = jobError;
        }
        
        if (status === 'running') {
          // Increment attempts
          const { data: currentJob } = await supabase
            .from('jobs')
            .select('attempts')
            .eq('id', jobId)
            .single();
          
          if (currentJob) {
            updates.attempts = currentJob.attempts + 1;
          }
        }

        const { error } = await supabase
          .from('jobs')
          .update(updates)
          .eq('id', jobId);

        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getJob': {
        const { jobId } = params;
        
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;
        
        return new Response(
          JSON.stringify({ job: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getPendingJobs': {
        const { limit = 10 } = params;
        
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('status', 'queued')
          .order('created_at', { ascending: true })
          .limit(limit);

        if (error) throw error;
        
        return new Response(
          JSON.stringify({ jobs: data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'retryJob': {
        const { jobId } = params;
        
        const { data: job, error: getError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (getError) throw getError;
        
        if (job.attempts >= job.max_attempts) {
          const { error } = await supabase
            .from('jobs')
            .update({ status: 'failed', error: 'Max retry attempts exceeded' })
            .eq('id', jobId);
          
          if (error) throw error;
          return new Response(
            JSON.stringify({ success: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('jobs')
          .update({ status: 'queued', updated_at: new Date().toISOString() })
          .eq('id', jobId);

        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Error in job-queue function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});