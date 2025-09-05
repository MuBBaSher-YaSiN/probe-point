import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import PerformanceTestForm from '@/components/performance/PerformanceTestForm';
import { PerformanceScoreCard } from '@/components/performance/PerformanceScoreCard';
import { WebVitalsChart } from '@/components/performance/WebVitalsChart';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LogOut, History, Settings, BarChart3, Globe2, Zap } from 'lucide-react';
import { TestFormData } from '@/schemas/validation';
import { Link } from 'react-router-dom';

interface TestRun {
  id: string;
  url: string;
  device: string;
  status: string;
  performance_score: number | null;
  seo_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  first_contentful_paint: number | null;
  largest_contentful_paint: number | null;
  cumulative_layout_shift: number | null;
  total_blocking_time: number | null;
  time_to_interactive: number | null;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const [recentTests, setRecentTests] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecentTests();
    }
  }, [user]);

  // Redirect admin users to admin dashboard
  if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const loadRecentTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentTests(data || []);
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSubmit = async (formData: TestFormData) => {
    setTestLoading(true);
    try {
      // Use the real performance testing engine
      const { PerformanceTestingEngine } = await import('@/lib/performance-testing');
      const testRunId = await PerformanceTestingEngine.runTest(formData);

      toast({
        title: 'Test Started!',
        description: `Performance test for ${formData.url} has been queued.`,
      });

      // Poll for test completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait
      
      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const { data: testRun } = await supabase
          .from('test_runs')
          .select('status')
          .eq('id', testRunId)
          .single();

        if (testRun?.status === 'completed' || testRun?.status === 'failed') {
          completed = true;
          
          if (testRun.status === 'completed') {
            toast({
              title: 'Test Completed!',
              description: `Performance test for ${formData.url} has been completed.`,
            });
          } else {
            toast({
              title: 'Test Failed',
              description: 'Performance test failed to complete.',
              variant: 'destructive',
            });
          }
        }
        
        attempts++;
      }

      // Reload recent tests
      await loadRecentTests();
    } catch (error) {
      console.error('Error running test:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to start performance test. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Signed Out',
      description: 'You have been successfully signed out.',
    });
  };

  // Sample data for the latest test
  const latestTest = recentTests[0];
  const sampleScores = latestTest ? [
    {
      label: 'Performance',
      score: latestTest.performance_score || 0,
      description: 'Loading speed and optimization',
    },
    {
      label: 'SEO',
      score: latestTest.seo_score || 0,
      description: 'Search engine optimization',
    },
    {
      label: 'Accessibility',
      score: latestTest.accessibility_score || 0,
      description: 'User accessibility features',
    },
    {
      label: 'Best Practices',
      score: latestTest.best_practices_score || 0,
      description: 'Web development standards',
    },
  ] : [];

  const webVitalsData = latestTest ? [
    {
      name: 'FCP',
      value: latestTest.first_contentful_paint || 0,
      unit: 'ms',
      threshold: { good: 1800, poor: 3000 },
    },
    {
      name: 'LCP',
      value: latestTest.largest_contentful_paint || 0,
      unit: 'ms',
      threshold: { good: 2500, poor: 4000 },
    },
    {
      name: 'CLS',
      value: Math.round((latestTest.cumulative_layout_shift || 0) * 1000) / 1000,
      unit: '',
      threshold: { good: 0.1, poor: 0.25 },
    },
    {
      name: 'TBT',
      value: latestTest.total_blocking_time || 0,
      unit: 'ms',
      threshold: { good: 200, poor: 600 },
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold gradient-text">ProbePoint</h1>
            </div>
            <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
              <Globe2 className="w-4 h-4" />
              <span>Professional Performance Testing</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="flex items-center gap-2">
              <Link to="/history">
                <History className="w-4 h-4" />
                <span className="hidden md:inline">History</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="flex items-center gap-2">
              <Link to="/settings">
                <Settings className="w-4 h-4" />
                <span className="hidden md:inline">Settings</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in-up">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user.user_metadata?.full_name || user.email}!
          </h2>
          <p className="text-muted-foreground">
            Ready to test your website's performance? Let's analyze what matters most.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="score-card animate-scale-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{recentTests.length}</div>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="score-card animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-success/10">
                  <Globe2 className="w-6 h-6 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {latestTest?.performance_score || 'N/A'}
                  </div>
                  <p className="text-sm text-muted-foreground">Latest Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="score-card animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-warning/10">
                  <Zap className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {latestTest ? `${latestTest.first_contentful_paint}ms` : 'N/A'}
                  </div>
                  <p className="text-sm text-muted-foreground">Avg FCP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Test Form */}
          <div className="lg:col-span-1">
            <PerformanceTestForm 
              onSubmit={handleTestSubmit} 
              loading={testLoading}
              className="animate-fade-in-up"
            />
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2 space-y-8">
            {latestTest ? (
              <>
                <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  <h3 className="text-xl font-semibold mb-4">Latest Test Results</h3>
                  <PerformanceScoreCard scores={sampleScores} />
                </div>

                <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <WebVitalsChart data={webVitalsData} />
                </div>
              </>
            ) : (
              <Card className="score-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <CardContent className="p-12 text-center">
                  <Globe2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Tests Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Run your first performance test to see detailed analytics and insights.
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <p>✨ Detailed performance scores</p>
                    <p>📊 Core Web Vitals analysis</p>
                    <p>🚀 Actionable recommendations</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Tests */}
        {recentTests.length > 0 && (
          <div className="mt-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <h3 className="text-xl font-semibold mb-4">Recent Tests</h3>
            <Card className="score-card">
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentTests.map((test, index) => (
                    <div key={test.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{test.url}</div>
                          <div className="text-sm text-muted-foreground">
                            {test.device} • {new Date(test.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">{test.performance_score}</div>
                            <div className="text-xs text-muted-foreground">Performance</div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            test.status === 'completed' ? 'bg-success/10 text-success' : 
                            test.status === 'running' ? 'bg-warning/10 text-warning' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {test.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;