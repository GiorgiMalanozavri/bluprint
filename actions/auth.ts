'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
    const supabase = createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/dashboard', 'layout')

    return { success: true }
}

export async function signup(formData: FormData) {
    const supabase = createClient()

    const country = (formData.get('country') as string)?.trim() || null
    const name = (formData.get('name') as string)?.trim() || null

    const { error } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            data: {
                ...(country && { country }),
                ...(name && { full_name: name }),
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/dashboard', 'layout')

    return { success: true }
}

export async function signInWithOAuth(provider: 'google' | 'github' | 'apple') {
    const supabase = createClient()
    const origin = headers().get('origin')

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    if (data.url) {
        redirect(data.url)
    }
}

export async function signout() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
        console.error('Signout error:', error)
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}
