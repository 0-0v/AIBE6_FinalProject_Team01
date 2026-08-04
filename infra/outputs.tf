output "app_host_public_ip" {
  description = "앱 호스트 EC2 퍼블릭 IP"
  value       = aws_instance.app_host.public_ip
}

output "s3_bucket_name" {
  description = "AWS_S3_BUCKET 환경변수에 사용할 값"
  value       = aws_s3_bucket.uploads.bucket
}

output "s3_bucket_public_base_url" {
  description = "AWS_S3_PUBLIC_BASE_URL 환경변수에 사용할 값"
  value       = "https://${aws_s3_bucket.uploads.bucket}.s3.${var.region}.amazonaws.com"
}
