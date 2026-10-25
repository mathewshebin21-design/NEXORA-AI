import { redirect } from "next/navigation";
import { COMMAND_BASE } from "@/lib/screens";

export default function Page() {
  redirect(`${COMMAND_BASE}/bridge`);
}
