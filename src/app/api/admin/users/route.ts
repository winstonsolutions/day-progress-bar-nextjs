import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import type { Database } from '@/lib/schema';

// 创建管理员Supabase客户端（使用service role key）
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * 管理员API端点 - 获取所有用户
 * 此端点使用Supabase service role key绕过RLS策略
 * 只有管理员用户应该被允许访问
 */
export async function GET(request: NextRequest) {
  // 1. 验证当前用户是否为管理员
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 从URL参数获取分页信息
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  try {
    // 验证用户是否为管理员
    const { data: adminCheck } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('clerk_id', userId)
      .single();

    // 如果用户不是管理员，拒绝访问
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 获取所有用户（分页）
    const { data: users, error, count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count,
        pages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (error) {
    console.error('Error in admin users endpoint:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * 管理员API端点 - 创建用户
 * 可用于管理员手动创建用户
 */
export async function POST(request: NextRequest) {
  // 验证管理员权限
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 验证用户是否为管理员
    const { data: adminCheck } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('clerk_id', userId)
      .single();

    // 如果用户不是管理员，拒绝访问
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 获取请求体
    const body = await request.json();
    const { clerk_id, email, first_name, last_name } = body;

    if (!clerk_id || !email) {
      return NextResponse.json({
        error: 'Missing required fields (clerk_id, email)'
      }, { status: 400 });
    }

    // 创建新用户
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        clerk_id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: data
    });
  } catch (error) {
    console.error('Error in admin create user endpoint:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}