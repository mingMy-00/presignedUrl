import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";

export async function GET(req: NextRequest) {
  const start = Date.now();
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });

  return NextResponse.json({
    url,
    expiresIn: 300,
    serverProcessingMs: Date.now() - start,
    serverDataBytes: 0,
    steps: [
      { from: "Browser", to: "Server", label: "GET /api/presigned/download?key=...", bytes: 50 },
      { from: "Server", to: "Server", label: "HMAC-SHA256 서명 계산 (로컬 연산)", bytes: 0 },
      { from: "Server", to: "Browser", label: "Presigned URL 반환", bytes: url.length },
      { from: "Browser", to: "S3", label: "GET 파일 직접 다운로드", bytes: -1 },
    ],
  });
}
