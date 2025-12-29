import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Json } from '@/integrations/supabase/types';

interface LogActivityParams {
  actionType: 'create' | 'edit' | 'delete' | 'view' | 'update_status' | 'update';
  module: string;
  description: string;
  recordId?: string;
  recordType?: string;
  oldData?: Json;
  newData?: Json;
}

export function useActivityLog() {
  const { profile, role } = useAuth();

  const logActivity = async ({
    actionType,
    module,
    description,
    recordId,
    recordType,
    oldData,
    newData,
  }: LogActivityParams) => {
    try {
      const userDisplayName = profile?.full_name || profile?.email || 'Unknown User';
      const userRole = role || 'staff';
      
      // Format description with user info and include old/new data summary if available
      let fullDescription = `${userDisplayName} (${userRole}) ${description}`;
      
      // Append old/new data details to description for audit trail
      if (oldData || newData) {
        const details: string[] = [];
        if (oldData && typeof oldData === 'object') {
          details.push(`Previous: ${JSON.stringify(oldData).substring(0, 200)}`);
        }
        if (newData && typeof newData === 'object') {
          details.push(`Updated: ${JSON.stringify(newData).substring(0, 200)}`);
        }
        if (details.length > 0) {
          fullDescription += ` | ${details.join(' → ')}`;
        }
      }

      // Insert directly into activity_logs table (more reliable than RPC)
      const { error } = await supabase.from('activity_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        action_type: actionType,
        module: module,
        description: fullDescription,
        record_id: recordId || null,
        record_type: recordType || null,
      });

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (err) {
      console.error('Activity logging error:', err);
    }
  };

  return { logActivity };
}

// Helper function for simple logging without hook context
export async function logActivityDirect(params: LogActivityParams & { userEmail?: string; userRole?: string }) {
  try {
    let description = params.description;
    
    // Append old/new data details to description for audit trail
    if (params.oldData || params.newData) {
      const details: string[] = [];
      if (params.oldData && typeof params.oldData === 'object') {
        details.push(`Previous: ${JSON.stringify(params.oldData).substring(0, 200)}`);
      }
      if (params.newData && typeof params.newData === 'object') {
        details.push(`Updated: ${JSON.stringify(params.newData).substring(0, 200)}`);
      }
      if (details.length > 0) {
        description += ` | ${details.join(' → ')}`;
      }
    }

    const { error } = await supabase.from('activity_logs').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      action_type: params.actionType,
      module: params.module,
      description: description,
      record_id: params.recordId || null,
      record_type: params.recordType || null,
    });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Activity logging error:', err);
  }
}
