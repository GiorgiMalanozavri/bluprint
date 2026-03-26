'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getUserId() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
}

export async function saveResume(params: {
    id?: string;
    name: string;
    data: any;
    settings: any;
    score?: number;
}) {
    const userId = await getUserId()
    if (!userId) return { error: "Unauthorized" }

    const { id, name, data, settings, score } = params

    try {
        // ENSURE USER EXISTS IN PRISMA (Sync with Supabase)
        // Since we are using Supabase Auth, the userId is a Supabase UUID.
        // We'll upsert the user record in our local Prisma DB.
        const supabase = createClient()
        const { data: { user: sbUser } } = await supabase.auth.getUser()

        if (sbUser) {
            await prisma.user.upsert({
                where: { email: sbUser.email || "" },
                update: { name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] },
                create: {
                    id: userId, // Use Supabase ID
                    email: sbUser.email || "",
                    name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0]
                }
            })
        }

        if (id) {
            // Update existing
            const updated = await prisma.resume.update({
                where: { id, userId },
                data: {
                    name,
                    data: JSON.stringify(data),
                    settings: JSON.stringify(settings),
                    score: score ?? null,
                }
            })
            revalidatePath('/resume')
            revalidatePath('/dashboard')
            return { success: true, id: updated.id }
        } else {
            // Create new
            const created = await prisma.resume.create({
                data: {
                    userId,
                    name,
                    data: JSON.stringify(data),
                    settings: JSON.stringify(settings),
                    score: score ?? null,
                }
            })
            revalidatePath('/resume')
            revalidatePath('/dashboard')
            return { success: true, id: created.id }
        }
    } catch (error: any) {
        console.error("Save Resume Error:", error)
        return { error: error.message || "Failed to save resume" }
    }
}

export async function getResumes() {
    const userId = await getUserId()
    if (!userId) return { error: "Unauthorized" }

    try {
        const resumes = await prisma.resume.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
        })

        return {
            resumes: resumes.map(r => ({
                ...r,
                data: JSON.parse(r.data),
                settings: JSON.parse(r.settings)
            }))
        }
    } catch (error: any) {
        console.error("Get Resumes Error:", error)
        return { error: "Failed to fetch resumes" }
    }
}

export async function getResumeById(id: string) {
    const userId = await getUserId()
    if (!userId) return { error: "Unauthorized" }

    try {
        const resume = await prisma.resume.findFirst({
            where: { id, userId }
        })

        if (!resume) return { error: "Resume not found" }

        return {
            resume: {
                ...resume,
                data: JSON.parse(resume.data),
                settings: JSON.parse(resume.settings)
            }
        }
    } catch (error: any) {
        console.error("Get Resume By ID Error:", error)
        return { error: "Failed to fetch resume" }
    }
}

export async function deleteResume(id: string) {
    const userId = await getUserId()
    if (!userId) return { error: "Unauthorized" }

    try {
        await prisma.resume.delete({
            where: { id, userId }
        })
        revalidatePath('/resume')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error("Delete Resume Error:", error)
        return { error: "Failed to delete resume" }
    }
}
