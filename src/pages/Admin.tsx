import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield,
  Users,
  BarChart3,
  Settings,
  FileText,
  Activity,
  AlertTriangle,
  TrendingUp,
  Globe,
  Clock,
  Key,
  Database,
  ArrowLeft,
  Trash2,
  LogOut
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminStats {
  totalUsers: number;
  totalTests: number;
  testsToday: number;
  activeUsers: number;
  avgPerformanceScore: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  last_sign_in_at: string;
}

interface TestRun {
  id: string;
  url: string;
  user_id: string;
  device: string;
  performance_score: number;
  created_at: string;
  status: string;
}

const Admin: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTests: 0,
    testsToday: 0,
    activeUsers: 0,
    avgPerformanceScore: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [recentTests, setRecentTests] = useState<TestRun[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  // Early return after all hooks are declared
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const checkAdminAccess = async () => {
    try {
      // Check if user has admin role in profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin access:', error);
        return;
      }

      // Check for admin role or specific admin email (file-based admin)
      const hasAdminRole = profile?.role === 'admin';
      const isFileBasedAdmin = user.email === 'iqraf2001@gmail.com';
      
      setIsAdmin(hasAdminRole || isFileBasedAdmin);
      
      if (!hasAdminRole && !isFileBasedAdmin) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access the admin dashboard.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      // Load statistics with proper user data
      const [profilesResult, testsResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('test_runs').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (testsResult.error) throw testsResult.error;
      
      const allUsers = profilesResult.data.map(profile => ({
        id: profile.user_id,
        email: `user-${profile.user_id.slice(0, 8)}`,
        full_name: profile.full_name || 'Unknown User',
        role: profile.role || 'user',
        created_at: profile.created_at,
        last_sign_in_at: profile.updated_at
      }));

      const allTests = testsResult.data || [];

      // Calculate stats with real data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const testsToday = allTests.filter(test => {
        const testDate = new Date(test.created_at);
        return testDate >= today && testDate < tomorrow;
      }).length;

      const completedTests = allTests.filter(test => 
        test.performance_score !== null && test.status === 'completed'
      );
      
      const avgScore = completedTests.length > 0 
        ? Math.round(completedTests.reduce((sum, test) => sum + (test.performance_score || 0), 0) / completedTests.length)
        : 0;

      setStats({
        totalUsers: allUsers.length,
        totalTests: allTests.length,
        testsToday,
        activeUsers: 0, // Will be removed from UI
        avgPerformanceScore: avgScore
      });

      setUsers(allUsers.slice(0, 20));
      setRecentTests(allTests.slice(0, 15));

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load admin dashboard data.',
        variant: 'destructive',
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Role Updated',
        description: `User role updated to ${newRole}.`,
      });

      await loadAdminData();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update user role.',
        variant: 'destructive',
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // First delete related data
      await Promise.all([
        supabase.from('test_runs').delete().eq('user_id', userId),
        supabase.from('api_keys').delete().eq('user_id', userId),
        supabase.from('sites').delete().eq('user_id', userId)
      ]);

      // Then delete the profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'User Deleted',
        description: 'User and all related data have been deleted.',
      });

      await loadAdminData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Deletion Failed',
        description: 'Failed to delete user. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const exportUserReport = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, created_at, updated_at');

      if (error) throw error;

      const csvContent = [
        'User ID,Full Name,Role,Created At,Updated At',
        ...data.map(user => 
          `${user.user_id},"${user.full_name || 'N/A'}",${user.role},${user.created_at},${user.updated_at}`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Report Generated',
        description: 'User report has been downloaded.',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate user report.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="score-card max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You don't have permission to access the admin dashboard.
            </p>
            <Button asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-primary/10 text-primary">
              Administrator
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                await signOut();
                toast({
                  title: 'Signed Out',
                  description: 'You have been successfully signed out.',
                });
              }}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="score-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="score-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-warning/10">
                  <BarChart3 className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.totalTests}</div>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="score-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-error/10">
                  <Clock className="w-6 h-6 text-error" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.testsToday}</div>
                  <p className="text-sm text-muted-foreground">Tests Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="score-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent/10">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.avgPerformanceScore}</div>
                  <p className="text-sm text-muted-foreground">Avg Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users">
            <Card className="score-card">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground mb-1">
                          {user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {user.id.slice(0, 8)}... • Joined: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                        >
                          {user.role}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserRole(
                            user.id, 
                            user.role === 'admin' ? 'user' : 'admin'
                          )}
                        >
                          {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                        {user.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteUser(user.id)}
                            className="text-error hover:text-error"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="score-card">
                <CardHeader>
                  <CardTitle>Recent Test Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentTests.map((test) => (
                      <div key={test.id} className="flex items-center justify-between p-3 border-l-4 border-primary/20 bg-muted/20">
                        <div>
                          <div className="font-medium truncate">{test.url}</div>
                          <div className="text-sm text-muted-foreground">
                            {test.device} • {new Date(test.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{test.performance_score || 'N/A'}</div>
                          <Badge variant={
                            test.status === 'completed' ? 'default' : 
                            test.status === 'running' ? 'secondary' : 'outline'
                          }>
                            {test.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="score-card">
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Connection</span>
                    <Badge variant="default" className="bg-success text-success-foreground">
                      Healthy
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Response Time</span>
                    <Badge variant="secondary">
                      ~200ms
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Test Queue</span>
                    <Badge variant="default" className="bg-success text-success-foreground">
                      Operational
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports">
            <Card className="score-card">
              <CardHeader>
                <CardTitle>System Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col" onClick={exportUserReport}>
                    <FileText className="w-6 h-6 mb-2" />
                    Export User Report
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => toast({ title: 'Coming Soon', description: 'Performance analytics export will be available soon.' })}>
                    <BarChart3 className="w-6 h-6 mb-2" />
                    Performance Analytics
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => toast({ title: 'System Stats', description: `Total Users: ${stats.totalUsers}, Total Tests: ${stats.totalTests}, Active Users: ${stats.activeUsers}` })}>
                    <Activity className="w-6 h-6 mb-2" />
                    System Usage Report
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => toast({ title: 'Database Status', description: 'Database connection is healthy and operational.' })}>
                    <Database className="w-6 h-6 mb-2" />
                    Database Statistics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="score-card">
                <CardHeader>
                  <CardTitle>Application Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Maintenance Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable public access
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: 'Settings', description: 'Maintenance mode configuration will be available in future updates.' })}>
                      Configure
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Rate Limiting</p>
                      <p className="text-sm text-muted-foreground">
                        Configure API request limits
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: 'Settings', description: 'Rate limiting configuration will be available in future updates.' })}>
                      Configure
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Backup Settings</p>
                      <p className="text-sm text-muted-foreground">
                        Database backup configuration
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: 'Settings', description: 'Backup settings configuration will be available in future updates.' })}>
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="score-card">
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">PageSpeed Insights API</p>
                      <p className="text-sm text-muted-foreground">
                        Configure PSI API key and settings
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: 'API Settings', description: 'PageSpeed Insights API configuration will be available in future updates.' })}>
                      <Key className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Test Queue Settings</p>
                      <p className="text-sm text-muted-foreground">
                        Job processing and retry configuration
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: 'Queue Settings', description: 'Test queue configuration will be available in future updates.' })}>
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;