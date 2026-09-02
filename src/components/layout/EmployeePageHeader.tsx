"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface EmployeePageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: ReactNode;
}

export function EmployeePageHeader({
  eyebrow,
  title,
  subtitle,
  backHref = "/",
  right,
}: EmployeePageHeaderProps) {
  return (
    <header className="tt-yellow-paper relative overflow-hidden border-b border-black/20 px-4 pb-5 pt-5 text-black">
      <div className="mx-auto flex max-w-[470px] items-start gap-3">
        <Link
          href={backHref}
          className="tt-retro-control mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-black/70 bg-[#ffc62c]/75 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)]"
          aria-label="กลับหน้าแรก"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-black/55">
            {eyebrow}
          </p>
          <h1 className="mt-0.5 text-[25px] font-black leading-tight tracking-[-0.045em]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 truncate text-[12px] font-bold text-black/55">
              {subtitle}
            </p>
          )}
        </div>

        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}
