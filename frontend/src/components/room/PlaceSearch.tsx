import React, { useState } from 'react';
import { SearchIcon, PlusIcon, XIcon } from 'lucide-react';
import { PlaceCategory } from '../../data/types';
import { CATEGORY_META } from '../../data/mockData';

type Result = { name: string; address: string; category: PlaceCategory };

const MOCK_RESULTS: Result[] = [
    {
        name: '카멜리아힐',
        address: '제주 서귀포시 안덕면 병악로 166',
        category: 'nature',
    },
    { name: '우진해장국', address: '제주 제주시 서사로 11', category: 'food' },
    {
        name: '아르떼뮤지엄 제주',
        address: '제주 제주시 애월읍 어림비로 478',
        category: 'attraction',
    },
    {
        name: '카페 델문도',
        address: '제주 제주시 조천읍 조함해안로 519-10',
        category: 'cafe',
    },
];

type Props = {
    onAdd: (r: Result) => void;
};

export function PlaceSearch({ onAdd }: Props) {
    const [q, setQ] = useState('');
    const [added, setAdded] = useState<string[]>([]);
    const results = q.trim()
        ? MOCK_RESULTS.filter(
              (r) => r.name.includes(q) || r.address.includes(q),
          )
        : MOCK_RESULTS;

    return (
        <div className="border-b border-slate-200 p-3">
            <div className="relative">
                <SearchIcon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="가고 싶은 장소 검색 (Google Maps)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-100"
                />

                {q && (
                    <button
                        onClick={() => setQ('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <XIcon size={15} />
                    </button>
                )}
            </div>

            <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-slate-400">
                <span className="text-amber-500">●</span> Google Maps 연동 전
                데모 검색입니다. 실제 운영 시 월 1,000~5,000건 이후 초과
                사용량이 과금될 수 있어 사용량을 모니터링하세요.
            </p>

            {q.trim() && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-100">
                    {results.length === 0 && (
                        <p className="px-3 py-4 text-center text-sm text-slate-400">
                            검색 결과가 없어요
                        </p>
                    )}
                    {results.map((r) => {
                        const isAdded = added.includes(r.name);
                        const meta = CATEGORY_META[r.category];
                        return (
                            <div
                                key={r.name}
                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
                            >
                                <span className="text-lg">{meta.emoji}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">
                                        {r.name}
                                    </div>
                                    <div className="truncate text-xs text-slate-400">
                                        {r.address}
                                    </div>
                                </div>
                                <button
                                    disabled={isAdded}
                                    onClick={() => {
                                        onAdd(r);
                                        setAdded((p) => [...p, r.name]);
                                    }}
                                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                        isAdded
                                            ? 'bg-slate-100 text-slate-400'
                                            : 'bg-brand text-white hover:bg-brand-700'
                                    }`}
                                >
                                    {isAdded ? (
                                        '추가됨'
                                    ) : (
                                        <>
                                            <PlusIcon size={13} /> 후보 추가
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
