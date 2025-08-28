import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminLoginSchema, AdminLoginData } from '@/schemas/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminLoginProps {
  onSuccess: (adminData: any) => void;
  loading?: boolean;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, loading = false }) => {
  const { toast } = useToast();
  const [isLogging, setIsLogging] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
  });

  const handleAdminLogin = async (formData: AdminLoginData) => {
    setIsLogging(true);
    try {
      // First authenticate with admin-auth edge function
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: {
          email: formData.email,
          password: formData.password
        }
      });

      if (error) {
        throw new Error(error.message || 'Authentication failed');
      }

      if (data.success) {
        // Now sign in the user through Supabase auth using a special admin account
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: 'admin@probe-point.app',
          password: 'probepoint2025'
        });

        if (signInError) {
          // If admin account doesn't exist, create it
          if (signInError.message.includes('Invalid login credentials')) {
            const { error: signUpError } = await supabase.auth.signUp({
              email: 'iqraf2001@gmail.com',
              password: 'probepoint2025',
              options: {
                data: {
                  full_name: 'System Administrator',
                  role: 'admin'
                }
              }
            });
            
            if (signUpError) {
              throw new Error('Failed to create admin account: ' + signUpError.message);
            }
            
            toast({
              title: 'Admin Account Created',
              description: 'Please check your email to confirm the account, then try logging in again.',
              variant: 'default',
            });
            return;
          } else {
            throw new Error('Sign in failed: ' + signInError.message);
          }
        }

        toast({
          title: 'Welcome, Admin!',
          description: 'You have been successfully authenticated.',
        });
        onSuccess(data);
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: 'Authentication Failed',
        description: error instanceof Error ? error.message : 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center">
            <Shield className="w-6 h-6 text-primary" />
            Admin Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleAdminLogin)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@probe-point.app"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-error">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-error">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || isLogging}
              className="w-full"
            >
              {isLogging ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Authenticating...
                </>
              ) : (
                'Login as Admin'
              )}
            </Button>

            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p><strong>Default Credentials:</strong></p>
              <p>Email: admin@probe-point.app</p>
              <p>Password: password</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
