import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import Footer from '../components/ui/Footer'
import Header from '../components/ui/Header'
import SearchForm from '../components/app/SearchForm'
import SpotifyCard from '../components/app/SpotifyCard'
import useDebounce from '../hooks/useDebounce'
import useGetSearch from '../hooks/useGetSearch'
import { useScrollRestoration } from '../hooks/useScrollRestoration'
import { api } from '../utils/api'
import { ssrHelper } from '../utils/ssrHelper'
import { stringOrNull } from '../utils/stringOrNull'

interface Props {
  searchTerm: string | null
}

const searchLimit = 5

const generateLoadingData = (amount: number) => {
  const loadingData = []
  for (let i = 1; i < amount; i++) {
    loadingData.push(<SpotifyCard cardData={null} key={i} />)
  }
  return loadingData
}

const loadingData = generateLoadingData(searchLimit * 3)

const SearchPage: NextPage<Props> = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) => {
  useScrollRestoration()
  const router = useRouter()
  const { ref, inView } = useInView({
    threshold: 0,
  })

  const searchTerm = stringOrNull(
    props.searchTerm ? props.searchTerm : router.query.search,
  )
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const isTyping = searchTerm !== debouncedSearchTerm

  const searchOptions = {
    searchTerm: debouncedSearchTerm as string,
    enabled: Boolean(debouncedSearchTerm),
    limit: searchLimit,
  }

  const {
    data: useSearchData,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useGetSearch(searchOptions)

  useEffect(() => {
    if (inView && hasNextPage) {
      void fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])

  if (isError) {
    throw new Error(error.message)
  }

  const isLoadingFirstPage = (isFetching && !isFetchingNextPage) || isTyping
  const shouldDisplayLoadingData = (isFetching || isTyping) && searchTerm
  const shouldDisplayData = useSearchData && searchTerm && !isLoadingFirstPage

  const searchData = useSearchData?.pages

  const utils = api.useContext()

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
                {shouldDisplayData &&
                  searchData?.flatMap((searchResults, index) => (
                    <React.Fragment key={index}>
                      {searchResults.albums?.map(album => (
                        <div
                          key={album.id}
                          onMouseEnter={() => {
                            void utils.spotify.getAlbumTracks.prefetchInfinite({
                              albumId: album.id,
                              limit: 15,
                            })
                          }}
                        >
                          <SpotifyCard cardData={album} key={album.id} />
                        </div>
                      ))}
                      {searchResults.tracks?.map(track => (
                        <div key={track.id}>
                          <SpotifyCard cardData={track} key={track.id} />
                        </div>
                      ))}
                      {searchResults.artists?.map(artist => (
                        <div
                          key={artist.id}
                          onMouseEnter={() => {
                            void utils.spotify.getArtistAlbums.prefetchInfinite(
                              { artistId: artist.id, limit: 15 },
                            )
                          }}
                        >
                          <SpotifyCard cardData={artist} />
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                {shouldDisplayLoadingData
                  ? loadingData
                  : !hasNextPage && 'Nothing more to load'}
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

export const getServerSideProps: GetServerSideProps<Props> = async (
  context: GetServerSidePropsContext,
) => {
  const searchTerm = stringOrNull(context.query.search)
  if (!searchTerm || searchTerm.length < 1) {
    return { props: { searchTerm: null } }
  }

  const trpc = ssrHelper(context)
  await trpc.spotify.getSearch.prefetchInfinite({
    searchTerm,
    limit: searchLimit,
  })

  return {
    props: {
      trpcState: trpc.dehydrate(),
      searchTerm,
    },
  }
}

export default SearchPage
