import DashboardViewClient from "./DashboardView.client";
import { fetchAllWidgetsData } from "@/lib/widgetData";

export default async function DashboardView() {
  const initialData = await fetchAllWidgetsData();
  return <DashboardViewClient initialData={initialData} />;
}
