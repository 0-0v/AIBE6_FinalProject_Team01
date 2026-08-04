'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLinkIcon, ImageOffIcon } from 'lucide-react'
import { getPlacePhotoMetadata, type PlacePhotoMetadata } from '@/entities/trip'
import { resolveGooglePlacePhotoUrl } from '@/shared/api/client'

// 완료된 메타데이터 결과를 세션 내내 보관 — 같은 장소를 다시 선택해도 재요청하지 않는다.
const resolvedPhotoMetadata = new Map<string, PlacePhotoMetadata>()
// 진행 중인 요청을 공유해 동시 중복 요청을 방지한다.
const pendingPhotoMetadataRequests = new Map<
    string,
    Promise<PlacePhotoMetadata>
>()

type Props = {
    placeId: string
    googlePlaceId: string
    placeName: string
    onPhotoResolved?: (
        placeId: string,
        photoUrl: string,
        attribution: string | null,
        attributionUrl: string | null,
        sourceUrl: string,
    ) => void
    variant?: 'map' | 'card'
}

export function LazyPlacePhoto({
    placeId,
    googlePlaceId,
    placeName,
    onPhotoResolved,
    variant = 'map',
}: Props) {
    const [metadata, setMetadata] = useState<PlacePhotoMetadata | null>(null)
    const [failed, setFailed] = useState(false)
    const onPhotoResolvedRef = useRef(onPhotoResolved)

    useEffect(() => {
        onPhotoResolvedRef.current = onPhotoResolved
    }, [onPhotoResolved])

    useEffect(() => {
        let cancelled = false

        function applyMetadata(nextMetadata: PlacePhotoMetadata) {
            if (cancelled) return
            setMetadata(nextMetadata)
            const photoUrl = resolveGooglePlacePhotoUrl(nextMetadata.photoName)
            const firstAuthor = nextMetadata.authorAttributions.find(
                (candidate) => candidate.displayName,
            )
            if (photoUrl && nextMetadata.googleMapsUri) {
                onPhotoResolvedRef.current?.(
                    placeId,
                    photoUrl,
                    firstAuthor?.displayName ?? null,
                    firstAuthor?.uri ?? null,
                    nextMetadata.googleMapsUri,
                )
            }
        }

        // 이미 완료된 결과가 있으면 API 호출 없이 바로 적용
        const resolved = resolvedPhotoMetadata.get(googlePlaceId)
        if (resolved) {
            applyMetadata(resolved)
            return () => { cancelled = true }
        }

        // 진행 중인 요청이 있으면 그 결과를 공유, 없으면 새로 요청
        const pending = pendingPhotoMetadataRequests.get(googlePlaceId)
        const request = pending ?? getPlacePhotoMetadata(googlePlaceId)
        if (!pending) {
            pendingPhotoMetadataRequests.set(googlePlaceId, request)
            void request
                .finally(() => {
                    if (pendingPhotoMetadataRequests.get(googlePlaceId) === request) {
                        pendingPhotoMetadataRequests.delete(googlePlaceId)
                    }
                })
                .catch(() => {})
        }

        void request
            .then((nextMetadata) => {
                resolvedPhotoMetadata.set(googlePlaceId, nextMetadata)
                applyMetadata(nextMetadata)
            })
            .catch(() => {
                if (!cancelled) setFailed(true)
            })

        return () => {
            cancelled = true
        }
    }, [googlePlaceId, placeId])

    const googlePhotoUrl = resolveGooglePlacePhotoUrl(metadata?.photoName)
    const author = metadata?.authorAttributions.find(
        (candidate) => candidate.displayName,
    )

    if (failed) {
        return (
            <div
                className={`flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400 ${
                    variant === 'card' ? 'h-16 w-16' : 'h-20 w-full text-[10px]'
                }`}
            >
                <ImageOffIcon size={variant === 'card' ? 16 : 18} aria-hidden />
                {variant === 'map' && (
                    <span>장소 사진을 불러오지 못했어요</span>
                )}
            </div>
        )
    }

    if (!googlePhotoUrl) {
        return (
            <div
                className={`animate-pulse bg-slate-200 ${
                    variant === 'card' ? 'h-16 w-16' : 'h-20 w-full'
                }`}
                role="status"
                aria-label={`${placeName} 사진 불러오는 중`}
            />
        )
    }

    return (
        <div className="relative bg-slate-100">
            <img
                src={googlePhotoUrl}
                alt={placeName}
                className={
                    variant === 'card'
                        ? 'h-16 w-16 object-cover'
                        : 'h-20 w-full object-cover'
                }
                onError={() => setFailed(true)}
            />
            {metadata?.googleMapsUri && (
                <div
                    className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-slate-950/65 text-white ${
                        variant === 'card'
                            ? 'px-1 py-0.5 text-[7px]'
                            : 'px-2 py-1 text-[9px]'
                    }`}
                >
                    {author?.uri ? (
                        <a
                            href={author.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:underline"
                            onClick={(event) => event.stopPropagation()}
                        >
                            사진: {author.displayName ?? '제공자'}
                        </a>
                    ) : (
                        <span className="truncate">
                            {author?.displayName
                                ? `사진: ${author.displayName}`
                                : 'Google Maps 사진'}
                        </span>
                    )}
                    <a
                        href={metadata.googleMapsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`shrink-0 items-center gap-0.5 font-bold hover:underline ${
                            variant === 'card' ? 'hidden' : 'flex'
                        }`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        원본
                        <ExternalLinkIcon size={9} aria-hidden />
                    </a>
                </div>
            )}
        </div>
    )
}
