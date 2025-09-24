import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Users, MapPin, Clock, X } from 'lucide-react';

interface Alert {
  id: string;
  prediction_id: string;
  alert_level: string;
  message: string;
  affected_population: number;
  recommended_actions: string[];
  is_active: boolean;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

interface PredictionAlertsProps {
  alerts: Alert[];
  detailed?: boolean;
}

const PredictionAlerts: React.FC<PredictionAlertsProps> = ({ alerts, detailed = false }) => {
  const { profile } = useAuth();
  const { toast } = useToast();

  const getAlertBadge = (level: string) => {
    const variants = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800"
    };
    
    return (
      <Badge className={variants[level as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('prediction_alerts')
        .update({ 
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: profile?.user_id,
          is_active: false
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Alert Acknowledged",
        description: "The alert has been marked as acknowledged",
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to acknowledge alert",
      });
    }
  };

  const activeAlerts = alerts.filter(a => a.is_active);
  const acknowledgedAlerts = alerts.filter(a => !a.is_active);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
          Active Prediction Alerts
        </CardTitle>
        <CardDescription>
          AI-generated alerts requiring immediate attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All Clear</h3>
            <p className="text-muted-foreground">
              No active high-risk alerts at this time
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getAlertBadge(alert.alert_level)}
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  {(profile?.role === 'analyst' || profile?.role === 'disaster_manager') && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>

                <p className="text-sm font-medium mb-3">{alert.message}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Affected: {alert.affected_population.toLocaleString()} people
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Coastal region monitoring</span>
                  </div>
                </div>

                {detailed && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recommended Actions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {alert.recommended_actions.map((action, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {acknowledgedAlerts.length > 0 && detailed && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Acknowledged Alerts</h3>
            <div className="space-y-2">
              {acknowledgedAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm line-clamp-1">{alert.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Ack'd {new Date(alert.acknowledged_at!).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictionAlerts;