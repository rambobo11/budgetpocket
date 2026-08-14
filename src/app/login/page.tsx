import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-full flex-1 items-center justify-center px-5 py-12 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div className="absolute top-[calc(1.25rem+env(safe-area-inset-top))] right-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
            PocketBudget
          </p>
          <h1 className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Bienvenue
          </h1>
          <p className="mt-2 text-[15px] text-zinc-500 dark:text-zinc-400">
            Connectez-vous pour suivre vos dépenses.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
