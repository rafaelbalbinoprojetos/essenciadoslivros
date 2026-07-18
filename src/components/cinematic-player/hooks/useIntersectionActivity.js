import { useEffect, useState } from "react";

export function useIntersectionActivity(ref, enabled = true) {
  const [active, setActive] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setActive(false);
      return undefined;
    }

    const updateVisibility = () => {
      if (document.visibilityState === "hidden") setActive(false);
    };

    document.addEventListener("visibilitychange", updateVisibility);

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setActive(document.visibilityState !== "hidden");
      return () => document.removeEventListener("visibilitychange", updateVisibility);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting && document.visibilityState !== "hidden"),
      { threshold: 0.08 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [enabled, ref]);

  return active;
}

