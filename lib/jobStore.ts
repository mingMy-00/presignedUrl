export type JobStatus = "pending" | "processing" | "done" | "error";

export type Job = {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  downloadUrl?: string;
  key?: string;
  rowCount?: number;
  range?: string;
  createdAt: number;
};

const jobs = new Map<string, Job>();

export function createJob(id: string, range: string): Job {
  const job: Job = {
    id,
    status: "pending",
    progress: 0,
    message: "대기 중",
    range,
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<Job>) {
  const job = jobs.get(id);
  if (job) jobs.set(id, { ...job, ...patch });
}
