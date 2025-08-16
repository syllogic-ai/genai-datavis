import { redirect } from "next/navigation";

export default function SettingsPage() {
  // Redirect to theme settings by default
  redirect("/dashboard/settings/theme");
}