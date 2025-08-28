import { supabase } from '@/integrations/supabase/client';

export interface JobData {
  id: string;
  type: 'performance-test';
  payload: Record<string, any>;
  status: 'queued' | 'running' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export class JobQueue {
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  static async enqueue(type: string, payload: Record<string, any>): Promise<string> {
    const job: Partial<JobData> = {
      type: type as any,
      payload,
      status: 'queued',
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { data, error } = await supabase
      .from('jobs')
      .insert(job)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async updateJobStatus(
    jobId: string, 
    status: JobData['status'], 
    error?: string
  ): Promise<void> {
    const updates: Partial<JobData> = {
      status,
      updatedAt: new Date(),
    };

    if (error) {
      updates.error = error;
    }

    if (status === 'running') {
      // Increment attempts when starting
      const { data: currentJob } = await supabase
        .from('jobs')
        .select('attempts')
        .eq('id', jobId)
        .single();
      
      if (currentJob) {
        updates.attempts = currentJob.attempts + 1;
      }
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId);

    if (updateError) throw updateError;
  }

  static async getJob(jobId: string): Promise<JobData | null> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) return null;
    return data;
  }

  static async getPendingJobs(limit: number = 10): Promise<JobData[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'queued')
      .order('createdAt', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async retryJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    
    if (!job || job.attempts >= job.maxAttempts) {
      await this.updateJobStatus(jobId, 'failed', 'Max retry attempts exceeded');
      return false;
    }

    await this.updateJobStatus(jobId, 'queued');
    return true;
  }

  static async processWithRetry<T>(
    jobId: string,
    processor: () => Promise<T>
  ): Promise<T> {
    try {
      await this.updateJobStatus(jobId, 'running');
      const result = await processor();
      await this.updateJobStatus(jobId, 'completed');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const job = await this.getJob(jobId);
      if (job && job.attempts < job.maxAttempts) {
        // Retry after delay
        setTimeout(async () => {
          await this.retryJob(jobId);
        }, this.RETRY_DELAY * job.attempts);
      } else {
        await this.updateJobStatus(jobId, 'failed', errorMessage);
      }
      
      throw error;
    }
  }
}