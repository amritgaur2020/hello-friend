import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Get the authorization header to identify the calling user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create client with the user's token to verify their identity
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get the current user
    const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Parse request body
    const { target_user_id, new_password, require_password_change } = await req.json()

    if (!target_user_id || !new_password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing target_user_id or new_password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, message: 'Password must be at least 6 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check if calling user is an admin (server-side validation)
    const { data: isAdminResult, error: adminCheckError } = await supabaseAdmin
      .rpc('is_admin', { _user_id: callingUser.id })

    if (adminCheckError) {
      console.error('Error checking admin status:', adminCheckError)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to verify admin status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Allow if admin OR user is changing their own password
    const isSelfChange = callingUser.id === target_user_id
    if (!isAdminResult && !isSelfChange) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized: Admin privileges required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    console.log(`Password change request: caller=${callingUser.id}, target=${target_user_id}, isAdmin=${isAdminResult}, isSelf=${isSelfChange}`)

    // Update the user's password using service role
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      { password: new_password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return new Response(
        JSON.stringify({ success: false, message: `Failed to update password: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Update requires_password_change flag in profiles
    const shouldRequireChange = require_password_change === true
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ requires_password_change: shouldRequireChange })
      .eq('id', target_user_id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      // Don't fail the request, password was already changed
    }

    // Log activity if admin is changing someone else's password
    if (!isSelfChange) {
      await supabaseAdmin.rpc('log_activity', {
        _action_type: 'update',
        _module: 'staff',
        _description: `Admin changed password for user`,
        _record_id: target_user_id,
        _record_type: 'user',
      })
    }

    console.log(`Password updated successfully for user: ${target_user_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password updated successfully',
        requires_password_change: shouldRequireChange
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    console.error('Change password error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to change password'
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
