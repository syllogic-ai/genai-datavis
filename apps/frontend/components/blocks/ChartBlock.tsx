"use client";

import { ChartRenderer } from "../charts/ChartRenderer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ChartSpec } from "@/types/chart-types";

interface ChartBlockProps {
  spec: ChartSpec;
}

/**
 * A generic chart block component that can display any type of chart
 * based on the provided ChartSpec
 */
export function ChartBlock({ spec }: ChartBlockProps) {
  return (
    <Card className="w-full overflow-hidden bg-[#FFF1E5]">
      <CardHeader className="pb-8">
        <CardTitle className="text-2xl font-bold">{spec.title}</CardTitle>
        <CardDescription className="text-md text-gray-500">{spec.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 h-full">
        <ChartRenderer spec={spec} />
      </CardContent>
    </Card>       
  );
} 