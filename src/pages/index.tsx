import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect, useRef } from 'react'
import { type SimplifiedAlbum } from 'spotify-web-api-ts-edge/types/types/SpotifyObjects'
import {
  useDebounce,
  useIntersectionObserver,
  useLocalStorage,
} from 'usehooks-ts'
import SearchForm from '../components/app/SearchForm'
import SpotifyCard from '../components/app/SpotifyCard'
import Footer from '../components/ui/Footer'
import Header from '../components/ui/Header'
import useGetSearch from '../hooks/useGetSearch'
import { api } from '../utils/api'
import { ssrHelper } from '../utils/ssrHelper'
import { stringOrNull } from '../utils/stringOrNull'

interface Props {
  searchTerm: string | null
}

const searchLimit = 5

const generateLoadingData = (amount: number) => {
  const loadingData = []
  for (let i = 1; i <= amount; i++) {
    loadingData.push(<SpotifyCard cardData={null} key={i} />)
  }
  return loadingData
}

const loadingData = generateLoadingData(searchLimit * 3)

const SearchPage: NextPage<Props> = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) => {
  const router = useRouter()
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useIntersectionObserver(ref, {
    threshold: 0,
    rootMargin: '30%',
  })

  const [lastSearchTerm, setLastSearchTerm] = useLocalStorage(
    'lastSearchTerm',
    '',
  )

  const searchTerm = stringOrNull(
    props.searchTerm ? props.searchTerm : router.query.search,
  )
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const isUserTyping = searchTerm !== debouncedSearchTerm

  const searchOptions = {
    searchTerm: debouncedSearchTerm as string,
    enabled: Boolean(debouncedSearchTerm),
    limit: searchLimit,
  }

  const {
    data: allSearchData,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useGetSearch(searchOptions)

  useEffect(() => {
    if (inView?.isIntersecting && hasNextPage && !isFetching) {
      void fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, inView, isFetching])

  if (isError) {
    throw new Error(error.message)
  }

  const isLoadingFirstPage = (isFetching && !isFetchingNextPage) || isUserTyping
  const shouldDisplayLoadingData = (isFetching || isUserTyping) && searchTerm
  const searchData = allSearchData?.pages
  const shouldDisplayData = searchData && searchTerm && !isLoadingFirstPage

  useEffect(() => {
    if (shouldDisplayData) {
      setLastSearchTerm(searchTerm)
    }
  }, [searchTerm, setLastSearchTerm, shouldDisplayData])

  const utils = api.useContext()

  const lastSearchedPages = utils.spotify.getSearch.getInfiniteData({
    searchTerm: lastSearchTerm,
    limit: searchLimit,
  })?.pages

  const lastSearchedAlbums: SimplifiedAlbum[] = []
  if (lastSearchedPages) {
    for (let i = lastSearchedPages.length - 1; i >= 0; i--) {
      if (lastSearchedPages[i]?.albums) {
        lastSearchedPages[i]?.albums?.map(album => {
          if (album) {
            lastSearchedAlbums.push(album)
          }
        })
      }
    }
  }

  return (
    <>
      <Head>
        <title>Search Page</title>
        <meta
          name='description'
          content='You can search for albums, songs and artists from spotify.'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <div className='bg-dark-gray'>
        <div className='min-h-[calc(100vh_-_4em_-_5px)]'>
          <Header />
          <main className='flex min-h-max flex-col'>
            <div>
              <div className='mx-32 mb-8'>
                <SearchForm search={searchTerm} />
                {shouldDisplayData || shouldDisplayLoadingData ? (
                  <h1 className='my-4 mt-14 text-3xl text-white-gray'>
                    Results found for &quot;{searchTerm}&quot;
                  </h1>
                ) : searchTerm ? (
                  <h1 className='my-4 mt-14 text-3xl text-white-gray'>
                    No results found for &quot;{searchTerm}&quot;
                  </h1>
                ) : lastSearchedAlbums ? (
                  <h1 className='my-4 mt-14 text-3xl text-white-gray'>
                    Recently searched albums
                  </h1>
                ) : null}
              </div>
              <div className='m-auto flex w-5/6 flex-wrap justify-center gap-6 bg-dark-gray 2xl:w-11/12 2xl:gap-12'>
                {shouldDisplayData &&
                  searchData.flatMap((searchResults, index) => (
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
                {shouldDisplayLoadingData && loadingData}
                {!shouldDisplayData &&
                  !shouldDisplayLoadingData &&
                  lastSearchedAlbums?.map(album => (
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

                {!hasNextPage && !isFetching && 'Nothing more to load'}
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
