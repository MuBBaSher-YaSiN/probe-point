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
  private static readonly API_KEY = 'AIzaSyBOTI0m-B7X0bcIntWqYswE9fzplZi-lOg'; // Demo API key
  private static readonly PSI_URL = 'https://www.googleapis.com/pagespeedinights/v5/runPagespeed';

  static async runTest(request: TestRequest): Promise<string> {
    try {
      // Create test run record with 'queued' status
      const { data: testRun, error } = await supabase
        .from('test_runs')
        .insert({
          url: request.url,
          device: request.device,
          region: request.region,
          status: 'queued',
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();

      if (error) throw error;

      // Queue the actual test processing
      await supabase.functions.invoke('process-performance-test', {
        body: { testRunId: testRun.id, ...request }
      });

      return testRun.id;
    } catch (error) {
      console.error('Failed to queue performance test:', error);
      throw error;
    }
  }

  static async getPageSpeedInsights(url: string, strategy: 'mobile' | 'desktop'): Promise<PageSpeedResult> {
    const apiUrl = new URL(this.PSI_URL);
    apiUrl.searchParams.set('url', url);
    apiUrl.searchParams.set('key', this.API_KEY);
    apiUrl.searchParams.set('strategy', strategy);
    apiUrl.searchParams.set('category', 'performance');
    apiUrl.searchParams.set('category', 'accessibility');
    apiUrl.searchParams.set('category', 'best-practices');
    apiUrl.searchParams.set('category', 'seo');

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`PageSpeed Insights API error: ${response.statusText}`);
    }

    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    const audits = lighthouse.audits;
    const categories = lighthouse.categories;

    // Calculate total page size and requests from network audits
    const networkRequests = audits['network-requests'];
    const totalBytes = audits['total-byte-weight']?.numericValue || 0;
    const totalRequests = networkRequests?.details?.items?.length || 0;

    return {
      url,
      strategy,
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
      total_bytes: totalBytes
    };
  }
}