// Force React and react-reconciler (pulled in by Ink) to load their *production*
// builds. Both package entry points branch on process.env.NODE_ENV at import
// time. The *development* build of react-reconciler calls performance.measure()
// on every render to feed the React DevTools "Performance Track"; in a long-lived
// TUI that re-renders every second (faster with +) those entries pile up in the
// global perf_hooks buffer forever — a genuine memory leak (RSS climbs into the
// GBs) that surfaces as a MaxPerformanceEntryBufferExceededWarning. Loading the
// production build avoids the instrumentation entirely.
//
// This must run before the first React/Ink import is evaluated, so cli.tsx
// imports it on its very first line. We only set it when unset, so a developer
// can still opt into the dev build with `NODE_ENV=development lattice`.
if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";
