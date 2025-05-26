import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { getApiUrl } from '@/config/environment';
import { toast } from 'sonner';

interface ErrorLog {
  timestamp: string;
  source: string;
  message: string;
  stack?: string;
  context?: any;
}

interface ErrorResponse {
  errors: ErrorLog[];
  count: number;
}

const AdminPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminKey, setAdminKey] = useState('');

  // Redirect non-admin users
  useEffect(() => {
    // Check if user has admin role or permissions
    if (!user || !profile || !profile.is_admin) {
      navigate('/');
      toast.error('Unauthorized access');
    }
  }, [user, profile, navigate]);

  // Function to fetch error logs
  const fetchErrorLogs = async () => {
    try {
      setLoading(true);
      
      // We need an admin API key for accessing the errors API
      if (!adminKey) {
        toast.error('Admin API key is required');
        return;
      }
      
      const response = await fetch(`${getApiUrl('/api/errors')}?limit=50`, {
        headers: {
          'Authorization': `Bearer ${adminKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch error logs: ${response.status}`);
      }
      
      const data: ErrorResponse = await response.json();
      setErrors(data.errors);
      
      toast.success(`Loaded ${data.count} error logs`);
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
      toast.error('Failed to fetch error logs');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to clear error logs
  const clearErrorLogs = async () => {
    try {
      setLoading(true);
      
      if (!adminKey) {
        toast.error('Admin API key is required');
        return;
      }
      
      const response = await fetch(`${getApiUrl('/api/errors')}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear error logs: ${response.status}`);
      }
      
      setErrors([]);
      toast.success('Error logs cleared');
    } catch (error) {
      console.error('Failed to clear error logs:', error);
      toast.error('Failed to clear error logs');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="errors">
        <TabsList className="mb-4">
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Monitoring</CardTitle>
              <CardDescription>
                View and manage server-side error logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Admin API Key
                </label>
                <div className="flex">
                  <input
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-l mr-0"
                    placeholder="Enter admin API key"
                  />
                  <Button 
                    onClick={fetchErrorLogs} 
                    disabled={loading || !adminKey}
                    className="rounded-l-none"
                  >
                    {loading ? 'Loading...' : 'Fetch Logs'}
                  </Button>
                </div>
              </div>
              
              <div className="my-4">
                <Button 
                  variant="destructive" 
                  onClick={clearErrorLogs}
                  disabled={loading || !adminKey || errors.length === 0}
                >
                  Clear All Logs
                </Button>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">
                  Error Logs {errors.length > 0 && `(${errors.length})`}
                </h3>
                
                {errors.length === 0 ? (
                  <p className="text-gray-500">No error logs found</p>
                ) : (
                  <div className="space-y-4">
                    {errors.map((error, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="bg-red-50 py-2 px-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{error.source}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(error.timestamp)}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="py-3 px-4">
                          <p className="mb-2 font-medium text-red-600">{error.message}</p>
                          
                          {error.context && (
                            <div className="mt-2">
                              <p className="text-sm font-medium mb-1">Context:</p>
                              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                                {JSON.stringify(error.context, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {error.stack && (
                            <div className="mt-2">
                              <p className="text-sm font-medium mb-1">Stack Trace:</p>
                              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                                {error.stack}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
              <CardDescription>
                Configure application settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Admin settings will be implemented in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
