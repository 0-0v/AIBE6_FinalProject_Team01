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
