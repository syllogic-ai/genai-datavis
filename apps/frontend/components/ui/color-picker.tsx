"use client"

import { useState } from "react"
import { HexColorPicker } from "react-colorful"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface ColorPickerProps {
  label: string
  color: string
  onChange: (color: string) => void
}

function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

function isCssVariable(color: string): boolean {
  return color.startsWith("var(--")
}

export function ColorPicker({ label, color, onChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(isCssVariable(color) ? "#1f77b4" : color)
  const [hexInput, setHexInput] = useState(isCssVariable(color) ? "#1f77b4" : color)

  const handleColorChange = (newColor: string) => {
    setCustomColor(newColor)
    setHexInput(newColor)
    onChange(newColor)
  }

  const handleHexInputChange = (value: string) => {
    setHexInput(value)
    if (isValidHexColor(value)) {
      handleColorChange(value)
    }
  }

  return (
    <div className="flex items-center justify-between space-x-2">
      <Label className="flex-1">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[60px] h-[30px] p-0"
            style={{ backgroundColor: color }}
          >
            <span className="sr-only">Pick a color</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Color Picker</Label>
              <HexColorPicker 
                color={customColor} 
                onChange={handleColorChange}
                className="w-full"
              />
              <div className="flex items-center space-x-2">
                <Label htmlFor="hex-input" className="shrink-0">#</Label>
                <Input
                  id="hex-input"
                  value={hexInput.replace("#", "")}
                  onChange={(e) => handleHexInputChange("#" + e.target.value)}
                  className="font-mono"
                  maxLength={6}
                  placeholder="000000"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 