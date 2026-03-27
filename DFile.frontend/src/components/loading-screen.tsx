"use client";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading…" }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">

      {/* Background ambient glows — mirrors the login left-panel aesthetic */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[140px] dark:bg-blue-800/20" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[140px] dark:bg-indigo-900/25" />
      </div>

      {/* Logo + spinner stack */}
      <div className="relative z-10 flex flex-col items-center gap-8">

        {/* Pulsing ring around logo */}
        <div className="relative flex items-center justify-center">
          {/* Outer ring */}
          <span
            className="absolute inline-flex h-36 w-36 rounded-full bg-blue-500/10 dark:bg-blue-400/10"
            style={{ animation: "ping-slow 2.4s cubic-bezier(0,0,0.2,1) infinite" }}
          />
          {/* Middle ring */}
          <span
            className="absolute inline-flex h-24 w-24 rounded-full bg-blue-500/15 dark:bg-blue-400/15"
            style={{ animation: "ping-slow 2.4s cubic-bezier(0,0,0.2,1) infinite 0.4s" }}
          />

          {/* Logo container */}
          <div
            className="relative flex items-center justify-center rounded-2xl bg-white dark:bg-[#0f172a] shadow-xl p-5"
            style={{ animation: "float 3s ease-in-out infinite" }}
          >
            {/* Light logo */}
            <img
              src="/AMS.svg"
              alt="DFile AMS"
              className="h-16 w-auto dark:hidden select-none"
              draggable={false}
            />
            {/* Dark logo */}
            <img
              src="/AMS_dark.svg"
              alt="DFile AMS"
              className="h-16 w-auto hidden dark:block select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* Animated progress dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block h-2 w-2 rounded-full bg-blue-500/70 dark:bg-blue-400/70"
              style={{
                animation: `bounce-dot 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>

        {/* Status message */}
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          {message}
        </p>
      </div>

      {/* Keyframe definitions injected as a style tag */}
      <style>{`
        @keyframes ping-slow {
          0%   { transform: scale(1); opacity: 0.6; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
