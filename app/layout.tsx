import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

import { Navbar } from "@/components/ui/navbar";
import { GoogleFontsLoader } from "@/components/tiptap/GoogleFonts";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { PostHogProvider } from "@/components/PostHogProvider";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Syllogic",
  description: "Data visualization with AI",
};
 
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Set dynamic viewport height for mobile browsers
              function setVh() {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', vh + 'px');
              }
              
              // Set initial value
              setVh();
              
              // Update on resize (handles mobile browser UI changes)
              window.addEventListener('resize', setVh);
              window.addEventListener('orientationchange', setVh);
            `,
          }}
        />
      </head>
      <body
        className={`${openSans.variable} antialiased font-sans`}
        style={{ fontFamily: "var(--font-open-sans), sans-serif" }}
      >
        <PostHogProvider>
          <ThemeProvider>
            <GoogleFontsLoader />
            {/* <Navbar /> */}
            {children}
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}