import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import ErrorBoundary from "@/components/ErrorBoundary";

import { BRAND_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${BRAND_NAME} - Roles and Responsibilities`,
  description: `Allocate program based responsibilities for ${BRAND_NAME} digital project`,
  generator: "v0.dev",
  icons: {
    icon: "/New_South_Wales_Government_logo.svg.png",
    shortcut: "/New_South_Wales_Government_logo.svg.png",
    apple: "/New_South_Wales_Government_logo.svg.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
