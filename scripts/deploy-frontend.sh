#!/bin/bash
set -euo pipefail

STACK_NAME="SaltusAtrStack"
REGION="eu-west-2"

get_output() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey==\`$1\`].OutputValue" \
    --output text --region "$REGION"
}

echo "Building frontend..."
yarn build

BUCKET=$(get_output HostingBucketName)
DIST_ID=$(get_output DistributionId)

echo "Syncing to s3://$BUCKET..."
aws s3 sync dist/ "s3://$BUCKET" --delete

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" --region "$REGION" > /dev/null

echo ""
echo "Deployed to: $(get_output CloudFrontUrl)"
