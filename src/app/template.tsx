"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Re-mounts on every route change, so this enter animation plays on each
 * navigation — page→page, page→product, product→page, etc.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
