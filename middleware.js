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

    // Fetch user profile
    const { data: profile, error } = await supabase
        .from('users')
        .select('approval_status')
        .eq('user_id', session.user.id)
        .single();

    if (error) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    if (profile.approval_status === 'denied') {
        return NextResponse.redirect(new URL('/login?message=Your account has been denied.', req.url));
    }

    if (profile.approval_status === 'pending') {
        return NextResponse.redirect(new URL('/login?message=Your account is pending approval.', req.url));
    }

    return res; // Allow the request to proceed
}

export const config = {
    matcher: ['/dashboard/:path*'], // Apply middleware only to protected routes
};
