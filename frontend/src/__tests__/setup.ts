import "@testing-library/jest-dom/vitest";

// Provide a stub for window.matchMedia which is not implemented in jsdom
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// EventSource is not implemented in jsdom — provide a no-op stub
if (typeof window !== "undefined" && !window.EventSource) {
  class EventSourceStub {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;
    readyState = 1;
    onopen: (() => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    constructor(_url: string) {}
    close() { this.readyState = 2; }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return false; }
  }
  Object.defineProperty(window, "EventSource", {
    writable: true,
    value: EventSourceStub,
  });
}

// Ensure localStorage is available for zustand persist middleware in jsdom
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.setItem) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}
