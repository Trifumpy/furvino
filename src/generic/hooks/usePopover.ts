import { useCallback, useRef, useState } from "react";

export function usePopover<T extends HTMLElement>() {
  const popoverRef = useRef<T>(null);

  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    ref: popoverRef,
    isOpen,
    open,
    close,
  };
}
