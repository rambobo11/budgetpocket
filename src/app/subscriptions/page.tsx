import { getSubscriptions } from "@/lib/data/queries";
import { requireUserOrRedirect } from "@/lib/security/auth";
import { SubscriptionsView } from "@/components/subscriptions-view";

export default async function SubscriptionsPage() {
  await requireUserOrRedirect();
  const items = await getSubscriptions();
  return <SubscriptionsView initialItems={items} />;
}
