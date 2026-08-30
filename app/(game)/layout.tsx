import { Suspense } from "react";
import { GameNav } from "@/components/GameNav";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* useSearchParams (inside GameNav) requires a Suspense boundary in
          the App Router, or Next.js opts the whole route out of static
          optimization with a build warning. */}
      <Suspense fallback={null}>
        <GameNav />
      </Suspense>
      {/* pb-20 clears the fixed mobile bottom tab bar. md:pl-64 offsets
          content past the fixed desktop sidebar (same width, w-64).
          The inner max-width keeps content readable on very wide
          screens instead of stretching edge-to-edge next to the
          sidebar. */}
      <div className="pb-20 md:pb-0 md:pl-64">
        <div className="md:max-w-3xl">{children}</div>
      </div>
    </>
  );
}
