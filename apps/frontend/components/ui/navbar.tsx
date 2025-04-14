"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"

const routes = [
  { href: "/", label: "Home" },
  { href: "/chart-prompt", label: "Chart Generator" },
]

export function Navbar() {
  const pathname = usePathname()
  
  return (
    <nav className="border-b">
      <div className="container flex h-14 items-center px-4">
        <div className="mr-4 flex">
          <span className="text-xl font-bold">GenAI DataVis</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === route.href ? "text-foreground font-medium" : "text-foreground/60"
              )}
            >
              {route.label}
            </Link>
          ))}
          
          <SignedIn>
            <Link
              href="/dashboard"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/dashboard" ? "text-foreground font-medium" : "text-foreground/60"
              )}
            >
              Dashboard
            </Link>
          </SignedIn>
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Link href="/sign-in" className="text-sm font-medium transition-colors hover:text-foreground/80">
              Sign In
            </Link>
            <Link href="/sign-up" className="ml-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Sign Up
            </Link>
          </SignedOut>
        </div>
      </div>
    </nav>
  )
}