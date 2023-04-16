import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  NextPage,
} from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import Footer from '../../components/Footer'
import Header from '../../components/Header'
import SearchForm from '../../components/SearchForm'
import SpotifyCard from '../../components/SpotifyCard'
import useDebounce from '../../hooks/useDebounce'
import useGetSearch from '../../hooks/useGetSearch'
import { useScrollRestoration } from '../../hooks/useScrollRestoration'
import { generateSSGHelper } from '../../utils/ssgHelper'
import { stringOrNull } from '../../utils/stringOrNull'

const searchLimit = 5

const generateLoadingData = (amount: number) => {
  const loadingData = []
  for (let i = 1; i < amount; i++) {
    loadingData.push(<SpotifyCard cardData={null} key={i} />)
  }
  return loadingData
}

const loadingData = generateLoadingData(searchLimit * 3)

const SearchPage: NextPage = () => {

  useScrollRestoration()
  const router = useRouter()
  const { ref, inView } = useInView({
    threshold: 0,
  });

  const searchTerm = stringOrNull(router.query?.search)
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const isTyping = searchTerm !== debouncedSearchTerm

  const searchOptions = {
    searchTerm: debouncedSearchTerm as string,
    enabled: Boolean(debouncedSearchTerm),
    limit: searchLimit,
  }

  const { data: useSearchData, isError, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } = useGetSearch(searchOptions)

  const isLoadingFirstPage = (isFetching && !isFetchingNextPage) || isTyping
  const shouldDisplayLoadingData = (isFetching || isTyping) && searchTerm
  const shouldDisplayData = useSearchData && searchTerm && !isError && !isLoadingFirstPage

  const searchData = useSearchData?.pages

  useEffect(() => {
    if (inView && !isFetchingNextPage && hasNextPage) {
      void fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])

  return (
    <>
      <Head>
        <title>Página de busca</title>
        <meta name='description' content='Generated by create-t3-app' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <div className='bg-dark-gray'>
        <div className='min-h-[calc(100vh_-_4em_-_5px)]'>
          <Header />
          <main className='flex min-h-max flex-col'>
            <div>
              <div className='mx-32 mb-8'>
                <SearchForm search={searchTerm} />
                <h2 className='my-4 mt-14 text-3xl text-white-gray'>
                  Álbuns buscados recentemente
                </h2>
              </div>
              <div className='m-auto flex w-5/6 flex-wrap justify-center gap-6 bg-dark-gray 2xl:w-11/12 2xl:gap-12'>
                {shouldDisplayData && searchData?.flatMap((searchResults, index) => (
                  <React.Fragment key={index}>
                    {searchResults.albums?.map(album => (
                      <SpotifyCard cardData={album} key={album.id} />
                    ))}
                    {searchResults.tracks?.map(track => (
                      <SpotifyCard cardData={track} key={track.id} />
                    ))}
                    {searchResults.artists?.map(artist => (
                      <SpotifyCard cardData={artist} key={artist.id} />
                    ))}
                  </React.Fragment>
                ))}
                {shouldDisplayLoadingData && loadingData}
              </div>
            </div>
          </main>
        </div>
        <div ref={ref}>
          <Footer />
        </div>
      </div>
    </>
  )
}

export const runtime = 'experimental-edge'

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const searchTerm = stringOrNull(context.query.search)

  if (!searchTerm || searchTerm.length < 1) {
    return { props: {} }
  }

  const ssg = generateSSGHelper(context)
  await ssg.spotify.getSearch.prefetchInfinite({
    searchTerm,
    limit: searchLimit
  })

  return {
    props: {
      trpcState: ssg.dehydrate(),
    },
  }
}

export default SearchPage
