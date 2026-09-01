export function LandingBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-[#fcf7ee]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_93%_8%,rgba(224,206,244,.58),transparent_24%),radial-gradient(circle_at_7%_46%,rgba(217,238,228,.52),transparent_20%),radial-gradient(circle_at_78%_86%,rgba(246,226,178,.46),transparent_24%)]" />
      <div className="absolute -left-[18vw] top-[24%] h-[34vw] w-[34vw] rounded-full bg-[#f4dfd2]/40 blur-3xl" />
      <div className="absolute -right-[16vw] bottom-[12%] h-[30vw] w-[30vw] rounded-full bg-[#dceade]/40 blur-3xl" />
    </div>
  );
}
