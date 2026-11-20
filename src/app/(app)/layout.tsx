import { AppProvider } from "@/components/AppProvider";
import { Splash } from "@/components/Splash";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Splash />
      {children}
    </AppProvider>
  );
}
