"use client";
import { useState } from "react";
import { IconRenderer, useIconPicker } from "./DashboardIconRenderer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface IconPickerDialogProps {
  selectedIcon?: string;
  onIconChange?: (icon: string) => void;
  trigger?: React.ReactNode;
}

export const IconPickerDialog = ({ 
  selectedIcon, 
  onIconChange, 
  trigger 
}: IconPickerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [internalSelected, setInternalSelected] = useState<null | string>(selectedIcon || null);

  const currentSelected = selectedIcon !== undefined ? selectedIcon : internalSelected;

  const handleIconChange = (icon: string) => {
    if (onIconChange) {
      onIconChange(icon);
    } else {
      setInternalSelected(icon);
    }
    setOpen(false);
  };

  const defaultTrigger = (
    <Button variant="outline" className="min-w-[150px]">
      {currentSelected ? (
        <>
          <IconRenderer className="size-4 text-sidebar-foreground" icon={currentSelected} />
          Update
        </>
      ) : (
        "Select"
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(e) => setOpen(e)}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select an Icon</DialogTitle>
          <DialogDescription>Choose the best suited icon</DialogDescription>
        </DialogHeader>
        <IconPicker
          onChange={handleIconChange}
        />
      </DialogContent>
    </Dialog>
  );
};

export const IconPicker = ({
  onChange,
}: {
  onChange: (icon: string) => void;
}) => {
  const { search, setSearch, icons } = useIconPicker();

  return (
    <div className="relative">
      <Input
        placeholder="Search..."
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="mt-2 flex h-full max-h-[400px] flex-wrap gap-2 overflow-y-scroll py-4 pb-12">
        {icons.map(({ name, Component }) => (
          <Button
            key={name}
            type="button"
            role="button"
            onClick={() => onChange(name)}
            className="h-11 hover:bg-sidebar-foreground/15 hover:text-sidebar-foreground/80 bg-sidebar-foreground/5 border-sidebar-foreground/10 text-sidebar-foreground"
          >
            <Component className="!size-6 shrink-0" />
            <span className="sr-only">{name}</span>
          </Button>
        ))}
        {icons.length === 0 && (
          <div className="col-span-full flex grow flex-col items-center justify-center gap-2 text-center">
            <p>No icons found...</p>
            <Button onClick={() => setSearch("")} variant="ghost">
              Clear search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};