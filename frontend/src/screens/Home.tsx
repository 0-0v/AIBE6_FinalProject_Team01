import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangleIcon,
    BellIcon,
    CalendarDaysIcon,
    CheckCircle2Icon,
    ChevronRightIcon,
    CopyIcon,
    CreditCardIcon,
    MapPinIcon,
    MessageCircleIcon,
    PipetteIcon,
    PlusIcon,
    SparklesIcon,
    ThumbsUpIcon,
    UserRoundPlusIcon,
    WandSparklesIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { ColorEditableCard } from '../components/dashboard/ColorEditableCard';
import { members } from '../data/mockData';

type SurfaceId =
    | 'travel'
    | 'tasks'
    | 'activity'
    | 'calendar'
    | 'insights'
    | 'schedule'
    | 'expenses'
    | 'notifications';

const photo = {
    beach: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
    cafe: '/5c004c76-d2d5-4fab-8307-e5df0c194dc1.jpg',
    food: '/67984159-ee93-4d51-aadd-43522138b92a.jpg',
    view: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
    market: '/9e582d3a-c3de-4ac9-a64e-952cdb17a104.jpg',
};

const initialTasks = [
    {
        id: 'vote',
        label: '후보 장소 투표하기',
        meta: '자매국수 외 3곳',
        urgent: true,
    },
    {
        id: 'schedule',
        label: '1일차 일정 확정하기',
        meta: '제주 동부 · 3개 장소',
        urgent: false,
    },
    { id: 'stay', label: '숙소 선택하기', meta: '후보 2곳', urgent: false },
    {
        id: 'settle',
        label: '예약금 정산 완료',
        meta: '민수님 입금 대기',
        urgent: false,
    },
];

const initialColors: Record<SurfaceId, string> = {
    travel: '#fff3f5',
    tasks: '#ffffff',
    activity: '#ffffff',
    calendar: '#ffffff',
    insights: '#ffffff',
    schedule: '#ffffff',
    expenses: '#ffffff',
    notifications: '#ffffff',
};

const aiFindings = [
    {
        icon: CopyIcon,
        title: '중복 장소',
        description: '오설록 티 뮤지엄과 오설록 카페가 같은 장소로 보여요.',
        tone: 'bg-amber-50 text-amber-600',
    },
    {
        icon: AlertTriangleIcon,
        title: '동선 충돌',
        description: '1일차 동부·서부 이동 시간이 2시간 40분이에요.',
        tone: 'bg-rose-50 text-rose-600',
    },
    {
        icon: CalendarDaysIcon,
        title: '비어있는 일정',
        description: '둘째 날 저녁 6시 이후 계획이 비어 있어요.',
        tone: 'bg-sky-50 text-sky-600',
    },
    {
        icon: SparklesIcon,
        title: '추천 맛집',
        description: '멤버 취향에 맞는 흑돼지 맛집 3곳을 찾았어요.',
        tone: 'bg-brand-50 text-brand-700',
    },
];

const notificationItems: Array<[string, LucideIcon, string, string, string]> = [
    [
        'comment',
        MessageCircleIcon,
        '새 댓글',
        '민수님이 자매국수에 댓글을 남겼어요.',
        'bg-sky-50 text-sky-600',
    ],
    [
        'vote',
        ThumbsUpIcon,
        '새 투표',
        '협재 해수욕장에 찬성표가 추가됐어요.',
        'bg-amber-50 text-amber-600',
    ],
    [
        'ai',
        SparklesIcon,
        'AI 완료',
        '일정 추천이 준비되었어요.',
        'bg-brand-50 text-brand-700',
    ],
    [
        'invite',
        UserRoundPlusIcon,
        '초대 도착',
        '부산 친구 여행에 초대되었어요.',
        'bg-violet-50 text-violet-600',
    ],
];

const calendarDays = [
    '26',
    '27',
    '28',
    '29',
    '30',
    '31',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '28',
    '29',
    '30',
    '31',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
];

