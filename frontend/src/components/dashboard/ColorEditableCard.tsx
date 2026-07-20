import React, { useState } from 'react';
import { PipetteIcon, RefreshCcwIcon, XIcon } from 'lucide-react';

type Props = {
    id: string;
    label: string;
    color: string;
    active: boolean;
    editing: boolean;
    children: React.ReactNode;
    className?: string;
    onActivate: (id: string) => void;
    onColorChange: (id: string, color: string) => void;
};

type BrowserEyeDropper = {
    open: () => Promise<{ sRGBHex: string }>;
};

function isHexColor(value: string) {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function hexToRgb(value: string) {
    const normalized = value.replace('#', '');
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);

    return { red, green, blue };
}

export function ColorEditableCard({
    id,
    label,
    color,
    active,
    editing,
    children,
    className = '',
    onActivate,
    onColorChange,
}: Props) {
    const [hexValue, setHexValue] = useState(color.toUpperCase());
    const [isExtracting, setIsExtracting] = useState(false);

    function handleCardClick(event: React.MouseEvent<HTMLDivElement>) {
        if (
            !editing ||
            (event.target as HTMLElement).closest('[data-color-extractor]')
        )
            return;
        event.preventDefault();
        event.stopPropagation();
        onActivate(id);
    }

    function applyColor(value: string) {
        const normalized = value.startsWith('#')
            ? value.toUpperCase()
            : `#${value.toUpperCase()}`;
        setHexValue(normalized);

        if (isHexColor(normalized)) {
            onColorChange(id, normalized);
        }
    }

    async function extractScreenColor() {
        const EyeDropper = (
            window as unknown as { EyeDropper?: new () => BrowserEyeDropper }
        ).EyeDropper;

        if (!EyeDropper) return;

        setIsExtracting(true);
        try {
            const result = await new EyeDropper().open();
            applyColor(result.sRGBHex);
        } catch {
            // The user cancelled the native screen color picker.
        } finally {
            setIsExtracting(false);
        }
    }

    const rgb = isHexColor(color)
        ? hexToRgb(color)
        : { red: 255, green: 255, blue: 255 };
    const eyeDropperAvailable =
        typeof window !== 'undefined' &&
        Boolean(
            (window as unknown as { EyeDropper?: new () => BrowserEyeDropper })
                .EyeDropper,
        );

    return (
        <div
            className={`relative transition-shadow ${editing ? 'cursor-pointer rounded-[24px] outline outline-2 outline-offset-2 outline-dashed' : ''} ${editing && active ? 'outline-[#e7657a]' : editing ? 'outline-[#f4b8c2]' : ''}`}
            onClickCapture={handleCardClick}
            style={{ backgroundColor: color }}
            aria-label={editing ? `${label} 색상 설정` : undefined}
        >
            <div className={className} style={{ backgroundColor: color }}>
                {children}
            </div>

            {editing && (
                <span className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                    <PipetteIcon size={11} /> {label}
                </span>
            )}

            {editing && active && (
                <div
                    data-color-extractor
                    className="absolute left-1/2 top-full z-30 mt-3 w-[min(336px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-[#f1c9d0] bg-white p-4 shadow-[0_18px_42px_rgba(89,37,49,0.18)]"
                    role="group"
                    aria-label={`${label} 배경색 추출`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-extrabold tracking-[0.12em] text-[#c94c63]">
                                COLOR EXTRACTOR
                            </p>
                            <p className="mt-0.5 text-sm font-extrabold text-slate-800">
                                {label} 배경색
                            </p>
                        </div>
                        <button
                            onClick={() => onActivate('')}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="색상 추출기 닫기"
                        >
                            <XIcon size={16} />
                        </button>
                    </div>

                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span
                            className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 shadow-inner"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                            <label
                                htmlFor={`${id}-hex`}
                                className="block text-[10px] font-bold text-slate-400"
                            >
                                HEX COLOR
                            </label>
                            <input
                                id={`${id}-hex`}
                                value={hexValue}
                                onChange={(event) =>
                                    applyColor(event.target.value)
                                }
                                className="mt-0.5 w-full bg-transparent font-mono text-sm font-extrabold uppercase text-slate-800 outline-none placeholder:text-slate-300"
                                inputMode="text"
                                maxLength={7}
                                aria-label={`${label} HEX 색상 코드`}
                            />
                        </div>
                        <input
                            type="color"
                            value={isHexColor(color) ? color : '#ffffff'}
                            onChange={(event) => applyColor(event.target.value)}
                            className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                            aria-label="색상 선택기 열기"
                        />
                    </div>

                    <button
                        onClick={extractScreenColor}
                        disabled={!eyeDropperAvailable || isExtracting}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e7657a] px-3 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#cf5268] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                        <PipetteIcon size={15} />
                        {isExtracting
                            ? '화면에서 색상 선택 중…'
                            : eyeDropperAvailable
                              ? '화면에서 색상 추출'
                              : '이 브라우저에서는 지원되지 않아요'}
                    </button>
                    <p className="mt-2 text-center text-[10px] leading-4 text-slate-400">
                        스포이드로 화면 어디에서나 원하는 색을 클릭해
                        적용하세요.
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                        {[
                            ['R', rgb.red],
                            ['G', rgb.green],
                            ['B', rgb.blue],
                        ].map(([channel, value]) => (
                            <div
                                key={channel as string}
                                className="rounded-lg bg-slate-50 px-2 py-1.5 text-center"
                            >
                                <span className="block text-[9px] font-bold text-slate-400">
                                    {channel}
                                </span>
                                <span className="mt-0.5 block font-mono text-xs font-bold text-slate-700">
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => applyColor('#FFFFFF')}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 transition hover:text-slate-700"
                    >
                        <RefreshCcwIcon size={12} /> 흰색으로 되돌리기
                    </button>
                </div>
            )}
        </div>
    );
}
