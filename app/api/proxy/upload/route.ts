import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const start = Date.now();
  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `proxy-uploads/${Date.now()}-${file.name}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }));

  const serverProcessingMs = Date.now() - start;

  return NextResponse.json({
    key,
    serverProcessingMs,
    serverDataBytes: buffer.length,
    steps: [
      { from: "Browser", to: "Server", label: `POST /api/proxy/upload (전체 파일 ${(buffer.length / 1024).toFixed(1)}KB)`, bytes: buffer.length },
      { from: "Server", to: "S3", label: `PutObject (${(buffer.length / 1024).toFixed(1)}KB 재전송)`, bytes: buffer.length },
      { from: "S3", to: "Server", label: "업로드 완료 응답", bytes: 0 },
      { from: "Server", to: "Browser", label: "완료 JSON 응답", bytes: 50 },
    ],
  });
}
