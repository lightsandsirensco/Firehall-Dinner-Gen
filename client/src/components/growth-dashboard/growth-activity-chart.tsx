import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {

  ChartContainer,

  ChartLegend,

  ChartLegendContent,

  ChartTooltip,

  ChartTooltipContent,

} from "@/components/ui/chart";

import type { GrowthChartPoint } from "@shared/growth-dashboard/types";



const chartConfig = {

  active_halls: { label: "Active halls", color: "hsl(var(--primary))" },

  active_shifts: { label: "Active shifts", color: "hsl(var(--chart-2))" },

  hall_votes: { label: "Hall votes", color: "hsl(var(--chart-3))" },

  meals_generated: { label: "Meals generated", color: "hsl(var(--chart-4))" },

  shopping_lists: { label: "Shopping lists", color: "hsl(var(--chart-5))" },

} as const;



function formatAxisDate(date: string): string {

  const d = new Date(`${date}T12:00:00.000Z`);

  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

}



interface GrowthActivityChartProps {

  data: GrowthChartPoint[];

}



export function GrowthActivityChart({ data }: GrowthActivityChartProps) {

  const chartData = data.map((point) => ({

    ...point,

    label: formatAxisDate(point.date),

  }));



  return (

    <ChartContainer config={chartConfig} className="aspect-[16/9] w-full min-h-[260px]">

      <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>

        <CartesianGrid vertical={false} strokeDasharray="4 4" />

        <XAxis

          dataKey="label"

          tickLine={false}

          axisLine={false}

          minTickGap={24}

          interval="preserveStartEnd"

        />

        <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />

        <ChartTooltip content={<ChartTooltipContent />} />

        <ChartLegend content={<ChartLegendContent />} />

        <Line

          type="monotone"

          dataKey="active_halls"

          stroke="var(--color-active_halls)"

          strokeWidth={2}

          dot={false}

        />

        <Line

          type="monotone"

          dataKey="active_shifts"

          stroke="var(--color-active_shifts)"

          strokeWidth={2}

          dot={false}

        />

        <Line

          type="monotone"

          dataKey="hall_votes"

          stroke="var(--color-hall_votes)"

          strokeWidth={2}

          dot={false}

        />

        <Line

          type="monotone"

          dataKey="meals_generated"

          stroke="var(--color-meals_generated)"

          strokeWidth={2}

          dot={false}

        />

        <Line

          type="monotone"

          dataKey="shopping_lists"

          stroke="var(--color-shopping_lists)"

          strokeWidth={2}

          dot={false}

        />

      </LineChart>

    </ChartContainer>

  );

}


