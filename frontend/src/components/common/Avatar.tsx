import React from 'react';

type Props = {
    name: string;
    color: string;
    size?: number;
    className?: string;
};

export function Avatar({ name, color, size = 32, className = '' }: Props) {
    const initial = name.trim().charAt(0).toUpperCase();
    return (
        <span
            className={`inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${className}`}
            style={{
                backgroundColor: color,
                width: size,
                height: size,
                fontSize: size * 0.42,
            }}
            aria-hidden="true"
        >
            {initial}
        </span>
    );
}
