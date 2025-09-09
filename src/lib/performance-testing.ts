import { supabase } from '@/integrations/supabase/client';

export interface PageSpeedResult {
  url: string;
  strategy: 'mobile' | 'desktop';
  performance_score: number;
  accessibility_score: number;
  best_practices_score: number;
  seo_score: number;
  first_contentful_paint: number;
  largest_contentful_paint: number;
  cumulative_layout_shift: number;
  total_blocking_time: number;
  time_to_interactive: number;
  speed_index: number;
  total_requests: number;
  total_bytes: number;
}

export interface TestRequest {
  url: string;
  device: 'mobile' | 'desktop';
  region: string;
}

export class PerformanceTestingEngine {
  static async runTest({ url, device, region }: { url: string; device: 'mobile'|'desktop'; region?: string }): Promise<string> {
    const { data, error } = await supabase.functions.invoke('api-test', {
      body: { url, device, region: region ?? 'us' }
      // no headers; Authorization is attached by supabase-js
    });
    if (error) throw error;
    return data?.test_run_id;
  }

  static async getPageSpeedInsights(url: string, strategy: 'mobile' | 'desktop'): Promise<PageSpeedResult> {
    // This method is deprecated - use runTest instead for production
    throw new Error('Direct PageSpeed Insights access is no longer supported. Use runTest method instead.');
  }
}