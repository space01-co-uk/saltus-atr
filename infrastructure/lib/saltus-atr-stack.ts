import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaBase from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as path from "path";
import { Construct } from "constructs";

export class SaltusAtrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const allowedOrigin = this.node.tryGetContext("allowedOrigin") as
      | string
      | undefined;

    // Basic auth credentials for demo access (base64-encoded in CloudFront Function)
    const basicAuthUsername = "guestuser";
    const basicAuthPassword = "s3a5e01";

    // Cognito Identity Pool (unauthenticated access for anonymous users)
    const identityPool = new cognito.CfnIdentityPool(
      this,
      "SaltusATRIdentityPool",
      {
        identityPoolName: "SaltusATRIdentityPool",
        allowUnauthenticatedIdentities: true,
      },
    );

    // IAM role for unauthenticated users
    const unauthRole = new iam.Role(this, "CognitoUnauthRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
    });

    // Attach role to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoles", {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthRole.roleArn,
      },
    });

    // AppSync GraphQL API
    const api = new appsync.GraphqlApi(this, "SaltusATRApi", {
      name: "SaltusATRApi",
      definition: appsync.Definition.fromFile(
        path.join(__dirname, "schema.graphql"),
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
    });

    // Grant unauthenticated role permission to invoke AppSync
    api.grant(unauthRole, appsync.IamResource.all(), "appsync:GraphQL");

    // Lambda: getQuestions
    const getQuestionsLambda = new lambda.NodejsFunction(
      this,
      "GetQuestionsFunction",
      {
        functionName: "getQuestionsSaltusATR",
        entry: path.join(__dirname, "..", "lambda", "getQuestions", "index.ts"),
        handler: "handler",
        runtime: lambdaBase.Runtime.NODEJS_22_X,
        memorySize: 256,
        timeout: cdk.Duration.seconds(30),
        bundling: { minify: true, sourceMap: true },
      },
    );

    // Lambda: calculateRisk
    const calculateRiskLambda = new lambda.NodejsFunction(
      this,
      "CalculateRiskFunction",
      {
        functionName: "calculateRiskSaltusATR",
        entry: path.join(
          __dirname,
          "..",
          "lambda",
          "calculateRisk",
          "index.ts",
        ),
        handler: "handler",
        runtime: lambdaBase.Runtime.NODEJS_22_X,
        memorySize: 256,
        timeout: cdk.Duration.seconds(30),
        bundling: { minify: true, sourceMap: true },
      },
    );

    // AppSync data sources and resolvers
    const getQuestionsDs = api.addLambdaDataSource(
      "GetQuestionsDs",
      getQuestionsLambda,
    );
    getQuestionsDs.createResolver("GetQuestionsResolver", {
      typeName: "Query",
      fieldName: "getQuestions",
    });

    const calculateRiskDs = api.addLambdaDataSource(
      "CalculateRiskDs",
      calculateRiskLambda,
    );
    calculateRiskDs.createResolver("CalculateRiskResolver", {
      typeName: "Mutation",
      fieldName: "calculateRisk",
    });

    // --- CloudFront + S3 Hosting ---

    // S3 bucket for frontend static files
    const hostingBucket = new s3.Bucket(this, "HostingBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Function for HTTP Basic Auth
    const encodedCredentials = Buffer.from(
      `${basicAuthUsername}:${basicAuthPassword}`,
    ).toString("base64");

    const basicAuthFunction = new cloudfront.Function(
      this,
      "BasicAuthFunction",
      {
        functionName: "SaltusATRBasicAuth",
        code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var expected = "Basic ${encodedCredentials}";
  if (!headers.authorization || headers.authorization.value !== expected) {
    return {
      statusCode: 401,
      statusDescription: "Unauthorized",
      headers: { "www-authenticate": { value: 'Basic realm="Saltus ATR Demo"' } }
    };
  }
  return request;
}
`),
        runtime: cloudfront.FunctionRuntime.JS_2_0,
      },
    );

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(hostingBucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: basicAuthFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      defaultRootObject: "index.html",
      // SPA routing: serve index.html for all non-file paths
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    const cloudfrontUrl = cdk.Fn.join("", [
      "https://",
      distribution.distributionDomainName,
    ]);

    // S3 bucket for PDF storage
    const pdfBucket = new s3.Bucket(this, "SaltusATRPDFStore", {
      bucketName: `saltus-atr-pdf-store-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: [
            allowedOrigin ?? cloudfrontUrl,
            "http://localhost:*",
          ],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
    });

    // Lambda: generatePDF
    // Chromium is bundled via @sparticuz/chromium (included in esbuild bundle)
    const generatePdfLambda = new lambda.NodejsFunction(
      this,
      "GeneratePdfFunction",
      {
        functionName: "generateRiskResultPDFSaltusATR",
        entry: path.join(__dirname, "..", "lambda", "generatePDF", "index.ts"),
        handler: "handler",
        runtime: lambdaBase.Runtime.NODEJS_22_X,
        memorySize: 2048,
        timeout: cdk.Duration.seconds(300),
        environment: {
          PDF_BUCKET_NAME: pdfBucket.bucketName,
        },
        bundling: {
          minify: true,
          sourceMap: true,
          // Exclude chromium binary from esbuild — it's loaded at runtime from the npm package
          nodeModules: ["@sparticuz/chromium"],
        },
      },
    );
    pdfBucket.grantReadWrite(generatePdfLambda);

    const generatePdfDs = api.addLambdaDataSource(
      "GeneratePdfDs",
      generatePdfLambda,
    );
    generatePdfDs.createResolver("GeneratePdfResolver", {
      typeName: "Mutation",
      fieldName: "generateRiskResultPDF",
    });

    // Outputs
    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: cloudfrontUrl,
      description: "CloudFront URL (password-protected)",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: "CloudFront Distribution ID",
    });

    new cdk.CfnOutput(this, "HostingBucketName", {
      value: hostingBucket.bucketName,
      description: "S3 bucket for frontend hosting",
    });

    new cdk.CfnOutput(this, "AppSyncEndpoint", {
      value: api.graphqlUrl,
      description: "AppSync GraphQL endpoint URL",
    });

    new cdk.CfnOutput(this, "AppSyncRegion", {
      value: this.region,
      description: "AWS region",
    });

    new cdk.CfnOutput(this, "CognitoIdentityPoolId", {
      value: identityPool.ref,
      description: "Cognito Identity Pool ID",
    });

    new cdk.CfnOutput(this, "PDFBucketName", {
      value: pdfBucket.bucketName,
      description: "S3 bucket for PDF storage",
    });
  }
}