function SectionTitle({
    title,
    action,
}: {
    title: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900">
                {title}
            </h2>
            {action}
        </div>
    );
}

export function Home() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState(initialTasks);
    const [readNotifications, setReadNotifications] = useState<string[]>([]);
    const [editingColors, setEditingColors] = useState(false);
    const [activeSurface, setActiveSurface] = useState<SurfaceId | null>(null);
    const [surfaceColors, setSurfaceColors] = useState(initialColors);

    function toggleTask(id: string) {
        setTasks((current) => current.filter((task) => task.id !== id));
    }

    function markRead(id: string) {
        setReadNotifications((current) =>
            current.includes(id) ? current : [...current, id],
        );
    }

    function toggleColorEditing() {
        setEditingColors((current) => !current);
        setActiveSurface(null);
    }

    function updateSurfaceColor(id: string, color: string) {
        setSurfaceColors((current) => ({
            ...current,
            [id as SurfaceId]: color,
        }));
    }

    function editable(
        id: SurfaceId,
        label: string,
        children: React.ReactNode,
        className = '',
    ) {
        return (
            <ColorEditableCard
                id={id}
                label={label}
                color={surfaceColors[id]}
                active={activeSurface === id}
                editing={editingColors}
                onActivate={(nextId) => setActiveSurface(nextId as SurfaceId)}
                onColorChange={updateSurfaceColor}
                className={className}
            >
                {children}
            </ColorEditableCard>
        );
    }

    return (
        <div className="min-h-full bg-white px-4 py-5 sm:px-7 sm:py-7 xl:px-8">
            <header className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-[-0.05em] text-slate-950 sm:text-[30px]">
                        안녕하세요, 지현님 <span aria-hidden="true">👋</span>
                    </h1>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        오늘의 여행 준비 현황을 확인해 보세요
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <label className="hidden h-11 w-[250px] items-center gap-2 rounded-full bg-[#f4f8f7] px-4 text-slate-400 lg:flex">
                        <span className="text-lg">⌕</span>
                        <input
                            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                            placeholder="여행방이나 장소 검색"
                        />
                    </label>
                    <button
                        onClick={toggleColorEditing}
                        aria-pressed={editingColors}
                        className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition ${editingColors ? 'border-[#efb7c1] bg-[#fff0f2] text-[#c94c63]' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        <PipetteIcon size={16} />{' '}
                        <span className="hidden sm:inline">
                            {editingColors ? '컬러 추출 완료' : '컬러 추출'}
                        </span>
                    </button>
                    <button
                        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f8f7] text-slate-500 hover:bg-slate-100"
                        aria-label="알림 열기"
                    >
                        <BellIcon size={18} />
                        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-400 ring-2 ring-white" />
                    </button>
                    <button
                        onClick={() => navigate('/app/room')}
                        className="flamingo-gradient flamingo-glow hidden items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 sm:flex"
                    >
                        <PlusIcon size={16} /> 새 여행방
                    </button>
                </div>
            </header>

            {editingColors && (
                <div className="mx-auto mt-4 flex max-w-[1440px] items-center gap-2 rounded-xl border border-[#f5d2d8] bg-[#fff7f8] px-4 py-3 text-xs text-[#9f5362]">
                    <PipetteIcon
                        size={15}
                        className="shrink-0 text-[#d65e74]"
                    />
                    <span>
                        <b>컬러 추출 모드</b> · 카드를 누른 뒤 스포이드로 화면의
                        색을 찍거나 HEX/RGB 값을 입력하세요.
                    </span>
                </div>
            )}

            <main className="mx-auto mt-6 grid max-w-[1440px] gap-6 xl:grid-cols-[minmax(0,1fr)_318px]">
                <div className="min-w-0 space-y-5">
                    {editable(
                        'travel',
                        '여행 현황',
                        <motion.section
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.32 }}
                            className="overflow-hidden rounded-[28px] border border-[#fbe1e5] p-5 sm:p-6"
                        >
                            <div className="grid gap-5 lg:grid-cols-[1.06fr_0.94fr]">
                                <div className="relative min-h-[250px] overflow-hidden rounded-[22px] bg-slate-950 p-6 text-white">
                                    <img
                                        src={photo.beach}
                                        alt="제주 바다"
                                        className="absolute inset-0 h-full w-full object-cover opacity-55"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10" />
                                    <div className="relative flex h-full flex-col justify-between">
                                        <div>
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
                                                <MapPinIcon size={12} /> 진행
                                                중인 여행
                                            </span>
                                            <div className="mt-4 flex items-center gap-2">
                                                <h2 className="text-2xl font-extrabold tracking-[-0.04em]">
                                                    제주도 가족여행
                                                </h2>
                                                <span className="rounded-full bg-[#ffe5e9] px-2.5 py-1 text-[11px] font-extrabold text-[#b93f58]">
                                                    D-12
                                                </span>
                                            </div>
                                            <p className="mt-1.5 text-xs font-medium text-white/75">
                                                2026. 08. 12 – 08. 15 · 제주도
                                            </p>
                                        </div>
                                        <div className="flex items-end gap-4">
                                            <div>
                                                <div className="flex -space-x-2">
                                                    {members.map((member) => (
                                                        <Avatar
                                                            key={member.id}
                                                            name={member.name}
                                                            color={
                                                                member.avatarColor
                                                            }
                                                            size={27}
                                                            className="ring-2 ring-slate-900"
                                                        />
                                                    ))}
                                                </div>
                                                <span className="mt-1.5 block text-[11px] font-medium text-white/75">
                                                    4명 함께 준비 중
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="mb-1.5 flex justify-between text-[11px] font-bold">
                                                    <span>여행 준비도</span>
                                                    <span>68%</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-white/25">
                                                    <div className="h-full w-[68%] rounded-full bg-[#e7657a]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        {
                                            title: '투표 대기',
                                            text: '후보 장소 4곳',
                                            icon: ThumbsUpIcon,
                                            tone: 'bg-amber-100 text-amber-600',
                                        },
                                        {
                                            title: 'AI 정리안',
                                            text: '확인할 제안 4개',
                                            icon: SparklesIcon,
                                            tone: 'bg-emerald-100 text-emerald-600',
                                        },
                                        {
                                            title: '오늘 일정',
                                            text: '3개 장소 방문',
                                            icon: CalendarDaysIcon,
                                            tone: 'bg-sky-100 text-sky-600',
                                        },
                                        {
                                            title: '예산 현황',
                                            text: '180,000원 남음',
                                            icon: CreditCardIcon,
                                            tone: 'bg-violet-100 text-violet-600',
                                        },
                                    ].map((item) => (
                                        <button
                                            onClick={() =>
                                                !editingColors &&
                                                navigate('/app/room')
                                            }
                                            key={item.title}
                                            className="flex flex-col items-start rounded-[22px] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                        >
                                            <span
                                                className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}
                                            >
                                                <item.icon size={17} />
                                            </span>
                                            <b className="mt-auto pt-5 text-sm text-slate-800">
                                                {item.title}
                                            </b>
                                            <span className="mt-1 text-[11px] font-medium text-slate-400">
                                                {item.text}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.section>,
                        'overflow-visible',
                    )}

                    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                        {editable(
                            'tasks',
                            '오늘 할 일',
                            <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                                <SectionTitle
                                    title="오늘 해야 하는 일"
                                    action={
                                        <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700">
                                            {tasks.length}개 남음
                                        </span>
                                    }
                                />
                                <div className="divide-y divide-slate-100">
                                    {tasks.length === 0 ? (
                                        <div className="py-10 text-center">
                                            <CheckCircle2Icon
                                                className="mx-auto text-brand"
                                                size={28}
                                            />
                                            <p className="mt-2 text-sm font-semibold text-slate-700">
                                                오늘 할 일을 모두 완료했어요!
                                            </p>
                                        </div>
                                    ) : (
                                        tasks.map((task) => (
                                            <button
                                                key={task.id}
                                                onClick={() =>
                                                    !editingColors &&
                                                    toggleTask(task.id)
                                                }
                                                className="group flex w-full items-center gap-3 py-3 text-left"
                                            >
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 text-transparent transition group-hover:border-brand group-hover:bg-brand">
                                                    <CheckCircle2Icon
                                                        size={14}
                                                    />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-slate-700">
                                                        {task.label}
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-xs text-slate-400">
                                                        {task.meta}
                                                    </span>
                                                </span>
                                                {task.urgent && (
                                                    <span className="h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                                <button className="mt-3 flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-700">
                                    <PlusIcon size={13} /> 할 일 추가
                                </button>
                            </section>,
                        )}
                        {editable(
                            'activity',
                            '최근 활동',
                            <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                                <SectionTitle
                                    title="최근 활동"
                                    action={
                                        <button className="text-xs font-bold text-slate-400 hover:text-slate-700">
                                            모두 보기
                                        </button>
                                    }
                                />
                                <div className="relative ml-2 border-l border-slate-200 pl-5">
                                    {[
                                        [
                                            '10분 전',
                                            '예린',
                                            '카페 델문도를 후보 장소에 등록했어요.',
                                            '#ea580c',
                                        ],
                                        [
                                            '20분 전',
                                            '태호',
                                            '자매국수에 댓글을 남겼어요.',
                                            '#2563eb',
                                        ],
                                        [
                                            '32분 전',
                                            'AI',
                                            '이동 시간을 반영한 일정 추천을 생성했어요.',
                                            '#0f766e',
                                        ],
                                    ].map(
                                        ([time, who, action, color], index) => (
                                            <div
                                                className="relative pb-4 last:pb-0"
                                                key={time}
                                            >
                                                <span
                                                    className="absolute -left-[25px] top-1 flex h-3 w-3 rounded-full border-2 border-white"
                                                    style={{
                                                        backgroundColor: color,
                                                    }}
                                                />
                                                <p className="text-xs text-slate-400">
                                                    {time}
                                                </p>
                                                <p className="mt-0.5 text-sm leading-5 text-slate-600">
                                                    <b className="font-bold text-slate-800">
                                                        {who}
                                                    </b>
                                                    님이 {action}
                                                </p>
                                                {index === 2 && (
                                                    <button
                                                        onClick={() =>
                                                            !editingColors &&
                                                            navigate(
                                                                '/app/room',
                                                            )
                                                        }
                                                        className="mt-2 rounded-lg bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100"
                                                    >
                                                        추천 보기
                                                    </button>
                                                )}
                                            </div>
                                        ),
                                    )}
                                </div>
                            </section>,
                        )}
                    </div>

                    <section>
                        <SectionTitle
                            title="내 여행방"
                            action={
                                <button className="flex items-center gap-0.5 text-xs font-bold text-slate-400 hover:text-slate-700">
                                    전체 보기 <ChevronRightIcon size={14} />
                                </button>
                            }
                        />
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                {
                                    title: '제주도 가족여행',
                                    sub: '👨‍👩‍👧 4명 · D-12',
                                    image: photo.beach,
                                    progress: '68%',
                                    status: '진행 중',
                                },
                                {
                                    title: '부산 친구 여행',
                                    sub: '🧑‍🤝‍🧑 3명 · D-38',
                                    image: photo.food,
                                    progress: '24%',
                                    status: '준비 중',
                                },
                                {
                                    title: '강릉 주말 여행',
                                    sub: '☕ 2명 · D-51',
                                    image: photo.cafe,
                                    progress: '12%',
                                    status: '준비 중',
                                },
                            ].map((trip, index) => (
                                <motion.button
                                    key={trip.title}
                                    whileHover={{
                                        y: -3,
                                        rotate: index === 1 ? 0.4 : -0.4,
                                    }}
                                    onClick={() => navigate('/app/room')}
                                    className="group relative min-h-[205px] overflow-hidden rounded-sm border border-slate-200 bg-white p-3 text-left shadow-[0_7px_14px_rgba(15,23,42,0.08)] transition hover:shadow-md"
                                >
                                    <div className="absolute left-1/2 top-0 h-5 w-16 -translate-x-1/2 rounded-b bg-[#d9d4c6]/90" />
                                    <img
                                        src={trip.image}
                                        alt=""
                                        className="h-[116px] w-full rounded-sm object-cover"
                                    />
                                    <div className="px-1 pt-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="truncate text-sm font-extrabold">
                                                {trip.title}
                                            </h3>
                                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                                                {trip.status}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            {trip.sub}
                                        </p>
                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-brand"
                                                style={{ width: trip.progress }}
                                            />
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="min-w-0 space-y-5 border-l border-slate-100 pl-0 xl:pl-6">
                    {editable(
                        'calendar',
                        '캘린더',
                        <section className="rounded-[24px] p-1">
                            <div className="flex items-center gap-3 px-3 pb-5 pt-2">
                                <Avatar name="지현" color="#e7657a" size={44} />
                                <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-slate-900">
                                        지현님
                                    </p>
                                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                                        여행 플래너
                                    </p>
                                </div>
                                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                    ⌄
                                </button>
                            </div>
                            <div className="border-t border-slate-100 px-3 pb-3 pt-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-extrabold tracking-tight">
                                        8월 2026
                                    </h2>
                                    <div className="flex gap-1">
                                        <button className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[#c94c63] hover:bg-slate-50">
                                            ‹
                                        </button>
                                        <button className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[#c94c63] hover:bg-slate-50">
                                            ›
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-7 gap-y-3 text-center text-[10px] font-bold text-slate-400">
                                    <span>일</span>
                                    <span>월</span>
                                    <span>화</span>
                                    <span>수</span>
                                    <span>목</span>
                                    <span>금</span>
                                    <span>토</span>
                                    {calendarDays.map((day, index) => (
                                        <span
                                            key={`${day}-${index}`}
                                            className={`${index >= 16 && index <= 19 ? 'rounded-full bg-[#e7657a] py-1 text-white shadow-sm' : index === 17 ? 'ring-2 ring-[#f2b8c2]' : ''} ${index < 6 || index > 36 ? 'text-slate-300' : ''}`}
                                        >
                                            {day}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </section>,
                    )}
                    {editable(
                        'insights',
                        'AI 인사이트',
                        <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                            <SectionTitle
                                title="AI가 발견한 것"
                                action={
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                        <WandSparklesIcon size={15} />
                                    </span>
                                }
                            />
                            <p className="-mt-1 mb-4 text-xs leading-5 text-slate-500">
                                여행방을 분석해, 확인이 필요한 항목을 모았어요.
                            </p>
                            <div className="space-y-2.5">
                                {aiFindings.map((finding) => (
                                    <button
                                        onClick={() =>
                                            !editingColors &&
                                            navigate('/app/room')
                                        }
                                        key={finding.title}
                                        className="flex w-full items-start gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
                                    >
                                        <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${finding.tone}`}
                                        >
                                            <finding.icon size={15} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <b className="block text-xs text-slate-800">
                                                {finding.title}
                                            </b>
                                            <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                                                {finding.description}
                                            </span>
                                        </span>
                                        <ChevronRightIcon
                                            className="mt-1 shrink-0 text-slate-300"
                                            size={14}
                                        />
                                    </button>
                                ))}
                            </div>
                        </section>,
                    )}
                    {editable(
                        'schedule',
                        '오늘 일정',
                        <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                            <SectionTitle
                                title="오늘 일정"
                                action={
                                    <button
                                        onClick={() =>
                                            !editingColors &&
                                            navigate('/app/room')
                                        }
                                        className="text-xs font-bold text-brand-700"
                                    >
                                        전체 일정
                                    </button>
                                }
                            />
                            <p className="-mt-1 mb-4 text-xs font-semibold text-slate-400">
                                8월 12일 · 여행 1일차
                            </p>
                            <div className="space-y-0">
                                {[
                                    [
                                        '09:00',
                                        '함덕 해수욕장',
                                        '바다 산책 · 1시간 30분',
                                        photo.beach,
                                    ],
                                    [
                                        '11:30',
                                        '카페 델문도',
                                        '브런치 · 1시간 20분',
                                        photo.cafe,
                                    ],
                                    [
                                        '14:00',
                                        '우도',
                                        '섬 투어 · 4시간',
                                        photo.view,
                                    ],
                                ].map(([time, name, detail, image], index) => (
                                    <div
                                        className="relative flex gap-3 pb-4 last:pb-0"
                                        key={time}
                                    >
                                        <div className="w-10 pt-1 text-xs font-extrabold text-brand-700">
                                            {time}
                                        </div>
                                        <div className="relative">
                                            <span className="mt-1.5 block h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-brand-50" />
                                            {index < 2 && (
                                                <span className="absolute left-[4px] top-5 h-10 border-l border-dashed border-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                            <img
                                                src={image}
                                                alt=""
                                                className="h-9 w-9 rounded-lg object-cover"
                                            />
                                            <span className="min-w-0">
                                                <b className="block truncate text-xs text-slate-800">
                                                    {name}
                                                </b>
                                                <span className="block truncate text-[11px] text-slate-400">
                                                    {detail}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>,
                    )}
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
                        {editable(
                            'expenses',
                            '지출',
                            <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                                <SectionTitle
                                    title="지출"
                                    action={
                                        <CreditCardIcon
                                            size={16}
                                            className="text-slate-400"
                                        />
                                    }
                                />
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-[10px] font-semibold text-slate-400">
                                            총 예산
                                        </p>
                                        <b className="mt-1 block text-sm tracking-tight">
                                            500,000
                                        </b>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-slate-400">
                                            사용
                                        </p>
                                        <b className="mt-1 block text-sm tracking-tight text-orange-500">
                                            320,000
                                        </b>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-slate-400">
                                            남음
                                        </p>
                                        <b className="mt-1 block text-sm tracking-tight text-brand-700">
                                            180,000
                                        </b>
                                    </div>
                                </div>
                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full w-[64%] rounded-full bg-orange-400" />
                                </div>
                                <p className="mt-2 text-right text-[10px] text-slate-400">
                                    예산의 64% 사용
                                </p>
                            </section>,
                        )}
                        {editable(
                            'notifications',
                            '알림',
                            <section className="rounded-[22px] border border-slate-100 p-5 shadow-sm">
                                <SectionTitle
                                    title="알림"
                                    action={
                                        <button
                                            onClick={() =>
                                                setReadNotifications([])
                                            }
                                            className="text-[11px] font-bold text-slate-400 hover:text-slate-700"
                                        >
                                            모두 읽음
                                        </button>
                                    }
                                />
                                <div className="space-y-2">
                                    {notificationItems.map(
                                        ([id, Icon, label, text, tone]) => {
                                            const isRead =
                                                readNotifications.includes(id);
                                            return (
                                                <button
                                                    key={id}
                                                    onClick={() =>
                                                        !editingColors &&
                                                        markRead(id)
                                                    }
                                                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50 ${isRead ? 'opacity-50' : ''}`}
                                                >
                                                    <span
                                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone}`}
                                                    >
                                                        <Icon size={13} />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <b className="block text-[11px] text-slate-700">
                                                            {label}
                                                        </b>
                                                        <span className="block truncate text-[10px] text-slate-400">
                                                            {text}
                                                        </span>
                                                    </span>
                                                    {!isRead && (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                                                    )}
                                                </button>
                                            );
                                        },
                                    )}
                                </div>
                            </section>,
                        )}
                    </div>
                </aside>
            </main>
        </div>
    );
}
