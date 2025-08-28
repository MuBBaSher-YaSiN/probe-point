export interface Recommendation {
  id: string;
  category: 'performance' | 'accessibility' | 'seo' | 'best-practices';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'hard';
  auditId?: string;
  score?: number;
}

export interface AuditResult {
  id: string;
  title: string;
  description?: string;
  score?: number;
  numericValue?: number;
  displayValue?: string;
}

export class RecommendationsEngine {
  private static readonly PERFORMANCE_RECOMMENDATIONS: Record<string, Omit<Recommendation, 'id'>> = {
    'first-contentful-paint': {
      category: 'performance',
      title: 'Improve First Contentful Paint',
      description: 'Optimize server response times, eliminate render-blocking resources, and use efficient caching strategies to make content appear faster.',
      impact: 'high',
      effort: 'moderate'
    },
    'largest-contentful-paint': {
      category: 'performance', 
      title: 'Optimize Largest Contentful Paint',
      description: 'Compress images, use next-gen image formats (WebP/AVIF), implement lazy loading, and optimize critical rendering path.',
      impact: 'high',
      effort: 'moderate'
    },
    'cumulative-layout-shift': {
      category: 'performance',
      title: 'Minimize Layout Shifts',
      description: 'Set explicit dimensions for images and videos, avoid inserting content above existing content, and use CSS transform animations.',
      impact: 'high',
      effort: 'easy'
    },
    'total-blocking-time': {
      category: 'performance',
      title: 'Reduce Total Blocking Time',
      description: 'Split long-running tasks, optimize JavaScript execution, defer non-critical scripts, and use code splitting.',
      impact: 'high',
      effort: 'hard'
    },
    'speed-index': {
      category: 'performance',
      title: 'Improve Speed Index',
      description: 'Optimize critical rendering path, inline critical CSS, preload key resources, and eliminate render-blocking resources.',
      impact: 'medium',
      effort: 'moderate'
    },
    'interactive': {
      category: 'performance',
      title: 'Reduce Time to Interactive',
      description: 'Minimize main thread work, reduce JavaScript execution time, and remove unused JavaScript.',
      impact: 'high',
      effort: 'hard'
    },
    'render-blocking-resources': {
      category: 'performance',
      title: 'Eliminate Render-Blocking Resources',
      description: 'Inline critical CSS, defer non-critical CSS and JavaScript, and use resource hints like preload.',
      impact: 'high',
      effort: 'moderate'
    },
    'unused-javascript': {
      category: 'performance',
      title: 'Remove Unused JavaScript',
      description: 'Audit your bundles for unused code, implement code splitting, and use tree shaking to eliminate dead code.',
      impact: 'medium',
      effort: 'moderate'
    },
    'efficient-animated-content': {
      category: 'performance',
      title: 'Use Efficient Animations',
      description: 'Use CSS transforms and opacity for animations, avoid animating layout properties, and use will-change sparingly.',
      impact: 'medium',
      effort: 'easy'
    },
    'uses-optimized-images': {
      category: 'performance',
      title: 'Optimize Images',
      description: 'Use next-generation image formats (WebP, AVIF), implement responsive images with srcset, and compress images.',
      impact: 'high',
      effort: 'easy'
    }
  };

  private static readonly ACCESSIBILITY_RECOMMENDATIONS: Record<string, Omit<Recommendation, 'id'>> = {
    'color-contrast': {
      category: 'accessibility',
      title: 'Improve Color Contrast',
      description: 'Ensure text has sufficient contrast ratio (4.5:1 for normal text, 3:1 for large text) against background colors.',
      impact: 'high',
      effort: 'easy'
    },
    'image-alt': {
      category: 'accessibility',
      title: 'Add Alternative Text to Images',
      description: 'Provide meaningful alt text for all images to help screen readers understand the content.',
      impact: 'high',
      effort: 'easy'
    },
    'heading-order': {
      category: 'accessibility',
      title: 'Use Proper Heading Hierarchy',
      description: 'Structure headings logically (h1 → h2 → h3) to create a clear document outline for screen readers.',
      impact: 'medium',
      effort: 'easy'
    },
    'link-name': {
      category: 'accessibility',
      title: 'Provide Descriptive Link Text',
      description: 'Use meaningful link text instead of "click here" or "read more" to help users understand link destinations.',
      impact: 'medium',
      effort: 'easy'
    }
  };

