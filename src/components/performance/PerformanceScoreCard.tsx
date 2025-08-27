import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface PerformanceScore {
  label: string;
  score: number;
  description: string;
}

interface PerformanceScoreCardProps {
  scores: PerformanceScore[];
  className?: string;
}

const getScoreColor = (score: number) => {
  if (score >= 90) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
};

const getScoreGrade = (score: number) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

export const PerformanceScoreCard: React.FC<PerformanceScoreCardProps> = ({
  scores,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {scores.map((scoreData, index) => {
        const colorClass = getScoreColor(scoreData.score);
        const grade = getScoreGrade(scoreData.score);
        
        return (
          <Card key={index} className={`score-card animate-scale-in`} style={{ animationDelay: `${index * 0.1}s` }}>
            <CardContent className="p-6 text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 text-2xl font-bold score-${colorClass}`}>
                {grade}
              </div>
              <h3 className="font-semibold text-lg mb-2">{scoreData.label}</h3>
              <div className="mb-3">
                <div className="text-3xl font-bold mb-1">{scoreData.score}</div>
                <Progress 
                  value={scoreData.score} 
                  className="h-2" 
                />
              </div>
              <p className="text-sm text-muted-foreground">{scoreData.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};