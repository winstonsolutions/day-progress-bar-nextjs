import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardContent from "@/components/dashboard/DashboardContent";

export default async function DashboardPage() {
  const authObject = await auth();
  const user = await currentUser();

  if (!authObject.userId || !user) {
    redirect("/sign-in");
  }

  // 创建一个普通JavaScript对象，只包含我们需要的属性
  const serializedUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl || "",
    emailAddress: user.emailAddresses?.[0]?.emailAddress || "",
    emailVerified: user.emailAddresses?.[0]?.verification?.status === "verified"
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <DashboardContent user={serializedUser} />
    </div>
  );
}