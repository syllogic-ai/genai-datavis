"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TagItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  category?: string
  description?: string
}

interface TagItemProps {
  item: TagItem
  onRemove?: (id: string) => void
  variant?: "default" | "secondary" | "outline" | "success"
  size?: "sm" | "default" | "lg"
  className?: string
  showRemove?: boolean
}

export function TagItemComponent({
  item,
  onRemove,
  variant = "secondary",
  size = "default",
  className,
  showRemove = true,
}: TagItemProps) {
  const Icon = item.icon

  const sizeClasses = {
    sm: "h-6 px-2 text-xs gap-1",
    default: "h-7 px-2.5 text-xs gap-1.5",
    lg: "h-8 px-3 text-sm gap-2",
  }

  return (
    <Badge
      variant={variant}
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-all hover:shadow-sm",
        sizeClasses[size],
        className
      )}
    >
      {Icon && (
        <Icon 
          className={cn(
            "shrink-0",
            size === "sm" ? "size-3" : size === "lg" ? "size-4" : "size-3.5"
          )} 
        />
      )}
      <span className="truncate">{item.label}</span>
      {showRemove && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 hover:bg-destructive/20 hover:text-destructive rounded-full",
            size === "sm" ? "size-4" : size === "lg" ? "size-5" : "size-4"
          )}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove(item.id)
          }}
        >
          <X className={cn(
            size === "sm" ? "size-2.5" : size === "lg" ? "size-3" : "size-2.5"
          )} />
          <span className="sr-only">Remove {item.label}</span>
        </Button>
      )}
    </Badge>
  )
}