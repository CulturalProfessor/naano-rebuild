import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { ProfileStep } from "./profile-form";

export const metadata = { title: "Add your LinkedIn profile — naano" };

export default async function ProfilePage() {
  const account = await requireAccount();
  if (account.role !== "creator") redirect("/brand");
  return <ProfileStep />;
}
