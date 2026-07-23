'use client'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-brand text-white hover:bg-brand-700',
                outline: 'border border-slate-200 bg-white hover:bg-slate-50',
                ghost: 'hover:bg-slate-100',
            },
            size: {
                default: 'h-9 px-4 py-2',
                sm: 'h-8 px-3',
                lg: 'h-10 px-6',
                icon: 'size-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
    }

export function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: ButtonProps) {
    const Component = asChild ? Slot : 'button'
    return (
        <Component
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        />
    )
}

export { buttonVariants }
