import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

export async function middleware(req) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // Define routes that should bypass middleware checks
    const exemptRoutes = ['/login', '/register/counselor', '/register/secretary'];

    // Check if the request is for an exempt route
    if (exemptRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
        return res; // Allow the request
    }

    // 1. Get the session
    const { data: { session } } = await supabase.auth.getSession();

    // If no session exists, redirect to login page
    if (!session) {
        const loginUrl = new URL('/login', req.nextUrl.origin); // Absolute URL
        return NextResponse.redirect(loginUrl);
    }

    // 2. Fetch user details (including user role)
    const { data: user } = await supabase.auth.getUser();
    const { data: userDetails, error } = await supabase
        .from('Users')
        .select('user_type')
        .eq('user_id', user.id)
        .single();

    // Handle any errors fetching user details
    if (error) {
        console.error('Error fetching user role:', error);
        const errorUrl = new URL('/error', req.nextUrl.origin); // Redirect to an error page
        return NextResponse.redirect(errorUrl);
    }

    // 3. Implement RBAC logic based on user role (if necessary)
    const role = userDetails?.user_type;

    // Example: Allow access only if the user is a 'counselor'
    if (role !== 'counselor') {
        const unauthorizedUrl = new URL('/unauthorized', req.nextUrl.origin); // Absolute URL
        return NextResponse.redirect(unauthorizedUrl);
    }

    // 4. Attach the user role to the request headers (optional)
    req.headers.set('x-user-role', role);

    return res;
}
