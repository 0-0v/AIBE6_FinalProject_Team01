import React, { useEffect, useRef, useState } from 'react'
import {
    PencilIcon,
    AlertTriangleIcon,
    CameraIcon,
    ChevronRightIcon,
    XIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, DEFAULT_AVATAR_COLOR } from '@/shared/ui'
import { useCurrentUserStore } from '@/shared/model'
import { resolveMediaUrl } from '@/shared/api/client'
import {
    checkNicknameAvailability,
    useProfileStore,
    withdrawAccount,
} from '@/features/manage-profile'
import { useTripStore } from '@/features/manage-trip'

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_PROFILE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const PROVIDER_LABEL: Record<string, string> = {
    GOOGLE: 'Google',
    KAKAO: '카카오',
    NAVER: '네이버',
    APPLE: 'Apple',
}

const WITHDRAWAL_REASON_HELP: Record<string, string> = {
    recreate:
        '개인정보 보관기간이 끝난 후 같은 이메일 또는 소셜 계정으로 다시 가입할 수 있어요.',
    difficult:
        '여행방과 일정 기능을 더 쉽게 사용할 수 있도록 계속 개선하고 있어요.',
    missing: '필요한 기능에 대한 의견은 서비스 개선에 큰 도움이 됩니다.',
    notifications: '알림이 불편했다면 여행방별 알림 설정을 조정할 수 있어요.',
    privacy:
        '탈퇴 후 작성 기록에는 개인정보 대신 ‘탈퇴한 사용자’가 표시됩니다.',
    other: '그동안 서비스를 이용해 주셔서 감사합니다.',
}

