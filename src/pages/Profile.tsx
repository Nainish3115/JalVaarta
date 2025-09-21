import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Edit, 
  Save, 
  X,
  MapPin,
  Award
} from 'lucide-react';

const Profile = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedName, setEditedName] = useState(profile?.name || '');

  const handleUpdateProfile = async () => {
    if (!profile) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: editedName })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'disaster_manager':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <Shield className="h-3 w-3 mr-1" />
            Disaster Manager
          </Badge>
        );
      case 'analyst':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Award className="h-3 w-3 mr-1" />
            Data Analyst
          </Badge>
        );
      default:
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <User className="h-3 w-3 mr-1" />
            Citizen Reporter
          </Badge>
        );
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'disaster_manager':
        return 'Coordinate emergency responses and manage critical hazard reports';
      case 'analyst':
        return 'Analyze hazard patterns, verify reports, and provide data insights';
      default:
        return 'Report ocean hazards and help keep your community safe';
    }
  };

  if (!profile || !user) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <User className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your basic profile information</CardDescription>
              </div>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleUpdateProfile} disabled={isSubmitting}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setIsEditing(false);
                      setEditedName(profile.name);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Enter your full name"
                      disabled={isSubmitting}
                    />
                  ) : (
                    <div className="flex items-center space-x-2 py-2 px-3 bg-muted/50 rounded-md">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.name}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center space-x-2 py-2 px-3 bg-muted/50 rounded-md">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user.email}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Role</Label>
                  <div className="py-2">
                    {getRoleBadge(profile.role)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <div className="flex items-center space-x-2 py-2 px-3 bg-muted/50 rounded-md">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Account Activity</CardTitle>
              <CardDescription>Your contribution statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Reports Created</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">0</div>
                  <div className="text-sm text-muted-foreground">Verified Reports</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-500">0</div>
                  <div className="text-sm text-muted-foreground">Pending Review</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-accent">0</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Information Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                Role Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  {profile.role === 'disaster_manager' && <Shield className="h-8 w-8 text-red-500" />}
                  {profile.role === 'analyst' && <Award className="h-8 w-8 text-blue-500" />}
                  {profile.role === 'citizen' && <User className="h-8 w-8 text-green-500" />}
                </div>
                {getRoleBadge(profile.role)}
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                {getRoleDescription(profile.role)}
              </p>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Permissions:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Create hazard reports</li>
                  <li>• View interactive map</li>
                  {(profile.role === 'analyst' || profile.role === 'disaster_manager') && (
                    <>
                      <li>• Verify reports</li>
                      <li>• Access analytics</li>
                      <li>• Admin panel access</li>
                    </>
                  )}
                  {profile.role === 'disaster_manager' && (
                    <li>• Emergency coordination</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                Location Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Set your default location for faster hazard reporting
              </p>
              <Button variant="outline" className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                Set Default Location
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;