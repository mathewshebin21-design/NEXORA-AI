import { CommandShell } from "@/components/command/Shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CommandShell>{children}</CommandShell>;
}
