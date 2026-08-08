import { BackupReminderBanner } from "@/components/backup-reminder-banner";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Même cadre sur iPhone et Mac :
 * - téléphone : largeur écran (max-w ne serre pas)
 * - Mac : ~900px centré (vue desktop stable au refresh)
 */
export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <main
      className={`mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col overflow-x-hidden px-4 pt-6 pb-8 sm:px-6 sm:pt-8 md:px-8 md:pt-10 md:pb-12 ${className}`}
    >
      <BackupReminderBanner />
      {children}
    </main>
  );
}
