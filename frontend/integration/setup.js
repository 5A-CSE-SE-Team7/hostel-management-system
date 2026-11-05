import { configure } from '@testing-library/react';
// Real HTTP, MySQL and bcrypt run outside jsdom. Wait for the actual UI state;
// the default 1s mock-oriented poll budget is not a page-latency measurement.
// Performance benchmarks retain their independent, unchanged 3000ms threshold.
configure({ asyncUtilTimeout: 5000 });
