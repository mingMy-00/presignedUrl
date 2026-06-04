"use client";

import { useEffect, useRef, useState } from "react";

// ── 공통 타입 ───────────────────────────────────────────────
const RANGES = ["1주일", "1개월", "3개월"] as const;
type Range = (typeof RANGES)[number];
const ROW_COUNTS: Record<Range, number> = { "1주일": 500, "1개월": 2000, "3개월": 6000 };
type Phase = "idle" | "running" | "done" | "error";
type AsyncJob = {
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  message: string;
  downloadUrl?: string;
  rowCount?: number;
};
type SyncResult = { url: string; rowCount: number; fileSizeBytes: number; connectionHeldMs: number };

const ASYNC_STEPS = [
  { threshold: 0,   label: "잡 생성" },
  { threshold: 10,  label: "DB 쿼리" },
  { threshold: 35,  label: "데이터 가공" },
  { threshold: 60,  label: "파일 생성" },
  { threshold: 80,  label: "S3 업로드" },
  { threshold: 95,  label: "URL 발급" },
  { threshold: 100, label: "완료" },
];

// ── 섹션 1: 개념 구분 ────────────────────────────────────────
function ConceptSeparator() {
  return (
    <div className="mb-6 p-4 bg-gray-950 rounded-xl border border-gray-800">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">
        이 케이스는 두 개의 독립된 개념의 조합입니다
      </p>
      <div className="flex items-stretch gap-3">
        <div className="flex-1 bg-emerald-950 border border-emerald-800 rounded-lg p-3">
          <p className="text-xs font-bold text-emerald-300 mb-1">개념 ① Pre-Signed URL</p>
          <p className="text-xs text-emerald-400 leading-relaxed">
            S3 private 버킷에 대한 임시 접근 URL.<br />
            <span className="text-emerald-600">→ 파일 전송 시 서버 경유 없음, 대역폭 0</span>
          </p>
        </div>

        <div className="flex items-center text-gray-500 text-xl font-bold shrink-0">+</div>

        <div className="flex-1 bg-blue-950 border border-blue-800 rounded-lg p-3">
          <p className="text-xs font-bold text-blue-300 mb-1">개념 ② 비동기 처리 패턴</p>
          <p className="text-xs text-blue-400 leading-relaxed">
            응답을 즉시 반환하고 작업은 background 처리.<br />
            <span className="text-blue-600">→ HTTP 연결 점유 없음, 타임아웃 없음</span>
          </p>
        </div>

        <div className="flex items-center text-gray-500 text-xl font-bold shrink-0">=</div>

        <div className="flex-1 bg-purple-950 border border-purple-800 rounded-lg p-3">
          <p className="text-xs font-bold text-purple-300 mb-1">이 케이스</p>
          <p className="text-xs text-purple-400 leading-relaxed">
            비동기로 파일 생성 → 완료 후 Pre-Signed URL 발급.<br />
            <span className="text-purple-600">→ 연결 점유 없음 + 서버 대역폭 없음</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 섹션 3: 실시간 알림 방법 비교 ─────────────────────────────
function NotificationMethods() {
  return (
    <div className="mb-6 bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          실시간 알림 방법 비교 — 폴링이 최선인가?
        </p>
      </div>

      {/* 세 방식 비교 */}
      <div className="p-4">
        <p className="text-xs font-semibold text-gray-300 mb-3">세 방식 한눈에 비교</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-orange-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-orange-300">폴링</span>
              <span className="text-xs bg-orange-900 text-orange-400 px-1.5 py-0.5 rounded">현재 구현</span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 mb-3">
              <div className="flex gap-1"><span className="text-gray-600">주체</span><span className="ml-auto text-orange-300">클라이언트</span></div>
              <div className="flex gap-1"><span className="text-gray-600">감지</span><span className="ml-auto text-orange-300">클라이언트</span></div>
              <div className="flex gap-1"><span className="text-gray-600">요청 수</span><span className="ml-auto text-orange-300">600번/10분</span></div>
              <div className="flex gap-1"><span className="text-gray-600">스레드</span><span className="ml-auto text-emerald-400">비점유</span></div>
            </div>
            <div className="text-xs space-y-0.5">
              <p className="text-emerald-400">✓ 구현 단순, 어디서든 작동</p>
              <p className="text-orange-400">✗ 불필요한 요청 많음</p>
            </div>
          </div>

          <div className="bg-gray-900 border border-emerald-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-300">SSE</span>
              <span className="text-xs bg-emerald-900 text-emerald-400 px-1.5 py-0.5 rounded">실무 권장</span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 mb-3">
              <div className="flex gap-1"><span className="text-gray-600">주체</span><span className="ml-auto text-emerald-300">서버</span></div>
              <div className="flex gap-1"><span className="text-gray-600">감지</span><span className="ml-auto text-emerald-300">OS (epoll)</span></div>
              <div className="flex gap-1"><span className="text-gray-600">요청 수</span><span className="ml-auto text-emerald-300">1번</span></div>
              <div className="flex gap-1"><span className="text-gray-600">스레드</span><span className="ml-auto text-emerald-400">비점유</span></div>
            </div>
            <div className="text-xs space-y-0.5">
              <p className="text-emerald-400">✓ 서버 push, 즉시 알림</p>
              <p className="text-emerald-400">✓ 불필요한 요청 없음</p>
              <p className="text-orange-400">✗ 소켓 유지 (미미한 비용)</p>
            </div>
          </div>

          <div className="bg-gray-900 border border-purple-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-300">WebSocket</span>
              <span className="text-xs bg-purple-900 text-purple-400 px-1.5 py-0.5 rounded">양방향</span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 mb-3">
              <div className="flex gap-1"><span className="text-gray-600">주체</span><span className="ml-auto text-purple-300">누구든</span></div>
              <div className="flex gap-1"><span className="text-gray-600">감지</span><span className="ml-auto text-purple-300">OS (epoll)</span></div>
              <div className="flex gap-1"><span className="text-gray-600">요청 수</span><span className="ml-auto text-purple-300">1번</span></div>
              <div className="flex gap-1"><span className="text-gray-600">스레드</span><span className="ml-auto text-emerald-400">비점유</span></div>
            </div>
            <div className="text-xs space-y-0.5">
              <p className="text-emerald-400">✓ 양방향, 취소/재시도 가능</p>
              <p className="text-orange-400">✗ 구현 복잡, 단순 알림엔 과함</p>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 bg-gray-900 rounded p-2.5 border border-gray-800">
          <span className="text-gray-300 font-semibold">실무 기준: </span>
          소규모·데모 → 폴링 충분.
          운영 서비스 → SSE 권장 (구현 비용 대비 효과 우수).
          채팅·실시간 협업 → WebSocket.
        </div>
      </div>
    </div>
  );
}

// ── 동기 패널 ─────────────────────────────────────────────────
function SyncPanel({ range, onComplete }: { range: Range; onComplete: (ms: number) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function addLog(t: string) { setLog((p) => [...p, t]); }

  async function handleRequest() {
    setPhase("running"); setElapsed(0); setResult(null); setLog([]);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - start), 100);
    addLog(`→ POST /api/excel/sync { range: "${range}" }`);
    addLog("  연결 점유 중... 응답 올 때까지 대기");
    try {
      const res = await fetch("/api/excel/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range }),
      });
      clearInterval(timerRef.current!);
      const data: SyncResult = await res.json();
      setResult(data); setPhase("done");
      onComplete(data.connectionHeldMs);
      addLog(`← 응답 수신 — ${data.connectionHeldMs.toLocaleString()}ms 후`);
    } catch (e) {
      clearInterval(timerRef.current!);
      setPhase("error"); addLog(`오류: ${e}`);
    }
  }

  function reset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("idle"); setElapsed(0); setResult(null); setLog([]);
  }
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-900 text-red-300">동기 방식</span>
        <span className="text-xs text-gray-500">처리 완료까지 연결 유지</span>
      </div>

      {/* 흐름 */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs space-y-1">
        <div className="flex gap-2">
          <span className="text-red-400 shrink-0">①</span>
          <div>
            <span className="text-blue-400">Browser</span>
            <span className="text-red-400"> ── POST ──▶ </span>
            <span className="text-gray-300">Server</span>
          </div>
        </div>
        <div className="pl-5 text-gray-600">↓ [연결 점유 중] DB → 가공 → 파일 → S3</div>
        <div className="flex gap-2">
          <span className="text-red-400 shrink-0">②</span>
          <div>
            <span className="text-blue-400">Browser</span>
            <span className="text-red-400"> ◀── 응답(N초 후) ── </span>
            <span className="text-gray-300">Server</span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-emerald-400 shrink-0">③</span>
          <div>
            <span className="text-blue-400">Browser</span>
            <span className="text-emerald-400"> ── Pre-Signed URL ──▶ </span>
            <span className="text-green-400">S3</span>
          </div>
        </div>
      </div>

      {/* 상태 박스 */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 min-h-[80px] flex flex-col justify-center">
        {phase === "idle" && <p className="text-xs text-gray-600 text-center">버튼을 누르면 연결이 묶입니다</p>}
        {phase === "running" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                연결 점유 중
              </span>
              <span className="text-xl font-mono font-bold text-red-300">{(elapsed / 1000).toFixed(1)}s</span>
            </div>
            <div className="text-xs text-gray-600">진행 상황: <span className="text-red-500">알 수 없음</span></div>
            {elapsed > 3000 && (
              <div className="text-xs text-orange-300 bg-orange-950 border border-orange-800 rounded px-2 py-1">
                nginx/ALB 기본 타임아웃 60s — 장시간 요청은 중간에 끊길 수 있음
              </div>
            )}
          </div>
        )}
        {phase === "done" && result && (
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">연결 점유 시간</span>
              <span className="text-red-400 font-bold">{result.connectionHeldMs.toLocaleString()}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">파일 크기</span>
              <span className="text-gray-300">{(result.fileSizeBytes / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        )}
      </div>

      {phase === "done" && result?.url && (
        <a href={result.url} download
          className="block text-center text-xs py-2 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-lg transition">
          다운로드 (Pre-Signed URL)
        </a>
      )}

      {log.length > 0 && (
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-2.5 font-mono text-xs text-gray-500 space-y-0.5 max-h-20 overflow-y-auto">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {phase === "idle" && (
        <button onClick={handleRequest}
          className="w-full py-2 rounded-lg bg-red-800 hover:bg-red-700 text-white text-sm font-semibold transition">
          동기 방식으로 요청
        </button>
      )}
      {phase === "running" && (
        <button disabled className="w-full py-2 rounded-lg bg-red-950 text-red-600 text-sm cursor-not-allowed">
          응답 대기 중...
        </button>
      )}
      {(phase === "done" || phase === "error") && (
        <button onClick={reset}
          className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-semibold transition">
          초기화
        </button>
      )}

      <div className="bg-red-950 border border-red-900 rounded-lg p-2.5 text-xs space-y-1">
        <p className="text-red-300 font-semibold">문제점</p>
        <p className="text-red-400">✗ 처리 내내 HTTP 연결 점유</p>
        <p className="text-red-400">✗ 진행률 표시 불가</p>
        <p className="text-red-400">✗ nginx/ALB 타임아웃 위험</p>
        <p className="text-red-400">✗ 동시 요청 시 연결 슬롯 고갈</p>
        <p className="text-red-400">✗ 다운로드도 서버 경유 시 대역폭 소모</p>
      </div>
    </div>
  );
}

// ── 비동기 패널 ───────────────────────────────────────────────
function AsyncPanel({ range, onComplete }: { range: Range; onComplete: (ms: number) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [job, setJob] = useState<AsyncJob | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [jobRequestMs, setJobRequestMs] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function addLog(t: string) { setLog((p) => [...p, t]); }
  function stopAll() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function handleRequest() {
    setPhase("running"); setJob(null); setLog([]); setElapsed(0);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - start), 100);
    addLog(`→ POST /api/excel/request`);
    const res = await fetch("/api/excel/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ range }),
    });
    const { jobId } = await res.json();
    const reqMs = Date.now() - start;
    setJobRequestMs(reqMs);
    addLog(`← 즉시 응답: jobId 수신 (${reqMs}ms)`);
    addLog("  서버는 background에서 파일 생성 시작");

    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/excel/status?jobId=${jobId}`);
      const data: AsyncJob = await r.json();
      setJob(data);
      if (data.status === "done") {
        stopAll(); setPhase("done"); onComplete(reqMs);
        addLog(`← 완료: Pre-Signed URL 수신`);
      } else if (data.status === "error") {
        stopAll(); setPhase("error");
      } else {
        addLog(`← 폴링: ${data.progress}% — ${data.message}`);
      }
    }, 1000);
  }

  function reset() { stopAll(); setPhase("idle"); setJob(null); setLog([]); setElapsed(0); }
  useEffect(() => () => stopAll(), []);

  const currentStep = job ? ASYNC_STEPS.filter((s) => job.progress >= s.threshold).at(-1) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-300">비동기 + Pre-Signed URL</span>
        <span className="text-xs text-gray-500">즉시 응답 후 폴링</span>
      </div>

      {/* 흐름 */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs space-y-1">
        <div className="flex gap-2">
          <span className="text-emerald-400 shrink-0">①</span>
          <div>
            <span className="text-blue-400">Browser</span>
            <span className="text-emerald-400"> ── POST ──▶ </span>
            <span className="text-gray-300">Server</span>
            <span className="text-emerald-600 ml-2">즉시 jobId 반환</span>
          </div>
        </div>
        <div className="pl-5 text-gray-600">↓ background: DB → 가공 → 파일 → S3</div>
        <div className="flex gap-2">
          <span className="text-purple-400 shrink-0">②</span>
          <div>
            <span className="text-blue-400">Browser</span>
            <span className="text-purple-400"> ── 폴링(1초마다) ──▶ </span>
            <span className="text-gray-300">Server</span>
            <span className="text-gray-600 ml-2">~10ms씩만 점유</span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-emerald-400 shrink-0">③</span>
          <div>
            <span className="text-blue-400">Browser</span>
            <span className="text-emerald-400"> ── Pre-Signed URL ──▶ </span>
            <span className="text-green-400">S3</span>
            <span className="text-emerald-600 ml-2">서버 대역폭 0</span>
          </div>
        </div>
      </div>

      {/* 진행률 */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 min-h-[80px] flex flex-col justify-center">
        {phase === "idle" && <p className="text-xs text-gray-600 text-center">버튼을 누르면 즉시 응답합니다</p>}
        {(phase === "running" || phase === "done") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300">{currentStep?.label ?? "대기"}</span>
              <div className="flex items-center gap-2">
                {phase === "running" && <span className="text-xs text-gray-500">{(elapsed / 1000).toFixed(1)}s</span>}
                <span className={`text-xs font-bold ${phase === "done" ? "text-emerald-400" : "text-blue-400"}`}>
                  {job?.progress ?? 0}%
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${phase === "done" ? "bg-emerald-500" : "bg-blue-500"}`}
                style={{ width: `${job?.progress ?? 0}%` }}
              />
            </div>
            <div className="flex gap-0.5">
              {ASYNC_STEPS.map((s) => (
                <div key={s.threshold}
                  className={`flex-1 h-0.5 rounded-full transition-colors duration-500 ${(job?.progress ?? 0) >= s.threshold ? (phase === "done" ? "bg-emerald-500" : "bg-blue-500") : "bg-gray-700"}`} />
              ))}
            </div>
            {job?.message && <p className="text-xs text-gray-400">{job.message}</p>}
            {phase === "running" && jobRequestMs > 0 && (
              <p className="text-xs text-emerald-700">초기 연결 점유: {jobRequestMs}ms (이후 해제됨)</p>
            )}
          </div>
        )}
      </div>

      {phase === "done" && job?.downloadUrl && (
        <a href={job.downloadUrl} download
          className="block text-center text-xs py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-lg transition">
          다운로드 (S3 직결 · 서버 대역폭 0)
        </a>
      )}

      {log.length > 0 && (
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-2.5 font-mono text-xs text-gray-500 space-y-0.5 max-h-20 overflow-y-auto">
          {log.map((l, i) => <div key={i}>{l}</div>)}
          {phase === "running" && <div className="text-blue-500 animate-pulse">▋</div>}
        </div>
      )}

      {phase === "idle" && (
        <button onClick={handleRequest}
          className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition">
          비동기 방식으로 요청
        </button>
      )}
      {phase === "running" && (
        <button disabled className="w-full py-2 rounded-lg bg-emerald-950 text-emerald-600 text-sm cursor-not-allowed">
          처리 중... (폴링 중)
        </button>
      )}
      {(phase === "done" || phase === "error") && (
        <button onClick={reset}
          className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-semibold transition">
          초기화
        </button>
      )}

      <div className="bg-emerald-950 border border-emerald-900 rounded-lg p-2.5 text-xs space-y-1">
        <p className="text-emerald-300 font-semibold">개선된 점</p>
        <p className="text-emerald-400">✓ 연결 점유: ~100ms (jobId 수신까지만)</p>
        <p className="text-emerald-400">✓ 폴링으로 진행률 실시간 표시</p>
        <p className="text-emerald-400">✓ 타임아웃 위험 없음</p>
        <p className="text-emerald-400">✓ 다운로드: S3 직결, 서버 대역폭 0</p>
      </div>
    </div>
  );
}

