import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { testFormSchema, TestFormData } from '@/schemas/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Globe, Smartphone, Monitor, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PerformanceTestFormProps {
  onSubmit: (data: TestFormData) => Promise<void>;
  loading?: boolean;
  className?: string;
}

const PerformanceTestForm: React.FC<PerformanceTestFormProps> = ({
  onSubmit,
  loading = false,
  className = '',
}) => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TestFormData>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      device: 'mobile',
      region: 'us',
    },
  });

  const selectedDevice = watch('device');

  const handleFormSubmit = async (data: TestFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start performance test. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={`score-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Performance Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              placeholder="https://example.com"
              {...register('url')}
              className="text-lg"
            />
            {errors.url && (
              <p className="text-sm text-error">{errors.url.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Device</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedDevice === 'mobile' ? 'default' : 'outline'}
                  onClick={() => setValue('device', 'mobile')}
                  className="flex items-center gap-2 text-sm"
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden xs:inline">Mobile</span>
                  <span className="xs:hidden">M</span>
                </Button>
                <Button
                  type="button"
                  variant={selectedDevice === 'desktop' ? 'default' : 'outline'}
                  onClick={() => setValue('device', 'desktop')}
                  className="flex items-center gap-2 text-sm"
                >
                  <Monitor className="w-4 h-4" />
                  <span className="hidden xs:inline">Desktop</span>
                  <span className="xs:hidden">D</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select onValueChange={(value) => setValue('region', value)} defaultValue="us">
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="eu">Europe</SelectItem>
                  <SelectItem value="asia">Asia Pacific</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="hero"
            className="w-full font-semibold py-3 animate-pulse-glow"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Running Test...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Performance Test
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PerformanceTestForm;