export function MyPage() {
    const navigate = useNavigate()
    const currentUser = useCurrentUserStore((state) => state.currentUser)
    const {
        changeNickname,
        changeProfileImage,
        isUpdatingNickname,
        isUploadingImage,
    } = useProfileStore()
    const { trips, isLoading, error: tripError, loadTrips } = useTripStore()
    const me = {
        name: currentUser?.nickname ?? '게스트',
        avatarColor: DEFAULT_AVATAR_COLOR,
        imageUrl: resolveMediaUrl(currentUser?.profileImageUrl),
    }
    const loginProviderLabel = currentUser
        ? PROVIDER_LABEL[currentUser.provider]
        : '로그인 필요'
    const [draft, setDraft] = useState(me.name)
    const [editing, setEditing] = useState(false)
    const [error, setError] = useState('')
    const [checkedNickname, setCheckedNickname] = useState('')
    const [isCheckingNickname, setIsCheckingNickname] = useState(false)
    const [imageError, setImageError] = useState('')
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
    const [isWithdrawing, setIsWithdrawing] = useState(false)
    const [withdrawError, setWithdrawError] = useState('')
    const [withdrawReason, setWithdrawReason] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (currentUser) void loadTrips()
    }, [currentUser, loadTrips])

    async function saveNickname() {
        const v = draft.trim()
        if (v.length < 2 || v.length > 12) {
            setError('닉네임은 2~12자로 입력해주세요')
            return
        }
        if (!/^[가-힣a-zA-Z0-9_]+$/.test(v)) {
            setError('한글, 영문, 숫자, _만 사용할 수 있어요')
            return
        }
        if (checkedNickname !== v) {
            setError('닉네임 중복 확인을 완료해 주세요')
            return
        }
        try {
            await changeNickname(v)
            setError('')
            setEditing(false)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : '닉네임 변경에 실패했어요',
            )
        }
    }

    async function checkNickname() {
        const v = draft.trim()
        if (v.length < 2 || v.length > 12) {
            setError('닉네임은 2~12자로 입력해주세요')
            return
        }
        if (!/^[가-힣a-zA-Z0-9_]+$/.test(v)) {
            setError('한글, 영문, 숫자, _만 사용할 수 있어요')
            return
        }

        setIsCheckingNickname(true)
        try {
            const available = await checkNicknameAvailability(v)
            if (!available) {
                setCheckedNickname('')
                setError('이미 사용 중인 닉네임입니다')
                return
            }
            setCheckedNickname(v)
            setError('')
        } catch (err) {
            setCheckedNickname('')
            setError(
                err instanceof Error
                    ? err.message
                    : '닉네임 중복 확인에 실패했어요',
            )
        } finally {
            setIsCheckingNickname(false)
        }
    }

    async function handleProfileImageSelect(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
            setImageError('jpg, png, webp 이미지만 업로드할 수 있어요')
            return
        }
        if (file.size > MAX_PROFILE_IMAGE_SIZE) {
            setImageError('이미지 파일은 5MB 이하만 업로드할 수 있어요')
            return
        }

        try {
            await changeProfileImage(file)
            setImageError('')
        } catch (err) {
            setImageError(
                err instanceof Error
                    ? err.message
                    : '프로필 이미지 등록에 실패했어요',
            )
        }
    }

    async function handleWithdraw() {
        setIsWithdrawing(true)
        setWithdrawError('')
        try {
            await withdrawAccount()
            navigate('/login', { replace: true })
        } catch (err) {
            setWithdrawError(
                err instanceof Error ? err.message : '회원 탈퇴에 실패했어요',
            )
        } finally {
            setIsWithdrawing(false)
        }
    }

    function openWithdrawModal() {
        setWithdrawReason('')
        setWithdrawError('')
        setIsWithdrawModalOpen(true)
    }

    function closeWithdrawModal() {
        if (isWithdrawing) return
        setIsWithdrawModalOpen(false)
    }

    return (
        <div className="min-h-full bg-[var(--color-app-background)] px-5 py-7 sm:px-9">
            <div className="mx-auto max-w-3xl">
                <p className="text-xs font-extrabold tracking-[0.12em] text-brand-700">
                    ACCOUNT
                </p>
                <h1 className="mb-8 mt-1 text-3xl font-extrabold tracking-[-0.05em] text-slate-950">
                    마이페이지
                </h1>

                {/* Profile */}
                <section className="mb-8 rounded-[22px] border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                            <Avatar
                                name={me.name}
                                color={me.avatarColor}
                                imageUrl={me.imageUrl}
                                size={64}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingImage}
                                aria-label="프로필 이미지 변경"
                                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-sm hover:bg-slate-700 disabled:opacity-50"
                            >
                                <CameraIcon size={12} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleProfileImageSelect}
                            />
                        </div>
                        <div className="flex-1">
                            {editing ? (
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            autoFocus
                                            value={draft}
                                            onChange={(e) => {
                                                setDraft(e.target.value)
                                                setCheckedNickname('')
                                                setError('')
                                            }}
                                            className={`w-48 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                                                error
                                                    ? 'border-red-400 focus:ring-red-100'
                                                    : 'border-slate-300 focus:ring-brand-100'
                                            }`}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => void checkNickname()}
                                            disabled={
                                                isCheckingNickname ||
                                                !draft.trim()
                                            }
                                            className="whitespace-nowrap rounded-xl border border-brand px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isCheckingNickname
                                                ? '확인 중'
                                                : '중복 확인'}
                                        </button>

                                        <button
                                            onClick={() => void saveNickname()}
                                            disabled={isUpdatingNickname}
                                            className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            저장
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditing(false)
                                                setDraft(me.name)
                                                setCheckedNickname('')
                                                setError('')
                                            }}
                                            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                                        >
                                            취소
                                        </button>
                                    </div>
                                    {error && (
                                        <p className="mt-1.5 text-xs font-medium text-red-500">
                                            {error}
                                        </p>
                                    )}
                                    {!error &&
                                        checkedNickname === draft.trim() && (
                                            <p className="mt-1.5 text-xs font-medium text-emerald-600">
                                                사용 가능한 닉네임입니다.
                                            </p>
                                        )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold">
                                        {me.name}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setDraft(me.name)
                                            setCheckedNickname('')
                                            setError('')
                                            setEditing(true)
                                        }}
                                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                                    >
                                        <PencilIcon size={13} /> 닉네임 변경
                                    </button>
                                </div>
                            )}
                            {imageError && (
                                <p className="mt-1 text-xs font-medium text-red-500">
                                    {imageError}
                                </p>
                            )}
                            <p className="mt-0.5 text-sm text-slate-500">
                                {loginProviderLabel} 계정으로 로그인됨
                            </p>
                        </div>
                    </div>
                </section>

                {/* Trips with public toggle */}
                <section className="mb-8">
                    <h2 className="mb-3 text-lg font-bold">
                        내가 참여 중인 여행방
                    </h2>
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm">
                        {isLoading && (
                            <p className="px-5 py-8 text-center text-sm font-medium text-slate-400">
                                여행방을 불러오는 중입니다.
                            </p>
                        )}
                        {!isLoading && tripError && (
                            <div className="px-5 py-8 text-center">
                                <p className="text-sm font-medium text-red-500">
                                    {tripError}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void loadTrips()}
                                    className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
                                >
                                    다시 시도
                                </button>
                            </div>
                        )}
                        {!isLoading && !tripError && trips.length === 0 && (
                            <p className="px-5 py-8 text-center text-sm font-medium text-slate-400">
                                참여 중인 여행방이 없습니다.
                            </p>
                        )}
                        {!isLoading &&
                            !tripError &&
                            trips.map((trip) => (
                                <div
                                    key={trip.id}
                                    className="flex items-center gap-3 px-5 py-4"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium">
                                            {trip.title}
                                        </div>
                                        <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                            {trip.ownerId === currentUser?.id
                                                ? '방장'
                                                : '참여 멤버'}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(`/app/room/${trip.id}`)
                                        }
                                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50"
                                    >
                                        여행방 열기
                                        <ChevronRightIcon size={14} />
                                    </button>
                                </div>
                            ))}
                    </div>
                </section>

                {/* Danger zone */}
                <section className="rounded-[22px] border border-red-100 bg-red-50/50 p-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangleIcon
                            size={20}
                            className="mt-0.5 text-red-500"
                        />
                        <div>
                            <h2 className="font-bold text-red-700">
                                회원 탈퇴
                            </h2>
                            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-red-600/80">
                                <li>
                                    개인정보는 개인정보처리방침에 따라
                                    보관·파기됩니다.
                                </li>
                                <li>
                                    탈퇴 후 90일간 동일 계정으로 재가입할 수
                                    없습니다.
                                </li>
                                <li>
                                    익명화된 개인정보는 다시 복구할 수 없습니다.
                                </li>
                                <li>
                                    공동 여행방에 공유한 기록은 삭제되지 않고
                                    작성자만 ‘탈퇴한 사용자’로 표시됩니다.
                                </li>
                            </ol>
                            <button
                                type="button"
                                onClick={openWithdrawModal}
                                className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                                탈퇴하기
                            </button>
                        </div>
                    </div>
                </section>
            </div>
            {isWithdrawModalOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-5 py-8"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="withdraw-title"
                >
                    <div className="relative w-full max-w-[520px] rounded-[28px] bg-white px-7 py-8 shadow-2xl sm:px-9">
                        <button
                            type="button"
                            onClick={closeWithdrawModal}
                            disabled={isWithdrawing}
                            aria-label="회원 탈퇴 팝업 닫기"
                            className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                        >
                            <XIcon size={20} />
                        </button>
                        <h2
                            id="withdraw-title"
                            className="pr-8 text-xl font-extrabold leading-7 text-slate-950"
                        >
                            {me.name}님과 이별인가요?
                            <br />
                            너무 아쉬워요
                        </h2>
                        <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-4">
                            <h3 className="text-sm font-extrabold text-slate-900">
                                회원탈퇴 안내
                            </h3>
                            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
                                <li>
                                    개인정보는 개인정보처리방침에 따라
                                    보관·파기됩니다.
                                </li>
                                <li>
                                    탈퇴 후 90일간 동일 이메일 또는 소셜
                                    계정으로 재가입할 수 없습니다.
                                </li>
                                <li>
                                    익명화된 개인정보는 다시 복구할 수 없습니다.
                                </li>
                                <li>
                                    공동 여행방에 공유한 여행·일정·댓글 등의
                                    기록은 삭제되지 않고 작성자만 ‘탈퇴한
                                    사용자’로 표시됩니다.
                                </li>
                            </ol>
                        </div>

                        <label
                            htmlFor="withdraw-reason"
                            className="mt-7 block text-sm font-extrabold text-slate-900"
                        >
                            {me.name}님이 탈퇴하려는 이유가 궁금해요.
                        </label>
                        <select
                            id="withdraw-reason"
                            value={withdrawReason}
                            onChange={(event) =>
                                setWithdrawReason(event.target.value)
                            }
                            disabled={isWithdrawing}
                            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-slate-50"
                        >
                            <option value="">탈퇴 사유를 선택해 주세요</option>
                            <option value="recreate">
                                새 계정을 만들고 싶어요
                            </option>
                            <option value="difficult">
                                서비스 이용이 어려워요
                            </option>
                            <option value="missing">
                                원하는 기능이 없어요
                            </option>
                            <option value="notifications">
                                알림이 너무 많아요
                            </option>
                            <option value="privacy">개인정보가 걱정돼요</option>
                            <option value="other">기타</option>
                        </select>

                        <div className="mt-4 min-h-20 rounded-xl bg-slate-50 px-4 py-3">
                            {withdrawReason ? (
                                <p className="text-sm leading-6 text-slate-600">
                                    {WITHDRAWAL_REASON_HELP[withdrawReason]}
                                </p>
                            ) : (
                                <p className="text-sm leading-6 text-slate-400">
                                    사유를 선택하면 탈퇴 전 확인할 내용을
                                    안내해드릴게요.
                                </p>
                            )}
                        </div>

                        {withdrawError && (
                            <p className="mt-3 text-sm text-red-600">
                                {withdrawError}
                            </p>
                        )}
                        <div className="mt-8 flex gap-3">
                            <button
                                type="button"
                                onClick={closeWithdrawModal}
                                disabled={isWithdrawing}
                                className="flex-1 rounded-xl bg-slate-100 px-4 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleWithdraw()}
                                disabled={isWithdrawing || !withdrawReason}
                                className="flex-1 rounded-xl bg-red-500 px-4 py-3.5 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-200"
                            >
                                {isWithdrawing ? '탈퇴 중...' : '제출'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
