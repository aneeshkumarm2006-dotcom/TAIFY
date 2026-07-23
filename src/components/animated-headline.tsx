"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const LEAD = "There's an AI for ";
const WORDS = ["you", "your class", "your startup", "whatever you're doing"];
const EASE = [0.22, 1, 0.36, 1] as const;
const STEP = 0.028; // per-character delay

/** Splits text into characters, each fading in left → right. */
function Chars({ text, base = 0 }: { text: string; base?: number }) {
  const reduce = useReducedMotion();
  return (
    <>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={reduce ? false : { opacity: 0, x: -8, filter: "blur(4px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.38, ease: EASE, delay: base + i * STEP }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </>
  );
}

export function AnimatedHeadline() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((p) => (p + 1) % WORDS.length), 2800);
    return () => clearInterval(t);
  }, [reduce]);

  const leadDelayEnd = LEAD.length * STEP;

  return (
    <h1 className="mx-auto max-w-4xl text-balance text-[clamp(36px,7vw,72px)] font-extrabold leading-[1.04] tracking-[-0.045em]">
      <Chars text={LEAD} />
      <span className="relative inline-block align-bottom">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={WORDS[i]}
            className="inline-block whitespace-nowrap text-accent"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            {/* base 0 so each new word types in left→right on every swap */}
            <Chars text={WORDS[i]} />
          </motion.span>
        </AnimatePresence>
        <motion.span
          aria-hidden
          className="absolute -bottom-[0.06em] left-0 h-[0.09em] w-full origin-left rounded-full bg-accent"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: leadDelayEnd + 0.15 }}
        />
      </span>
      <span>.</span>
    </h1>
  );
}
