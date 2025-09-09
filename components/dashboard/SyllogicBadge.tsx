"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import Image from "next/image";

export function SyllogicBadge() {
  return (
    <Link
      href="https://syllogic.ai"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center text-black gap-2 px-3 py-2 rounded-lg bg-white text-sm font-medium border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
    >
    <div className="flex items-center gap-0.5">
    Made with
     <Image
       src="https://ptsbrkwalysbchtdharj.supabase.co/storage/v1/object/public/web-public/brand-kit/syllogic_logo_black.png"
       alt="Syllogic Logo"
       width={60}
       height={18}
       style={{ objectFit: "contain" }}
       className="w-auto h-4 mt-0.5"
     />
     </div>
    </Link>
  );
}