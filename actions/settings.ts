'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function updateUserProfile(formData: FormData) {
    const supabase = createClient()

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const country = (formData.get('country') as string)?.trim() || null

    const metadata: Record<string, string | null> = { name }
    if (country !== undefined) metadata.country = country || null

    const { error } = await supabase.auth.updateUser({
        email: email,
        data: metadata
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateUserCountry(country: string | null) {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
        data: { country: country || null }
    })
    if (error) return { error: error.message }
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updatePassword(formData: FormData) {
    const supabase = createClient()

    const password = formData.get('password') as string

    if (password.length < 6) {
        return { error: 'Password must be at least 6 characters' }
    }

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function deleteAccount(confirmation: string) {
    if (confirmation !== 'DELETE') {
        return { error: 'Please type DELETE to confirm' }
    }

    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Delete user account
    const { error } = await supabase.auth.admin.deleteUser(user.id)

    if (error) {
        return { error: error.message }
    }

    // Sign out and redirect
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/')
}
