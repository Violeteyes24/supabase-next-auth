-- Function to create appointment completion trigger
CREATE OR REPLACE FUNCTION public.create_appointment_completion_trigger()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First create the function that will be called by the trigger
  CREATE OR REPLACE FUNCTION handle_appointment_completion()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $func$
  BEGIN
    -- Check if the status was changed to 'completed'
    IF (OLD.status <> 'completed' AND NEW.status = 'completed') THEN
      -- Update the associated availability_schedule to not available
      -- Only if the appointment end time is >= current time
      UPDATE public.availability_schedules AS avs
      SET is_available = false
      FROM public.appointments AS apt
      WHERE apt.appointment_id = NEW.appointment_id
        AND avs.availability_schedule_id = apt.availability_schedule_id
        AND avs.is_available = true
        AND (avs.date + avs.end_time::time) >= NOW();
    END IF;
    
    RETURN NEW;
  END;
  $func$;

  -- Drop the trigger if it already exists
  DROP TRIGGER IF EXISTS appointment_completion_trigger ON public.appointments;
  
  -- Create the trigger
  CREATE TRIGGER appointment_completion_trigger
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_appointment_completion();
  
  -- Create a utility function to check and complete expired appointments
  -- This accepts a counselor_id parameter for security
  CREATE OR REPLACE FUNCTION public.check_and_complete_appointments(counselor_id uuid)
  RETURNS TABLE(updated_count integer)
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $func$
  DECLARE
    updated_count integer;
  BEGIN
    -- Check if the user is a counselor
    IF EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = counselor_id
      AND user_type = 'counselor'
    ) THEN
      -- Auto-complete appointments whose end time has passed
      -- Only for the appointments that belong to this counselor
      WITH updated_rows AS (
        UPDATE public.appointments
        SET status = 'completed'
        FROM public.availability_schedules AS avs
        WHERE appointments.availability_schedule_id = avs.availability_schedule_id
          AND appointments.status <> 'completed'
          AND avs.counselor_id = counselor_id  -- Only their own appointments
          AND (avs.date + avs.end_time::time) <= NOW()
        RETURNING appointments.appointment_id
      )
      SELECT COUNT(*) INTO updated_count FROM updated_rows;
    ELSE
      -- Not a counselor
      updated_count := 0;
    END IF;
    
    RETURN QUERY SELECT updated_count;
  END;
  $func$;
END;
$$; 