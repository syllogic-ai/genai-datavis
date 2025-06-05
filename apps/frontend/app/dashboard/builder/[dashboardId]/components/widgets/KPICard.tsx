"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Widget } from "@/types/enhanced-dashboard-types";

interface KPICardProps {
  widget: Widget;
  onUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export function KPICard({ widget, onUpdate, isEditing, onEditToggle }: KPICardProps) {
  const [title, setTitle] = useState(widget.config.title || "KPI");
  const [value, setValue] = useState(widget.config.value || "0");
  const [change, setChange] = useState(widget.config.change || "0");
  const [changeDirection, setChangeDirection] = useState(widget.config.changeDirection || "flat");
  const [unit, setUnit] = useState(widget.config.unit || "");
  const [subtitle, setSubtitle] = useState(widget.config.subtitle || "");

  const handleSave = () => {
    onUpdate(widget.id, {
      config: {
        ...widget.config,
        title,
        value: parseFloat(value) || 0,
        change: parseFloat(change) || 0,
        changeDirection,
        unit,
        subtitle,
      },
    });
    onEditToggle();
  };

  const handleCancel = () => {
    setTitle(widget.config.title || "KPI");
    setValue(widget.config.value?.toString() || "0");
    setChange(widget.config.change?.toString() || "0");
    setChangeDirection(widget.config.changeDirection || "flat");
    setUnit(widget.config.unit || "");
    setSubtitle(widget.config.subtitle || "");
    onEditToggle();
  };

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1) + "M";
    } else if (val >= 1000) {
      return (val / 1000).toFixed(1) + "K";
    }
    return val.toLocaleString();
  };

  const getChangeIcon = () => {
    switch (changeDirection) {
      case "increase":
        return <TrendingUp className="w-4 h-4" />;
      case "decrease":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getChangeColor = () => {
    switch (changeDirection) {
      case "increase":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30";
      case "decrease":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30";
    }
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col p-2">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="KPI Title"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Value
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                placeholder="%, $, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Change
              </label>
              <input
                type="number"
                value={change}
                onChange={(e) => setChange(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Direction
              </label>
              <select
                value={changeDirection}
                onChange={(e) => setChangeDirection(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
                <option value="flat">Flat</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subtitle
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="vs last month"
            />
          </div>

          <div className="flex gap-1">
            <button
              onClick={handleSave}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-center p-4">
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          {widget.config.title || "KPI"}
        </h3>
        
        <div className="mb-3">
          <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {formatValue(widget.config.value || 0)}
            {widget.config.unit && (
              <span className="text-lg text-gray-500 dark:text-gray-400 ml-1">
                {widget.config.unit}
              </span>
            )}
          </div>
        </div>

        {(widget.config.change !== 0 || widget.config.subtitle) && (
          <div className="flex items-center justify-center">
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
              ${getChangeColor()}
            `}>
              {getChangeIcon()}
              <span>
                {widget.config.change > 0 ? "+" : ""}{widget.config.change}%
              </span>
            </div>
          </div>
        )}

        {widget.config.subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {widget.config.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}