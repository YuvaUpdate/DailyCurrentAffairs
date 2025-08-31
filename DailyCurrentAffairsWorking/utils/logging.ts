// Structured logging helper. By default, in production we silence verbose
// logs (log/debug/info) to reduce noise and improve performance. In dev
// builds the original console methods remain available.

const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : false;

type LogMethod = (...args: any[]) => void;

const originalConsole = {
  log: console.log.bind(console) as LogMethod,
  debug: console.debug ? console.debug.bind(console) as LogMethod : console.log.bind(console) as LogMethod,
  info: console.info ? console.info.bind(console) as LogMethod : console.log.bind(console) as LogMethod,
  warn: console.warn.bind(console) as LogMethod,
  error: console.error.bind(console) as LogMethod,
};

// If not in dev, replace verbose methods with no-ops to avoid flooding logs
if (!isDev) {
  const noop = () => {};
  console.log = noop as any;
  console.debug = noop as any;
  console.info = noop as any;
}

export const logger = {
  log: (...args: any[]) => { console.log(...args); },
  debug: (...args: any[]) => { console.debug(...args); },
  info: (...args: any[]) => { console.info(...args); },
  warn: (...args: any[]) => { console.warn(...args); },
  error: (...args: any[]) => { console.error(...args); },
};

// For dev-time interactive debugging we allow restoring the original methods
export function enableVerboseLogging() {
  if (!isDev) return; // no-op in production
  console.log = originalConsole.log as any;
  console.debug = originalConsole.debug as any;
  console.info = originalConsole.info as any;
}

// Also expose a method to programmatically silence verbose logs at runtime
export function disableVerboseLogging() {
  if (!isDev) return;
  const noop = () => {};
  console.log = noop as any;
  console.debug = noop as any;
  console.info = noop as any;
}
