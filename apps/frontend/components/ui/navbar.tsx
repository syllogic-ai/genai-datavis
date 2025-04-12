"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

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
        </div>
      </div>
    </nav>
  )
}