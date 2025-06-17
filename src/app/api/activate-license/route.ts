import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// 创建具有管理权限的Supabase客户端
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * API路由用于激活许可证
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();
    const { licenseKey, email } = body;

    if (!licenseKey) {
      return NextResponse.json({ success: false, error: 'License key is required' }, { status: 400 });
    }

    // 从数据库中验证许可证密钥
    const { data: licenseData, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();

    if (licenseError || !licenseData) {
      console.error('验证许可证时出错:', licenseError || '未找到许可证');
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired license key'
      }, { status: 400 });
    }

    // 检查许可证是否已经被激活
    if (licenseData.user_id && licenseData.user_id !== session.userId) {
      return NextResponse.json({
        success: false,
        error: 'This license key has already been activated by another user'
      }, { status: 400 });
    }

    // 激活许可证 - 将许可证与当前用户关联
    const { error: updateError } = await supabaseAdmin
      .from('licenses')
      .update({
        user_id: session.userId,
        active: true,
        updated_at: new Date().toISOString()
      })
      .eq('license_key', licenseKey);

    if (updateError) {
      console.error('激活许可证时出错:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to activate license'
      }, { status: 500 });
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: 'License activated successfully'
    });
  } catch (error: any) {
    console.error('激活许可证时出错:', error);
    return NextResponse.json({
      success: false,
      error: `License activation error: ${error.message}`
    }, { status: 500 });
  }
}