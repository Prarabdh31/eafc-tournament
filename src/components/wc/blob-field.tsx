/**
 * Decorative background matching the official FIFA World Cup 26 identity:
 * flat, saturated, overlapping "blob" shapes bleeding in from the edges,
 * with a calm dark center where real content sits. Fixed to the viewport
 * so it stays put behind scrolling pages (Draft/Admin) as well as the
 * fixed-height Home Display.
 */
export function WcBlobField() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[var(--background)]">
      <div className="absolute -left-[30%] -top-[34%] size-[52vmax] rounded-[58%_42%_37%_63%/55%_38%_62%_45%] bg-[#2E45D6]" />
      <div className="absolute -right-[34%] -top-[38%] size-[48vmax] rounded-[42%_58%_63%_37%/48%_58%_42%_52%] bg-[#FF8A6B]" />
      <div className="absolute right-[4%] top-[6%] size-[7vmax] rounded-full bg-[#FFD23F]" />
      <div className="absolute -right-[32%] top-[32%] size-[30vmax] rounded-[55%_45%_40%_60%/50%_40%_60%_50%] bg-[#E2231A] opacity-90" />
      <div className="absolute -bottom-[36%] -left-[26%] size-[50vmax] rounded-[45%_55%_60%_40%/60%_45%_55%_40%] bg-[#3DBB5E]" />
      <div className="absolute -bottom-[30%] left-[30%] size-[36vmax] rounded-[50%_50%_35%_65%/45%_55%_50%_50%] bg-[#4FE0C0] opacity-95" />
    </div>
  );
}
