import { useEffect } from "react";

/**
 * Apple-style cursor light effect for glass surfaces.
 * Updates CSS custom properties to create a subtle radial light
 * that follows the cursor, giving glass cards a refraction effect.
 * 
 * Only active on hover-capable devices (desktop).
 */
export function CursorLight() {
  useEffect(() => {
    // Only run on devices with fine pointer (mouse)
    const hasHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!hasHover) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;

      document.documentElement.style.setProperty("--cursor-x", `${x}%`);
      document.documentElement.style.setProperty("--cursor-y", `${y}%`);
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      // Reset to center on cleanup
      document.documentElement.style.setProperty("--cursor-x", "50%");
      document.documentElement.style.setProperty("--cursor-y", "50%");
    };
  }, []);

  return null;
}
