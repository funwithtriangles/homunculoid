import { useEffect, useRef } from "react";
import { engineRef } from "./App";

export const PerformanceStats = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const monitor = engineRef.performanceMonitor;
    if (ref.current && monitor) {
      ref.current.appendChild(monitor.dom);
      monitor.dom.setAttribute("style", "");
    }

    return () => {
      monitor?.dom.remove();
    };
  }, []);

  return <div ref={ref} style={{ position: "fixed", top: 0, right: 0 }} />;
};
