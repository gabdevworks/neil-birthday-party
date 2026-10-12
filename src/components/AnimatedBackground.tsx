const particles = [
  { left: "8%", top: "18%", delay: "0s", size: 2 },
  { left: "16%", top: "72%", delay: "1.4s", size: 2 },
  { left: "24%", top: "34%", delay: "2.2s", size: 3 },
  { left: "31%", top: "84%", delay: "0.6s", size: 2 },
  { left: "42%", top: "16%", delay: "3s", size: 2 },
  { left: "48%", top: "62%", delay: "1.1s", size: 3 },
  { left: "57%", top: "28%", delay: "2.8s", size: 2 },
  { left: "63%", top: "78%", delay: "0.3s", size: 2 },
  { left: "71%", top: "22%", delay: "1.8s", size: 3 },
  { left: "78%", top: "58%", delay: "2.4s", size: 2 },
  { left: "86%", top: "36%", delay: "0.9s", size: 2 },
  { left: "91%", top: "80%", delay: "3.4s", size: 2 },
  { left: "12%", top: "48%", delay: "4s", size: 2 },
  { left: "36%", top: "46%", delay: "2s", size: 2 },
  { left: "68%", top: "48%", delay: "3.6s", size: 2 },
  { left: "52%", top: "88%", delay: "1.6s", size: 2 },
];

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-navy" />
      <div className="absolute -left-24 top-[-10%] h-[28rem] w-[28rem] rounded-full bg-electric/20 blur-3xl" />
      <div className="absolute -right-16 bottom-[-8%] h-[24rem] w-[24rem] rounded-full bg-cyan/10 blur-3xl" />
      <div className="digital-grid absolute inset-0" />
      {particles.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}`}
          className="particle"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            width: particle.size,
            height: particle.size,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(5,11,24,0.2)_40%,rgba(5,11,24,0.72))]" />
    </div>
  );
}
