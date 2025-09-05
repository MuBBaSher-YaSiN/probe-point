import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

const Auth: React.FC = () => {
  // One source of truth for auth state
  const { user, userRole, signIn, signUp, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Local UI state (rename to avoid clashing with authLoading)
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Hooks must be declared before any return paths
  const signInForm = useForm<SignInFormData>({ resolver: zodResolver(signInSchema) });
  const signUpForm = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) });

  // Toast if unauthenticated (no redirect loop on the Auth page)
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: 'Sign-in required',
        description: 'Please log in to continue.',
        variant: 'destructive',
      });
    }
  }, [authLoading, user, toast]);

  // Wait while auth is resolving, or while role is being fetched for a logged-in user
  if (authLoading || (user && userRole == null)) return null;

  // If logged in and role known → send to the right place
  if (user && userRole) {
    const redirectPath = userRole.toLowerCase() === 'admin' ? '/admin' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const handleSignIn = async (data: SignInFormData) => {
    setSubmitting(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        toast({ title: 'Sign In Failed', description: error.message || 'Please check your credentials and try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Welcome back!', description: 'You have been successfully signed in.' });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setSubmitting(true);
    try {
      const { error } = await signUp(data.email, data.password, data.fullName);
      if (error) {
        if (error.message?.includes('already registered')) {
          toast({ title: 'Account Already Exists', description: 'This email is already registered. Try signing in instead.', variant: 'destructive' });
          setActiveTab('signin');
        } else {
          toast({ title: 'Sign Up Failed', description: error.message || 'Failed to create account. Please try again.', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Account Created!', description: 'Welcome to ProbePoint! You can now start testing websites.' });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold gradient-text mb-2">ProbePoint</h1>
          <p className="text-muted-foreground">Professional Website Performance Testing</p>
        </div>

        <Card className="score-card">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <CardHeader><CardTitle>Welcome Back</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" type="email" placeholder="your@email.com" {...signInForm.register('email')} />
                    {signInForm.formState.errors.email && <p className="text-sm text-error">{signInForm.formState.errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" {...signInForm.register('password')} />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {signInForm.formState.errors.password && <p className="text-sm text-error">{signInForm.formState.errors.password.message}</p>}
                  </div>

                  <Button type="submit" disabled={submitting} variant="hero" className="w-full font-semibold">
                    {submitting ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Signing In...</>) : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader><CardTitle>Create Account</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" placeholder="John Doe" {...signUpForm.register('fullName')} />
                    {signUpForm.formState.errors.fullName && <p className="text-sm text-error">{signUpForm.formState.errors.fullName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="your@email.com" {...signUpForm.register('email')} />
                    {signUpForm.formState.errors.email && <p className="text-sm text-error">{signUpForm.formState.errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="Create a password" {...signUpForm.register('password')} />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {signUpForm.formState.errors.password && <p className="text-sm text-error">{signUpForm.formState.errors.password.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input id="signup-confirm" type={showPassword ? 'text' : 'password'} placeholder="Confirm your password" {...signUpForm.register('confirmPassword')} />
                    {signUpForm.formState.errors.confirmPassword && <p className="text-sm text-error">{signUpForm.formState.errors.confirmPassword.message}</p>}
                  </div>

                  <Button type="submit" disabled={submitting} variant="hero" className="w-full font-semibold">
                    {submitting ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Creating Account...</>) : 'Create Account'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          By continuing, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
};

export default Auth;
