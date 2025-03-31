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
    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Approved</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f7f6; color: #333333;">
          <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <tr>
              <td style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">MentalHelp</h1>
              </td>
            </tr>
            <tr>
              <td style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #10b981; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Account Approval Notification</h2>
                
                <p style="margin-bottom: 15px; line-height: 1.5;">Congratulations! Your account has been approved. You can now log in to our platform and access all available features.</p>
                
                <p style="margin-bottom: 25px; line-height: 1.5;">We're excited to have you join our community and look forward to supporting your journey.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://www.mentalhelp.fun/login" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Sign In Now</a>
                </div>
                
                <p style="margin-bottom: 15px; line-height: 1.5;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                
                <hr style="border: 0; height: 1px; background-color: #eaeaea; margin: 30px 0;">
                
                <p style="color: #666666; font-size: 14px; margin-bottom: 5px;">Thank you,</p>
                <p style="color: #666666; font-size: 14px; margin-top: 0;"><strong>The Mental Health Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding-top: 20px; color: #666666; font-size: 12px;">
                <p>&copy; ${new Date().getFullYear()} MentalHelp. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    
    // Send email using Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'MentalHelp Team <team@mentalhelp.fun>', // Added sender name
      to: userEmail,
      subject: 'Your Account Has Been Approved',
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