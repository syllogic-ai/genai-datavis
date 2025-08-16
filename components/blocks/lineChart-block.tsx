import { ChartRenderer } from "../charts/ChartRenderer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ChartSpec } from "@/types/chart-types";

interface LineChartBlockProps {
  cardData: ChartSpec;
}

/**
 * @deprecated Use ChartBlock with a ChartSpec instead
 */
export default function LineChartBlock({ cardData }: LineChartBlockProps) {
  return (
    <Card className="w-full h-[500px] overflow-hidden bg-[#FFF1E5] lg:flex lg:flex-row lg:items-start lg:gap-4">
      <CardHeader className="pb-8 lg:w-1/3">
        <CardTitle className="text-2xl font-bold">{cardData.title}</CardTitle>
        <CardDescription className="text-md text-gray-500">{cardData.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 h-full">
        <ChartRenderer spec={cardData} />
      </CardContent>
    </Card>       
  );
}