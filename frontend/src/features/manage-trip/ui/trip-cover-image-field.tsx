import { useEffect, useMemo } from 'react'
import { ImagePlusIcon } from 'lucide-react'
import { resolveMediaUrl } from '@/shared/api/client'

type Props = {
    file: File | null
    currentImageUrl?: string | null
    disabled?: boolean
    onFileChange: (file: File | null) => void
}

export function TripCoverImageField({
    file,
    currentImageUrl,
    disabled = false,
    onFileChange,
}: Props) {
    const localPreviewUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    )
    useEffect(
        () => () => {
            if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
        },
        [localPreviewUrl],
    )
    const previewUrl =
        localPreviewUrl ??
        resolveMediaUrl(currentImageUrl) ??
        '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg'

    return (
        <section className="mt-5">
            <p className="text-sm font-bold">여행방 프로필 이미지</p>
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img
                    src={previewUrl}
                    alt="여행방 프로필 미리보기"
                    className="h-40 w-full object-cover"
                />
            </div>
            <div className="mt-2 flex gap-2">
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs font-extrabold text-brand-700 hover:bg-brand-100">
                    <ImagePlusIcon size={15} />
                    {file ? '다른 이미지 선택' : '이미지 선택'}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={disabled}
                        className="sr-only"
                        onChange={(event) => {
                            onFileChange(event.target.files?.[0] ?? null)
                            event.target.value = ''
                        }}
                    />
                </label>
                {file && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onFileChange(null)}
                        className="rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-500"
                    >
                        선택 취소
                    </button>
                )}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
                JPG, PNG, WEBP · 최대 10MB
            </p>
        </section>
    )
}
