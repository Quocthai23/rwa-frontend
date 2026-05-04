export function BodyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <body className="text-foreground bg-background antialiased">
      <div className="bg-background flex justify-center">
        <div className="text-foreground bg-background border-border w-full max-w-[var(--experience-shell-max-width)] px-[var(--experience-shell-padding-inline)] lg:max-w-none lg:px-0">
          {children}
        </div>
      </div>
    </body>
  );
}
