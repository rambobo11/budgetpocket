import { BackupReminderBanner } from "@/components/backup-reminder-banner";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Même cadre sur iPhone et Mac :
 * - téléphone : largeur écran (max-w ne serre pas)
 * - Mac : ~900px centré (vue desktop stable au refresh)
 * - PWA iOS : safe-area (notch / Dynamic Island / home indicator)
 */
export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <main
      className={`mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col overflow-x-hidden px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-[calc(2rem+env(safe-area-inset-top))] md:px-8 md:pt-[calc(2.5rem+env(safe-area-inset-top))] md:pb-[calc(3rem+env(safe-area-inset-bottom))] ${className}`}
    >
      <BackupReminderBanner />
      {children}
    </main>
  );
}
