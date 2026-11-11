'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplitFlapCharProps {
  char: string;
}

function SplitFlapChar({ char }: SplitFlapCharProps) {
  return (
    <div className="relative inline-flex flex-col items-center justify-center w-7 h-10 bg-coal text-amber-300 font-mono text-xl font-bold rounded-sm border border-black shadow-inner select-none overflow-hidden mx-[1px]">
      {/* Top half */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-[#1e222a] border-b border-black/80 flex items-end justify-center overflow-hidden">
        <span className="translate-y-[50%]">{char}</span>
      </div>

      {/* Bottom half */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#15181f] flex items-start justify-center overflow-hidden">
        <span className="-translate-y-[50%]">{char}</span>
      </div>

      {/* Split crease line */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/70 z-10" />

      {/* Flip animation flap */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={char}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          {/* subtle shine */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface SplitFlapDisplayProps {
  text: string;
  padLength?: number;
  label?: string;
}

export function SplitFlapDisplay({ text, padLength = 10, label }: SplitFlapDisplayProps) {
  const padded = text.toUpperCase().padEnd(padLength, ' ').slice(0, padLength);
  const chars = padded.split('');

  return (
    <div className="inline-flex flex-col items-start bg-navy-dark p-3 rounded-lg border-2 border-brass/50 shadow-md">
      {label && (
        <span className="text-[10px] font-mono tracking-widest text-brass uppercase mb-1">
          {label}
        </span>
      )}
      <div className="flex items-center">
        {chars.map((c, i) => (
          <SplitFlapChar key={i} char={c} />
        ))}
      </div>
    </div>
  );
}
