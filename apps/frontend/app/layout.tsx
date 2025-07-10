import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

import { Navbar } from "@/components/ui/navbar";
import { ClerkProvider } from '@clerk/nextjs';

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
      <ClerkProvider>
        <body
          className={`${openSans.variable} antialiased font-sans`}
          style={{ fontFamily: "var(--font-open-sans), sans-serif" }}
        >
          {/* <Navbar /> */}
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
