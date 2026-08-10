'use client'

import { useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, ShieldCheckIcon } from 'lucide-react'

type Section = {
    title: string
    paragraphs?: string[]
    items?: string[]
}

const termsSections: Section[] = [
    {
        title: '제1조 목적',
        paragraphs: [
            '이 약관은 Plamingo 프로젝트 팀이 제공하는 공동 여행 계획 서비스의 이용 조건과 운영자 및 이용자의 권리·의무를 정하는 것을 목적으로 합니다.',
        ],
    },
    {
        title: '제2조 계정과 회원가입',
        items: [
            '이용자는 정확한 정보를 제공하고 자신의 계정과 인증수단을 안전하게 관리해야 합니다.',
            '타인의 정보를 도용하거나 서비스 운영을 방해하는 계정은 이용이 제한될 수 있습니다.',
            '소셜 로그인은 해당 제공자의 정책과 장애 상황에 영향을 받을 수 있습니다.',
        ],
    },
    {
        title: '제3조 서비스의 주요 기능',
        items: [
            '여행방 생성, 멤버 초대, 장소 등록·투표·댓글 및 일정 관리',
            '예산·지출·정산 내역 관리와 여행 기록·회고 작성',
            'AI를 활용한 장소 분류, 일정 초안 및 동선 보조',
            '완료된 여행 카드의 공개, 댓글, 북마크 및 일정 복사',
        ],
    },
    {
        title: '제4조 이용자의 콘텐츠',
        items: [
            '이용자는 자신이 업로드한 사진, 글, 댓글 등에 필요한 권리를 보유해야 합니다.',
            '공개로 설정한 여행 카드는 다른 이용자가 열람하거나 서비스가 제공하는 범위에서 활용할 수 있습니다.',
            '타인의 권리를 침해하거나 불법·유해한 콘텐츠는 사전 통지 없이 제한 또는 삭제될 수 있습니다.',
        ],
    },
    {
        title: '제5조 AI 및 외부 서비스',
        items: [
            'AI가 생성한 분류·일정·동선은 참고 정보이며 정확성이나 완전성을 보장하지 않습니다.',
            '장소, 지도와 경로 정보는 Google Maps 등 외부 서비스의 정보와 정책에 영향을 받을 수 있습니다.',
            'Google Maps 기능 이용에는 Google Maps/Google Earth 추가 서비스 약관과 Google 개인정보처리방침이 적용됩니다.',
            '이용자는 영업시간, 교통, 안전 및 예약 정보를 직접 최종 확인해야 합니다.',
        ],
    },
    {
        title: '제6조 금지행위',
        items: [
            '서비스 또는 계정에 대한 비정상적인 접근과 보안 우회',
            '타인의 개인정보·저작권·초상권 등 권리 침해',
            '자동화 수단을 이용한 과도한 요청, 악성코드 배포 및 서비스 방해',
            '법령 또는 공공질서에 반하는 목적의 이용',
        ],
    },
    {
        title: '제7조 서비스 변경 및 중단',
        paragraphs: [
            '운영상 또는 기술상 필요한 경우 서비스의 일부를 변경하거나 일시 중단할 수 있습니다. 중요한 변경은 서비스 내 공지 등 합리적인 방법으로 안내합니다.',
        ],
    },
    {
        title: '제8조 책임의 범위',
        paragraphs: [
            '운영자는 고의 또는 중대한 과실이 없는 한 외부 서비스 장애, 이용자 간 분쟁, 이용자가 확정한 여행 계획으로 발생한 손해에 책임을 지지 않습니다. 관련 법령상 배제할 수 없는 책임은 제외합니다.',
        ],
    },
    {
        title: '제9조 회원 탈퇴',
        paragraphs: [
            '이용자는 서비스에서 탈퇴를 요청할 수 있습니다. 탈퇴 시 처리되는 정보와 예외적 보존 항목은 개인정보처리방침을 따릅니다.',
        ],
    },
    {
        title: '제10조 준거법 및 분쟁',
        paragraphs: [
            '이 약관은 대한민국 법령을 따릅니다. 분쟁이 발생하면 상호 협의를 우선하며, 해결되지 않는 경우 관련 법령에 따른 관할 법원에서 처리합니다.',
        ],
    },
]

