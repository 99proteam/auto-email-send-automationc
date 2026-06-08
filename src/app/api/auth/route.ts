import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // Check against the simple password provided by the user
    if (password === '9009121') {
      const response = NextResponse.json({ success: true }, { status: 200 });
      
      // Set an HTTP-only cookie to keep the user authenticated
      response.cookies.set({
        name: 'auth_token',
        value: 'authenticated',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Invalid password' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Bad request' },
      { status: 400 }
    );
  }
}