  private static readonly SEO_RECOMMENDATIONS: Record<string, Omit<Recommendation, 'id'>> = {
    'document-title': {
      category: 'seo',
      title: 'Add a Descriptive Title',
      description: 'Include a unique, descriptive title for each page that accurately reflects the page content (50-60 characters).',
      impact: 'high',
      effort: 'easy'
    },
    'meta-description': {
      category: 'seo',
      title: 'Add Meta Description',
      description: 'Write compelling meta descriptions (150-160 characters) that summarize page content and encourage clicks.',
      impact: 'medium',
      effort: 'easy'
    },
    'structured-data': {
      category: 'seo',
      title: 'Add Structured Data',
      description: 'Implement JSON-LD structured data to help search engines understand your content better.',
      impact: 'medium',
      effort: 'moderate'
    },
    'robots-txt': {
      category: 'seo',
      title: 'Add robots.txt File',
      description: 'Create a robots.txt file to guide search engine crawlers and prevent indexing of sensitive pages.',
      impact: 'low',
      effort: 'easy'
    }
  };

  static generateRecommendations(
    auditResults: Record<string, AuditResult>,
    scores: { performance: number; accessibility: number; seo: number; bestPractices: number }
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Performance recommendations
    Object.entries(auditResults).forEach(([auditId, audit]) => {
      const perfRec = this.PERFORMANCE_RECOMMENDATIONS[auditId];
      if (perfRec && audit.score !== undefined && audit.score < 0.9) {
        recommendations.push({
          id: `perf-${auditId}`,
          auditId,
          score: audit.score,
          ...perfRec
        });
      }

      const a11yRec = this.ACCESSIBILITY_RECOMMENDATIONS[auditId];
      if (a11yRec && audit.score !== undefined && audit.score < 0.9) {
        recommendations.push({
          id: `a11y-${auditId}`,
          auditId,
          score: audit.score,
          ...a11yRec
        });
      }

      const seoRec = this.SEO_RECOMMENDATIONS[auditId];
      if (seoRec && audit.score !== undefined && audit.score < 0.9) {
        recommendations.push({
          id: `seo-${auditId}`,
          auditId,
          score: audit.score,
          ...seoRec
        });
      }
    });

    // General recommendations based on scores
    if (scores.performance < 50) {
      recommendations.push({
        id: 'general-performance',
        category: 'performance',
        title: 'Critical Performance Issues Detected',
        description: 'Your site has significant performance issues. Focus on optimizing images, reducing JavaScript, and improving server response times.',
        impact: 'high',
        effort: 'hard'
      });
    }

    if (scores.accessibility < 70) {
      recommendations.push({
        id: 'general-accessibility',
        category: 'accessibility',
        title: 'Accessibility Improvements Needed',
        description: 'Improve accessibility by adding alt text, ensuring proper color contrast, and using semantic HTML elements.',
        impact: 'high',
        effort: 'moderate'
      });
    }

    if (scores.seo < 70) {
      recommendations.push({
        id: 'general-seo',
        category: 'seo',
        title: 'SEO Optimization Required',
        description: 'Improve SEO by adding proper meta tags, optimizing page titles, and implementing structured data.',
        impact: 'medium',
        effort: 'easy'
      });
    }

    // Sort by impact (high first) then effort (easy first)
    return recommendations.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      const effortOrder = { easy: 0, moderate: 1, hard: 2 };
      
      const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
      if (impactDiff !== 0) return impactDiff;
      
      return effortOrder[a.effort] - effortOrder[b.effort];
    });
  }

  static getRecommendationsByCategory(recommendations: Recommendation[]): Record<string, Recommendation[]> {
    return recommendations.reduce((acc, rec) => {
      if (!acc[rec.category]) {
        acc[rec.category] = [];
      }
      acc[rec.category].push(rec);
      return acc;
    }, {} as Record<string, Recommendation[]>);
  }

  static getPriorityRecommendations(recommendations: Recommendation[], limit: number = 5): Recommendation[] {
    return recommendations
      .filter(rec => rec.impact === 'high')
      .slice(0, limit);
  }
}