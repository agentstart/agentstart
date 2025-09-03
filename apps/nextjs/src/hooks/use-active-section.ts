// AGENT: Active section detection hook
// PURPOSE: Track which section is currently visible in viewport
// USAGE: const activeSection = useActiveSection(['hero', 'features', 'pricing'])
// FEATURES:
//   - Uses Intersection Observer API
//   - Customizable viewport trigger zone
//   - Automatic cleanup on unmount
// RETURNS: ID of currently visible section
// SEARCHABLE: active section, scroll spy, viewport tracking

"use client";

import { useEffect, useState } from "react";

// AGENT: Hook to detect active section based on scroll position
// CUSTOMIZATION: Adjust rootMargin to change trigger zone
export function useActiveSection(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px", // Trigger when section is in the upper portion of viewport
      },
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      sectionIds.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [sectionIds]);

  return activeSection;
}
