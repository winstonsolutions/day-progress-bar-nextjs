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

    console.log('开始处理许可证激活，用户ID:', session.userId);

    // 解析请求体
    const body = await request.json();
    const { licenseKey, email: requestEmail } = body;

    if (!licenseKey) {
      return NextResponse.json({ success: false, error: 'License key is required' }, { status: 400 });
    }

    console.log('许可证激活请求参数 - 许可证密钥:', licenseKey, '邮箱:', requestEmail);

    // 从数据库中验证许可证密钥
    const { data: licenseData, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();

    if (licenseError || !licenseData) {
      console.error('查询许可证时出错:', licenseError || '未找到许可证');
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired license key'
      }, { status: 400 });
    }

    console.log('查询到的许可证数据:', licenseData);

    // 获取当前用户的信息
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('clerk_id', session.userId)
      .single();

    let userEmail: string;
    let supabaseUserId: string;

    if (userError || !userData) {
      console.error('获取用户信息时出错:', userError || '未找到用户');
      console.log('找不到用户记录，将尝试创建新用户');

      // 如果找不到用户，可能需要先创建用户
      // 尝试从请求中获取邮箱
      if (!requestEmail) {
        return NextResponse.json({
          success: false,
          error: 'User not found in database and no email provided'
        }, { status: 400 });
      }

      userEmail = requestEmail;

      // 创建新用户记录
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          clerk_id: session.userId,
          email: userEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, email')
        .single();

      if (createError || !newUser) {
        console.error('创建用户时出错:', createError || '未返回新用户数据');
        return NextResponse.json({
          success: false,
          error: 'Failed to create user record'
        }, { status: 500 });
      }

      console.log('成功创建新用户:', newUser);
      // 使用新创建的用户
      supabaseUserId = newUser.id;
    } else {
      console.log('找到现有用户记录:', userData);
      // 使用现有用户
      userEmail = userData.email || requestEmail;
      supabaseUserId = userData.id;
    }

    console.log('准备激活许可证，关联到用户ID:', supabaseUserId);

    // 检查许可证是否已经被激活
    if (licenseData.user_id && licenseData.user_id !== supabaseUserId) {
      // 如果许可证已经被激活，检查电子邮件是否匹配
      // 获取与许可证关联的用户的邮箱
      const { data: licenseOwnerData } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', licenseData.user_id)
        .single();

      console.log('许可证当前所有者:', licenseOwnerData);

      // 如果与许可证关联的邮箱与当前用户邮箱匹配，则允许激活
      if (licenseData.email && (licenseData.email === userEmail || (licenseOwnerData && licenseOwnerData.email === userEmail))) {
        console.log('邮箱匹配，允许重新激活许可证');
        // 继续激活流程 - 将许可证重新分配给当前用户
      } else {
        console.log('许可证已被其他用户激活，且邮箱不匹配');
        return NextResponse.json({
          success: false,
          error: 'This license key has already been activated by another user'
        }, { status: 400 });
      }
    }

    // 激活许可证 - 将许可证与当前用户关联
    const { error: updateError } = await supabaseAdmin
      .from('licenses')
      .update({
        user_id: supabaseUserId, // 使用Supabase用户ID而不是Clerk ID
        active: true,
        updated_at: new Date().toISOString(),
        // 存储邮箱以便将来验证
        email: userEmail
      })
      .eq('license_key', licenseKey);

    if (updateError) {
      console.error('激活许可证时出错:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to activate license'
      }, { status: 500 });
    }

    console.log('许可证激活成功 - 许可证密钥:', licenseKey, '用户ID:', supabaseUserId);

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