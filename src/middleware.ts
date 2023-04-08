import { getAuth, withClerkMiddleware } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Set the paths that don't require the user to be signed in
const publicPaths = ['/', '/auth*']

const isPublic = (path: string) => {
  return publicPaths.find(x =>
    path.match(new RegExp(`^${x}$`.replace('*$', '($|/)'))),
  )
}

export default withClerkMiddleware((request: NextRequest) => {
  const response = NextResponse.next()
  const ONE_DAY_IN_SECONDS = 60 * 60 * 24
  const MAX_CACHE_TIME = ONE_DAY_IN_SECONDS * 31

  response.headers.set(
    "x-modified-edge",
    "true"
  )
  response.headers.set(
    'cache-control',
    `s-maxage=${MAX_CACHE_TIME}, stale-while-revalidate=${MAX_CACHE_TIME}`
  )

  if (isPublic(request.nextUrl.pathname)) {
    return NextResponse.next()
  }
  // if the user is not signed in redirect them to the sign in page.
  const { userId } = getAuth(request)

  if (!userId) {
    // redirect the users to /pages/sign-in/[[...index]].ts

    const signInUrl = new URL('/auth/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', request.url)
    return NextResponse.redirect(signInUrl)
  }
  return NextResponse.next()
})

export const config = {
  matcher: '/((?!_next/image|_next/static|favicon.ico).*)',
}