import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    APP_BUCKET_NAME:      process.env.APP_BUCKET_NAME      ? `set (${process.env.APP_BUCKET_NAME})` : "❌ NOT SET",
    APP_REGION:           process.env.APP_REGION           ? `set (${process.env.APP_REGION})`      : "❌ NOT SET",
    APP_ACCESS_KEY_ID:    process.env.APP_ACCESS_KEY_ID    ? "set (****)"                           : "❌ NOT SET",
    APP_SECRET_ACCESS_KEY:process.env.APP_SECRET_ACCESS_KEY? "set (****)"                           : "❌ NOT SET",
    S3_BUCKET_NAME:       process.env.S3_BUCKET_NAME       ? `set (${process.env.S3_BUCKET_NAME})`  : "not set",
  });
}