const privacySections: Section[] = [
    {
        title: '1. 수집하는 개인정보',
        items: [
            '필수 정보: 이메일, 닉네임, 로그인 제공자, 제공자 식별값',
            '선택 정보: 프로필 이미지',
            '서비스 이용 정보: 여행방, 장소, 일정, 투표, 댓글, 지출·정산, 여행 기록과 업로드 파일',
            '자동 생성 정보: 로그인 시각, 서비스 이용 및 오류 기록, 인증 토큰 관련 기록',
        ],
    },
    {
        title: '2. 이용 목적',
        items: [
            '회원 식별, 로그인, 계정 관리와 보안',
            '공동 여행 계획, 멤버 협업, 알림과 활동 기록 제공',
            '지도·경로·AI 기능 제공 및 서비스 품질 개선',
            '부정 이용 방지, 장애 대응과 분쟁 처리',
        ],
    },
    {
        title: '3. 보유 및 이용 기간',
        paragraphs: [
            '회원 탈퇴 시 계정은 즉시 비활성화되고, 닉네임과 프로필 이미지는 서비스 화면에서 탈퇴한 사용자로 마스킹됩니다.',
            '이메일, 로그인 제공자 식별값 등 계정 개인정보는 탈퇴일로부터 90일간 보관한 뒤 복구할 수 없도록 파기합니다.',
            '개인정보 보관기간 동안에는 동일한 이메일 또는 동일한 소셜 계정으로 재가입할 수 없으며, 탈퇴일로부터 90일이 지난 후 다시 가입할 수 있습니다.',
            '이용자가 공동 여행방에 남긴 여행, 장소, 일정, 댓글 등의 기록은 다른 이용자의 서비스 이용과 기록 보존을 위해 유지되며 작성자는 탈퇴한 사용자로 표시됩니다.',
            '법령에 따라 보존 의무가 발생하는 경우 해당 기록은 다른 정보와 분리하여 법정 기간 동안만 보관합니다.',
        ],
        items: [
            '계약 또는 청약철회, 대금결제 및 공급 기록: 5년(해당 기능을 제공하는 경우)',
            '소비자 불만 또는 분쟁 처리 기록: 3년',
            '표시·광고 기록: 6개월',
        ],
    },
    {
        title: '4. 외부 서비스와 처리위탁',
        items: [
            'OAuth 제공자: Google, Kakao — 로그인과 회원 식별',
            'Google Maps Platform — 장소 검색, 지도와 경로 제공',
            'AI API 제공자 — 사용자가 요청한 장소 분류와 일정 생성',
            'AWS 등 인프라 제공자 — 서버 및 이미지·파일 저장',
            '이메일 발송 서비스 — 회원가입 및 비밀번호 재설정 인증번호 발송',
        ],
        paragraphs: [
            '실제 제공자, 이전 국가, 보관 기간 및 위탁 범위가 확정되면 배포 전에 본 방침에 구체적으로 반영합니다.',
        ],
    },
    {
        title: '5. 이용자의 권리',
        items: [
            '자신의 개인정보 열람, 정정, 삭제 및 처리정지를 요청할 수 있습니다.',
            '회원 탈퇴를 통해 개인정보 처리 동의를 철회할 수 있습니다.',
            '법령상 보존 의무 또는 다른 이용자의 권리 보호가 필요한 정보는 즉시 삭제가 제한될 수 있습니다.',
        ],
    },
    {
        title: '6. 파기 방법',
        items: [
            '전자적 파일은 복구하기 어려운 방법으로 삭제합니다.',
            '법령 또는 부정 이용 방지 목적으로 보존하는 정보는 일반 회원정보와 논리적·물리적으로 분리하고 접근 권한을 제한합니다.',
            '보유기간이 끝나면 해당 정보도 지체 없이 파기합니다.',
        ],
    },
    {
        title: '7. 안전성 확보 조치',
        items: [
            '비밀번호 암호화, 접근 권한 제한 및 인증 토큰 보호',
            '전송 구간 암호화와 주요 활동 기록 관리',
            '파일 업로드 형식·크기 검증과 비정상 요청 방지',
        ],
    },
    {
        title: '8. 개인정보 관련 문의',
        paragraphs: [
            '개인정보 보호책임자와 문의 이메일은 운영 주체가 확정되는 즉시 서비스 내 공지와 본 방침에 표시합니다. 현재는 프로젝트 저장소 또는 서비스 내 문의 채널을 이용해 주세요.',
        ],
    },
]

