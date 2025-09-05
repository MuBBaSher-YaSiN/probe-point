import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Filter, 
  Download, 
  ExternalLink,
  Calendar,
  Monitor,
  Smartphone,
  Globe,
  BarChart3,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TestRun {
  id: string;
  url: string;
  device: string;
  region: string;
  status: string;
  performance_score: number | null;
  seo_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  first_contentful_paint: number | null;
  largest_contentful_paint: number | null;
  cumulative_layout_shift: number | null;
  total_blocking_time: number | null;
  total_requests: number | null;
  total_bytes: number | null;
  created_at: string;
}

const History: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tests, setTests] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUrl, setSearchUrl] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const itemsPerPage = 10;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const loadTests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('test_runs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Apply filters
      if (searchUrl) {
        query = query.ilike('url', `%${searchUrl}%`);
      }
      if (deviceFilter !== 'all') {
        query = query.eq('device', deviceFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setTests(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error loading tests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test history.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, [currentPage, searchUrl, deviceFilter, statusFilter]);

  const getScoreColor = (score: number | null) => {
    if (!score) return 'bg-muted text-muted-foreground';
    if (score >= 90) return 'bg-success text-success-foreground';
    if (score >= 50) return 'bg-warning text-warning-foreground';
    return 'bg-error text-error-foreground';
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const exportToCSV = () => {
    const headers = [
      'URL',
      'Device',
      'Region', 
      'Date',
      'Performance Score',
      'SEO Score',
      'Accessibility Score',
      'Best Practices Score',
      'FCP (ms)',
      'LCP (ms)',
      'CLS',
      'TBT (ms)',
      'Total Requests',
      'Total Bytes',
      'Status'
    ];
    
    const csvData = tests.map(test => [
      test.url,
      test.device,
      test.region,
      new Date(test.created_at).toLocaleDateString(),
      test.performance_score || '',
      test.seo_score || '',
      test.accessibility_score || '',
      test.best_practices_score || '',
      test.first_contentful_paint || '',
      test.largest_contentful_paint || '',
      test.cumulative_layout_shift || '',
      test.total_blocking_time || '',
      test.total_requests || '',
      test.total_bytes || '',
      test.status
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `probepoint-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: 'Export Complete',
      description: 'Test history has been exported to CSV.',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold gradient-text">Test History</h1>
            </div>
          </div>
          
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="score-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search URL</label>
                <Input
                  placeholder="Filter by URL..."
                  value={searchUrl}
                  onChange={(e) => setSearchUrl(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Device</label>
                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={() => {
                    setSearchUrl('');
                    setDeviceFilter('all');
                    setStatusFilter('all');
                    setCurrentPage(1);
                  }} 
                  variant="outline" 
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="score-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Results</CardTitle>
              <div className="text-sm text-muted-foreground">
                {tests.length} results • Page {currentPage} of {totalPages}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading test history...</p>
              </div>
            ) : tests.length === 0 ? (
              <div className="p-8 text-center">
                <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tests found</h3>
                <p className="text-muted-foreground">
                  {searchUrl || deviceFilter !== 'all' || statusFilter !== 'all' 
                    ? 'Try adjusting your filters or run your first test.'
                    : 'Run your first performance test to see results here.'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {tests.map((test) => (
                  <div key={test.id} className="p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <a 
                            href={test.url.startsWith('http') ? test.url : `https://${test.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline flex items-center gap-1 truncate"
                          >
                            {test.url}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {test.device === 'mobile' ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <Monitor className="w-4 h-4" />
                            )}
                            {test.device}
                          </div>
                          <div className="flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            {test.region}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(test.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <Badge 
                        className={`ml-4 ${
                          test.status === 'completed' ? 'bg-success/10 text-success hover:bg-success/20' :
                          test.status === 'running' ? 'bg-warning/10 text-warning hover:bg-warning/20' :
                          test.status === 'failed' ? 'bg-error/10 text-error hover:bg-error/20' :
                          'bg-muted/10 text-muted-foreground hover:bg-muted/20'
                        }`}
                      >
                        {test.status}
                      </Badge>
                    </div>

                    {test.status === 'completed' && (
                      <>
                        {/* Performance Scores */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="text-center">
                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold mb-1 ${getScoreColor(test.performance_score)}`}>
                              {test.performance_score || 'N/A'}
                            </div>
                            <p className="text-xs text-muted-foreground">Performance</p>
                          </div>
                          <div className="text-center">
                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold mb-1 ${getScoreColor(test.seo_score)}`}>
                              {test.seo_score || 'N/A'}
                            </div>
                            <p className="text-xs text-muted-foreground">SEO</p>
                          </div>
                          <div className="text-center">
                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold mb-1 ${getScoreColor(test.accessibility_score)}`}>
                              {test.accessibility_score || 'N/A'}
                            </div>
                            <p className="text-xs text-muted-foreground">Accessibility</p>
                          </div>
                          <div className="text-center">
                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold mb-1 ${getScoreColor(test.best_practices_score)}`}>
                              {test.best_practices_score || 'N/A'}
                            </div>
                            <p className="text-xs text-muted-foreground">Best Practices</p>
                          </div>
                        </div>

                        {/* Web Vitals and Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">FCP</p>
                            <p className="font-medium">{test.first_contentful_paint ? `${test.first_contentful_paint}ms` : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">LCP</p>
                            <p className="font-medium">{test.largest_contentful_paint ? `${test.largest_contentful_paint}ms` : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CLS</p>
                            <p className="font-medium">{test.cumulative_layout_shift ? test.cumulative_layout_shift.toFixed(3) : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">TBT</p>
                            <p className="font-medium">{test.total_blocking_time ? `${test.total_blocking_time}ms` : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Requests</p>
                            <p className="font-medium">{test.total_requests || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Size</p>
                            <p className="font-medium">{formatBytes(test.total_bytes)}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-6 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History;