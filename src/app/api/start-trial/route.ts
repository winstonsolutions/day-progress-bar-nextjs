import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// 创建具有管理权限的Supabase客户端
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * API路由用于开始或重新开始试用
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;
    const now = Date.now();
    const trialDuration = 60 * 60 * 1000; // 1小时(毫秒)
    const trialEndTime = now + trialDuration;

    // 检查用户是否存在于数据库中
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError) {
      console.error('查找用户时出错:', userError);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // 更新用户的试用状态
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        trial_started_at: new Date(now).toISOString(),
        trial_ends_at: new Date(trialEndTime).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('clerk_id', userId);

    if (updateError) {
      console.error('更新试用状态时出错:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update trial status' }, { status: 500 });
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      trialStartTime: now,
      trialEndTime: trialEndTime,
      message: 'Trial started successfully'
    });
  } catch (error: any) {
    console.error('开始试用时出错:', error);
    return NextResponse.json({
      success: false,
      error: `Trial start error: ${error.message}`
    }, { status: 500 });
  }
}