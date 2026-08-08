"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrivacy } from "@/components/privacy-provider";
import { Button } from "@/components/ui/button";

type PrivacyToggleProps = {
  /** plus grand, à côté d’un titre / total */
  prominent?: boolean;
};

export function PrivacyToggle({ prominent = false }: PrivacyToggleProps) {
  const { hidden, toggle } = usePrivacy();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={
        prominent
          ? "size-10 shrink-0 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          : "size-9 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }
      aria-label={hidden ? "Afficher les montants" : "Masquer les montants"}
      title={hidden ? "Afficher les montants" : "Masquer les montants"}
    >
      {hidden ? (
        <EyeOff className={prominent ? "size-5" : "size-4"} />
      ) : (
        <Eye className={prominent ? "size-5" : "size-4"} />
      )}
    </Button>
  );
}
