/* Quick shim so `import foo from '@/data/file.json'` has type `any` */

declare module '*.json' {
  const value: any;
  export default value;
}

// Minimal types for Bun's test runner so TypeScript can resolve imports like
// `import { test, expect } from 'bun:test'` in our tests. These are lightweight
// shims and do not attempt to fully model Bun's API.
declare module 'bun:test' {
  export const test: (...args: any[]) => any;
  export const expect: (...args: any[]) => any;
}
