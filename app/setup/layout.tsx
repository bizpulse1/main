export default function SetupLayout({ children }: { children: React.ReactNode }) {
  // No GameNav here — onboarding is linear and most game systems aren't
  // unlocked yet, so a full nav would mostly link to screens that would
  // just redirect back. Desktop still gets the same width/frame
  // treatment as everywhere else.
  return (
    <div className="md:max-w-3xl md:mx-auto md:min-h-dvh md:border-x md:border-bp-border">
      {children}
    </div>
  );
}
