export function LandingBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-[var(--public-brand-cream)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_93%_8%,rgba(38,98,231,.10),transparent_24%),radial-gradient(circle_at_7%_46%,rgba(254,150,199,.12),transparent_20%),radial-gradient(circle_at_78%_86%,rgba(254,213,1,.12),transparent_24%)]" />
      <div className="absolute -left-[18vw] top-[24%] h-[34vw] w-[34vw] rounded-full bg-[#FE96C7]/10 blur-3xl" />
      <div className="absolute -right-[16vw] bottom-[12%] h-[30vw] w-[30vw] rounded-full bg-[#2662E7]/10 blur-3xl" />
    </div>
  );
}
