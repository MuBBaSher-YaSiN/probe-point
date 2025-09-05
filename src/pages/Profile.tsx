import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  User, 
  Key, 
  Shield, 
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface ApiKey {
  id: string;
  label: string;
  key_hash: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [newApiKeyLabel, setNewApiKeyLabel] = useState('');
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
      loadApiKeys();
    }
  }, [user]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile information.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const updateProfile = async () => {
    setUpdating(true);
    try {
      const updates = {
        user_id: user.id,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });

      await loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated.',
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: 'Password Update Failed',
        description: error.message || 'Failed to update password.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const generateApiKey = async () => {
    if (!newApiKeyLabel.trim()) {
      toast({
        title: 'Label Required',
        description: 'Please provide a label for the API key.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Generate a random API key
      const apiKey = 'pk_' + Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => 
        byte.toString(16).padStart(2, '0')
      ).join('');

      // Create hash of the key for storage
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          label: newApiKeyLabel.trim(),
          key_hash: hashHex,
        });

      if (error) throw error;

      setGeneratedApiKey(apiKey);
      setNewApiKeyLabel('');
      setShowNewApiKey(true);
      
      toast({
        title: 'API Key Generated',
        description: 'Your new API key has been created. Please copy it now as it won\'t be shown again.',
      });

      await loadApiKeys();
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate API key. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId);

      if (error) throw error;

      toast({
        title: 'API Key Revoked',
        description: 'The API key has been revoked and is no longer valid.',
      });

      await loadApiKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast({
        title: 'Revocation Failed',
        description: 'Failed to revoke API key. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied',
        description: 'API key copied to clipboard.',
      });
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
              <User className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold gradient-text">Profile & Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="score-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed. Contact support if needed.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <Button onClick={updateProfile} disabled={updating}>
                  {updating ? 'Updating...' : 'Update Profile'}
                </Button>
              </CardContent>
            </Card>

            {/* Password Update */}
            <Card className="score-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <Button 
                  onClick={updatePassword} 
                  disabled={updating || !newPassword || newPassword !== confirmPassword}
                  variant="outline"
                >
                  {updating ? 'Updating...' : 'Update Password'}
                </Button>
              </CardContent>
            </Card>

            {/* API Keys */}
            <Card className="score-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    API Keys
                  </CardTitle>
                  <Button onClick={() => setShowNewApiKey(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Generate New Key
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate API keys for programmatic access to performance testing endpoints.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNewApiKey && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4 space-y-4">
                      {generatedApiKey ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-primary">
                            New API Key Generated
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              value={generatedApiKey}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              onClick={() => copyToClipboard(generatedApiKey)}
                              size="sm"
                              variant="outline"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-warning">
                            ⚠️ Copy this key now. It won't be shown again for security reasons.
                          </p>
                          <Button 
                            onClick={() => {
                              setShowNewApiKey(false);
                              setGeneratedApiKey('');
                            }}
                            size="sm"
                            variant="outline"
                          >
                            Done
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="apiKeyLabel">API Key Label</Label>
                            <Input
                              id="apiKeyLabel"
                              value={newApiKeyLabel}
                              onChange={(e) => setNewApiKeyLabel(e.target.value)}
                              placeholder="e.g., Production App, Testing, etc."
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button onClick={generateApiKey} size="sm">
                              Generate Key
                            </Button>
                            <Button 
                              onClick={() => setShowNewApiKey(false)}
                              size="sm"
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {apiKeys.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No API keys yet. Generate your first key to get started.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div 
                        key={key.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{key.label}</span>
                            {key.revoked_at ? (
                              <Badge variant="secondary">Revoked</Badge>
                            ) : (
                              <Badge variant="default">Active</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <p>Created: {new Date(key.created_at).toLocaleDateString()}</p>
                            {key.last_used_at && (
                              <p>Last used: {new Date(key.last_used_at).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                        
                        {!key.revoked_at && (
                          <Button
                            onClick={() => revokeApiKey(key.id)}
                            size="sm"
                            variant="outline"
                            className="text-error hover:text-error"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Usage Documentation */}
            <Card className="score-card border-info/20 bg-info/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-info">
                  <Globe className="w-5 h-5" />
                  API Usage Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Run Performance Test</h4>
                    <div className="bg-muted/50 p-3 rounded text-xs font-mono space-y-2">
                      <div>POST {window.location.origin.replace('https://', 'https://').replace('http://', 'https://')}/functions/v1/api-test</div>
                      <div>Headers: x-api-key: YOUR_API_KEY</div>
                      <div>Body: {`{"url": "https://example.com", "device": "mobile", "region": "us"}`}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Example Response</h4>
                    <div className="bg-muted/50 p-3 rounded text-xs font-mono">
                      {`{
  "success": true,
  "test_run_id": "uuid-here",
  "status": "queued"
}`}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p>• Generate API keys above to get programmatic access</p>
                    <p>• Keys are validated on each request and usage is tracked</p>
                    <p>• Revoked keys will immediately stop working</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Summary */}
          <div className="space-y-6">
            <Card className="score-card">
              <CardHeader>
                <CardTitle>Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'}>
                    {profile?.role || 'user'}
                  </Badge>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Unknown'
                    }
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {profile?.updated_at 
                      ? new Date(profile.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Never'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="score-card border-error/20">
              <CardHeader>
                <CardTitle className="text-error">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Need to delete your account? Contact support for assistance.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-error text-error hover:bg-error hover:text-error-foreground"
                  onClick={() => {
                    toast({
                      title: 'Contact Support',
                      description: 'Please contact support to delete your account.',
                    });
                  }}
                >
                  Request Account Deletion
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;