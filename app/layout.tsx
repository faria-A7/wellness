import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wellness - Track your mood & habits",
  description: "Personal wellness tracking app",
};

const themeScript = `
  try {
    const theme = localStorage.getItem('wellness-theme');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
