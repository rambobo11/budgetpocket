import { getUpcoming } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { UpcomingView } from "@/components/upcoming-view";

export default async function UpcomingPage() {
  await requireUserOrRedirect();
  const items = await getUpcoming();
  return <UpcomingView initialItems={items} />;
}
