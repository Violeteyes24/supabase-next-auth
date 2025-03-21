import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if the user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized: You must be logged in' }, { status: 401 });
    }
    
    // Verify the user is a counselor
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_type')
      .eq('user_id', session.user.id)
      .single();
    
    if (userError || !userData) {
      return NextResponse.json({ error: 'User data not found' }, { status: 404 });
    }
    
    if (userData.user_type !== 'counselor') {
      return NextResponse.json({ error: 'Unauthorized: Only counselors can perform this action' }, { status: 403 });
    }
    
    // Execute the SQL function that creates the trigger
    const { data, error } = await supabase.rpc('create_appointment_completion_trigger');
    
    if (error) {
      console.error('Error setting up trigger:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Appointment completion trigger set up successfully' });
  } catch (error) {
    console.error('Error in setup-triggers route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST method to set up triggers' 
  });
} 