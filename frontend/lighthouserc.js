/**
 * Lighthouse CI configuration (Phase 3a — Performance Metrics)
 *
 * Runs against the static built dist directory so no server is required.
 * Thresholds are intentionally relaxed for initial baseline measurement.
 * Tighten after the first successful CI run establishes a baseline.
 */

/** @type {import('@lhci/cli').LighthouseConfig} */
export default {
  ci: {
    collect: {
      // Analyze the built static files without needing a running server
      staticDistDir: "./dist",
      // Measure 3 times to reduce noise
      numberOfRuns: 3,
    },
    assert: {
      preset: "lighthouse:no-pwa",
      assertions: {
        // Phase 3a: Baseline thresholds — tighten in Phase 3b after first pass
        "categories:performance": ["warn", { minScore: 0.7 }],
        "categories:accessibility": ["warn", { minScore: 0.8 }],
        "categories:best-practices": ["warn", { minScore: 0.8 }],
        "categories:seo": ["warn", { minScore: 0.7 }],
        // Core Web Vitals
        "first-contentful-paint": ["warn", { maxNumericValue: 3000 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 4000 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        // Block only on critical failures
        "is-on-https": "off", // disabled for local/CI static serving
        "redirects-http": "off",
      },
    },
    upload: {
      // Store reports as GitHub Actions artifacts (no server required)
      target: "filesystem",
      outputDir: "./lighthouse-reports",
    },
  },
};
