import { UserRoundCheckIcon } from 'lucide-react'

export type TestAccount = {
    identifier: string
    password: string
    nickname: string
}

const TEST_ACCOUNTS: TestAccount[] = [
    {
        identifier: 'test-user-1@plamingo.app',
        password: 'PlamingoTest1!',
        nickname: '테스트유저1',
    },
    {
        identifier: 'test-user-2@plamingo.app',
        password: 'PlamingoTest1!',
        nickname: '테스트유저2',
    },
]

export function TestAccountLogin({
    busy,
    onLogin,
}: {
    busy: boolean
    onLogin: (account: TestAccount) => void
}) {
    return (
        <section className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <div className="flex items-start gap-2.5">
                <UserRoundCheckIcon
                    className="mt-0.5 shrink-0 text-brand"
                    size={18}
                />
                <div>
                    <h2 className="text-sm font-extrabold text-slate-800">
                        테스트 계정으로 둘러보기
                    </h2>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        초대와 공동 여행 기능을 확인할 수 있는 심사용
                        계정입니다.
                    </p>
                </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
                {TEST_ACCOUNTS.map((account) => (
                    <button
                        key={account.identifier}
                        type="button"
                        disabled={busy}
                        onClick={() => onLogin(account)}
                        className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-xs font-extrabold text-brand-700 transition hover:border-brand hover:bg-brand-50 disabled:cursor-wait disabled:opacity-50"
                    >
                        {account.nickname} 로그인
                    </button>
                ))}
            </div>
        </section>
    )
}
