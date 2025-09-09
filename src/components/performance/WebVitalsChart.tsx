import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WebVitalsData {
  name: string;
  value: number;
  unit: string;
  threshold: {
    good: number;
    poor: number;
  };
}

interface WebVitalsChartProps {
  data: WebVitalsData[];
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold">{label}</p>
        <p className="text-primary">
          {`${payload[0].value}${data.unit}`}
        </p>
        <div className="text-xs text-muted-foreground mt-1">
          <p>Good: &lt;{data.threshold.good}{data.unit}</p>
          <p>Poor: &gt;{data.threshold.poor}{data.unit}</p>
        </div>
      </div>
    );
  }
  return null;
};

const getBarColor = (value: number, threshold: { good: number; poor: number }) => {
  if (value <= threshold.good) return 'hsl(var(--success))';
  if (value <= threshold.poor) return 'hsl(var(--warning))';
  return 'hsl(var(--error))';
};

export const WebVitalsChart: React.FC<WebVitalsChartProps> = ({
  data,
  className = '',
}) => {
  return (
    <Card className={`score-card ${className}`}>
      <CardHeader>
        <CardTitle className="gradient-text">Core Web Vitals</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--foreground))"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.value, entry.threshold)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-center text-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span>Good</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <span className="hidden xs:inline">Needs Improvement</span>
            <span className="xs:hidden">Needs Work</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-error"></div>
            <span>Poor</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};