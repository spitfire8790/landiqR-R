import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";

export const metadata: Metadata = {
  title: "Land iQ - Roles and Responsibilities",
  description:
    "Allocate program based responsibilities for Land iQ digital project",
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
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
