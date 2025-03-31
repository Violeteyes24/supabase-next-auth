import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client with service role key
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
    
    // Initialize Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.error('Missing Resend API Key');
      return NextResponse.json(
        { error: 'Email service configuration error' },
        { status: 500 }
      );
    }
    
    const resend = new Resend(resendApiKey);
    
    // Email content
    const emailSubject = 'Your Account Has Been Approved';
    const emailContent = `
      <h2>Account Approval Notification</h2>
      <p>Congratulations! Your account has been approved. You can now log in to the platform.</p>
      <p>Click the button below to sign in:</p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login" style="display: inline-block; background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Sign In</a>
      <p>If you have any questions, please feel free to contact us.</p>
      <p>Thank you,<br>The Mental Health Team</p>
    `;
    
    // Send email using Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'MentalHelp Team <team@mentalhelp.fun>', // Added sender name
      to: userEmail,
      subject: emailSubject,
      html: emailContent,
    });
    
    if (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }
    
    // Update user metadata in Supabase
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { status: 'approved' },
      user_metadata: { 
        status_notification_sent: true,
        status_notification_time: new Date().toISOString()
      }
    });
    
    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      // We still continue since the email was sent
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Approval email sent',
      emailId: emailData?.id 
    });
  } catch (error) {
    console.error('Error sending approval email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send approval email' },
      { status: 500 }
    );
  }
} 