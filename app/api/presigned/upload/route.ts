import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const { filename, contentType, size } = await req.json();

    const key = `uploads/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 });

    return NextResponse.json({
      url,
      key,
      expiresIn: 300,
      serverProcessingMs: Date.now() - start,
      serverDataBytes: 0,
      steps: [
        { from: "Browser", to: "Server", label: "POST /api/presigned/upload (메타데이터만)", bytes: JSON.stringify({ filename, contentType, size }).length },
        { from: "Server", to: "Server", label: "HMAC-SHA256 서명 계산 (로컬 연산, 네트워크 없음)", bytes: 0 },
        { from: "Server", to: "Browser", label: "Presigned URL 반환", bytes: url.length },
        { from: "Browser", to: "S3", label: `PUT 파일 직접 업로드 (${(size / 1024).toFixed(1)}KB)`, bytes: size },
      ],
    });
  } catch (e) {
    console.error("[presigned/upload]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
