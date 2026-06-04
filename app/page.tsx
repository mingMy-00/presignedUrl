"use client";

import { useState } from "react";
import UploadPanel from "@/components/UploadPanel";
import AnimatedFlow from "@/components/AnimatedFlow";
import MetricsBar from "@/components/MetricsBar";
import SecurityPanel from "@/components/SecurityPanel";
import FileList from "@/components/FileList";
import UserExperiencePanel from "@/components/UserExperiencePanel";
import GuideModal, { GuideSection } from "@/components/GuideModal";

export type Step = {
  from: string;
  to: string;
  label: string;
  bytes: number;
};

export type UploadResult = {
  key: string;
  serverProcessingMs: number;
  serverDataBytes: number;
  totalMs: number;
  steps: Step[];
  fileSize: number;
  mode: "presigned" | "proxy";
};

export default function Home() {
  const [presignedResult, setPresignedResult] = useState<UploadResult | null>(null);
  const [proxyResult, setProxyResult] = useState<UploadResult | null>(null);
  const [uploadedKeys, setUploadedKeys] = useState<{ key: string; mode: "presigned" | "proxy"; name: string }[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideSection, setGuideSection] = useState<GuideSection>("problem");

  function openGuide(section: GuideSection) {
    setGuideSection(section);
    setGuideOpen(true);
  }

  function onResult(result: UploadResult) {
    if (result.mode === "presigned") setPresignedResult(result);
    else setProxyResult(result);
    setUploadedKeys((prev) => [{ key: result.key, mode: result.mode, name: result.key.split("/").pop()! }, ...prev]);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* 헤더 */}
        <div className="mb-8 text-center relative">
          <h1 className="text-3xl font-bold mb-2">S3 Presigned URL vs Proxy 비교 데모</h1>
          <p className="text-gray-400 mb-4">동일한 파일을 두 방식으로 업로드하고, 아키텍처 차이를 실시간으로 확인하세요.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => openGuide("problem")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-sm font-semibold rounded-lg transition border border-emerald-700"
            >
              📖 Pre-Signed URL 개념 가이드
            </button>
            <div className="flex gap-2">
              {([
                { section: "hmac" as GuideSection,       label: "🔐 HMAC 원리" },
                { section: "performance" as GuideSection, label: "⚡ 성능 비교" },
                { section: "tradeoffs" as GuideSection,   label: "⚖️ 장단점" },
              ]).map((btn) => (
                <button
                  key={btn.section}
                  onClick={() => openGuide(btn.section)}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition border border-zinc-700"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 업로드 패널 */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <UploadPanel mode="presigned" onResult={onResult} onOpenGuide={openGuide} />
          <UploadPanel mode="proxy" onResult={onResult} onOpenGuide={openGuide} />
        </div>

        {/* 지표 */}
        {(presignedResult || proxyResult) && (
          <MetricsBar presigned={presignedResult} proxy={proxyResult} onOpenGuide={openGuide} />
        )}

        {/* 애니메이션 */}
        <AnimatedFlow presignedResult={presignedResult} proxyResult={proxyResult} />

        {/* 사용자 경험 */}
        <UserExperiencePanel />

        {/* 보안 비교 */}
        <SecurityPanel onOpenGuide={openGuide} />

        {/* 파일 목록 */}
        {uploadedKeys.length > 0 && (
          <FileList files={uploadedKeys} />
        )}
      </div>

      {/* 가이드 모달 */}
      <GuideModal open={guideOpen} initialSection={guideSection} onClose={() => setGuideOpen(false)} />
    </main>
  );
}
