import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const email = requestUrl.searchParams.get('email');
    
    if (code) {
        const cookieStore = await cookies();
        const supabase = createRouteHandlerClient({cookies: () => cookieStore})
        await supabase.auth.exchangeCodeForSession(code);
        
        // Redirect to confirmation page with code and email parameters
        const confirmationUrl = new URL('/auth/confirmation', requestUrl.origin);
        confirmationUrl.searchParams.set('code', code);
        if (email) confirmationUrl.searchParams.set('email', email);
        return NextResponse.redirect(confirmationUrl);
    }
    return NextResponse.redirect(requestUrl.origin)
} 