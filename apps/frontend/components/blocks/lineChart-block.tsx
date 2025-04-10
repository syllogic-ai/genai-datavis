import { LineChartComponent } from "../charts/LineChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ChartDataItem } from "@/types/chart-types";

export default function LineChartBlock({cardData}: {cardData: ChartDataItem}) {

    return (
        <Card className="w-full h-[500px] overflow-hidden bg-[#FFF1E5]">
        <CardHeader className="pb-8">
          <CardTitle className="text-2xl font-bold">{cardData.title}</CardTitle>
          <CardDescription className="text-md text-gray-500">{cardData.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 h-[calc(500px-8rem)] pb-8">
          <LineChartComponent data={cardData.chartProps.data} config={cardData.chartProps.config} />
        </CardContent>
      </Card>       
    )
}