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
    console.log('Bootstrap admin function called')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if any admin already exists in user_roles table
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)

    if (checkError) {
      console.error('Error checking existing admins:', checkError)
      throw new Error(`Failed to check existing admins: ${checkError.message}`)
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log('Admin already exists, skipping bootstrap')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Admin account already exists. Use the login page to sign in.',
          already_exists: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Default admin credentials
    const adminEmail = 'batman@hotel.local'
    const adminPassword = '123456'
    const adminFullName = 'System Administrator'

    console.log('Creating admin user with email:', adminEmail)

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === adminEmail)

    let userId: string

    if (existingUser) {
      console.log('Auth user exists, using existing ID:', existingUser.id)
      userId = existingUser.id
      
      // Update password to ensure it's correct
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: adminPassword,
        email_confirm: true
      })
      
      if (updateError) {
        console.error('Error updating user password:', updateError)
      }
    } else {
      // Create the admin user in auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminFullName
        }
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        throw new Error(`Failed to create admin user: ${authError.message}`)
      }

      userId = authData.user.id
      console.log('Created auth user with ID:', userId)
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!existingProfile) {
      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: adminEmail,
          full_name: adminFullName,
          is_active: true
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Continue anyway - profile might be created by trigger
      } else {
        console.log('Created profile for admin')
      }
    }

    // Check if role already exists for this user in user_roles
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingRole) {
      // Assign admin role to user_roles table
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin'
        })

      if (roleError) {
        console.error('Error assigning admin role:', roleError)
        throw new Error(`Failed to assign admin role: ${roleError.message}`)
      }
      console.log('Assigned admin role to user_roles')
    } else {
      // Update existing role to admin
      const { error: updateRoleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', userId)

      if (updateRoleError) {
        console.error('Error updating role to admin:', updateRoleError)
      }
      console.log('Updated existing role to admin in user_roles')
    }

    // Also ensure admin role exists in user_roles_dynamic for full compatibility
    // First, check/create the Admin role in roles table
    let adminRoleId: string | null = null
    const { data: existingAdminRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .ilike('name', 'admin')
      .maybeSingle()

    if (existingAdminRole) {
      adminRoleId = existingAdminRole.id
    } else {
      // Create the Admin role
      const { data: newRole, error: createRoleError } = await supabaseAdmin
        .from('roles')
        .insert({
          name: 'admin',
          display_name: 'Administrator',
          is_active: true
        })
        .select('id')
        .single()

      if (createRoleError) {
        console.error('Error creating Admin role:', createRoleError)
      } else {
        adminRoleId = newRole.id
        console.log('Created Admin role in roles table')
      }
    }

    // Insert into user_roles_dynamic if we have an admin role ID
    if (adminRoleId) {
      const { data: existingDynamicRole } = await supabaseAdmin
        .from('user_roles_dynamic')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', adminRoleId)
        .maybeSingle()

      if (!existingDynamicRole) {
        const { error: dynamicRoleError } = await supabaseAdmin
          .from('user_roles_dynamic')
          .insert({
            user_id: userId,
            role_id: adminRoleId
          })

        if (dynamicRoleError) {
          console.error('Error assigning dynamic admin role:', dynamicRoleError)
        } else {
          console.log('Assigned admin role to user_roles_dynamic')
        }
      }
    }

    console.log('Admin bootstrap completed successfully')

    // Mark admin as requiring password change
    await supabaseAdmin
      .from('profiles')
      .update({ requires_password_change: true })
      .eq('id', userId)

    console.log('Admin bootstrap completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin account created successfully',
        credentials: {
          userId: 'batman',
          password: '123456'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    console.error('Bootstrap admin error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to bootstrap admin account'
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
