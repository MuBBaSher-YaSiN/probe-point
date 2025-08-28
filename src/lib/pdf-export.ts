import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReportData {
  url: string;
  device: string;
  testDate: Date;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    fcp: number;
    lcp: number;
    cls: number;
    tbt: number;
    tti: number;
    speedIndex: number;
  };
  resources: {
    totalRequests: number;
    totalBytes: number;
  };
  recommendations: Array<{
    category: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

export class PDFExporter {
  static async generateReport(reportData: ReportData): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    pdf.setFontSize(24);
    pdf.setTextColor(40, 40, 40);
    pdf.text('ProbePoint Performance Report', 20, 30);

    // Add URL and test info
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`URL: ${reportData.url}`, 20, 45);
    pdf.text(`Device: ${reportData.device}`, 20, 52);
    pdf.text(`Test Date: ${reportData.testDate.toLocaleDateString()}`, 20, 59);

    // Add scores section
    let yPos = 80;
    pdf.setFontSize(16);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Performance Scores', 20, yPos);
    
    yPos += 15;
    pdf.setFontSize(12);
    
    const scores = [
      { label: 'Performance', value: reportData.scores.performance, color: this.getScoreColor(reportData.scores.performance) },
      { label: 'Accessibility', value: reportData.scores.accessibility, color: this.getScoreColor(reportData.scores.accessibility) },
      { label: 'Best Practices', value: reportData.scores.bestPractices, color: this.getScoreColor(reportData.scores.bestPractices) },
      { label: 'SEO', value: reportData.scores.seo, color: this.getScoreColor(reportData.scores.seo) }
    ];

    scores.forEach(score => {
      const [r, g, b] = score.color;
      pdf.setTextColor(r, g, b);
      pdf.text(`${score.label}: ${score.value}/100`, 20, yPos);
      yPos += 8;
    });

    // Add Core Web Vitals section
    yPos += 10;
    pdf.setFontSize(16);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Core Web Vitals', 20, yPos);
    
    yPos += 15;
    pdf.setFontSize(12);
    
    const metrics = [
      { label: 'First Contentful Paint', value: `${Math.round(reportData.metrics.fcp)}ms` },
      { label: 'Largest Contentful Paint', value: `${Math.round(reportData.metrics.lcp)}ms` },
      { label: 'Cumulative Layout Shift', value: reportData.metrics.cls.toFixed(3) },
      { label: 'Total Blocking Time', value: `${Math.round(reportData.metrics.tbt)}ms` },
      { label: 'Time to Interactive', value: `${Math.round(reportData.metrics.tti)}ms` },
      { label: 'Speed Index', value: `${Math.round(reportData.metrics.speedIndex)}ms` }
    ];

    pdf.setTextColor(100, 100, 100);
    metrics.forEach(metric => {
      pdf.text(`${metric.label}: ${metric.value}`, 20, yPos);
      yPos += 8;
    });

    // Add Resources section
    yPos += 10;
    pdf.setFontSize(16);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Resource Analysis', 20, yPos);
    
    yPos += 15;
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Total Requests: ${reportData.resources.totalRequests}`, 20, yPos);
    yPos += 8;
    pdf.text(`Total Size: ${this.formatBytes(reportData.resources.totalBytes)}`, 20, yPos);

    // Add new page for recommendations
    pdf.addPage();
    yPos = 30;
    
    pdf.setFontSize(20);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Recommendations', 20, yPos);
    
    yPos += 20;
    
    reportData.recommendations.forEach((rec, index) => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 30;
      }
      
      // Impact badge
      const impactColors = {
        high: [220, 53, 69] as [number, number, number],
        medium: [255, 193, 7] as [number, number, number], 
        low: [40, 167, 69] as [number, number, number]
      };
      const impactColor = impactColors[rec.impact];
      
      pdf.setFontSize(12);
      const [r, g, b] = impactColor;
      pdf.setTextColor(r, g, b);
      pdf.text(`[${rec.impact.toUpperCase()}]`, 20, yPos);
      
      // Title
      pdf.setTextColor(40, 40, 40);
      pdf.setFontSize(14);
      pdf.text(rec.title, 50, yPos);
      
      yPos += 8;
      
      // Description
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const splitDescription = pdf.splitTextToSize(rec.description, 170);
      pdf.text(splitDescription, 20, yPos);
      yPos += splitDescription.length * 4 + 10;
    });

    return pdf.output('blob');
  }

  static async generateCSVExport(tests: any[]): Promise<Blob> {
    const headers = [
      'URL',
      'Device',
      'Test Date',
      'Performance Score',
      'Accessibility Score',
      'Best Practices Score',
      'SEO Score',
      'FCP (ms)',
      'LCP (ms)',
      'CLS',
      'TBT (ms)',
      'TTI (ms)',
      'Speed Index (ms)',
      'Total Requests',
      'Total Bytes'
    ];

    const csvContent = [
      headers.join(','),
      ...tests.map(test => [
        test.url,
        test.device,
        new Date(test.created_at).toLocaleDateString(),
        test.performance_score || 0,
        test.accessibility_score || 0,
        test.best_practices_score || 0,
        test.seo_score || 0,
        Math.round(test.first_contentful_paint || 0),
        Math.round(test.largest_contentful_paint || 0),
        (test.cumulative_layout_shift || 0).toFixed(3),
        Math.round(test.total_blocking_time || 0),
        Math.round(test.time_to_interactive || 0),
        Math.round(test.speed_index || 0),
        test.total_requests || 0,
        test.total_bytes || 0
      ].join(','))
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  }

  private static getScoreColor(score: number): [number, number, number] {
    if (score >= 90) return [40, 167, 69]; // Green
    if (score >= 50) return [255, 193, 7]; // Yellow  
    return [220, 53, 69]; // Red
  }

  private static formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    const kb = bytes / 1024;
    
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    } else {
      return `${kb.toFixed(1)} KB`;
    }
  }
}