#!/bin/bash

# Setup IAM Permissions for SQS Access
# This script creates IAM policy and role for EC2 instances to access SQS

set -e

PROJECT_NAME="${PROJECT_NAME:-ecommerce}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"

echo "========================================="
echo "Setting up IAM Permissions for SQS"
echo "========================================="

# Create IAM Policy for SQS Access
echo "Creating IAM policy for SQS access..."

POLICY_DOCUMENT=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SQSAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ChangeMessageVisibility",
        "sqs:ListQueues"
      ],
      "Resource": [
        "arn:aws:sqs:${AWS_REGION}:*:${PROJECT_NAME}-*"
      ]
    },
    {
      "Sid": "CloudWatchLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": [
        "arn:aws:logs:${AWS_REGION}:*:log-group:/aws/ec2/${PROJECT_NAME}/*"
      ]
    }
  ]
}
EOF
)

# Create the policy
POLICY_ARN=$(aws iam create-policy \
  --policy-name ${PROJECT_NAME}-sqs-policy \
  --policy-document "$POLICY_DOCUMENT" \
  --description "Policy for ${PROJECT_NAME} services to access SQS queues" \
  --query 'Policy.Arn' \
  --output text 2>/dev/null || aws iam list-policies --query "Policies[?PolicyName=='${PROJECT_NAME}-sqs-policy'].Arn" --output text)

echo "IAM Policy ARN: $POLICY_ARN"

# Create IAM Role for EC2
echo ""
echo "Creating IAM role for EC2 instances..."

TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

# Create the role
ROLE_NAME="${PROJECT_NAME}-ec2-role"

aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document "$TRUST_POLICY" \
  --description "IAM role for ${PROJECT_NAME} EC2 instances" \
  2>/dev/null || echo "Role already exists"

echo "IAM Role: $ROLE_NAME"

# Attach policy to role
echo ""
echo "Attaching SQS policy to role..."

aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn $POLICY_ARN

echo "Policy attached successfully"

# Attach AWS managed policies
echo ""
echo "Attaching AWS managed policies..."

# CloudWatch Agent policy
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

# SSM policy (for Systems Manager)
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# Create instance profile
echo ""
echo "Creating instance profile..."

INSTANCE_PROFILE_NAME="${PROJECT_NAME}-ec2-instance-profile"

aws iam create-instance-profile \
  --instance-profile-name $INSTANCE_PROFILE_NAME \
  2>/dev/null || echo "Instance profile already exists"

# Add role to instance profile
aws iam add-role-to-instance-profile \
  --instance-profile-name $INSTANCE_PROFILE_NAME \
  --role-name $ROLE_NAME \
  2>/dev/null || echo "Role already added to instance profile"

echo "Instance Profile: $INSTANCE_PROFILE_NAME"

# Get instance profile ARN
INSTANCE_PROFILE_ARN=$(aws iam get-instance-profile \
  --instance-profile-name $INSTANCE_PROFILE_NAME \
  --query 'InstanceProfile.Arn' \
  --output text)

echo ""
echo "========================================="
echo "IAM Setup Complete!"
echo "========================================="
echo ""
echo "Policy ARN: $POLICY_ARN"
echo "Role Name: $ROLE_NAME"
echo "Instance Profile: $INSTANCE_PROFILE_NAME"
echo "Instance Profile ARN: $INSTANCE_PROFILE_ARN"
echo ""
echo "Next steps:"
echo ""
echo "For NEW EC2 instances:"
echo "  Launch instances with --iam-instance-profile Name=$INSTANCE_PROFILE_NAME"
echo ""
echo "For EXISTING EC2 instances:"
echo "  1. Stop the instance"
echo "  2. Attach the instance profile:"
echo "     aws ec2 associate-iam-instance-profile \\"
echo "       --instance-id <instance-id> \\"
echo "       --iam-instance-profile Name=$INSTANCE_PROFILE_NAME"
echo "  3. Start the instance"
echo ""
echo "Verify IAM role on instance:"
echo "  ssh to instance and run:"
echo "  curl http://169.254.169.254/latest/meta-data/iam/security-credentials/"
echo ""

# Save configuration
cat > iam-config.txt << EOF
# IAM Configuration for SQS Access
POLICY_ARN=$POLICY_ARN
ROLE_NAME=$ROLE_NAME
INSTANCE_PROFILE_NAME=$INSTANCE_PROFILE_NAME
INSTANCE_PROFILE_ARN=$INSTANCE_PROFILE_ARN
EOF

echo "Configuration saved to iam-config.txt"
echo ""
