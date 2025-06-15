import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { supabaseAdmin } from "@/lib/db";

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

  // 从Supabase获取用户的试用信息
  let trialData = null;
  try {
    // 使用supabaseAdmin绕过RLS策略
    // 使用maybeSingle()代替single()，这样当没有找到记录时不会抛出错误
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('trial_started_at')
      .eq('clerk_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching trial data from Supabase:', error);
    } else if (data && data.trial_started_at) {
      const trialStartTime = new Date(data.trial_started_at).getTime();
      const currentTime = Date.now();
      const trialEndTime = trialStartTime + (60 * 60 * 1000); // 1小时(毫秒)

      trialData = {
        trialStartTime,
        trialEndTime,
        isTrialActive: currentTime < trialEndTime
      };
    } else {
      // 用户在Supabase中不存在或没有trial_started_at字段
      console.log('No trial data found for user:', user.id);

      // 尝试自动创建用户记录，使用supabaseAdmin绕过RLS策略
      try {
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            clerk_id: user.id,
            email: serializedUser.emailAddress,
            first_name: serializedUser.firstName,
            last_name: serializedUser.lastName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Failed to create user record in Supabase:', insertError);
        } else {
          console.log('Created new user record in Supabase');
        }
      } catch (insertError) {
        console.error('Exception during user creation in Supabase:', insertError);
      }
    }
  } catch (error) {
    console.error('Failed to fetch trial data:', error);
  }

  return (
    <div>
      <DashboardContent user={serializedUser} serverTrialData={trialData} />
    </div>
  );
}