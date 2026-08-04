variable "region" {
  description = "리소스를 생성할 AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "prefix" {
  description = "리소스 이름/태그에 사용할 접두사"
  type        = string
  default     = "plamingo-prod"
}

variable "instance_type" {
  description = "앱 호스트 EC2 인스턴스 유형"
  type        = string
  default     = "t3.micro"
}

variable "root_volume_size" {
  description = "EC2 루트 볼륨 크기(GB)"
  type        = number
  default     = 20
}

variable "key_pair_name" {
  description = "EC2 SSH 접속에 사용할 기존 AWS 키 페어 이름"
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "SSH(22)와 nginx-proxy-manager 관리 UI(81) 접근을 허용할 CIDR (예: 1.2.3.4/32)"
  type        = string
}

variable "mysql_database" {
  description = "생성할 MySQL 데이터베이스 이름 (backend/compose.yml과 동일하게 유지)"
  type        = string
  default     = "plamingo"
}

variable "mysql_user" {
  description = "애플리케이션에서 사용할 MySQL 계정"
  type        = string
  sensitive   = true
}

variable "mysql_password" {
  description = "MySQL 애플리케이션 계정 비밀번호"
  type        = string
  sensitive   = true
}

variable "mysql_root_password" {
  description = "MySQL root 비밀번호"
  type        = string
  sensitive   = true
}

variable "redis_password" {
  description = "Redis 접속 비밀번호"
  type        = string
  sensitive   = true
}

variable "npm_admin_email" {
  description = "nginx-proxy-manager 최초 관리자 계정 이메일"
  type        = string
}

variable "npm_admin_password" {
  description = "nginx-proxy-manager 최초 관리자 계정 비밀번호"
  type        = string
  sensitive   = true
}

variable "app_domain" {
  description = "백엔드에 연결할 도메인 (nginx-proxy-manager의 proxy host 도메인과 일치해야 함, CI 배포 스크립트가 이 값으로 전환 대상을 찾음)"
  type        = string
}

variable "jwt_secret" {
  description = "백엔드 JWT 서명에 사용할 시크릿 (app.auth.jwt.secret)"
  type        = string
  sensitive   = true
}

variable "google_maps_api_key" {
  description = "백엔드 Google Maps/Routes API 키 (app.integrations.google-maps.api-key)"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "구글 소셜 로그인 OAuth2 클라이언트 ID"
  type        = string
}

variable "google_client_secret" {
  description = "구글 소셜 로그인 OAuth2 클라이언트 시크릿"
  type        = string
  sensitive   = true
}

variable "kakao_client_id" {
  description = "카카오 소셜 로그인 OAuth2 클라이언트 ID"
  type        = string
}

variable "kakao_client_secret" {
  description = "카카오 소셜 로그인 OAuth2 클라이언트 시크릿"
  type        = string
  sensitive   = true
}

variable "oauth_token_encryption_key" {
  description = "소셜 로그인 토큰 저장/연결해제에 쓰는 AES 키 (Base64, `openssl rand -base64 32`로 생성)"
  type        = string
  sensitive   = true
}

variable "brevo_api_key" {
  description = "Brevo 트랜잭션 이메일 API 키 (BrevoEmailClient가 실제로 사용, 이메일 인증 발송에 필수)"
  type        = string
  sensitive   = true
}

variable "brevo_email_verification_template_id" {
  description = "Brevo 이메일 인증 템플릿 ID (BrevoEmailClient가 실제로 사용)"
  type        = string
}

variable "brevo_smtp_username" {
  description = "Brevo SMTP 사용자명 (현재 코드에서 JavaMailSender를 쓰지 않아 실제로는 참조되지 않음, 추후 대비용)"
  type        = string
  default     = ""
}

variable "brevo_smtp_password" {
  description = "Brevo SMTP 비밀번호 (현재 코드에서 JavaMailSender를 쓰지 않아 실제로는 참조되지 않음, 추후 대비용)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "brevo_from_email" {
  description = "Brevo 발신자 이메일 (EmailAuthProperties.getFrom()이 코드에서 호출되지 않아 실제로는 참조되지 않음, 추후 대비용)"
  type        = string
  default     = ""
}

variable "openai_api_key" {
  description = "AI 동선 추천에 사용할 OpenAI API 키 (없으면 규칙 기반 추천으로 자동 대체)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cors_allowed_origins" {
  description = "CORS 허용 오리진 (프론트엔드 배포 도메인, 쉼표로 여러 개 구분 가능)"
  type        = string
  default     = "http://localhost:3000"
}

variable "frontend_base_url" {
  description = "이메일 링크 등에 사용할 프론트엔드 기본 URL"
  type        = string
  default     = "http://localhost:3000"
}
