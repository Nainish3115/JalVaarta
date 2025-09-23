import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, MapPin, AlertTriangle, Camera } from 'lucide-react';

const ReportHazard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const hazardTypes = [
    { value: 'tsunami', label: 'Tsunami' },
    { value: 'flood', label: 'Flood' },
    { value: 'high_waves', label: 'High Waves' },
    { value: 'storm_surge', label: 'Storm Surge' },
    { value: 'abnormal_sea_behavior', label: 'Abnormal Sea Behavior' },
  ];

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast({
            title: "Location Retrieved",
            description: "Current location has been captured successfully.",
          });
        },
        (error) => {
          toast({
            variant: "destructive",
            title: "Location Error",
            description: "Unable to retrieve your location. Please enter it manually.",
          });
        }
      );
    }
  };

  const extractExifLocation = (file: File): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const dataView = new DataView(arrayBuffer);
          
          // Simple EXIF GPS extraction (basic implementation)
          // Note: This is a simplified version. For production, consider using a library like 'exif-js'
          const exifMarker = 0xFFE1;
          let offset = 2;
          
          while (offset < dataView.byteLength) {
            const marker = dataView.getUint16(offset);
            if (marker === exifMarker) {
              // Found EXIF data, but for simplicity, we'll skip complex parsing
              // In a real implementation, you'd parse GPS coordinates here
              break;
            }
            offset += 2;
          }
          
          resolve(null); // Return null for now, but structure is ready for GPS parsing
        } catch (error) {
          resolve(null);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please select a file smaller than 10MB.",
        });
        return;
      }
      
      setFile(selectedFile);
      
      // Try to extract location from image if it's a photo
      if (selectedFile.type.startsWith('image/')) {
        const exifLocation = await extractExifLocation(selectedFile);
        if (exifLocation) {
          setLocation(exifLocation);
          toast({
            title: "Location Found",
            description: "Location extracted from photo metadata.",
          });
        }
      }
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('hazard-media')
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('hazard-media')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !location) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      let mediaUrl = null;

      if (file) {
        mediaUrl = await uploadFile(file);
      }

      const { error } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          hazard_type: formData.get('hazard_type') as any,
          description: formData.get('description') as string,
          latitude: location.lat,
          longitude: location.lng,
          location_name: formData.get('location_name') as string || null,
          media_url: mediaUrl,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Report Submitted",
        description: "Your hazard report has been submitted successfully and is pending verification.",
      });

      // Reset form
      (e.target as HTMLFormElement).reset();
      setFile(null);
      setLocation(null);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "An error occurred while submitting your report.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Report Ocean Hazard</h1>
          <p className="text-muted-foreground">
            Help keep our communities safe by reporting ocean hazards in your area
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Hazard Details</CardTitle>
            <CardDescription>
              Please provide accurate information about the ocean hazard you've observed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="hazard_type">Hazard Type *</Label>
                <Select name="hazard_type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hazard type" />
                  </SelectTrigger>
                  <SelectContent>
                    {hazardTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe what you observed, including severity, timing, and any immediate impacts..."
                  rows={4}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-4">
                <Label>Location Information *</Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={isSubmitting}
                    className="flex-shrink-0"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Current Location
                  </Button>
                  {location && (
                    <div className="flex-1 p-2 bg-muted rounded-md text-sm">
                      Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location_name">Location Name</Label>
                  <Input
                    id="location_name"
                    name="location_name"
                    placeholder="e.g., Miami Beach, Santa Monica Pier..."
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="media">Photo/Video Evidence</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="media"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" disabled>
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="pt-4 border-t">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting || !location}
                >
                  {isSubmitting ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Submitting Report...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Submit Hazard Report
                    </>
                  )}
                </Button>
                
                {!location && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Please capture your location before submitting
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportHazard;