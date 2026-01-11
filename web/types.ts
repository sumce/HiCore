export interface ApiResponse<T = any> {
  code: number;
  msg?: string;
  data?: T;
  detail?: string; // For error responses
}

export interface LoginResponse {
  token: string;
  contribution: number;
  is_admin: boolean;
}

export interface TaskData {
  task_token: string;
  project_id: string;
  machine_id: string;
  page_index: number;
  image: string;
}

export interface TaskRow {
  machine_id: string;
  circuit_name: string;
  area: string;
  device_pos: string;
  voltage: string;
  phase_wire: string;
  power: string;
  max_current: string;
  run_current: string;
  machine_switch: string;
  factory_switch: string;
  remark: string;
}

export interface SubmitPayload {
  task_token: string;
  rows: TaskRow[];
}

export enum TaskStatus {
  IDLE,
  FETCHING,
  WORKING,
  SUBMITTING,
  ERROR,
  NO_TASK,
}

export enum ConnectionStatus {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
}


export interface SubmissionItem {
  id: number;
  task_id: number;
  project_id: string;
  machine_id: string;
  page_index: number;
  submitted_at: string;
  image: string;
  data: TaskRow[];
}
