import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PerformanceTestForm from '@/components/performance/PerformanceTestForm';
import { PerformanceScoreCard } from '@/components/performance/PerformanceScoreCard';
import { WebVitalsChart } from '@/components/performance/WebVitalsChart';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  BarChart3, 
  Shield, 
  TrendingUp, 
  Globe2, 
  CheckCircle, 
  ArrowRight,
  Users,
  Award,
  Sparkles
} from 'lucide-react';

const Landing: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testLoading, setTestLoading] = useState(false);
  const [demoResults, setDemoResults] = useState<any>(null);

  const handleQuickTest = async (formData: { url: string; device: string; region: string }) => {
    setTestLoading(true);
    try {
      // Mock demo results for public users
      const mockResults = {
        scores: [
          {
            label: 'Performance',
            score: Math.floor(Math.random() * 40) + 60,
            description: 'Loading speed and optimization',
          },
          {
            label: 'SEO',
            score: Math.floor(Math.random() * 30) + 70,
            description: 'Search engine optimization',
          },
          {
            label: 'Accessibility',
            score: Math.floor(Math.random() * 20) + 80,
            description: 'User accessibility features',
          },
          {
            label: 'Best Practices',
            score: Math.floor(Math.random() * 25) + 75,
            description: 'Web development standards',
          },
        ],
        webVitals: [
          {
            name: 'FCP',
            value: Math.floor(Math.random() * 2000) + 1000,
            unit: 'ms',
            threshold: { good: 1800, poor: 3000 },
          },
          {
            name: 'LCP',
            value: Math.floor(Math.random() * 3000) + 2000,
            unit: 'ms',
            threshold: { good: 2500, poor: 4000 },
          },
          {
            name: 'CLS',
            value: Math.round(Math.random() * 0.25 * 1000) / 1000,
            unit: '',
            threshold: { good: 0.1, poor: 0.25 },
          },
          {
            name: 'TBT',
            value: Math.floor(Math.random() * 300) + 50,
            unit: 'ms',
            threshold: { good: 200, poor: 600 },
          },
        ],
        url: formData.url,
      };

      setTimeout(() => {
        setDemoResults(mockResults);
        setTestLoading(false);
        toast({
          title: 'Demo Test Complete!',
          description: 'Sign up for full history and detailed analytics.',
        });
      }, 3000);
    } catch (error) {
      setTestLoading(false);
      toast({
        title: 'Test Failed',
        description: 'Please try again or sign up for reliable testing.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">ProbePoint</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild variant="default">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild variant="hero">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Professional
              <span className="gradient-text block">Performance Testing</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get detailed insights into your website's performance with comprehensive testing, 
              Core Web Vitals analysis, and actionable recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-16 items-start">
            {/* Quick Test Form */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-2xl font-semibold mb-6 text-left">Try it now - Free</h2>
              <PerformanceTestForm 
                onSubmit={handleQuickTest} 
                loading={testLoading}
              />
            </div>

            {/* Results or Demo */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {demoResults ? (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-left">Test Results for {demoResults.url}</h3>
                    <PerformanceScoreCard scores={demoResults.scores} />
                  </div>
                  <WebVitalsChart data={demoResults.webVitals} />
                  <Card className="score-card bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                    <CardContent className="p-6 text-center">
                      <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">Want More?</h3>
                      <p className="text-muted-foreground mb-4">
                        Sign up for complete test history, detailed recommendations, and advanced analytics.
                      </p>
                      <Button asChild variant="hero">
                        <Link to="/auth">Sign Up Free</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="score-card h-fit">
                  <CardContent className="p-8 text-center">
                    <Globe2 className="w-16 h-16 text-primary mx-auto mb-6 animate-float" />
                    <h3 className="text-xl font-semibold mb-4">Instant Performance Analysis</h3>
                    <div className="space-y-3 text-sm text-muted-foreground text-left">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                        <span>Google Lighthouse Performance Scores</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                        <span>Core Web Vitals Analysis</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                        <span>SEO & Accessibility Audits</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                        <span>Actionable Recommendations</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl font-bold mb-4">Why Choose ProbePoint?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Professional-grade performance testing with enterprise features and detailed insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="score-card animate-scale-in">
              <CardContent className="p-8 text-center">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-6">
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Comprehensive Analysis</h3>
                <p className="text-muted-foreground">
                  Get detailed performance, SEO, accessibility, and best practices scores with actionable insights.
                </p>
              </CardContent>
            </Card>

            <Card className="score-card animate-scale-in" style={{ animationDelay: '0.1s' }}>
              <CardContent className="p-8 text-center">
                <div className="p-4 rounded-full bg-success/10 w-fit mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Performance Tracking</h3>
                <p className="text-muted-foreground">
                  Monitor your website's performance over time with detailed history and trend analysis.
                </p>
              </CardContent>
            </Card>

            <Card className="score-card animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-8 text-center">
                <div className="p-4 rounded-full bg-warning/10 w-fit mx-auto mb-6">
                  <Shield className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Enterprise Ready</h3>
                <p className="text-muted-foreground">
                  Secure, scalable testing with API access, custom reports, and team collaboration features.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="animate-fade-in-up">
              <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-4xl font-bold text-primary mb-2">10M+</div>
              <div className="text-muted-foreground">Tests Run</div>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-4xl font-bold text-primary mb-2">50K+</div>
              <div className="text-muted-foreground">Websites Tested</div>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-fade-in-up">
            <h2 className="text-3xl font-bold mb-4">Ready to Optimize Your Website?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of developers and businesses who trust ProbePoint for their performance testing needs.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button asChild variant="hero" size="lg">
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/auth">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              <span className="font-semibold">ProbePoint</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 ProbePoint. Professional performance testing platform.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;