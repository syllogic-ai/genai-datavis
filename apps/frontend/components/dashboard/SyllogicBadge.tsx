"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export function SyllogicBadge() {
  return (
    <Link
      href="https://syllogic.ai"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
    >
      <Sparkles className="w-4 h-4" />
      <span>Powered by Syllogic</span>
    </Link>
  );
}