import { useEffect, useState } from "react";
import { getCountdownParts, type CountdownParts } from "../utils/dateTime";

export function useCountdown(target: Date | null): CountdownParts {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target || Number.isNaN(target.getTime())) return;

    const tick = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= target.getTime()) window.clearInterval(tick);
    }, 1000);

    return () => window.clearInterval(tick);
  }, [target]);

  return getCountdownParts(target, now);
}
