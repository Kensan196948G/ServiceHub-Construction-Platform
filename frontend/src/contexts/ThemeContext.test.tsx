import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to light theme when no preference stored", () => {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("applies dark class to html element when theme is dark", () => {
    localStorage.setItem("theme", "dark");

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggles from light to dark on toggleTheme", () => {
    localStorage.setItem("theme", "light");

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("toggles from dark to light on toggleTheme", () => {
    localStorage.setItem("theme", "dark");

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("persists theme to localStorage on toggle", () => {
    localStorage.setItem("theme", "light");

    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.toggleTheme();
    });

    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("respects prefers-color-scheme: dark when no stored preference", () => {
    window.matchMedia = (query: string) =>
      ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    // Suppress React error boundary noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      "useTheme must be used within ThemeProvider",
    );
    spy.mockRestore();
  });
});
