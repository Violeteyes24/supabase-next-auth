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
          <title>Account Application Status</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f7f6; color: #333333;">
          <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <tr>
              <td style="background-color: #4b5563; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">MentalHelp</h1>
              </td>
            </tr>
            <tr>
              <td style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #4b5563; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Account Application Update</h2>
                
                <p style="margin-bottom: 15px; line-height: 1.5;">We regret to inform you that your account application has been declined at this time.</p>
                
                <p style="margin-bottom: 15px; line-height: 1.5;">This decision may be due to one of the following reasons:</p>
                
                <ul style="margin-bottom: 20px; padding-left: 20px; line-height: 1.6; color: #555555;">
                  <li style="margin-bottom: 8px;">Incomplete or incorrect information provided</li>
                  <li style="margin-bottom: 8px;">Unable to verify your credentials</li>
                  <li style="margin-bottom: 8px;">Your role or department does not match our current requirements</li>
                </ul>
                
                <p style="margin-bottom: 15px; line-height: 1.5;">If you believe this is an error or would like to provide additional information, please contact our support team at <a href="mailto:support@mentalhelp.fun" style="color: #4b5563; text-decoration: underline;">support@mentalhelp.fun</a>.</p>
                
                <p style="margin-bottom: 25px; line-height: 1.5;">Thank you for your interest in our platform.</p>
                
                <hr style="border: 0; height: 1px; background-color: #eaeaea; margin: 30px 0;">
                
                <p style="color: #666666; font-size: 14px; margin-bottom: 5px;">Regards,</p>
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
      subject: 'Your Account Application Status',
      html: emailContent,
    });
    
    if (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }
    
    // Update user metadata in Supabase
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { status: 'denied' },
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
      message: 'Denial email sent',
      emailId: emailData?.id 
    });
  } catch (error) {
    console.error('Error sending denial email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send denial email' },
      { status: 500 }
    );
  }
} 