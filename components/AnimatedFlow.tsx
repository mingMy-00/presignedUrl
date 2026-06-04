"use client";

import { useState, useEffect, useRef } from "react";
import { UploadResult } from "@/app/page";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

const ACTOR_X = [8, 50, 92];

type Step = {
  from: number;
  to: number;
  label: string;
  sublabel: string;
  big: boolean;
  self?: boolean;
};

function buildSteps(result: UploadResult, isPresigned: boolean): Step[] {
  const filename = result.key.split("/").pop() || "파일";
  const sizeKB = (result.fileSize / 1024).toFixed(1);

  if (isPresigned) {
    return [
      { from: 0, to: 1, label: "메타데이터 전송", sublabel: `${filename} · ${sizeKB}KB`, big: false },
      { from: 1, to: 1, label: "HMAC-SHA256 서명 계산", sublabel: `서버 처리 ${result.serverProcessingMs}ms · 로컬 연산`, big: false, self: true },
      { from: 1, to: 0, label: "Presigned URL 반환", sublabel: "서명된 S3 URL", big: false },
      { from: 0, to: 2, label: "파일 직접 업로드", sublabel: `${filename} · ${sizeKB}KB → S3 직결 (서버 미경유!)`, big: true },
    ];
  } else {
    return [
      { from: 0, to: 1, label: "전체 파일 전송", sublabel: `${filename} · ${sizeKB}KB`, big: true },
      { from: 1, to: 2, label: "S3 재전송", sublabel: `${sizeKB}KB 재전송 · 서버 처리 ${result.serverProcessingMs}ms`, big: true },
      { from: 2, to: 1, label: "완료 응답", sublabel: "S3 → Server", big: false },
      { from: 1, to: 0, label: "완료 JSON", sublabel: `총 소요 ${result.totalMs}ms`, big: false },
    ];
  }
}

const DEFAULT_PRESIGNED: Step[] = [
  { from: 0, to: 1, label: "메타데이터 전송", sublabel: "파일명·타입·크기만", big: false },
  { from: 1, to: 1, label: "HMAC-SHA256 서명 계산", sublabel: "로컬 연산 — 네트워크 없음", big: false, self: true },
  { from: 1, to: 0, label: "Presigned URL 반환", sublabel: "서명된 S3 URL", big: false },
  { from: 0, to: 2, label: "파일 직접 업로드", sublabel: "Browser → S3 직결 (서버 미경유!)", big: true },
];

const DEFAULT_PROXY: Step[] = [
  { from: 0, to: 1, label: "전체 파일 전송", sublabel: "Browser → Server (파일 전체)", big: true },
  { from: 1, to: 2, label: "S3 재전송", sublabel: "Server → S3 (파일 전체 다시)", big: true },
  { from: 2, to: 1, label: "완료 응답", sublabel: "S3 → Server", big: false },
  { from: 1, to: 0, label: "완료 JSON", sublabel: "Server → Browser", big: false },
];

type PktState = { show: boolean; left: string; big: boolean; transition: string };

