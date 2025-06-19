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

  // 检查用户是否为Pro用户（是否有有效的许可证）
  let isPro = false;
  try {
    console.log('开始检查用户Pro状态，Clerk用户ID:', user.id);
    // 首先获取Supabase用户ID
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', user.id)
      .maybeSingle();

    if (userError) {
      console.error('获取Supabase用户ID时出错:', userError);
    }

    console.log('Supabase用户查询结果:', userData);

    if (userData && userData.id) {
      console.log('找到Supabase用户ID:', userData.id);

      // 当前时间
      const now = new Date().toISOString();

      // 1. 首先查询无过期日期的许可证
      const { count: countNoExpiry, error: errorNoExpiry } = await supabaseAdmin
        .from('licenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id)
        .eq('active', true)
        .is('expires_at', null);

      if (errorNoExpiry) {
        console.error('查询无过期日期许可证时出错:', errorNoExpiry);
      }

      // 2. 然后查询未过期的许可证
      const { count: countNotExpired, error: errorNotExpired } = await supabaseAdmin
        .from('licenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id)
        .eq('active', true)
        .gt('expires_at', now);

      if (errorNotExpired) {
        console.error('查询未过期许可证时出错:', errorNotExpired);
      }

      // 总的有效许可证数量
      const totalValidLicenses = (countNoExpiry || 0) + (countNotExpired || 0);

      console.log('许可证查询结果 - 无过期日期许可证:', countNoExpiry, '未过期许可证:', countNotExpired);

      // 检查是否有任何有效许可证记录
      if (totalValidLicenses > 0) {
        // 如果找到激活的许可证，设置用户为Pro
        isPro = true;
        console.log('用户拥有有效的Pro许可证，总许可证数量:', totalValidLicenses);
      } else {
        console.log('未找到活跃的许可证');
      }
    } else {
      console.log('未找到对应的Supabase用户记录');
    }
  } catch (error) {
    console.error('检查Pro状态时出错:', error);
  }

  console.log('最终确定的Pro状态:', isPro);

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
    }
  } catch (error) {
    console.error('Failed to fetch trial data:', error);
  }

  return (
    <div>
      <DashboardContent user={serializedUser} serverTrialData={trialData} isPro={isPro} />
    </div>
  );
}