import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CheckedInGuest {
  checkInId: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  checkInTime: string;
  expectedCheckOut: string;
}

export function useCheckedInGuests(searchQuery?: string) {
  return useQuery({
    queryKey: ['checked-in-guests', searchQuery],
    queryFn: async () => {
      // Fetch check-ins that haven't checked out yet
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('id, guest_id, room_id, check_in_time, expected_check_out')
        .is('actual_check_out', null)
        .order('check_in_time', { ascending: false });

      if (checkInsError) throw checkInsError;
      if (!checkIns || checkIns.length === 0) return [];

      // Get unique guest and room IDs
      const guestIds = [...new Set(checkIns.map(c => c.guest_id))];
      const roomIds = [...new Set(checkIns.map(c => c.room_id))];

      // Fetch guests and rooms in parallel
      const [guestsRes, roomsRes] = await Promise.all([
        supabase.from('guests').select('id, full_name, phone').in('id', guestIds),
        supabase.from('rooms').select('id, room_number, room_type_id').in('id', roomIds),
      ]);

      if (guestsRes.error) throw guestsRes.error;
      if (roomsRes.error) throw roomsRes.error;

      // Fetch room types
      const roomTypeIds = [...new Set(roomsRes.data?.map(r => r.room_type_id).filter(Boolean) || [])];
      const { data: roomTypes } = await supabase
        .from('room_types')
        .select('id, name')
        .in('id', roomTypeIds);

      const guestMap = new Map(guestsRes.data?.map(g => [g.id, { name: g.full_name, phone: g.phone }]) || []);
      const roomMap = new Map(roomsRes.data?.map(r => [r.id, { number: r.room_number, typeId: r.room_type_id }]) || []);
      const roomTypeMap = new Map(roomTypes?.map(rt => [rt.id, rt.name]) || []);

      const result: CheckedInGuest[] = checkIns.map(checkIn => {
        const room = roomMap.get(checkIn.room_id);
        const guest = guestMap.get(checkIn.guest_id);
        return {
          checkInId: checkIn.id,
          guestId: checkIn.guest_id,
          guestName: guest?.name || 'Unknown Guest',
          guestPhone: guest?.phone || '',
          roomId: checkIn.room_id,
          roomNumber: room?.number || '-',
          roomType: room?.typeId ? roomTypeMap.get(room.typeId) || 'Standard' : 'Standard',
          checkInTime: checkIn.check_in_time,
          expectedCheckOut: checkIn.expected_check_out,
        };
      });

      // Filter by search query if provided
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return result.filter(
          g => g.guestName.toLowerCase().includes(query) || g.roomNumber.toLowerCase().includes(query)
        );
      }

      return result;
    },
  });
}
