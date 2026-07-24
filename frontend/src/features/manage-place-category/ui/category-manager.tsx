import React, { useState } from 'react'
import {
    ArrowDownIcon,
    ArrowUpIcon,
    PlusIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react'
import {
    createPlaceCategory,
    deletePlaceCategory,
    reorderPlaceCategories,
    updatePlaceCategory,
    type PlaceCategoryInfo,
} from '@/entities/trip'
import { getApiErrorMessage } from '@/shared/api/client'

type Props = {
    tripId: number
    categories: PlaceCategoryInfo[]
    onChange: (categories: PlaceCategoryInfo[]) => void
    onClose: () => void
}

const DEFAULT_COLOR = '#64748b'
const DEFAULT_ICON = '📍'

export function CategoryManager({
    tripId,
    categories,
    onChange,
    onClose,
}: Props) {
    const [name, setName] = useState('')
    const [color, setColor] = useState(DEFAULT_COLOR)
    const [icon, setIcon] = useState(DEFAULT_ICON)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function createCategory() {
        if (!name.trim()) return
        setSubmitting(true)
        setError(null)
        try {
            const created = await createPlaceCategory(tripId, {
                name: name.trim(),
                markerColor: color,
                markerIcon: icon.trim() || DEFAULT_ICON,
            })
            onChange([...categories, created])
            setName('')
            setColor(DEFAULT_COLOR)
            setIcon(DEFAULT_ICON)
        } catch (cause) {
            setError(
                getApiErrorMessage(cause, '카테고리를 생성하지 못했습니다.'),
            )
        } finally {
            setSubmitting(false)
        }
    }

    async function move(categoryId: number, offset: -1 | 1) {
        const index = categories.findIndex(
            (category) => category.categoryId === categoryId,
        )
        const targetIndex = index + offset
        if (index < 0 || targetIndex < 0 || targetIndex >= categories.length)
            return
        const next = [...categories]
        ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
        onChange(next)
        try {
            onChange(
                await reorderPlaceCategories(
                    tripId,
                    next.map((category) => category.categoryId),
                ),
            )
        } catch (cause) {
            onChange(categories)
            setError(
                getApiErrorMessage(
                    cause,
                    '카테고리 순서를 변경하지 못했습니다.',
                ),
            )
        }
    }

    async function remove(category: PlaceCategoryInfo) {
        if (category.categoryType === 'OTHER') return
        if (!window.confirm(`${category.name} 카테고리를 삭제할까요?`)) return
        setError(null)
        try {
            await deletePlaceCategory(tripId, category.categoryId)
            onChange(
                categories.filter(
                    (item) => item.categoryId !== category.categoryId,
                ),
            )
        } catch (cause) {
            setError(
                getApiErrorMessage(cause, '카테고리를 삭제하지 못했습니다.'),
            )
        }
    }

    return (
        <div className="absolute inset-0 z-40 flex flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                    <p className="text-xs font-bold text-brand-700">PLACE</p>
                    <h3 className="mt-0.5 text-sm font-extrabold">
                        장소 카테고리 관리
                    </h3>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="카테고리 관리 닫기"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                    <XIcon size={17} />
                </button>
            </div>

            <div className="mp-scroll flex-1 space-y-2 overflow-y-auto p-3">
                {error && (
                    <p
                        role="alert"
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
                    >
                        {error}
                    </p>
                )}
                {categories.map((category, index) => (
                    <CategoryRow
                        key={category.categoryId}
                        tripId={tripId}
                        category={category}
                        first={index === 0}
                        last={index === categories.length - 1}
                        onUpdated={(updated) =>
                            onChange(
                                categories.map((item) =>
                                    item.categoryId === updated.categoryId
                                        ? updated
                                        : item,
                                ),
                            )
                        }
                        onMove={(offset) =>
                            void move(category.categoryId, offset)
                        }
                        onDelete={() => void remove(category)}
                        onError={setError}
                    />
                ))}
            </div>

            <div className="border-t border-slate-100 p-3">
                <p className="mb-2 text-xs font-extrabold text-slate-600">
                    새 카테고리
                </p>
                <div className="grid grid-cols-[48px_48px_1fr] gap-2">
                    <input
                        aria-label="새 카테고리 아이콘"
                        value={icon}
                        maxLength={10}
                        onChange={(event) => setIcon(event.target.value)}
                        className="rounded-lg border border-slate-200 px-2 py-2 text-center text-sm"
                    />
                    <input
                        aria-label="새 카테고리 색상"
                        type="color"
                        value={color}
                        onChange={(event) => setColor(event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 p-1"
                    />
                    <input
                        aria-label="새 카테고리 이름"
                        value={name}
                        maxLength={50}
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') void createCategory()
                        }}
                        placeholder="예: 야경"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                </div>
                <button
                    type="button"
                    disabled={!name.trim() || submitting}
                    onClick={() => void createCategory()}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-brand py-2 text-xs font-extrabold text-white disabled:opacity-40"
                >
                    <PlusIcon size={14} />
                    {submitting ? '추가 중...' : '카테고리 추가'}
                </button>
            </div>
        </div>
    )
}

function CategoryRow({
    tripId,
    category,
    first,
    last,
    onUpdated,
    onMove,
    onDelete,
    onError,
}: {
    tripId: number
    category: PlaceCategoryInfo
    first: boolean
    last: boolean
    onUpdated: (category: PlaceCategoryInfo) => void
    onMove: (offset: -1 | 1) => void
    onDelete: () => void
    onError: (message: string | null) => void
}) {
    const [name, setName] = useState(category.name)
    const [color, setColor] = useState(category.markerColor)
    const [icon, setIcon] = useState(category.markerIcon)
    const [saving, setSaving] = useState(false)
    const changed =
        name.trim() !== category.name ||
        color !== category.markerColor ||
        icon.trim() !== category.markerIcon

    async function save() {
        if (!changed || !name.trim() || !icon.trim()) return
        setSaving(true)
        onError(null)
        try {
            onUpdated(
                await updatePlaceCategory(tripId, category.categoryId, {
                    name: name.trim(),
                    markerColor: color,
                    markerIcon: icon.trim(),
                }),
            )
        } catch (cause) {
            onError(
                getApiErrorMessage(cause, '카테고리를 수정하지 못했습니다.'),
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="rounded-xl border border-slate-100 p-2.5">
            <div className="flex items-center gap-2">
                <input
                    aria-label={`${category.name} 아이콘`}
                    value={icon}
                    maxLength={10}
                    onChange={(event) => setIcon(event.target.value)}
                    className="h-8 w-10 rounded-lg border border-slate-200 text-center text-sm"
                />
                <input
                    aria-label={`${category.name} 색상`}
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-8 w-10 rounded-lg border border-slate-200 p-1"
                />
                <input
                    aria-label={`${category.name} 이름`}
                    value={name}
                    maxLength={50}
                    onChange={(event) => setName(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold"
                />
                <button
                    type="button"
                    disabled={!changed || saving || !name.trim() || !icon.trim()}
                    onClick={() => void save()}
                    className="rounded-lg bg-slate-900 px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-30"
                >
                    저장
                </button>
            </div>
            <div className="mt-2 flex justify-end gap-1">
                <button
                    type="button"
                    disabled={first}
                    onClick={() => onMove(-1)}
                    aria-label={`${category.name} 위로 이동`}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-20"
                >
                    <ArrowUpIcon size={13} />
                </button>
                <button
                    type="button"
                    disabled={last}
                    onClick={() => onMove(1)}
                    aria-label={`${category.name} 아래로 이동`}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-20"
                >
                    <ArrowDownIcon size={13} />
                </button>
                <button
                    type="button"
                    disabled={category.categoryType === 'OTHER'}
                    onClick={onDelete}
                    aria-label={`${category.name} 삭제`}
                    className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-20"
                >
                    <Trash2Icon size={13} />
                </button>
            </div>
        </div>
    )
}
