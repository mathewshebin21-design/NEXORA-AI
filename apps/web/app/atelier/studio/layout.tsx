import { AtelierShell } from "@/components/atelier/Shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AtelierShell>{children}</AtelierShell>;
}
