"use client";

import { motion } from "framer-motion";
import type { Team } from "@/lib/types/database";

const SIZE_CLASSES = {
  sm: "size-8 text-[10px] ring-2",
  md: "size-14 text-lg ring-4 sm:size-20",
  lg: "size-16 text-2xl ring-4 sm:size-24",
} as const;

/**
 * The flag itself IS the circle — cropped edge-to-edge with object-cover,
 * not floated inside a padded ring. Shared across Home Display, Draft
 * Room, and Control Panel so every "team" visual stays identical.
 */
export function TeamCrest({
  team,
  size = "md",
}: {
  team: Team | null | undefined;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = SIZE_CLASSES[size];

  if (!team) {
    return (
      <div
        className={`flex ${sizeClass} items-center justify-center rounded-full border-2 border-white/15 bg-white/5 text-white/40`}
      >
        ?
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.08 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`${sizeClass} overflow-hidden rounded-full ring-[#FFD23F]/50 shadow-[0_2px_14px_rgba(0,0,0,0.45)]`}
    >
      {team.crest_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.crest_url} alt={team.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#FF8A6B] font-bold text-black/80">
          {team.name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </motion.div>
  );
}
