import { ClerkProvider } from '@clerk/nextjs'
import ErrorBoundary from '@components/hoc/ErrorBoundary'
import usePersistQueryClient from '@hooks/usePersistQueryClient'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Analytics } from '@vercel/analytics/react'
import { type AppType } from 'next/app'
import { lazy, Suspense, useState } from 'react'
import { useEffectOnce } from 'usehooks-ts'
import { useSSRIntercept } from '../hooks/useSSRIntercept'
import '../styles/globals.css'
import { api } from '../utils/api'

const ReactQueryDevtoolsProduction = lazy(() =>
  import('@tanstack/react-query-devtools/build/lib/index.prod.js').then(d => ({
    default: d.ReactQueryDevtools,
  })),
)

const MyApp: AppType = ({ Component, pageProps: { ...pageProps } }) => {
  useSSRIntercept() // makes all gssp run only once
  usePersistQueryClient()
  // this way the react query devtools can be downloaded in production using window.toggleDevtools() on console
  const [showDevtools, setShowDevtools] = useState(false)
  useEffectOnce(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.toggleDevtools = () => setShowDevtools(old => !old)
  })

  return (
    <>
      <ClerkProvider {...pageProps}>
        <ErrorBoundary>
          <Component {...pageProps} />
        </ErrorBoundary>
        <ReactQueryDevtools initialIsOpen={false} position='bottom-right' />
        {showDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtoolsProduction />
          </Suspense>
        )}
      </ClerkProvider>
      <Analytics />
    </>
  )
}

export { reportWebVitals } from 'next-axiom'
export default api.withTRPC(MyApp)
