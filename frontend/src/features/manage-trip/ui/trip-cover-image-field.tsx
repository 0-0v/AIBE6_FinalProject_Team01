import { useEffect, useMemo } from 'react'
import { ImagePlusIcon, ShuffleIcon } from 'lucide-react'
import { resolveMediaUrl } from '@/shared/api/client'

export type TripCoverMode = 'preset' | 'upload'

type Props = {
    // 프리셋 스위치가 필요한 화면(예: 생성 모달)에서만 mode/onModeChange/presetUrl/onReroll을 넘긴다.
    // 넘기지 않으면(예: 기존 여행방 수정 모달) 지금까지와 동일하게 업로드 전용으로 동작한다.
    mode?: TripCoverMode
    onModeChange?: (mode: TripCoverMode) => void
    presetUrl?: string
    onReroll?: () => void
    file: File | null
    onFileChange: (file: File | null) => void
    currentImageUrl?: string | null
    disabled?: boolean
    compact?: boolean
}

const FALLBACK_IMAGE = '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg'

export function TripCoverImageField({
    mode,
    onModeChange,
    presetUrl,
    onReroll,
    file,
    onFileChange,
    currentImageUrl,
    disabled = false,
    compact = false,
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
        mode === 'preset'
            ? (presetUrl ?? FALLBACK_IMAGE)
            : (localPreviewUrl ??
              resolveMediaUrl(currentImageUrl) ??
              presetUrl ??
              FALLBACK_IMAGE)

    return (
        <section className={compact ? '' : 'mt-5'}>
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold">여행방 프로필 이미지</p>
                {onModeChange && (
                    <div className="flex gap-1 rounded-full bg-slate-100 p-1">
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onModeChange('preset')}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                                mode === 'preset'
                                    ? 'bg-white text-brand shadow-sm'
                                    : 'text-slate-500'
                            }`}
                        >
                            기본 이미지
                        </button>
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onModeChange('upload')}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                                mode === 'upload'
                                    ? 'bg-white text-brand shadow-sm'
                                    : 'text-slate-500'
                            }`}
                        >
                            직접 선택
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img
                    src={previewUrl}
                    alt="여행방 프로필 미리보기"
                    className={`${compact ? 'h-52 md:h-64' : 'h-40'} w-full object-cover`}
                />
            </div>

            {mode === 'preset' ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onReroll}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs font-extrabold text-brand-700 hover:bg-brand-100"
                >
                    <ShuffleIcon size={15} />
                    다른 사진
                </button>
            ) : (
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
            )}

            <p className="mt-1.5 text-[11px] text-slate-400">
                {mode === 'preset'
                    ? '기본 이미지가 자동으로 선택돼요. 마음에 안 들면 다른 사진을 눌러 바꿔보세요.'
                    : 'JPG, PNG, WEBP · 최대 10MB'}
            </p>
        </section>
    )
}
