import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { render } from "@/test/test-utils";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useTheme } from "next-themes";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("ThemeSwitcher", () => {
  it("renders all theme buttons", () => {
    const mockSetTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      resolvedTheme: "light",
    } as any);

    render(<ThemeSwitcher />);

    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("calls setTheme with 'dark' when dark button is clicked", () => {
    const mockSetTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      resolvedTheme: "light",
    } as any);

    render(<ThemeSwitcher />);

    const darkButton = screen.getByText("Dark");
    fireEvent.click(darkButton);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme with 'light' when light button is clicked", () => {
    const mockSetTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      resolvedTheme: "dark",
    } as any);

    render(<ThemeSwitcher />);

    const lightButton = screen.getByText("Light");
    fireEvent.click(lightButton);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("calls setTheme with 'system' when system button is clicked", () => {
    const mockSetTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      resolvedTheme: "light",
    } as any);

    render(<ThemeSwitcher />);

    const systemButton = screen.getByText("System");
    fireEvent.click(systemButton);

    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("highlights the active theme button", () => {
    const mockSetTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      resolvedTheme: "dark",
    } as any);

    const { container } = render(<ThemeSwitcher />);

    const darkButton = screen.getByText("Dark").closest("button");
    // Check that the dark button has the primary background color (bg-primary)
    expect(darkButton?.getAttribute("class")).toContain("bg-primary");

    const lightButton = screen.getByText("Light").closest("button");
    // Light button should have outline variant which doesn't have bg-primary
    expect(lightButton?.getAttribute("class")).not.toContain("bg-primary");
  });
});
