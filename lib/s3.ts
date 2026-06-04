import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.APP_REGION ?? process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.APP_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.APP_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET = process.env.APP_BUCKET_NAME ?? process.env.S3_BUCKET_NAME!;
