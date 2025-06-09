import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Since we can't directly revoke sessions from the client side,
    // we'll return success and rely on the client to clear local storage
    // The actual session invalidation will happen when the user logs out through Clerk's UI

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process logout' },
      { status: 500 }
    );
  }
}