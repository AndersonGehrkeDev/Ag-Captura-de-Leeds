"use client";

import type { ComponentProps } from "react";
import { Tabs as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = Primitive.Root;
export const TabsContent = Primitive.Content;
export function TabsList({ className, ...props }: ComponentProps<typeof Primitive.List>) {
  return <Primitive.List className={cn("ag-tabs", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger className={cn("ag-tab", className)} {...props} />;
}
