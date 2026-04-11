/**
 * Web Vitals reporting utility (Phase 3a — Performance Metrics)
 *
 * Measures Core Web Vitals and reports them to the console in development,
 * or to an analytics endpoint in production (extend onReport as needed).
 *
 * Metrics collected:
 *  - LCP  (Largest Contentful Paint) — loading performance
 *  - INP  (Interaction to Next Paint) — interactivity
 *  - CLS  (Cumulative Layout Shift)  — visual stability
 *  - TTFB (Time to First Byte)       — server response
 *  - FCP  (First Contentful Paint)   — perceived load speed
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

export type WebVitalsReporter = (metric: Metric) => void;

const defaultReporter: WebVitalsReporter = (metric) => {
  if (import.meta.env.DEV) {
    // In development: log to console for immediate feedback
    const rating = metric.rating ?? "unknown";
    console.debug(
      `[Web Vitals] ${metric.name}: ${Math.round(metric.value)}ms (${rating})`,
    );
  }
  // Production: extend here to send to analytics / OpenTelemetry endpoint
  // e.g. navigator.sendBeacon('/api/v1/metrics', JSON.stringify(metric))
};

export function reportWebVitals(onReport: WebVitalsReporter = defaultReporter): void {
  onCLS(onReport);
  onFCP(onReport);
  onINP(onReport);
  onLCP(onReport);
  onTTFB(onReport);
}
