import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Body = {
  userId?: string
  email?: string
  newPassword?: string
}

const toInternalEmail = (userId: string) => `${userId.toLowerCase().trim()}@hotel.local`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const { userId, email, newPassword } = (await req.json().catch(() => ({}))) as Body

    const resolvedEmail = (email?.trim() || (userId ? toInternalEmail(userId) : '')).toLowerCase()
    if (!resolvedEmail || !resolvedEmail.includes('@')) {
      return new Response(JSON.stringify({ success: false, message: 'Missing email or userId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ success: false, message: 'Password must be at least 6 characters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Safety guard: only allow internal accounts
    if (!resolvedEmail.endsWith('@hotel.local')) {
      return new Response(JSON.stringify({ success: false, message: 'Only @hotel.local accounts are allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Find user by email
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listError) {
      console.error('listUsers error:', listError)
      return new Response(JSON.stringify({ success: false, message: 'Failed to find user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const target = listData.users.find((u) => (u.email ?? '').toLowerCase() === resolvedEmail)
    if (!target) {
      return new Response(JSON.stringify({ success: false, message: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Only allow reset before first successful sign-in (prevents ongoing takeover)
    if (target.last_sign_in_at) {
      return new Response(
        JSON.stringify({ success: false, message: 'Password reset is disabled after the first login' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
      password: newPassword,
      email_confirm: true,
    })

    if (updateError) {
      console.error('updateUserById error:', updateError)
      return new Response(JSON.stringify({ success: false, message: updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // If user is admin, don't force an extra password change prompt after we set it.
    await supabaseAdmin
      .from('profiles')
      .update({ requires_password_change: false })
      .eq('id', target.id)

    return new Response(JSON.stringify({ success: true, user_id: target.id, email: resolvedEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('recover-admin-password error:', err)
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return new Response(JSON.stringify({ success: false, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
