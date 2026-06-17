import { useRef } from "react";

export function Dormant() {
  const rootRef = useRef<HTMLElement | null>(null);

  return (
    <section
      ref={rootRef}
      className="dormant-state"
      aria-label="Dormant"
    ></section>
  );
}
