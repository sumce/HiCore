import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { TaskData, TaskStatus, TaskRow, ConnectionStatus, SubmissionItem } from '../types';
import { getWsBaseUrl, PING_INTERVAL_MS } from '../constants';
import { ImageViewer } from './ImageViewer';
import { DataEntryForm } from './DataEntryForm';
import { Button } from './Button';
import { HistoryList } from './HistoryList';
import { RefreshCw, Save, Activity, AlertTriangle, SkipForward, History, Trophy, Medal, Award, Zap } from 'lucide-react';

interface WorkspaceProps {
  updateContribution: () => void;
}

type ViewMode = 'task' | 'history' | 'edit';

export const Workspace: React.FC<WorkspaceProps> = ({ updateContribution }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('task');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.IDLE);
  const [task, setTask] = useState<TaskData | null>(null);
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // 项目筛选
  const [projects, setProjects] = useState<{ project_id: string; available_count: number }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  
  // 排行榜
  const [leaderboard, setLeaderboard] = useState<{ username: string; contribution: number }[]>([]);
  
  // 编辑模式
  const [editingSubmission, setEditingSubmission] = useState<SubmissionItem | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const statusRef = useRef<TaskStatus>(TaskStatus.IDLE);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // 加载可用项目列表
  useEffect(() => {
    loadProjects();
    loadLeaderboard();
  }, []);

  const loadProjects = async () => {
    try {
      const list = await api.getAvailableProjects();
      setProjects(list || []);
    } catch (e) {
      console.warn('Failed to load projects', e);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const list = await api.getLeaderboard(10);
      setLeaderboard(list || []);
    } catch (e) {
      console.warn('Failed to load leaderboard', e);
    }
  };

  // --- WebSocket Logic ---

  const cleanupWS = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsStatus(ConnectionStatus.DISCONNECTED);
  }, []);

  const startHeartbeat = useCallback((token: string) => {
    cleanupWS(); 
    setWsStatus(ConnectionStatus.CONNECTING);
    
    const ws = new WebSocket(`${getWsBaseUrl()}/${token}`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setWsStatus(ConnectionStatus.CONNECTED);
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, PING_INTERVAL_MS);
    };

    ws.onclose = (event) => {
        setWsStatus(ConnectionStatus.DISCONNECTED);
        if (statusRef.current === TaskStatus.WORKING && event.code !== 1000) {
           setErrorMsg("连接中断，请刷新任务 (Code: " + event.code + ")");
        }
    };

    ws.onerror = () => {
        console.warn('WS Error occurred');
    };

  }, [cleanupWS]);

  useEffect(() => {
    return () => cleanupWS();
  }, [cleanupWS]);


  // --- Task Actions ---

  const fetchTask = async (projectId?: string) => {
    try {
      cleanupWS();
      setStatus(TaskStatus.FETCHING);
      setErrorMsg(null);
      setRows([]);
      setTask(null);

      const response = await api.fetchTask(projectId || selectedProject || undefined);
      
      if (response && response.data) {
        setTask(response.data);
        setStatus(TaskStatus.WORKING);
        startHeartbeat(response.data.task_token);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      if (err.message === 'NO_TASK_AVAILABLE') {
        setStatus(TaskStatus.NO_TASK);
      } else {
        setStatus(TaskStatus.ERROR);
        setErrorMsg(err.message || '获取任务失败');
      }
    }
  };

  const [isSkipping, setIsSkipping] = useState(false);

  const handleSkip = async () => {
    if (!task) return;
    
    try {
      setIsSkipping(true); // 开始跳过，清除图片显示加载
      setRows([]);
      await api.skipTask(task.task_token);
      cleanupWS();
      loadProjects();
      
      // 直接获取新任务
      const response = await api.fetchTask(selectedProject || undefined);
      
      if (response && response.data) {
        setTask(response.data);
        setStatus(TaskStatus.WORKING);
        startHeartbeat(response.data.task_token);
      } else {
        setTask(null);
        setStatus(TaskStatus.NO_TASK);
      }
    } catch (err: any) {
      if (err.message === 'NO_TASK_AVAILABLE') {
        setTask(null);
        setStatus(TaskStatus.NO_TASK);
      } else {
        setStatus(TaskStatus.WORKING);
        setErrorMsg(err.message || "跳过失败");
      }
    } finally {
      setIsSkipping(false);
    }
  };

  const handleSubmit = async () => {
    if (!task) return;
    
    const invalidRows = rows.filter(r => !r.circuit_name.trim());
    if (invalidRows.length > 0) {
      setErrorMsg("请填写所有行的回路名称。");
      return;
    }

    try {
      setStatus(TaskStatus.SUBMITTING); 
      
      await api.submitTask({
        task_token: task.task_token,
        rows: rows
      });
      
      updateContribution();
      cleanupWS();
      fetchTask(); 
      
    } catch (err: any) {
      setStatus(TaskStatus.WORKING);
      setErrorMsg(err.message || "提交失败");
    }
  };

  // --- Edit Mode ---
  
  const handleEditSubmission = (submission: SubmissionItem) => {
    setEditingSubmission(submission);
    setRows(submission.data.map(d => ({ ...d })));
    setViewMode('edit');
  };

  const handleUpdateSubmission = async () => {
    if (!editingSubmission) return;
    
    const invalidRows = rows.filter(r => !r.circuit_name.trim());
    if (invalidRows.length > 0) {
      setErrorMsg("请填写所有行的回路名称。");
      return;
    }

    try {
      setStatus(TaskStatus.SUBMITTING);
      await api.updateSubmission(editingSubmission.id, rows);
      setErrorMsg(null);
      setViewMode('history');
      setEditingSubmission(null);
      setRows([]);
    } catch (err: any) {
      setErrorMsg(err.message || "修改失败");
    } finally {
      setStatus(TaskStatus.IDLE);
    }
  };

  const handleBackFromEdit = () => {
    setViewMode('history');
    setEditingSubmission(null);
    setRows([]);
    setErrorMsg(null);
  };

  // --- History View ---
  
  if (viewMode === 'history') {
    return (
      <HistoryList 
        onEdit={handleEditSubmission}
        onBack={() => setViewMode('task')}
      />
    );
  }

  // --- Edit View ---
  
  if (viewMode === 'edit' && editingSubmission) {
    const fakeTask: TaskData = {
      task_token: '',
      project_id: editingSubmission.project_id,
      machine_id: editingSubmission.machine_id,
      page_index: editingSubmission.page_index,
      image: editingSubmission.image
    };

    return (
      <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-900">
        <div className="absolute inset-0 z-0">
          <ImageViewer image={editingSubmission.image} />
        </div>

        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none p-4 flex justify-between items-start">
          <div className="bg-yellow-100/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-yellow-300 pointer-events-auto flex items-center gap-4">
            <span className="text-yellow-800 font-bold">编辑模式</span>
            <div className="h-6 w-px bg-yellow-300"></div>
            <span className="text-sm text-yellow-700">{editingSubmission.machine_id} - 第{editingSubmission.page_index + 1}页</span>
          </div>
          <button 
            onClick={handleBackFromEdit}
            className="px-4 py-2 bg-white/90 hover:bg-white rounded-lg shadow text-gray-700 font-medium pointer-events-auto"
          >
            返回列表
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-gray-900/50 to-transparent flex flex-col items-center justify-end pointer-events-none">
          {errorMsg && (
            <div className="mb-4 px-4 py-2 bg-red-500/90 backdrop-blur text-white rounded-lg shadow-xl flex items-center gap-2 text-sm font-medium animate-bounce pointer-events-auto">
              <AlertTriangle size={16} /> {errorMsg}
            </div>
          )}

          <div className="w-full max-w-[98%] xl:max-w-[95%] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4 pointer-events-auto flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1 w-full min-w-0">
              <DataEntryForm task={fakeTask} rows={rows} setRows={setRows} />
            </div>

            <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-32 border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pl-3 md:pt-0">
              <Button 
                onClick={handleUpdateSubmission} 
                isLoading={status === TaskStatus.SUBMITTING} 
                className="flex-1 h-12 w-full text-base bg-yellow-500 hover:bg-yellow-600 shadow-lg"
              >
                <Save size={18} className="mr-2" /> 保存修改
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Loading States ---

  if (status === TaskStatus.IDLE || status === TaskStatus.NO_TASK || (status === TaskStatus.FETCHING && !task)) {
    const totalTasks = projects.reduce((sum, p) => sum + p.available_count, 0);
    
    return (
      <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-auto">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl"></div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 relative z-10">
          {/* 左侧：主操作区 */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="max-w-lg w-full">
              {/* Logo & 标题 */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-200 mb-4">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  <span className="text-blue-600">UNSIAO</span> HiCore
                </h1>
                <p className="text-gray-500">数据登记系统 · 高效协作平台</p>
              </div>

              {/* 统计卡片 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
                  <div className="text-sm text-gray-500">待处理任务</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white shadow-sm">
                  <div className="text-2xl font-bold text-indigo-600">{projects.length}</div>
                  <div className="text-sm text-gray-500">活跃项目</div>
                </div>
              </div>

              {/* 主卡片 */}
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white p-6">
                {status === TaskStatus.NO_TASK ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">暂无可用任务</h3>
                    <p className="text-gray-500 text-sm mb-4">任务池已空，请稍后再试</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <RefreshCw className={`w-5 h-5 text-blue-600 ${status === TaskStatus.FETCHING ? 'animate-spin' : ''}`} />
                      领取新任务
                    </h3>
                    
                    {/* 项目选择 */}
                    {projects.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-2">选择项目</label>
                        <select
                          value={selectedProject}
                          onChange={(e) => setSelectedProject(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="">🎲 随机分配</option>
                          {projects.map(p => (
                            <option key={p.project_id} value={p.project_id}>
                              📁 {p.project_id} ({p.available_count} 个可用)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                <Button 
                  onClick={() => { loadProjects(); loadLeaderboard(); fetchTask(); }} 
                  className="w-full py-3.5 text-base shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={status === TaskStatus.FETCHING}
                >
                  {status === TaskStatus.FETCHING ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> 搜索中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" /> 开始任务
                    </>
                  )}
                </Button>
                
                <button 
                  onClick={() => setViewMode('history')}
                  className="w-full mt-4 py-2.5 text-gray-500 hover:text-blue-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <History size={16} /> 查看我的提交记录
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：排行榜 */}
          <div className="lg:w-80 shrink-0">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white p-5 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                贡献排行榜
              </h3>
              
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  暂无数据
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((user, index) => (
                    <div 
                      key={user.username}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        index === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100' :
                        index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-100' :
                        index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100' :
                        'hover:bg-gray-50'
                      }`}
                    >
                      {/* 排名 */}
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        {index === 0 ? (
                          <Medal className="w-6 h-6 text-amber-500" />
                        ) : index === 1 ? (
                          <Medal className="w-6 h-6 text-gray-400" />
                        ) : index === 2 ? (
                          <Medal className="w-6 h-6 text-orange-400" />
                        ) : (
                          <span className="text-sm font-bold text-gray-400">{index + 1}</span>
                        )}
                      </div>
                      
                      {/* 用户名 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{user.username}</div>
                      </div>
                      
                      {/* 贡献值 */}
                      <div className="flex items-center gap-1 text-blue-600 font-bold">
                        <Award className="w-4 h-4" />
                        {user.contribution}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部备案信息 */}
        <div className="text-center py-4 text-xs text-gray-400 relative z-10">
          <p>© 2025 UNSIAO HiCore · 粤ICP备XXXXXXXX号-1</p>
        </div>
      </div>
    );
  }

  // --- Main Workspace ---

  return (
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-900">
      
      {/* 图片区域 - 跳过时显示加载 */}
      <div className="absolute inset-0 z-0">
        {isSkipping ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="flex gap-3 text-5xl font-bold tracking-widest">
              {['U', 'N', 'S', 'I', 'A', 'O'].map((letter, i) => (
                <span
                  key={i}
                  className="text-blue-500 animate-pulse"
                  style={{
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: '1.2s'
                  }}
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="mt-6 text-gray-500 text-sm tracking-wide">正在加载下一个任务</p>
          </div>
        ) : (
          <ImageViewer image={task?.image || ''} />
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none p-4 flex justify-between items-start">
         <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-gray-200 pointer-events-auto flex items-center gap-4">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Project</span>
                <span className="text-sm font-bold text-gray-800">{task?.project_id}</span>
            </div>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Machine</span>
                <span className="text-lg font-black text-blue-700">{task?.machine_id}</span>
            </div>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Page</span>
                <span className="text-sm font-bold text-gray-800">{(task?.page_index || 0) + 1}</span>
            </div>
         </div>

         <div className="flex items-center gap-2">
           <button 
             onClick={() => setViewMode('history')}
             className="px-3 py-1.5 bg-white/90 hover:bg-white rounded-full text-xs font-medium text-gray-600 backdrop-blur-md shadow pointer-events-auto flex items-center gap-1"
           >
             <History size={14} /> 历史
           </button>
           <div className={`px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md shadow flex items-center gap-2 ${
                 wsStatus === ConnectionStatus.CONNECTED ? 'bg-green-100/90 text-green-700 border-green-200' : 'bg-red-100/90 text-red-700 border-red-200'
           }`}>
               <Activity size={14} className={wsStatus === ConnectionStatus.CONNECTED ? 'animate-pulse' : ''} />
               {wsStatus === ConnectionStatus.CONNECTED ? '已连接' : '离线'}
           </div>
         </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-gray-900/50 to-transparent flex flex-col items-center justify-end pointer-events-none">
         
         {errorMsg && (
            <div className="mb-4 px-4 py-2 bg-red-500/90 backdrop-blur text-white rounded-lg shadow-xl flex items-center gap-2 text-sm font-medium animate-bounce pointer-events-auto">
                <AlertTriangle size={16} /> {errorMsg}
            </div>
         )}

         <div className="w-full max-w-[98%] xl:max-w-[95%] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4 pointer-events-auto flex flex-col md:flex-row gap-4 items-start md:items-end">
            
            <div className="flex-1 w-full min-w-0">
                {task && <DataEntryForm task={task} rows={rows} setRows={setRows} />}
            </div>

            <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-32 border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pl-3 md:pt-0">
                 <Button 
                    onClick={handleSubmit} 
                    isLoading={status === TaskStatus.SUBMITTING} 
                    disabled={isSkipping}
                    className="flex-1 h-12 w-full text-base bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                    <Save size={18} className="mr-2" /> 提交
                 </Button>
                 
                 <Button 
                    variant="outline" 
                    onClick={handleSkip} 
                    disabled={isSkipping}
                    isLoading={isSkipping}
                    className="flex-1 h-10 w-full text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700"
                    title="跳过此任务"
                >
                    <SkipForward size={16} className="mr-2" /> {isSkipping ? '跳过中' : '跳过'}
                 </Button>
            </div>
         </div>
      </div>
    </div>
  );
};
