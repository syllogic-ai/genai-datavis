"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@radix-ui/react-icons";

export interface TagItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  category?: string;
  description?: string;
}

export interface TagSelectorProps {
  availableItems: TagItem[];
  selectedItems: TagItem[];
  onSelectionChange: (items: TagItem[]) => void;
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
  className?: string;
  triggerLabel?: string;
  searchPlaceholder?: string;
  emptyStateMessage?: string;
  displayOnlyRemaining?: boolean;
}

// Using function declaration instead of function expression
export function TagSelector(props: TagSelectorProps) {
  const {
    availableItems,
    selectedItems: externalSelectedItems = [],
    onSelectionChange,
    placeholder = "Add Context",
    maxSelections,
    disabled = false,
    className = "",
    triggerLabel = "Add Context",
    searchPlaceholder = "Search items...",
    emptyStateMessage = "No items found",
    displayOnlyRemaining = false,
  } = props;

  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [internalSelectedItems, setInternalSelectedItems] = React.useState<
    TagItem[]
  >(externalSelectedItems);

  // Sync internal state with external props when they change
  React.useEffect(() => {
    setInternalSelectedItems(externalSelectedItems);
  }, [externalSelectedItems]);

  // Use internal state for display
  const selectedItems = internalSelectedItems;

  const filteredItems = React.useMemo(() => {
    if (!Array.isArray(availableItems)) return [];
    if (!Array.isArray(selectedItems)) return [];

    const selectedIds = new Set(
      selectedItems.map((item) => item?.id).filter(Boolean)
    );

    return availableItems
      .filter((item) => {
        if (!item || !item.id) return false;

        // If displayOnlyRemaining is true, exclude selected items
        if (displayOnlyRemaining && selectedIds.has(item.id)) {
          return false;
        }

        return true;
      })
      .filter((item) => {
        const searchLower = String(searchValue || "").toLowerCase();
        const label = String(item.label || "").toLowerCase();
        const description = String(item.description || "").toLowerCase();
        const category = String(item.category || "").toLowerCase();

        return (
          label.includes(searchLower) ||
          description.includes(searchLower) ||
          category.includes(searchLower)
        );
      });
  }, [availableItems, selectedItems, searchValue, displayOnlyRemaining]);

  const handleToggleItem = React.useCallback(
    (item: TagItem) => {
      const isSelected = selectedItems.some(
        (selected) => selected.id === item.id
      );
      let newSelectedItems: TagItem[];

      if (isSelected) {
        newSelectedItems = selectedItems.filter(
          (selected) => selected.id !== item.id
        );
      } else {
        if (!maxSelections || selectedItems.length < maxSelections) {
          newSelectedItems = [...selectedItems, item];
        } else {
          return; // Don't add if max reached
        }
      }

      setInternalSelectedItems(newSelectedItems);
      onSelectionChange(newSelectedItems);
    },
    [selectedItems, onSelectionChange, maxSelections]
  );

  const handleRemoveItem = React.useCallback(
    (id: string) => {
      const newSelectedItems = selectedItems.filter((item) => item.id !== id);
      setInternalSelectedItems(newSelectedItems);
      onSelectionChange(newSelectedItems);
    },
    [selectedItems, onSelectionChange]
  );

  // Handle click outside to close popover
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (open && !target.closest("[data-popover]")) {
        setOpen(false);
      }
    };

    if (open) {
      setSearchValue("");
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const isMaxReached = maxSelections
    ? selectedItems.length >= maxSelections
    : false;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Add Context trigger */}
      <div className="relative" data-popover>
        <button
          onClick={() => setOpen(!open)}
          disabled={disabled || isMaxReached}
          className={cn(
            "px-2 py-1 border rounded-md bg-transparent text-xs flex items-center gap-1 transition-opacity",
            "hover:border-gray-400 focus:outline-none focus:ring-none",
            (disabled || isMaxReached) && "opacity-50 cursor-not-allowed"
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25"
            />
          </svg>
          {String(triggerLabel || "Add Context")}
        </button>

        {open && (
          <div
            data-popover
            className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-80"
          >
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                placeholder={String(searchPlaceholder || "Search items...")}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full p-1 border-none outline-none text-sm focus:ring-0"
              />
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="py-4 px-4 text-center text-sm text-gray-500">
                  {String(emptyStateMessage || "No items found")}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItems.some(
                    (selected) => selected.id === item.id
                  );
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(item)}
                      className={cn(
                        "py-1 px-3 cursor-pointer flex items-center justify-between text-sm transition-colors",
                        "border-l-3 hover:bg-gray-50",
                        isSelected ? "bg-gray-50" : ""
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                        <div className="truncate">
                          {String(item.label || "")}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckIcon className="w-4 h-4 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {maxSelections && (
              <div className="border-t border-gray-200 py-1 px-3 text-xs text-gray-500">
                {selectedItems.length} / {maxSelections} selected
              </div>
            )}
          </div>
        )}
      </div>

      {/* Display selected tags */}
      {selectedItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className="inline-flex items-center py-1 px-2 bg-gray-100 border border-gray-300 rounded-md text-xs gap-1"
          >
            {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
            <span className="truncate">{String(item.label || "")}</span>
            <button
              onClick={() => handleRemoveItem(item.id)}
              className="bg-transparent border-none cursor-pointer rounded-md flex items-center justify-center"
              aria-label={`Remove ${item.label}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