// ── 성능 비교 테이블 ──────────────────────────────────────────
function ComparisonMetrics({ syncMs, asyncMs, range }: { syncMs: number; asyncMs: number; range: Range }) {
  const fileSizeKB = Math.round(ROW_COUNTS[range] * 0.08);
  const improvement = Math.round((1 - asyncMs / syncMs) * 100);
  const concurrent = 100;

  const rows = [
    {
      label: "HTTP 연결 점유 시간",
      sync: `${syncMs.toLocaleString()}ms`,
      async: `${asyncMs}ms`,
      sc: "text-red-400", ac: "text-emerald-400",
      note: `${improvement}% 감소`,
    },
    {
      label: "진행률 표시",
      sync: "불가 (블랙박스)",
      async: "실시간 표시",
      sc: "text-red-400", ac: "text-emerald-400",
      note: "UX 개선",
    },
    {
      label: "타임아웃 위험",
      sync: "높음 (nginx 60s)",
      async: "없음",
      sc: "text-red-400", ac: "text-emerald-400",
      note: "안정성 확보",
    },
    {
      label: `동시 ${concurrent}명 연결 점유 합계`,
      sync: `${(syncMs * concurrent / 1000).toFixed(0)}초`,
      async: `${((asyncMs * concurrent) / 1000).toFixed(1)}초`,
      sc: "text-red-400", ac: "text-emerald-400",
      note: `${Math.round((1 - (asyncMs * concurrent) / (syncMs * concurrent)) * 100)}% 감소`,
    },
    {
      label: "다운로드 서버 대역폭",
      sync: `최대 ~${fileSizeKB}KB (서버 경유 시)`,
      async: "0KB (S3 직결)",
      sc: "text-orange-400", ac: "text-emerald-400",
      note: "대역폭 절약",
    },
  ];

  return (
    <div className="bg-gray-950 rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">성능 비교 — 실측 결과</p>
        <span className="text-xs text-gray-500">{range} 기준</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50">
            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">항목</th>
            <th className="text-center px-4 py-2.5 text-red-400 font-medium">동기 방식</th>
            <th className="text-center px-4 py-2.5 text-emerald-400 font-medium">비동기 + Pre-Signed</th>
            <th className="text-center px-4 py-2.5 text-blue-400 font-medium">개선</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-gray-900 hover:bg-gray-900/30 transition">
              <td className="px-4 py-2.5 text-gray-400">{r.label}</td>
              <td className={`px-4 py-2.5 text-center font-mono ${r.sc}`}>{r.sync}</td>
              <td className={`px-4 py-2.5 text-center font-mono ${r.ac}`}>{r.async}</td>
              <td className="px-4 py-2.5 text-center text-blue-400">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 bg-blue-950 border-t border-blue-900">
        <p className="text-xs text-blue-200">
          <span className="font-bold text-blue-300">핵심 정리: </span>
          비동기 패턴으로 연결 점유를 <span className="text-emerald-400">{improvement}% 단축</span>하고,
          Pre-Signed URL로 다운로드 서버 대역폭을 <span className="text-emerald-400">0으로</span> 만듭니다.
          두 개념을 조합하면 처리량과 안정성이 모두 개선됩니다.
        </p>
      </div>
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────
export default function ExcelDownloadPanel() {
  const [range, setRange] = useState<Range>("1주일");
  const [syncMs, setSyncMs] = useState(0);
  const [asyncMs, setAsyncMs] = useState(0);

  const showMetrics = syncMs > 0 && asyncMs > 0;

  return (
    <div className="mb-8">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-200">
            심화: 비동기 엑셀 다운로드 + Pre-Signed URL
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            동기 방식과 비교하며 비동기 + Pre-Signed URL 조합의 이점을 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition border
                ${range === r ? "bg-blue-800 border-blue-600 text-blue-200" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}>
              {r}
              <span className="ml-1 text-gray-600">({ROW_COUNTS[r].toLocaleString()}건)</span>
            </button>
          ))}
        </div>
      </div>

      {/* 섹션 1: 개념 구분 */}
      <ConceptSeparator />

      {/* 섹션 2: 실시간 알림 방법 */}
      <NotificationMethods />

      {/* 섹션 4: 데모 */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
          직접 실행해보기 — 같은 기간을 양쪽으로 요청
        </p>
        <div className="grid grid-cols-2 gap-6">
          <SyncPanel range={range} onComplete={setSyncMs} />
          <AsyncPanel range={range} onComplete={setAsyncMs} />
        </div>
      </div>

      {/* 섹션 5: 성능 비교 */}
      {showMetrics && <ComparisonMetrics syncMs={syncMs} asyncMs={asyncMs} range={range} />}
      {!showMetrics && (
        <p className="text-xs text-gray-600 text-center py-2">
          양쪽 모두 완료하면 실측 성능 비교 테이블이 표시됩니다.
        </p>
      )}
    </div>
  );
}
