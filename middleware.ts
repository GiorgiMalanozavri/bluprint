import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Define public routes that don't require authentication
    const publicRoutes = ['/', '/pricing', '/sign-in', '/sign-up', '/auth/callback', '/privacy']
    const isPublicRoute = publicRoutes.some(route =>
        request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith('/auth/')
    )

    // If user is not authenticated and trying to access a protected route, redirect to sign-in
    if (!user && !isPublicRoute) {
        const redirectUrl = new URL('/sign-in', request.url)
        return NextResponse.redirect(redirectUrl)
    }

    // If user is authenticated and trying to access sign-in or sign-up, redirect to dashboard
    if (user && (request.nextUrl.pathname === '/sign-in' || request.nextUrl.pathname === '/sign-up')) {
        const redirectUrl = new URL('/dashboard', request.url)
        return NextResponse.redirect(redirectUrl)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
