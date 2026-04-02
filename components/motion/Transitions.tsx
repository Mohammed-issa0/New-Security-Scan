'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function MotionSection({ 
  children, 
  className = "", 
  delay = 0 
}: { 
  children: ReactNode, 
  className?: string, 
  delay?: number 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export const sectionStagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const backgroundDrift = {
  animate: {
    x: [0, 18, 0],
    y: [0, -14, 0],
    scale: [1, 1.05, 1],
  },
  transition: {
    duration: 18,
    repeat: Infinity,
    repeatType: 'mirror' as const,
    ease: 'easeInOut',
  },
};

export const glowPulse = {
  animate: {
    opacity: [0.45, 0.8, 0.45],
    scale: [1, 1.06, 1],
  },
  transition: {
    duration: 8,
    repeat: Infinity,
    repeatType: 'mirror' as const,
    ease: 'easeInOut',
  },
};

export const networkFlow = {
  animate: {
    opacity: [0.08, 0.22, 0.08],
    strokeDashoffset: [0, -16],
  },
  transition: {
    duration: 8,
    repeat: Infinity,
    ease: 'linear',
  },
};

export const nodeHalo = {
  animate: {
    opacity: [0.35, 0.95, 0.35],
    scale: [1, 1.3, 1],
  },
  transition: {
    duration: 4.8,
    repeat: Infinity,
    repeatType: 'mirror' as const,
    ease: 'easeInOut',
  },
};

export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

export const buttonInteraction = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
};

