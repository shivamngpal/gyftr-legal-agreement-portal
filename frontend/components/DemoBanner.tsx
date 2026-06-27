"use client";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function DemoBanner() {
  if (!isDemoMode) return null;

  return (
    <div className="bg-amber-400 text-amber-900 w-full px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm z-50 border-b border-amber-500">
      <span>⚠</span>
      <span>DEMO MODE</span>
      <span className="font-normal mx-1">—</span>
      <span className="font-normal">
        This portal is showing <strong>sample/presentation data</strong>. Not for live production use.
      </span>
    </div>
  );
}