function Panel({
  defaultSteps,
  accent,
  title,
  note,
  result,
}: {
  defaultSteps: Step[];
  accent: "emerald" | "orange";
  title: string;
  note: string;
  result: UploadResult | null;
}) {
  const [playTrigger, setPlayTrigger] = useState(0);
  const [activeStep, setActiveStep] = useState(-1);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [pkt, setPkt] = useState<PktState>({ show: false, left: "8%", big: false, transition: "none" });
  const [serverGlow, setServerGlow] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const cancelRef = useRef(false);

  const isEmerald = accent === "emerald";
  const steps = result ? buildSteps(result, isEmerald) : defaultSteps;


  useEffect(() => {
    if (playTrigger === 0) return;

    cancelRef.current = false;
    setActiveStep(-1);
    setDoneSteps([]);
    setPkt({ show: false, left: "8%", big: false, transition: "none" });
    setServerGlow(false);

    const run = async () => {
      setIsRunning(true);
      await sleep(80);

      for (let i = 0; i < steps.length; i++) {
        if (cancelRef.current) return;
        const step = steps[i];
        setActiveStep(i);

        if (step.self) {
          setServerGlow(true);
          await sleep(1100);
          if (cancelRef.current) return;
          setServerGlow(false);
        } else {
          const fromX = `${ACTOR_X[step.from]}%`;
          const toX = `${ACTOR_X[step.to]}%`;

          setPkt({ show: true, left: fromX, big: step.big, transition: "none" });
          await sleep(60);
          if (cancelRef.current) return;

          setPkt({ show: true, left: toX, big: step.big, transition: "left 900ms cubic-bezier(0.4,0,0.2,1)" });
          await sleep(950);
          if (cancelRef.current) return;

          setPkt((prev) => ({ ...prev, show: false }));
          await sleep(180);
        }

        if (cancelRef.current) return;
        setDoneSteps((prev) => [...prev, i]);
        await sleep(280);
      }

      setActiveStep(-1);
      setIsRunning(false);
    };

    run();
    return () => { cancelRef.current = true; };
  }, [playTrigger]);

  return (
    <div className={`bg-gray-900 rounded-xl p-5 border ${isEmerald ? "border-emerald-800" : "border-orange-800"}`}>
      <div className="flex items-center gap-3 mb-6 min-w-0">
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${isEmerald ? "text-emerald-400" : "text-orange-400"}`}>
            {title}
          </h3>
          {result && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              실측 데이터 기반 · {result.key.split("/").pop()} · {(result.fileSize / 1024).toFixed(1)}KB
            </p>
          )}
        </div>
        <button
          onClick={() => setPlayTrigger((t) => t + 1)}
          disabled={isRunning}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed
            ${isEmerald ? "bg-emerald-700 hover:bg-emerald-600 text-white" : "bg-orange-700 hover:bg-orange-600 text-white"}`}
        >
          {isRunning ? "재생 중..." : "▶ 재생"}
        </button>
      </div>

      {/* Track */}
      <div className="relative h-20 mb-5 select-none">
        <div className="absolute top-7 left-[8%] right-[8%] h-px bg-gray-700" />

        {["Browser", "Server", "S3"].map((name, idx) => {
          const glowing = name === "Server" && serverGlow;
          return (
            <div
              key={name}
              className={`absolute -translate-x-1/2 top-3 px-2.5 py-1 rounded text-xs font-bold border transition-all duration-300 ${
                glowing
                  ? "bg-yellow-700 border-yellow-400 text-yellow-100 shadow-[0_0_12px_3px_rgba(234,179,8,0.5)]"
                  : name === "Browser" ? "bg-blue-800 border-blue-600 text-blue-100"
                  : name === "Server" ? "bg-purple-800 border-purple-600 text-purple-100"
                  : "bg-green-800 border-green-600 text-green-100"
              }`}
              style={{ left: `${ACTOR_X[idx]}%` }}
            >
              {name}
              {glowing && <span className="ml-1 inline-block animate-spin">⚙</span>}
            </div>
          );
        })}

        <div
          className={`absolute top-4 -translate-x-1/2 z-10 flex items-center justify-center rounded-full font-bold text-sm shadow-lg pointer-events-none
            ${pkt.big
              ? isEmerald ? "w-10 h-10 bg-emerald-500 shadow-emerald-500/50" : "w-10 h-10 bg-orange-500 shadow-orange-500/50"
              : "w-6 h-6 bg-gray-400 shadow-gray-400/40"
            }
            ${pkt.show ? "opacity-100" : "opacity-0"}
          `}
          style={{ left: pkt.left, transition: pkt.show ? pkt.transition : "none" }}
        >
          {pkt.big ? "📦" : "✉"}
        </div>

        <div className="absolute bottom-0 right-0 flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-gray-400" />소량</span>
          <span className="flex items-center gap-1">
            <span className={`inline-block w-4 h-4 rounded-full ${isEmerald ? "bg-emerald-500" : "bg-orange-500"}`} />파일
          </span>
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-1.5 mb-4">
        {steps.map((step, i) => {
          const isDone = doneSteps.includes(i);
          const isActive = activeStep === i;
          return (
            <div
              key={i}
              className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                isActive
                  ? isEmerald ? "bg-emerald-900/60 ring-1 ring-emerald-600" : "bg-orange-900/60 ring-1 ring-orange-600"
                  : isDone ? "opacity-50"
                  : "opacity-25"
              }`}
            >
              <span className={`shrink-0 w-4 font-mono font-bold mt-px ${
                isDone ? isEmerald ? "text-emerald-400" : "text-orange-400" : "text-gray-600"
              }`}>
                {isDone ? "✓" : `${i + 1}`}
              </span>
              <div className="leading-snug">
                <span className={isActive ? "text-white font-semibold" : "text-gray-300"}>
                  {step.self ? `⚙ ${step.label}` : step.label}
                </span>
                {step.sublabel && (
                  <span className={`ml-1.5 ${isActive && result ? "text-yellow-300 font-medium" : "text-gray-500"}`}>
                    {step.sublabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`text-xs border rounded-lg p-2.5 ${
        isEmerald ? "bg-emerald-950 border-emerald-900 text-emerald-300" : "bg-orange-950 border-orange-900 text-orange-300"
      }`}>
        {note}
      </div>
    </div>
  );
}

export default function AnimatedFlow({
  presignedResult,
  proxyResult,
}: {
  presignedResult: UploadResult | null;
  proxyResult: UploadResult | null;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        데이터 흐름 — 애니메이션
      </h2>
      <div className="grid grid-cols-2 gap-6">
        <Panel
          defaultSteps={DEFAULT_PRESIGNED}
          accent="emerald"
          title="✅ Presigned URL — 데이터 흐름"
          note="파일 데이터가 서버를 거치지 않음 → 서버 부하 0"
          result={presignedResult}
        />
        <Panel
          defaultSteps={DEFAULT_PROXY}
          accent="orange"
          title="⚠️ Proxy — 데이터 흐름"
          note="파일이 서버를 2회 통과 (수신 + 재전송) → 서버 메모리·대역폭 2배 소모"
          result={proxyResult}
        />
      </div>
    </div>
  );
}
