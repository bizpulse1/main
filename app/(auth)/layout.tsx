export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:max-w-3xl md:mx-auto md:min-h-dvh md:border-x md:border-bp-border">
      {children}
    </div>
  );
}