export function TermsPage() {
    return (
        <LegalPage
            eyebrow="TERMS OF SERVICE"
            title="이용약관"
            description="Plamingo를 이용할 때 필요한 기본 규칙입니다."
            sections={termsSections}
        />
    )
}

export function PrivacyPolicyPage() {
    return (
        <LegalPage
            eyebrow="PRIVACY POLICY"
            title="개인정보처리방침"
            description="개인정보의 수집·이용·보관 및 이용자의 권리를 안내합니다."
            sections={privacySections}
            notice="본 문서는 현재 서비스 구조를 기준으로 작성한 초안입니다. 출시 전 실제 운영자 정보, 위탁업체, 국외 이전 여부와 탈퇴 데이터 처리 구현을 기준으로 법률 검토가 필요합니다."
        />
    )
}

function LegalPage({
    eyebrow,
    title,
    description,
    sections,
    notice,
}: {
    eyebrow: string
    title: string
    description: string
    sections: Section[]
    notice?: string
}) {
    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [title])

    return (
        <main className="min-h-full bg-[var(--color-app-warm-background)] px-4 py-8 sm:px-6 sm:py-12">
            <article className="mx-auto max-w-3xl rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-10">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-brand"
                >
                    <ArrowLeftIcon size={16} />
                    로그인으로 돌아가기
                </Link>

                <header className="mt-8 border-b border-slate-100 pb-8">
                    <p className="text-xs font-black tracking-[0.16em] text-brand">
                        {eyebrow}
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                        {title}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        {description}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                        시행일: 2026년 7월 29일
                    </p>
                </header>

                {notice && (
                    <div className="mt-6 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                        <ShieldCheckIcon
                            size={20}
                            className="mt-0.5 shrink-0"
                        />
                        <p>{notice}</p>
                    </div>
                )}

                <div className="mt-8 space-y-9">
                    {sections.map((section) => (
                        <section key={section.title}>
                            <h2 className="text-lg font-extrabold text-slate-900">
                                {section.title}
                            </h2>
                            {section.paragraphs?.map((paragraph) => (
                                <p
                                    key={paragraph}
                                    className="mt-3 text-sm leading-7 text-slate-600"
                                >
                                    {paragraph}
                                </p>
                            ))}
                            {section.items && (
                                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
                                    {section.items.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>

                <footer className="mt-10 flex flex-wrap gap-4 border-t border-slate-100 pt-6 text-xs font-bold text-slate-400">
                    <Link to="/terms" className="hover:text-brand">
                        이용약관
                    </Link>
                    <Link to="/privacy" className="hover:text-brand">
                        개인정보처리방침
                    </Link>
                    <Link to="/" className="hover:text-brand">
                        Plamingo 홈
                    </Link>
                    <a
                        href="https://maps.google.com/help/terms_maps.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand"
                    >
                        Google Maps 추가 약관
                    </a>
                    <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand"
                    >
                        Google 개인정보처리방침
                    </a>
                </footer>
            </article>
        </main>
    )
}
