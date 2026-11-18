import type { ReactNode } from "react";

import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

/** Coquille commune : barre latérale sur desktop, navigation pilule sur mobile. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <main className="flex-1 px-4 pb-28 pt-4 md:px-12 md:pb-12 md:pt-8">
        <div className="mx-auto max-w-3xl md:max-w-5xl">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
