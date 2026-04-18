/**
 * Lighthouse CI configuration (Phase 5b — Production Quality Targets)
 *
 * Runs against the static built dist directory so no server is required.
 * Phase 5b targets: Performance ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 90
 * Core Web Vitals: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms
 */

/** @type {import('@lhci/cli').LighthouseConfig} */
export default {
  ci: {
    collect: {
      staticDistDir: "./dist",
      numberOfRuns: 3,
    },
    assert: {
      preset: "lighthouse:no-pwa",
      assertions: {
        // Phase 5b: Production quality thresholds
        "categories:performance": ["warn", { minScore: 0.9 }],
        "categories:accessibility": ["warn", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.95 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
        // Core Web Vitals
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        // Disabled for CI static serving
        "is-on-https": "off",
        "redirects-http": "off",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-reports",
    },
  },
};
