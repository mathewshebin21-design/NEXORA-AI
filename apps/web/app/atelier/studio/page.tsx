import { redirect } from "next/navigation";
import { ATELIER_BASE } from "@/lib/screens";

export default function Page() {
  redirect(`${ATELIER_BASE}/today`);
}
