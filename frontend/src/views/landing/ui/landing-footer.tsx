import { Link } from 'react-router-dom'
import { BrandLogo } from '@/shared/ui'

export function LandingFooter() {
    return (
        <footer
            id="footer-section"
            style={{
                padding: '36px clamp(20px,6vw,80px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                borderTop: '1.5px solid #F0E4D8',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 800,
                    fontSize: 15,
                    color: '#3A2A28',
                }}
            >
                <BrandLogo className="h-6 w-6" />
                Plamingo
            </div>
            <div
                style={{
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#8A8FA8',
                }}
            >
                <Link
                    to="/terms"
                    style={{ color: '#8A8FA8', textDecoration: 'none' }}
                >
                    이용약관
                </Link>
                <Link
                    to="/privacy"
                    style={{ color: '#8A8FA8', textDecoration: 'none' }}
                >
                    개인정보처리방침
                </Link>
                <a
                    href="https://github.com/prgrms-aibe-devcourse/AIBE6_FinalProject_Team01"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#8A8FA8', textDecoration: 'none' }}
                >
                    GitHub
                </a>
            </div>
            <div style={{ fontSize: 12.5, color: '#B7BBCF', fontWeight: 600 }}>
                © 2026 Plamingo
            </div>
        </footer>
    )
}
