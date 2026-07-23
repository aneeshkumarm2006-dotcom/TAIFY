"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const LEAD = ["There's", "an", "AI", "for"];
const WORDS = ["you", "your class", "your startup", "whatever you're doing"];
const EASE = [0.22, 1, 0.36, 1] as const;

export function AnimatedHeadline() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((p) => (p + 1) % WORDS.length), 2600);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <h1 className="mx-auto max-w-4xl text-balance text-[clamp(36px,7vw,72px)] font-extrabold leading-[1.02] tracking-[-0.045em]">
      {LEAD.map((w, idx) => (
        <motion.span
          key={idx}
          className="mr-[0.25em] inline-block"
          initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: EASE, delay: idx * 0.08 }}
        >
          {w}
        </motion.span>
      ))}
      <span className="relative inline-block align-bottom">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={WORDS[i]}
            className="inline-block whitespace-nowrap text-accent"
            initial={reduce ? false : { opacity: 0, y: "0.5em" }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: "-0.5em" }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            {WORDS[i]}
          </motion.span>
        </AnimatePresence>
        <motion.span
          aria-hidden
          className="absolute -bottom-[0.06em] left-0 h-[0.09em] w-full origin-left rounded-full bg-accent"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: LEAD.length * 0.08 + 0.2 }}
        />
      </span>
      <span>.</span>
    </h1>
  );
}
