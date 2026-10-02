import { SplitbarkMark } from "@/components/splitbark-mark";
import type { ReactNode } from "react";

export function BrandIllustration(): ReactNode {
  return (
    <div
      className="relative flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-secondary/45"
      aria-hidden="true"
    >
      <svg viewBox="0 0 288 192" fill="none" className="h-full w-full text-primary">
        <ellipse cx="144" cy="159" rx="95" ry="9" className="fill-primary/5" />
        <g transform="rotate(-9 116 91)">
          <path
            d="M70 28H157V153L147 147L137 153L127 147L117 153L107 147L97 153L87 147L77 153L70 149Z"
            className="fill-card"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M87 54H137M87 88H137M87 103H119M87 130H109"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M87 72H115" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          <path
            d="M124 128L128 132L136 123"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <path
          d="M178 55C198 61 210 75 214 94"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 6"
        />
        <circle cx="210" cy="125" r="23" className="fill-secondary" stroke="currentColor" strokeWidth="2" />
        <circle cx="210" cy="125" r="17" stroke="currentColor" strokeWidth="1" className="text-primary/35" />
        <path
          d="M204 114V135M200 117H212C222 117 222 125 212 125H204M204 125H213C223 125 223 133 213 133H200M208 111V117M213 111V117M208 133V139M213 133V139"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M45 55V65M40 60H50M242 67V75M238 71H246"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary/35"
        />
      </svg>
      <SplitbarkMark className="absolute top-5 right-12 size-16 -rotate-6" />
    </div>
  );
}
