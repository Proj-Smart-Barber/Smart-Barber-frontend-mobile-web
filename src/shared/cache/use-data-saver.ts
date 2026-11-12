import { useEffect, useState } from 'react';

interface Connection extends EventTarget {
  saveData?: boolean;
  effectiveType?: string;
}
export function useDataSaver(): boolean {
  const read = () => {
    if (typeof navigator === 'undefined') return false;
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    return (
      process.env.EXPO_PUBLIC_DATA_SAVER === 'true' ||
      connection?.saveData === true ||
      ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')
    );
  };
  const [enabled, setEnabled] = useState(read);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => setEnabled(read());
    connection?.addEventListener?.('change', update);
    return () => connection?.removeEventListener?.('change', update);
  }, []);
  return enabled;
}
