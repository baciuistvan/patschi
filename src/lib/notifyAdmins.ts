import { supabase } from './supabase';

interface ReservationData {
  id: string;
  customer_name: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_numbers?: string[];
  special_requests?: string;
}

export async function notifyAdminsNewReservation(
  reservation: ReservationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'notify-admins-new-reservation',
      {
        body: { reservation }
      }
    );

    if (error) {
      console.error('Error notifying admins:', error);
      return { success: false, error: error.message };
    }

    console.log('Admin notification sent:', data);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to notify admins:', error);
    return { success: false, error: error.message || 'Failed to send notification' };
  }
}
