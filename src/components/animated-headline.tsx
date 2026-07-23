"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const LEAD = "There's an AI for";
const WORDS = ["you", "your class", "your startup", "whatever you're doing"];
const EASE = [0.22, 1, 0.36, 1] as const;
const STEP = 0.03; // per-character delay

/**
 * Renders text with each character fading in left → right, but keeps whole
 * words unbreakable so "for" never splits across a line.
 */
function Chars({ text, base = 0 }: { text: string; base?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  let idx = 0; // running character index for a continuous left→right sweep

  return (
    <>
      {words.map((word, wi) => {
        const chars = word.split("").map((ch) => {
          const delay = base + idx * STEP;
          idx += 1;
          return (
            <motion.span
              key={`${wi}-${idx}`}
              className="inline-block"
              initial={reduce ? false : { opacity: 0, x: -8, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.38, ease: EASE, delay }}
            >
              {ch}
            </motion.span>
          );
        });
        idx += 1; // account for the space
        return (
          <span key={wi}>
            <span className="inline-block whitespace-nowrap">{chars}</span>
            {wi < words.length - 1 ? " " : ""}
          </span>
        );
      })}
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
    <h1 className="mx-auto max-w-4xl text-balance text-[clamp(36px,7vw,72px)] font-extrabold leading-[1.06] tracking-[-0.045em]">
      <Chars text={LEAD} />{" "}
      <span className="relative inline-block whitespace-nowrap align-bottom">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={WORDS[i]}
            className="inline-block whitespace-nowrap text-accent"
            initial={reduce ? false : { opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: EASE }}
          >
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
