"use client";

import { useEffect, useRef, useState } from "react";

export function useHoverOrTap<T extends HTMLElement, P extends HTMLElement = HTMLElement>() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<T>(null);
  const popoverRef = useRef<P>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hoverCapable = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

  const cancelClose = () => clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    if (!hoverCapable()) return;
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insidePopover = popoverRef.current?.contains(target);
      if (!insideTrigger && !insidePopover) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const triggerProps = {
    onMouseEnter: () => {
      if (!hoverCapable()) return;
      cancelClose();
      setOpen(true);
    },
    onMouseLeave: scheduleClose,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen((o) => !o);
    },
  };

  const popoverHoverProps = {
    onMouseEnter: cancelClose,
    onMouseLeave: scheduleClose,
  };

  return { open, setOpen, containerRef, popoverRef, triggerProps, popoverHoverProps };
}
