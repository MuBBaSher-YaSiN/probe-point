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
    try {
      const { data, error } = await supabase.functions.invoke('job-queue', {
        body: { 
          action: 'enqueue', 
          type, 
          payload,
          maxAttempts: this.MAX_ATTEMPTS 
        }
      });

      if (error) throw error;
      return data.jobId;
    } catch (error) {
      console.error('Failed to enqueue job:', error);
      throw error;
    }
  }

  static async updateJobStatus(
    jobId: string, 
    status: JobData['status'], 
    error?: string
  ): Promise<void> {
    try {
      const { error: updateError } = await supabase.functions.invoke('job-queue', {
        body: { 
          action: 'updateStatus', 
          jobId, 
          status, 
          error 
        }
      });

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Failed to update job status:', error);
      throw error;
    }
  }

  static async getJob(jobId: string): Promise<JobData | null> {
    try {
      const { data, error } = await supabase.functions.invoke('job-queue', {
        body: { 
          action: 'getJob', 
          jobId 
        }
      });

      if (error) throw error;
      return data.job || null;
    } catch (error) {
      console.error('Failed to get job:', error);
      return null;
    }
  }

  static async getPendingJobs(limit: number = 10): Promise<JobData[]> {
    try {
      const { data, error } = await supabase.functions.invoke('job-queue', {
        body: { 
          action: 'getPendingJobs', 
          limit 
        }
      });

      if (error) throw error;
      return data.jobs || [];
    } catch (error) {
      console.error('Failed to get pending jobs:', error);
      return [];
    }
  }

  static async retryJob(jobId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('job-queue', {
        body: { 
          action: 'retryJob', 
          jobId 
        }
      });

      if (error) throw error;
      return data.success || false;
    } catch (error) {
      console.error('Failed to retry job:', error);
      return false;
    }
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