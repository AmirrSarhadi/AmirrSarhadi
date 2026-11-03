import { createContext, useContext, useEffect, useId } from "react";

export type Registration = { dirty: boolean; blocked: boolean };
type Guard = { run: (action: () => void) => void; register: (id: string, state: Registration) => () => void };
export const GuardContext = createContext<Guard>({ run: (action) => action(), register: () => () => undefined });

export const useNavigationGuard = () => useContext(GuardContext);
export function useUnsavedChanges(dirty: boolean, blocked = false) {
  const { register } = useNavigationGuard(); const id = useId();
  useEffect(() => register(id, { dirty, blocked }), [id, register, dirty, blocked]);
}
