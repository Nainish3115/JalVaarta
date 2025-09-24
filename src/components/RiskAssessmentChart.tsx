import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface Prediction {
  id: string;
  hazard_type: string;
  risk_level: string;
  risk_score: number;
  latitude: number;
  longitude: number;
  location_name: string;
  prediction_timeframe: string;
  confidence_score: number;
  factors: any;
  status: string;
  created_at: string;
}

interface RiskAssessmentChartProps {
  predictions: Prediction[];
}

const RiskAssessmentChart: React.FC<RiskAssessmentChartProps> = ({ predictions }) => {
  // Prepare data for risk trend chart
  const riskTrendData = predictions.slice(0, 10).map((prediction, index) => ({
    time: `T${index + 1}`,
    risk: prediction.risk_score,
    location: prediction.location_name.substring(0, 8),
    hazard: prediction.hazard_type
  }));

  // Prepare data for risk distribution
  const riskDistribution = predictions.reduce((acc, prediction) => {
    const level = prediction.risk_level;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const distributionData = Object.entries(riskDistribution).map(([level, count]) => ({
    level: level.charAt(0).toUpperCase() + level.slice(1),
    count,
    color: level === 'critical' ? '#ef4444' : 
           level === 'high' ? '#f97316' : 
           level === 'medium' ? '#eab308' : '#22c55e'
  }));

  const chartConfig = {
    risk: {
      label: "Risk Score",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Risk Trend Analysis
          </CardTitle>
          <CardDescription>
            Real-time risk score trends across monitored locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <AreaChart data={riskTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="risk"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Risk Level Distribution
          </CardTitle>
          <CardDescription>
            Distribution of risk levels across all predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {distributionData.map((item) => (
              <div key={item.level} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.level}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${(item.count / predictions.length) * 100}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskAssessmentChart;