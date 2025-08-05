import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

import { Navbar } from "@/components/ui/navbar";
import { ClerkProvider } from '@clerk/nextjs';
import { GoogleFontsLoader } from "@/components/tiptap/GoogleFonts";
import { ThemeProvider } from "@/lib/ThemeProvider";
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GenAI DataVis",
  description: "Data visualization with AI",
};
 
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <ClerkProvider>
        <body
          className={`${openSans.variable} antialiased font-sans`}
          style={{ fontFamily: "var(--font-open-sans), sans-serif" }}
        >
          <ThemeProvider>
            <GoogleFontsLoader />
            {/* <Navbar /> */}
            {children}
          </ThemeProvider>
        </body>
      </ClerkProvider>
    </html>
  );
}
