import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react'
import { resolveMediaUrl } from '@/shared/api/client'

export type ImageGallery = { images: string[]; index: number }

export function displayTravelRecordImage(imageUrl: string) {
    return imageUrl.startsWith('/uploads/')
        ? (resolveMediaUrl(imageUrl) ?? imageUrl)
        : imageUrl
}

export function RecordPhotoGrid({
    images,
    onOpen,
}: {
    images: string[]
    onOpen: (images: string[], index: number) => void
}) {
    const visibleImages = images.slice(0, 3)
    const extraCount = images.length - visibleImages.length
    return (
        <div
            className={`mt-4 grid overflow-hidden rounded-xl bg-slate-100 ${
                visibleImages.length === 1
                    ? 'grid-cols-1'
                    : visibleImages.length === 2
                      ? 'grid-cols-2 gap-1'
                      : 'h-64 grid-cols-[2fr_1fr] grid-rows-2 gap-0.5'
            }`}
        >
            {visibleImages.map((image, index) => (
                <button
                    key={`${image}-${index}`}
                    onClick={() => onOpen(images, index)}
                    className={`relative overflow-hidden ${
                        visibleImages.length === 1
                            ? 'h-64'
                            : visibleImages.length === 2
                              ? 'h-52'
                              : index === 0
                                ? 'row-span-2 h-64'
                                : 'h-[127px]'
                    }`}
                    aria-label="여행 기록 사진 크게 보기"
                >
                    <img
                        src={displayTravelRecordImage(image)}
                        alt="여행 기록 사진"
                        className="h-full w-full object-cover"
                    />
                    {index === visibleImages.length - 1 && extraCount > 0 && (
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-lg font-extrabold text-white">
                            +{extraCount}
                        </span>
                    )}
                </button>
            ))}
        </div>
    )
}

export function RecordImageGalleryModal({
    gallery,
    onChange,
    onClose,
}: {
    gallery: ImageGallery
    onChange: (gallery: ImageGallery) => void
    onClose: () => void
}) {
    const currentIndex = Math.min(gallery.index, gallery.images.length - 1)
    const move = (offset: number) => {
        const nextIndex =
            (currentIndex + offset + gallery.images.length) %
            gallery.images.length
        onChange({ ...gallery, index: nextIndex })
    }

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="여행 기록 사진 미리보기"
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute right-5 top-5 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25"
                aria-label="사진 미리보기 닫기"
            >
                <XIcon size={22} />
            </button>
            {gallery.images.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            move(-1)
                        }}
                        className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:left-8"
                        aria-label="이전 사진"
                    >
                        <ChevronLeftIcon size={26} />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            move(1)
                        }}
                        className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:right-8"
                        aria-label="다음 사진"
                    >
                        <ChevronRightIcon size={26} />
                    </button>
                </>
            )}
            <div
                className="flex max-h-[88dvh] max-w-[calc(100vw-120px)] flex-col items-center"
                onClick={(event) => event.stopPropagation()}
            >
                <img
                    src={displayTravelRecordImage(gallery.images[currentIndex])}
                    alt={`${currentIndex + 1}번째 여행 기록 사진`}
                    className="max-h-[78dvh] max-w-full rounded-2xl object-contain shadow-2xl"
                />
                <div className="mp-scroll mt-4 flex max-w-full snap-x gap-2 overflow-x-auto rounded-2xl bg-slate-950/35 p-2">
                    {gallery.images.map((image, index) => (
                        <button
                            key={`${image}-${index}`}
                            type="button"
                            onClick={() => onChange({ ...gallery, index })}
                            className={`h-14 w-14 shrink-0 snap-center overflow-hidden rounded-xl border-2 transition ${index === currentIndex ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            aria-label={`${index + 1}번째 사진 보기`}
                        >
                            <img
                                src={displayTravelRecordImage(image)}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        </button>
                    ))}
                </div>
                <span className="mt-2 text-xs font-bold text-white/75">
                    {currentIndex + 1} / {gallery.images.length}
                </span>
            </div>
        </div>
    )
}
