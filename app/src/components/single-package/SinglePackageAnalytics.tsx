"use client";

import { useNameAnalytics } from "@/hooks/useNameAnalytics";
import { usePackagesNetwork } from "../providers/packages-provider";
import { ResolvedName } from "@/hooks/mvrResolution";
import { Area, AreaChart, XAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Text } from "../ui/Text";
import { useMemo } from "react";
import { SinglePackageContent } from "./SinglePackageLayout";
import { SinglePackageSidebarTitle } from "./SinglePackageLayout";

const chartConfig = {
  total: {
    label: "Total Calls",
    color: "var(--bg-accent)",
  },
} satisfies ChartConfig;

export function SinglePackageAnalytics({ name }: { name: ResolvedName }) {
  const network = usePackagesNetwork();

  if (network !== "mainnet") return null;

  const { data } = useNameAnalytics(name.name, network);

  const totalCalls = useMemo(() => {
    return data?.reduce((acc, d) => acc + d.total, 0);
  }, [data]);

  if (data?.length === 0) return null;

  return (
    <SinglePackageContent>
      <SinglePackageSidebarTitle>
        Lifetime Composable Calls
      </SinglePackageSidebarTitle>
      <Text kind="label" size="label-large">
        {totalCalls?.toLocaleString("en-US", { useGrouping: true })}
      </Text>
      <ChartContainer config={chartConfig} className="mb-md h-[100px] w-full">
        <AreaChart
          accessibilityLayer
          height={150}
          data={
            data?.map((d) => ({
              period: d.date_from + " to " + d.date_to,
              calls: d.direct,
              propagated: d.propagated,
              total: d.total,
            })) || []
          }
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <ChartTooltip
            cursor={true}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(value: any) => {
                  return (
                    <Text kind="paragraph" size="paragraph-small">
                      {value}
                    </Text>
                  );
                }}
              />
            }
          />
          <Area
            dot={false}
            strokeWidth={2}
            height={150}
            dataKey="total"
            type="linear"
            fill="var(--bg-accent)"
            stroke="var(--bg-accent)"
            fillOpacity={0.2}
          />
          <XAxis dataKey="period" hide />
        </AreaChart>
      </ChartContainer>
    </SinglePackageContent>
  );
}
