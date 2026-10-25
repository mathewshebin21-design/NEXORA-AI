import { redirect } from "next/navigation";
import { GROWTH_BASE } from "@/lib/screens";

export default function Page() {
  redirect(`${GROWTH_BASE}/overview`);
}
