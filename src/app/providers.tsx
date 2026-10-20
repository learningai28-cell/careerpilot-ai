import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/AuthContext";
import { setBillingNavigator } from "@/shared/lib/invokeFunction";
import { router } from "./router";

// Lets the free-plan-limit toast navigate without a hook (it fires outside React).
setBillingNavigator(() => router.navigate("/dashboard/billing"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
