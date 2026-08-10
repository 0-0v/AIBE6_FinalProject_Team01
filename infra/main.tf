terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_availability_zones" "available" {
  state = "available"
}

# --- 네트워크 ---

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.prefix}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.prefix}-igw"
  }
}

# EC2 인스턴스 1대만 운영하는 구조라 가용영역 2개에 public subnet만 둔다.
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.prefix}-public-subnet-${count.index + 1}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.prefix}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# --- 보안 그룹 ---
# 80/443만 전체 공개하고, SSH(22)와 npm 관리자 UI(81)는 ssh_allowed_cidr로 제한한다.
# MySQL(3306)/Redis(6379)는 같은 EC2에서 도커 네트워크로만 접근하므로 외부에 열지 않는다.
resource "aws_security_group" "app_host" {
  name        = "${var.prefix}-app-host-sg"
  description = "Public web (80/443) + restricted admin access (22/81) for the app host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH (restricted)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  ingress {
    description = "nginx-proxy-manager admin UI (restricted)"
    from_port   = 81
    to_port     = 81
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.prefix}-app-host-sg"
  }
}

# --- S3 (업로드 버킷) ---
# 업로드 버킷은 별도로 관리하며, 이 구성에서는 생성·삭제하지 않고 참조만 한다.
data "aws_s3_bucket" "uploads" {
  bucket = var.uploads_bucket_name
}

# 이전 업로드 버킷은 AWS에서 이미 교체되었으므로 관련 리소스를 상태에서만 제거한다.
removed {
  from = aws_s3_bucket.uploads

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_s3_bucket_public_access_block.uploads

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_s3_bucket_policy.uploads_public_read

  lifecycle {
    destroy = false
  }
}

# --- IAM (EC2 역할) ---

resource "aws_iam_role" "ec2" {
  name = "${var.prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.prefix}-ec2-role"
  }
}

# S3 전체 권한 대신 업로드 버킷으로만 범위를 제한한다.
resource "aws_iam_role_policy" "s3_uploads" {
  name = "${var.prefix}-s3-uploads-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${data.aws_s3_bucket.uploads.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = data.aws_s3_bucket.uploads.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.prefix}-ec2-instance-profile"
  role = aws_iam_role.ec2.name
}

# --- EC2 (앱 호스트: nginx-proxy-manager + MySQL + Redis) ---

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

resource "aws_instance" "app_host" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.app_host.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  key_name                    = var.key_pair_name

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size
  }

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    mysql_database                       = var.mysql_database
    mysql_user                           = var.mysql_user
    mysql_password                       = var.mysql_password
    mysql_root_password                  = var.mysql_root_password
    redis_password                       = var.redis_password
    npm_admin_email                      = var.npm_admin_email
    npm_admin_password                   = var.npm_admin_password
    app_domain                           = var.app_domain
    jwt_secret                           = var.jwt_secret
    google_maps_api_key                  = var.google_maps_api_key
    google_client_id                     = var.google_client_id
    google_client_secret                 = var.google_client_secret
    kakao_client_id                      = var.kakao_client_id
    kakao_client_secret                  = var.kakao_client_secret
    oauth_token_encryption_key           = var.oauth_token_encryption_key
    aws_s3_bucket                        = data.aws_s3_bucket.uploads.bucket
    aws_s3_public_base_url               = "https://${data.aws_s3_bucket.uploads.bucket}.s3.${var.region}.amazonaws.com"
    brevo_api_key                        = var.brevo_api_key
    brevo_email_verification_template_id = var.brevo_email_verification_template_id
    brevo_smtp_username                  = var.brevo_smtp_username
    brevo_smtp_password                  = var.brevo_smtp_password
    brevo_from_email                     = var.brevo_from_email
    openai_api_key                       = var.openai_api_key
    cors_allowed_origins                 = var.cors_allowed_origins
    frontend_base_url                    = var.frontend_base_url
  })

  tags = {
    Name = "${var.prefix}-app-host"
  }
}
