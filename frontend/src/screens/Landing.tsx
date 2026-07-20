import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRightIcon,
    CalendarDaysIcon,
    CheckIcon,
    MapPinnedIcon,
    MessageCircleIcon,
    PlusIcon,
    SparklesIcon,
    ThumbsUpIcon,
    UsersRoundIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';

const places = [
    {
        name: '오설록 티 뮤지엄',
        type: '카페',
        image: '/5c004c76-d2d5-4fab-8307-e5df0c194dc1.jpg',
        position: 'left-[31%] top-[30%]',
        color: '#b45309',
    },
    {
        name: '협재 해수욕장',
        type: '자연',
        image: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
        position: 'left-[15%] top-[53%]',
        color: '#0f766e',
    },
    {
        name: '자매국수',
        type: '맛집',
        image: '/67984159-ee93-4d51-aadd-43522138b92a.jpg',
        position: 'left-[57%] top-[59%]',
        color: '#dc2626',
    },
];

export function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-full w-full overflow-x-hidden bg-[#f8faf9] text-slate-900">
            <header className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
                <Link
                    to="/"
                    className="flex items-center gap-2.5"
                    aria-label="Plamingo 홈"
                >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
                        <SparklesIcon size={19} />
                    </span>
                    <span className="text-lg font-extrabold tracking-tight">
                        Plamingo
                    </span>
                </Link>

                <nav
                    className="hidden items-center gap-7 text-sm font-medium text-slate-500 md:flex"
                    aria-label="공개 메뉴"
                >
                    <a href="#features" className="hover:text-slate-900">
                        서비스 살펴보기
                    </a>
                    <a href="#journey" className="hover:text-slate-900">
                        함께 만드는 여행
                    </a>
                </nav>

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => navigate('/login')}
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:px-4"
                    >
                        로그인
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="flamingo-gradient flamingo-glow rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 sm:px-4"
                    >
                        시작하기
                    </button>
                </div>
            </header>

            <main>
                <section className="mx-auto grid max-w-[1400px] gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(540px,1.1fr)] lg:items-center lg:px-10 lg:pb-24 lg:pt-20">
                    <div className="max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45 }}
                            className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700"
                        >
                            <SparklesIcon size={14} /> Collaborative travel
                            planning
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.06 }}
                            className="mt-6 text-4xl font-extrabold leading-[1.12] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-[62px]"
                        >
                            Plan Together.
                            <br />
                            <span className="text-brand-700">
                                Travel Better.
                            </span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.12 }}
                            className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg"
                        >
                            친구들과 흩어져 있던 여행 계획을 하나의 공간에서
                            관리하세요. 장소를 모으고, 투표하고, 일정을 만들고,
                            AI의 추천까지 함께 완성하는 여행 협업 플랫폼입니다.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.18 }}
                            className="mt-8 flex flex-wrap items-center gap-3"
                        >
                            <button
                                onClick={() => navigate('/login')}
                                className="flamingo-gradient flamingo-glow flex items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white transition hover:opacity-90"
                            >
                                무료로 여행방 만들기{' '}
                                <ArrowRightIcon size={17} />
                            </button>
                            <a
                                href="#features"
                                className="rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                서비스 살펴보기
                            </a>
                        </motion.div>
                        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <CheckIcon size={14} className="text-brand" />{' '}
                                소셜 계정으로 10초 가입
                            </span>
                            <span className="flex items-center gap-1.5">
                                <CheckIcon size={14} className="text-brand" />{' '}
                                멤버와 함께 결정하는 여행
                            </span>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.65, delay: 0.13 }}
                        className="relative mx-auto w-full max-w-[720px]"
                    >
                        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_22px_70px_rgba(15,23,42,0.12)]">
                            <div className="overflow-hidden rounded-[21px] border border-slate-100 bg-white">
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
                                            <SparklesIcon size={14} />
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold">
                                                Plamingo · 제주도 여행 🌊
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                4명 · 2박 3일
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex -space-x-1.5">
                                        {['지', '민', '서', '준'].map(
                                            (name, index) => (
                                                <span
                                                    key={name}
                                                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white"
                                                    style={{
                                                        backgroundColor: [
                                                            '#0f766e',
                                                            '#ea580c',
                                                            '#7c3aed',
                                                            '#2563eb',
                                                        ][index],
                                                    }}
                                                >
                                                    {name}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                </div>

                                <div className="grid min-h-[350px] grid-cols-[1.28fr_0.72fr] sm:min-h-[410px]">
                                    <div className="relative overflow-hidden bg-[#e5edeb]">
                                        <div
                                            className="absolute inset-0 opacity-70"
                                            style={{
                                                backgroundImage:
                                                    'linear-gradient(#cbd8d3 1px, transparent 1px), linear-gradient(90deg, #cbd8d3 1px, transparent 1px)',
                                                backgroundSize: '34px 34px',
                                            }}
                                        />
                                        <div className="absolute -left-24 top-[43%] h-60 w-72 rounded-full bg-[#c8e0e7]" />
                                        <div className="absolute bottom-[-45px] right-[-30px] h-52 w-72 rounded-tl-[80%] bg-[#d4e5d2]" />
                                        <svg
                                            className="absolute inset-0 h-full w-full opacity-35"
                                            viewBox="0 0 480 410"
                                            preserveAspectRatio="none"
                                            aria-hidden="true"
                                        >
                                            <path
                                                d="M-20 130 C90 60 190 185 500 100"
                                                stroke="#82a99d"
                                                strokeWidth="5"
                                                fill="none"
                                            />
                                            <path
                                                d="M125 -20 C220 150 80 280 260 440"
                                                stroke="#82a99d"
                                                strokeWidth="4"
                                                fill="none"
                                            />
                                        </svg>
                                        {places.map((place, index) => (
                                            <div
                                                key={place.name}
                                                className={`absolute ${place.position} -translate-x-1/2 -translate-y-full`}
                                            >
                                                <span
                                                    className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-sm shadow-md"
                                                    style={{
                                                        backgroundColor:
                                                            place.color,
                                                    }}
                                                >
                                                    {index === 0
                                                        ? '☕'
                                                        : index === 1
                                                          ? '🌊'
                                                          : '🍜'}
                                                    <span
                                                        className="absolute -bottom-1 h-2 w-2 rotate-45 border-b-2 border-r-2 border-white"
                                                        style={{
                                                            backgroundColor:
                                                                place.color,
                                                        }}
                                                    />
                                                </span>
                                            </div>
                                        ))}
                                        <div className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[9px] text-slate-500 shadow-sm">
                                            지도에서 바로 확인
                                        </div>
                                    </div>

                                    <div className="border-l border-slate-200 bg-white p-2.5 sm:p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-800">
                                                후보 장소{' '}
                                                <span className="text-slate-400">
                                                    6
                                                </span>
                                            </span>
                                            <PlusIcon
                                                size={13}
                                                className="text-slate-400"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            {places.map((place, index) => (
                                                <div
                                                    key={place.name}
                                                    className="rounded-lg border border-slate-100 p-1.5 shadow-sm"
                                                >
                                                    <div className="flex gap-1.5">
                                                        <img
                                                            src={place.image}
                                                            alt=""
                                                            className="h-8 w-8 rounded-md object-cover"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-[9px] font-bold">
                                                                {place.name}
                                                            </p>
                                                            <p className="mt-0.5 text-[8px] text-slate-400">
                                                                {place.type} ·
                                                                멤버 {index + 1}
                                                                명 찬성
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {index === 0 && (
                                                        <div className="mt-1 flex items-center gap-1 rounded bg-brand-50 px-1.5 py-1 text-[8px] font-semibold text-brand-700">
                                                            <CheckIcon
                                                                size={9}
                                                            />{' '}
                                                            지도에 저장됨
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-2 rounded-lg bg-brand p-2 text-[9px] font-bold text-white">
                                            <SparklesIcon
                                                className="mr-1 inline"
                                                size={10}
                                            />{' '}
                                            AI가 정리안 2개를 찾았어요
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg sm:flex">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                <ThumbsUpIcon size={14} />
                            </span>
                            <div className="text-[11px]">
                                <b className="block text-slate-800">
                                    4명이 함께 결정 중
                                </b>
                                <span className="text-slate-400">
                                    의견이 한곳에 모여요
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </section>

                <section
                    id="features"
                    className="border-y border-slate-200 bg-white"
                >
                    <div className="mx-auto max-w-[1160px] px-5 py-20 sm:px-8 lg:px-10">
                        <div className="max-w-2xl">
                            <p className="text-sm font-bold text-brand-700">
                                MADE FOR THE WHOLE GROUP
                            </p>
                            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-5xl">
                                함께 고르고, 함께 완성하는
                                <br />
                                여행의 모든 순간.
                            </h2>
                        </div>

                        <div className="mt-16 grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
                            <div>
                                <p className="text-sm font-extrabold text-brand-700">
                                    01
                                </p>
                                <h3 className="mt-3 text-3xl font-extrabold tracking-tight">
                                    Shared Travel Rooms.
                                </h3>
                                <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">
                                    친구들과 하나의 여행방에서 장소를 모으고,
                                    <br />
                                    댓글과 투표를 통해 모두의 의견을 반영하며
                                    여행을 완성해 보세요.
                                </p>
                            </div>
                            <div className="rounded-[28px] bg-[#f4f1ff] p-5">
                                <div className="rounded-[22px] bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <span className="font-bold">
                                            제주도 가족여행
                                        </span>
                                        <div className="flex -space-x-2">
                                            {['지', '민', '서', '준'].map(
                                                (name, index) => (
                                                    <span
                                                        key={name}
                                                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white"
                                                        style={{
                                                            backgroundColor: [
                                                                '#5b32ea',
                                                                '#f97316',
                                                                '#0ea5e9',
                                                                '#16a34a',
                                                            ][index],
                                                        }}
                                                    >
                                                        {name}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <div className="rounded-xl bg-slate-50 p-3">
                                            <MapPinnedIcon
                                                className="text-brand"
                                                size={18}
                                            />
                                            <b className="mt-3 block text-sm">
                                                후보 장소 16곳
                                            </b>
                                            <span className="mt-1 block text-xs text-slate-400">
                                                모두가 함께 추가해요
                                            </span>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3">
                                            <UsersRoundIcon
                                                className="text-brand"
                                                size={18}
                                            />
                                            <b className="mt-3 block text-sm">
                                                멤버 4명
                                            </b>
                                            <span className="mt-1 block text-xs text-slate-400">
                                                의견을 한곳에서
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-24 grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
                            <div className="order-2 rounded-[28px] bg-[#fff6e8] p-5 lg:order-1">
                                <div className="rounded-[22px] bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <b className="text-sm">후보 장소</b>
                                        <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-600">
                                            투표 진행 중
                                        </span>
                                    </div>
                                    {[
                                        '카페 델문도',
                                        '자매국수',
                                        '성산일출봉',
                                    ].map((name, index) => (
                                        <div
                                            key={name}
                                            className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 p-2"
                                        >
                                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-base">
                                                {['☕', '🍜', '🌋'][index]}
                                            </span>
                                            <span className="flex-1 text-sm font-bold">
                                                {name}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs font-bold text-brand">
                                                <ThumbsUpIcon size={13} />{' '}
                                                {index + 2}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="order-1 lg:order-2">
                                <p className="text-sm font-extrabold text-orange-500">
                                    02
                                </p>
                                <h3 className="mt-3 text-3xl font-extrabold tracking-tight">
                                    Choose Before You Go.
                                </h3>
                                <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">
                                    검색한 장소는 바로 일정에 추가되지 않습니다.
                                    <br />
                                    후보 장소를 함께 검토하고 투표와 댓글을 통해
                                    확정된 장소만 지도에 반영됩니다.
                                </p>
                            </div>
                        </div>

                        <div className="mt-24 grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
                            <div>
                                <p className="text-sm font-extrabold text-sky-600">
                                    03
                                </p>
                                <h3 className="mt-3 text-3xl font-extrabold tracking-tight">
                                    Build Every Day.
                                </h3>
                                <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">
                                    확정된 장소를 원하는 순서대로 배치하고,
                                    <br />
                                    드래그 앤 드롭으로 여행 동선을 자연스럽게
                                    완성하세요.
                                </p>
                            </div>
                            <div className="rounded-[28px] bg-[#eef8ff] p-5">
                                <div className="rounded-[22px] bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <b className="text-sm">
                                            DAY 1 · 제주 동부
                                        </b>
                                        <CalendarDaysIcon
                                            className="text-sky-600"
                                            size={17}
                                        />
                                    </div>
                                    {[
                                        ['09:00', '함덕 해수욕장'],
                                        ['11:30', '카페 델문도'],
                                        ['14:00', '우도'],
                                    ].map(([time, place], index) => (
                                        <div
                                            key={time}
                                            className="relative mt-4 flex gap-3"
                                        >
                                            <b className="w-10 text-xs text-sky-600">
                                                {time}
                                            </b>
                                            <span className="relative mt-1 h-3 w-3 rounded-full bg-sky-500 ring-4 ring-sky-50">
                                                {index < 2 && (
                                                    <span className="absolute left-1 top-3 h-7 border-l border-dashed border-sky-200" />
                                                )}
                                            </span>
                                            <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold">
                                                {place}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-24 grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
                            <div className="order-2 rounded-[28px] bg-[#25213f] p-5 text-white lg:order-1">
                                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                                            <SparklesIcon size={15} />
                                        </span>
                                        <b className="text-sm">AI 제안 2개</b>
                                    </div>
                                    <p className="mt-4 text-sm leading-6 text-white/70">
                                        중복 장소 1곳 · 이동시간 충돌 1건을
                                        발견했어요.
                                    </p>
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-white/10 p-2 text-xs">
                                            <b>1번 · 해안 우선</b>
                                            <span className="mt-1 block text-white/60">
                                                이동 42분
                                            </span>
                                        </div>
                                        <div className="rounded-lg bg-white/10 p-2 text-xs">
                                            <b>2번 · 카페 우선</b>
                                            <span className="mt-1 block text-white/60">
                                                이동 35분
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="order-1 lg:order-2">
                                <p className="text-sm font-extrabold text-brand-700">
                                    04
                                </p>
                                <h3 className="mt-3 text-3xl font-extrabold tracking-tight">
                                    Smart Suggestions.
                                </h3>
                                <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">
                                    AI가 중복 장소와 일정 충돌을 찾아주고,
                                    <br />더 효율적인 여행 동선을 제안합니다.
                                </p>
                                <p className="mt-4 text-sm font-bold text-slate-900">
                                    최종 결정은 언제나 여행 멤버가 함께합니다.
                                </p>
                            </div>
                        </div>

                        <div className="mt-24 grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
                            <div>
                                <p className="text-sm font-extrabold text-emerald-600">
                                    05
                                </p>
                                <h3 className="mt-3 text-3xl font-extrabold tracking-tight">
                                    Split Without Stress.
                                </h3>
                                <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">
                                    여행 경비를 기록하고,
                                    <br />
                                    누가 누구에게 얼마를 보내야 하는지 한눈에
                                    확인하세요.
                                </p>
                            </div>
                            <div className="rounded-[28px] bg-[#ecfdf5] p-5">
                                <div className="rounded-[22px] bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <b>제주도 가족여행 · 정산</b>
                                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
                                            진행 중
                                        </span>
                                    </div>
                                    <div className="mt-5 grid grid-cols-3 text-center">
                                        <div>
                                            <small className="text-slate-400">
                                                총 지출
                                            </small>
                                            <b className="mt-1 block">
                                                320,000원
                                            </b>
                                        </div>
                                        <div>
                                            <small className="text-slate-400">
                                                내 부담
                                            </small>
                                            <b className="mt-1 block">
                                                80,000원
                                            </b>
                                        </div>
                                        <div>
                                            <small className="text-slate-400">
                                                받을 돈
                                            </small>
                                            <b className="mt-1 block text-emerald-600">
                                                24,000원
                                            </b>
                                        </div>
                                    </div>
                                    <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                                        민수님에게 24,000원을 받을 예정이에요.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    id="journey"
                    className="mx-auto max-w-[1160px] px-5 py-20 sm:px-8 lg:px-10"
                >
                    <div className="flex flex-col items-start justify-between gap-8 rounded-[32px] bg-[#25213f] px-7 py-12 text-white sm:px-12 lg:flex-row lg:items-center">
                        <div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-[#c7baff]">
                                <MessageCircleIcon size={15} /> Start Your Next
                                Journey.
                            </p>
                            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                                혼자 계획하는 여행보다,
                                <br />
                                함께 만드는 여행이 더 즐겁습니다.
                            </h2>
                            <p className="mt-4 text-sm leading-6 text-white/65">
                                지금 Plamingo에서 새로운 여행을 시작해 보세요.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#25213f] hover:bg-[#f4f1ff]"
                        >
                            새 여행 시작하기 <ArrowRightIcon size={17} />
                        </button>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 px-5 py-7 text-center text-xs text-slate-400">
                © 2026 Plamingo · 함께 만드는 여행 협업 플랫폼
            </footer>
        </div>
    );
}
