const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

/**
 * 6자리 hex 색상 뒤에 2자리 alpha hex를 붙여 8자리 hex로 만든다.
 * color가 6자리 hex가 아니면(CSS 변수 등) alpha를 붙일 수 없으므로 그대로 반환한다.
 */
export function hexWithAlpha(color: string, alphaHex: string): string {
    return HEX_COLOR_PATTERN.test(color) ? `${color}${alphaHex}` : color
}
