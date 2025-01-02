import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // Fetch the session
    const { data: { session } } = await supabase.auth.getSession();

    // Redirect unauthenticated users to login
    if (!session) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return res; // Allow the request to proceed
}

export const config = {
    matcher: ['/dashboard/:path*'], // Apply middleware only to protected routes
};
