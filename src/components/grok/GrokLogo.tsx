export function GrokMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="3" />
      <path d="M8 42 L40 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function GrokWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-foreground ${className}`}>
      <GrokMark className="h-8 w-8" />
      <span className="text-2xl font-semibold tracking-tight">Grok</span>
    </div>
  );
}
