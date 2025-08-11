import { getImmediate, Updater } from "@lib/setters";
import { useCallback, useRef, useState } from "react";

export function useStateRef<T>(initialValue: T | (() => T)) {
  const [state, setState] = useState<T>(initialValue);
  const stateRef = useRef(state);

  const setStateWithRef = useCallback((updater: Updater<T>) => {
    setState((prevState) => {
      const result = getImmediate(updater, prevState);
      stateRef.current = result;
      return result;
    });
  }, []);

  return [state, setStateWithRef, stateRef] as const;
}
