"use client";

import { useState } from "react";

type FileEntry = { key: string; mode: "presigned" | "proxy"; name: string };

export default function FileList({ files }: { files: FileEntry[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function download(file: FileEntry) {
    setDownloading(file.key);
    try {
      if (file.mode === "presigned") {
        const res = await fetch(`/api/presigned/download?key=${encodeURIComponent(file.key)}`);
        const { url } = await res.json();
        // Browser fetches directly from S3
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
      } else {
        const res = await fetch(`/api/proxy/download?key=${encodeURIComponent(file.key)}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">업로드된 파일 목록</h2>
      <div className="space-y-2">
        {files.map((f) => (
          <div key={f.key} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2">
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                f.mode === "presigned" ? "bg-emerald-900 text-emerald-300" : "bg-orange-900 text-orange-300"
              }`}>
                {f.mode === "presigned" ? "PRESIGNED" : "PROXY"}
              </span>
              <span className="text-sm text-gray-300 font-mono">{f.name}</span>
            </div>
            <button
              onClick={() => download(f)}
              disabled={downloading === f.key}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition"
            >
              {downloading === f.key ? "다운로드 중..." : "다운로드"}
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-3">
        Presigned 다운로드: 브라우저가 S3에서 직접 수신 / Proxy 다운로드: 서버 경유 후 브라우저로 전달
      </p>
    </div>
  );
}
