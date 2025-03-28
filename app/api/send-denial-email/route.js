import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client with service role key (IMPORTANT: this should only be used server-side)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user data including email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('Error getting user data:', userError);
      return NextResponse.json(
        { error: 'Could not retrieve user information' },
        { status: 500 }
      );
    }
    
    if (!userData || !userData.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const userEmail = userData.user.email;
    
    // Email content
    const emailSubject = 'Your Account Application Status';
    const emailContent = `
      <h2>Account Application Update</h2>
      <p>We regret to inform you that your account application has been declined at this time.</p>
      <p>This decision may be due to one of the following reasons:</p>
      <ul>
        <li>Incomplete or incorrect information provided</li>
        <li>Unable to verify your credentials</li>
        <li>Your role or department does not match our current requirements</li>
      </ul>
      <p>If you believe this is an error or would like to provide additional information, please contact our support team.</p>
      <p>Thank you for your interest in our platform.</p>
      <p>Regards,<br>The Mental Health Team</p>
    `;
    
    // Send email using Supabase Auth API
    // Note: You must have email configured in your Supabase project
    // For production, integrate with a dedicated email service like SendGrid, Mailgun, etc.
    const { error: emailError } = await supabase.auth.admin.updateUserById(userId, {
      email: userEmail,
      app_metadata: { status: 'denied' },
      user_metadata: { 
        status_notification_sent: true,
        status_notification_time: new Date().toISOString()
      }
    });
    
    if (emailError) throw emailError;
    
    return NextResponse.json({ success: true, message: 'Denial email sent' });
  } catch (error) {
    console.error('Error sending denial email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send denial email' },
      { status: 500 }
    );
  }
} 