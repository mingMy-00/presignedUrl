"use client";

import { useRef, useState } from "react";
import { UploadResult } from "@/app/page";
import { GuideSection } from "@/components/GuideModal";

type Props = {
  mode: "presigned" | "proxy";
  onResult: (r: UploadResult) => void;
  onOpenGuide?: (s: GuideSection) => void;
};

export default function UploadPanel({ mode, onResult, onOpenGuide }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [showFullUrl, setShowFullUrl] = useState(false);
  const [fullUrlCopied, setFullUrlCopied] = useState(false);

  const isPresigned = mode === "presigned";

  function addLog(msg: string) {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);
  }

  async function copyUrl() {
    if (!presignedUrl) return;
    await navigator.clipboard.writeText(presignedUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  async function copyFullUrl() {
    if (!presignedUrl) return;
    await navigator.clipboard.writeText(presignedUrl);
    setFullUrlCopied(true);
    setTimeout(() => setFullUrlCopied(false), 2000);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    setLog([]);
    setPresignedUrl(null);
    setShowFullUrl(false);

    const totalStart = Date.now();

    try {
      if (isPresigned) {
        addLog("1. 서버에 메타데이터 전송 (파일 데이터 없음)");
        const res = await fetch("/api/presigned/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
        });
        const data = await res.json();
        addLog(`2. Presigned URL 수신 (서버 처리: ${data.serverProcessingMs}ms, 만료: ${data.expiresIn}s)`);
        setPresignedUrl(data.url);

        setProgress(30);

        addLog("3. S3에 직접 PUT 업로드 (서버 미경유)");
        await fetch(data.url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        setProgress(100);
        const totalMs = Date.now() - totalStart;
        addLog(`4. 완료! 총 ${totalMs}ms (서버 통과 데이터: 0 bytes)`);

        onResult({
          key: data.key,
          serverProcessingMs: data.serverProcessingMs,
          serverDataBytes: 0,
          totalMs,
          steps: data.steps,
          fileSize: file.size,
          mode: "presigned",
        });
      } else {
        addLog("1. 서버로 전체 파일 전송 시작");
        const formData = new FormData();
        formData.append("file", file);

        setProgress(10);
        const res = await fetch("/api/proxy/upload", { method: "POST", body: formData });
        const data = await res.json();

        setProgress(100);
        const totalMs = Date.now() - totalStart;
        addLog(`2. 서버 → S3 재전송 완료`);
        addLog(`   서버 처리시간: ${data.serverProcessingMs}ms`);
        addLog(`   서버 통과 데이터: ${(data.serverDataBytes / 1024).toFixed(1)}KB × 2 = ${(data.serverDataBytes * 2 / 1024).toFixed(1)}KB`);
        addLog(`3. 완료! 총 ${totalMs}ms`);

        onResult({
          key: data.key,
          serverProcessingMs: data.serverProcessingMs,
          serverDataBytes: data.serverDataBytes,
          totalMs,
          steps: data.steps,
          fileSize: file.size,
          mode: "proxy",
        });
      }
      setStatus("done");
    } catch (e) {
      addLog(`오류: ${e}`);
      setStatus("error");
    }
  }

  return (
    <div className={`bg-gray-900 rounded-xl p-5 border ${isPresigned ? "border-emerald-800" : "border-orange-800"}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-bold px-2 py-1 rounded ${isPresigned ? "bg-emerald-900 text-emerald-300" : "bg-orange-900 text-orange-300"}`}>
          {isPresigned ? "PRESIGNED URL" : "PROXY"}
        </span>
        <h2 className="font-semibold text-sm text-gray-300">
          {isPresigned ? "브라우저 → S3 직접 업로드" : "브라우저 → 서버 → S3 경유"}
        </h2>
      </div>

      <div className={`text-xs rounded-lg p-3 mb-4 ${isPresigned ? "bg-emerald-950 text-emerald-300" : "bg-orange-950 text-orange-300"}`}>
        {isPresigned
          ? "서버는 서명된 URL만 발급. 파일 데이터는 브라우저↔S3 직결."
          : "서버가 파일을 완전히 수신 후 S3로 재전송. 서버 메모리·대역폭 소모."}
      </div>

      <div
        className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-gray-500 transition mb-4"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {file ? (
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">파일을 드래그하거나 클릭하여 선택</p>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || status === "uploading"}
        className={`w-full py-2 rounded-lg font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed
          ${isPresigned ? "bg-emerald-700 hover:bg-emerald-600" : "bg-orange-700 hover:bg-orange-600"}`}
      >
        {status === "uploading" ? "업로드 중..." : "업로드"}
      </button>

      {status === "uploading" && (
        <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isPresigned ? "bg-emerald-500" : "bg-orange-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Presigned URL 표시 */}
      {isPresigned && presignedUrl && (
        <div className="mt-4 bg-gray-950 border border-emerald-900 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400">발급된 Presigned URL (PUT)</span>
              {onOpenGuide && (
                <button onClick={() => onOpenGuide("hmac")} className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition">
                  🔐 서명 원리
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFullUrl((v) => !v)}
                className="text-xs px-2 py-0.5 rounded bg-emerald-900 hover:bg-emerald-800 text-emerald-300 transition"
              >
                {showFullUrl ? "구조 보기 ▲" : "전체 URL 보기 ▼"}
              </button>
              <button
                onClick={copyUrl}
                className="text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
              >
                {urlCopied ? "✓ 복사됨" : "복사"}
              </button>
            </div>
          </div>

          {showFullUrl ? (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2">업로드에 사용된 PUT Presigned URL</p>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 font-mono text-xs text-emerald-300 break-all leading-relaxed">
                {presignedUrl}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={copyFullUrl}
                  className="text-xs px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition"
                >
                  {fullUrlCopied ? "✓ 복사됨" : "URL 복사"}
                </button>
                <span className="text-xs text-gray-500">PUT 전용 — 브라우저에서 열면 XML 에러 (GET 불가)</span>
              </div>
            </div>
          ) : (
            <PresignedUrlBreakdown url={presignedUrl} />
          )}
        </div>
      )}

      {log.length > 0 && (
        <div className="mt-4 bg-gray-950 rounded-lg p-3 font-mono text-xs text-gray-400 space-y-1 max-h-40 overflow-y-auto">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {status === "done" && (
        <div className={`mt-3 text-xs font-medium ${isPresigned ? "text-emerald-400" : "text-orange-400"}`}>
          ✓ 업로드 완료
        </div>
      )}
    </div>
  );
}

function PresignedUrlBreakdown({ url }: { url: string }) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return <p className="font-mono text-xs text-gray-400 break-all">{url}</p>;
  }

  const params = Object.fromEntries(parsed.searchParams.entries());
  const host = parsed.host;
  const pathname = parsed.pathname;

  const rows: { key: string; value: string; desc: string; color: string }[] = [
    { key: "host", value: host, desc: "S3 엔드포인트", color: "text-blue-400" },
    { key: "X-Amz-Algorithm", value: params["X-Amz-Algorithm"] || "-", desc: "서명 알고리즘", color: "text-yellow-400" },
    { key: "X-Amz-Credential", value: params["X-Amz-Credential"] || "-", desc: "액세스키 + 리전 + 서비스", color: "text-purple-400" },
    { key: "X-Amz-Date", value: params["X-Amz-Date"] || "-", desc: "서명 생성 시각", color: "text-gray-300" },
    { key: "X-Amz-Expires", value: params["X-Amz-Expires"] ? `${params["X-Amz-Expires"]}초` : "-", desc: "만료 시간", color: "text-orange-400" },
    { key: "X-Amz-SignedHeaders", value: params["X-Amz-SignedHeaders"] || "-", desc: "서명에 포함된 헤더", color: "text-gray-300" },
    { key: "X-Amz-Signature", value: params["X-Amz-Signature"] ? `${params["X-Amz-Signature"].substring(0, 20)}...` : "-", desc: "HMAC-SHA256 서명값", color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-xs text-gray-500 break-all mb-2">
        <span className="text-blue-400">{host}</span>
        <span className="text-gray-400">{pathname}</span>
        <span className="text-gray-600">?...</span>
      </p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.key} className="flex gap-2 text-xs">
            <span className={`font-mono shrink-0 ${r.color}`}>{r.key}</span>
            <span className="text-gray-600">=</span>
            <span className="font-mono text-gray-400 truncate flex-1">{r.value}</span>
            <span className="text-gray-600 shrink-0">{r.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
