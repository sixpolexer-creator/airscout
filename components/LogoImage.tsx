"use client";

import { useEffect, useRef } from "react";

interface LogoImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function LogoImage({ src, alt, className }: LogoImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const isPulsingRef = useRef(false);
  const loadPhaseRef = useRef(true);
  const loadCountRef = useRef(0);

  const triggerPulse = () => {
    const el = imgRef.current;
    if (!el || isPulsingRef.current) return;
    isPulsingRef.current = true;
    el.classList.remove("logo-pulse-anim");
    void el.offsetHeight; // force reflow so animation restarts cleanly
    el.classList.add("logo-pulse-anim");
  };

  const handleAnimationEnd = () => {
    const el = imgRef.current;
    if (!el) return;
    el.classList.remove("logo-pulse-anim");
    isPulsingRef.current = false;
    if (loadPhaseRef.current) {
      loadCountRef.current += 1;
      if (loadCountRef.current < 2) {
        setTimeout(triggerPulse, 140);
      } else {
        loadPhaseRef.current = false;
      }
    }
  };

  useEffect(() => {
    const t = setTimeout(triggerPulse, 220);
    return () => clearTimeout(t);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      onAnimationEnd={handleAnimationEnd}
      onMouseEnter={() => {
        if (!loadPhaseRef.current) triggerPulse();
      }}
    />
  );
}
