type PageHeaderProps = {
    eyebrow: string
    title: string
    description: string
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
    return (
        <header>
            <p className="text-xs font-extrabold tracking-[0.12em] text-brand-700">
                {eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.05em] text-slate-950 sm:text-3xl">
                {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
            </p>
        </header>
    )
}
