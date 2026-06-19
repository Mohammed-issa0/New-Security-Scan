'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface AnimatedProgressBarProps {
  value: number | null | undefined;
  isTerminal?: boolean;
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
}

function clampProgress(value: number, isTerminal: boolean): number {
  if (isTerminal) {
    return 100;
  }

  const safe = Number.isFinite(value) ? value : 0;
  return Math.min(99, Math.max(0, safe));
}

function smoothProgressChange(previous: number, next: number): number {
  if (next >= previous) {
    return next;
  }

  return Math.max(next, previous - 5);
}

export function AnimatedProgressBar({
  value,
  isTerminal = false,
  className = '',
  barClassName = '',
  showLabel = true,
}: AnimatedProgressBarProps) {
  const target = clampProgress(value ?? 0, isTerminal);
  const previousRef = useRef(target);
  const [displayValue, setDisplayValue] = useState(target);

  useEffect(() => {
    const smoothed = smoothProgressChange(previousRef.current, target);
    previousRef.current = smoothed;
    setDisplayValue(smoothed);
  }, [target]);

  const label = isTerminal ? '100' : displayValue.toFixed(displayValue % 1 === 0 ? 0 : 1);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`h-2 flex-1 overflow-hidden rounded-full bg-white/10 ${barClassName}`}>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
          initial={false}
          animate={{ width: `${displayValue}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {showLabel ? (
        <span className="min-w-[2.5rem] text-right text-xs font-semibold text-text-secondary">
          {label}%
        </span>
      ) : null}
    </div>
  );
}
