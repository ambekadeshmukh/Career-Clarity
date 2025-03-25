provider "aws" {
  region = var.aws_region
}

terraform {
  backend "s3" {
    bucket = "careerclarity-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Import modules
module "s3" {
  source = "./modules/s3"
  
  app_name        = var.app_name
  environment     = var.environment
  frontend_bucket = "${var.app_name}-${var.environment}-frontend"
}

module "dynamodb" {
  source = "./modules/dynamodb"
  
  app_name        = var.app_name
  environment     = var.environment
}

module "cognito" {
  source = "./modules/cognito"
  
  app_name        = var.app_name
  environment     = var.environment
  user_pool_name  = "${var.app_name}-${var.environment}-users"
}

module "lambda" {
  source = "./modules/lambda"
  
  app_name               = var.app_name
  environment            = var.environment
  job_analyzer_function  = "${var.app_name}-${var.environment}-job-analyzer"
  pattern_detector_function = "${var.app_name}-${var.environment}-pattern-detector"
  feedback_processor_function = "${var.app_name}-${var.environment}-feedback-processor"
  dynamodb_table_arn     = module.dynamodb.table_arn
  s3_bucket_arn          = module.s3.bucket_arn
}

module "api_gateway" {
  source = "./modules/api-gateway"
  
  app_name         = var.app_name
  environment      = var.environment
  cognito_user_pool_arn = module.cognito.user_pool_arn
  lambda_functions = {
    job_analyzer = {
      function_name = module.lambda.job_analyzer_function_name
      function_arn  = module.lambda.job_analyzer_function_arn
      invoke_arn    = module.lambda.job_analyzer_invoke_arn
    },
    pattern_detector = {
      function_name = module.lambda.pattern_detector_function_name
      function_arn  = module.lambda.pattern_detector_function_arn
      invoke_arn    = module.lambda.pattern_detector_invoke_arn
    },
    feedback_processor = {
      function_name = module.lambda.feedback_processor_function_name
      function_arn  = module.lambda.feedback_processor_function_arn
      invoke_arn    = module.lambda.feedback_processor_invoke_arn
    }
  }
}

# EventBridge rule for scheduled job scanning
resource "aws_cloudwatch_event_rule" "scan_jobs_rule" {
  name                = "${var.app_name}-${var.environment}-scan-jobs"
  description         = "Triggers job scanning function daily"
  schedule_expression = "cron(0 0 * * ? *)" # Run once per day at midnight UTC
}

resource "aws_cloudwatch_event_target" "scan_jobs_target" {
  rule      = aws_cloudwatch_event_rule.scan_jobs_rule.name
  target_id = "ScanJobsFunction"
  arn       = module.lambda.pattern_detector_function_arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda.pattern_detector_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scan_jobs_rule.arn
}