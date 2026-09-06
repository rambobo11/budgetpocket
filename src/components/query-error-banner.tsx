type QueryErrorBannerProps = {
  message: string | null;
  className?: string;
};

export function QueryErrorBanner({
  message,
  className = "",
}: QueryErrorBannerProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className={`rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400 ${className}`}
    >
      {message}
    </p>
  );
}
