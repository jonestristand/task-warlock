'use client';

import { useEffect, useState } from 'react';

/**
 * Dates must be formatted in the browser: the server doesn't know the viewer's
 * locale or timezone, so server-rendered dates cause hydration mismatches.
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface ClientDateProps {
  date?: Date;
  format: (date: Date) => string;
}

/** Renders nothing on the server, then the formatted date once mounted. */
export function ClientDate({ date, format }: ClientDateProps) {
  const mounted = useHasMounted();
  return <>{mounted && date ? format(date) : ''}</>;
}
