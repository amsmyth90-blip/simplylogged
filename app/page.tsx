import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { WebsiteHome } from "@/components/WebsiteHome";

export default async function HomePage() {
  const user = await getAuthenticatedUser();
  if (user) redirect("/dashboard");
  return <WebsiteHome />;
}
