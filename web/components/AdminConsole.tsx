import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { STATIC_BASE_URL } from '../constants';
import { 
  BarChart3, Users, FolderOpen, Clock, CheckCircle, 
  Lock, Unlock, RefreshCw, ChevronLeft, Search, Eye
} from 'lucide-react';
import { Button } from './Button';

interface Stats {
  tasks: { total: number; pending: number; locked: number; completed: number };
  users: { total: number };
  submissions: { total: number; today: number };
}

interface User {
  username: string;
  contribution: number;
  submission_count: number;
  is_admin?: number;
}

interface Project {
  project_id: string;
  total_tasks: number;
  completed_tasks: number;
}

interface LockedTask {
  id: number;
  project_id: string;
  machine_id: string;
  page_index: number;
  locked_by: string;
  locked_at: string;
}

interface Submission {
  id: number;
  project_id: string;
  machine_id: string;
  page_index: number;
  username: string;
  submitted_at: string;
  image: string;
  row_count: number;
  data: any[];
}

interface AdminConsoleProps {
  onBack: () => void;
}

type Tab = 'overview' | 'users' | 'projects' | 'locked' | 'submissions';

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onBack }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lockedTasks, setLockedTasks] = useState<LockedTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 筛选
  const [filterUsername, setFilterUsername] = useState('');
  const [filterProject, setFilterProject] = useState('');
  
  // 详情弹窗
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'projects') loadProjects();
    if (tab === 'locked') loadLockedTasks();
    if (tab === 'submissions') loadSubmissions();
  }, [tab]);

  const loadStats = async () => {
    try {
      const res = await api.adminRequest('/admin/stats');
      // API返回的是 {tasks: {...}, users: {...}, submissions: {...}}
      setStats(res || null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.adminRequest('/admin/users');
      // API返回的是数组
      setUsers(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await api.adminRequest('/admin/projects');
      setProjects(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e.message);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLockedTasks = async () => {
    setLoading(true);
    try {
      const res = await api.adminRequest('/admin/locked-tasks');
      setLockedTasks(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e.message);
      setLockedTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      let url = '/admin/submissions?limit=100';
      if (filterUsername) url += `&username=${filterUsername}`;
      if (filterProject) url += `&project_id=${filterProject}`;
      const res = await api.adminRequest(url);
      setSubmissions(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e.message);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (taskId: number) => {
    try {
      await api.adminRequest(`/admin/unlock-task/${taskId}`, 'POST');
      loadLockedTasks();
      loadStats();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      setError('请填写用户名和密码');
      return;
    }
    try {
      await api.createUser(newUsername, newPassword);
      setShowAddUser(false);
      setNewUsername('');
      setNewPassword('');
      loadUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`确定删除用户 ${username}？`)) return;
    try {
      await api.deleteUser(username);
      loadUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleResetPassword = async (username: string) => {
    const newPwd = prompt(`请输入 ${username} 的新密码：`);
    if (!newPwd) return;
    try {
      await api.updateUserPassword(username, newPwd);
      alert('密码修改成功');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const tabs = [
    { id: 'overview', label: '概览', icon: BarChart3 },
    { id: 'users', label: '用户', icon: Users },
    { id: 'projects', label: '项目', icon: FolderOpen },
    { id: 'locked', label: '进行中', icon: Lock },
    { id: 'submissions', label: '提交记录', icon: CheckCircle },
  ];

  return (
    <div className="h-full bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-bold text-lg">管理控制台</h1>
        </div>
        
        <nav className="flex-1 p-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                tab === t.id 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <t.icon size={20} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">系统概览</h2>
            
            {!stats ? (
              <div className="text-center text-gray-500 py-8">加载中...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="总任务数" 
                    value={stats.tasks?.total || 0} 
                    icon={FolderOpen}
                    color="blue"
                  />
                  <StatCard 
                    title="待处理" 
                    value={stats.tasks?.pending || 0} 
                    icon={Clock}
                    color="yellow"
                  />
                  <StatCard 
                    title="进行中" 
                    value={stats.tasks?.locked || 0} 
                    icon={Lock}
                    color="orange"
                  />
                  <StatCard 
                    title="已完成" 
                    value={stats.tasks?.completed || 0} 
                    icon={CheckCircle}
                    color="green"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard 
                    title="用户数" 
                    value={stats.users?.total || 0} 
                    icon={Users}
                    color="purple"
                  />
                  <StatCard 
                    title="总提交数" 
                    value={stats.submissions?.total || 0} 
                    icon={CheckCircle}
                    color="blue"
                  />
                  <StatCard 
                    title="今日提交" 
                    value={stats.submissions?.today || 0} 
                    icon={BarChart3}
                    color="green"
                  />
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold mb-4">完成进度</h3>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                      style={{ width: `${stats.tasks?.total ? (stats.tasks.completed / stats.tasks.total * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {stats.tasks?.completed || 0} / {stats.tasks?.total || 0} ({stats.tasks?.total ? ((stats.tasks.completed / stats.tasks.total * 100)).toFixed(1) : 0}%)
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">用户管理</h2>
              <div className="flex gap-2">
                <Button onClick={() => setShowAddUser(true)}>
                  + 添加用户
                </Button>
                <Button variant="outline" onClick={loadUsers}>
                  <RefreshCw size={16} className="mr-2" /> 刷新
                </Button>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户名</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">贡献值</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">提交数</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u: User) => (
                    <tr key={u.username} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {u.username}
                        {u.is_admin === 1 && (
                          <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded">管理员</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-blue-600">{u.contribution}</td>
                      <td className="px-4 py-3 text-gray-500">{u.submission_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResetPassword(u.username)}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            重置密码
                          </button>
                          {u.is_admin !== 1 && (
                            <button
                              onClick={() => handleDeleteUser(u.username)}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Projects */}
        {tab === 'projects' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">项目列表</h2>
            
            {loading ? (
              <div className="text-center text-gray-500 py-8">加载中...</div>
            ) : projects.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                暂无项目
              </div>
            ) : (
              <div className="grid gap-4">
                {projects.map((p: Project) => (
                  <div key={p.project_id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-lg">{p.project_id}</span>
                      <span className="text-sm text-gray-500">
                        {p.completed_tasks} / {p.total_tasks} 完成
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${p.total_tasks ? (p.completed_tasks / p.total_tasks * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Locked Tasks */}
        {tab === 'locked' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">进行中的任务</h2>
              <Button variant="outline" onClick={loadLockedTasks}>
                <RefreshCw size={16} className="mr-2" /> 刷新
              </Button>
            </div>
            
            {(!lockedTasks || lockedTasks.length === 0) ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                当前没有进行中的任务
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">任务</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">锁定时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lockedTasks.map((t: LockedTask) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium">{t.machine_id}</span>
                          <span className="text-gray-400 text-sm ml-2">第{t.page_index + 1}页</span>
                        </td>
                        <td className="px-4 py-3 text-blue-600">{t.locked_by}</td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{t.locked_at}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleUnlock(t.id)}
                            className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            <Unlock size={14} className="inline mr-1" /> 强制解锁
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Submissions */}
        {tab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">提交记录</h2>
              <Button variant="outline" onClick={loadSubmissions}>
                <RefreshCw size={16} className="mr-2" /> 刷新
              </Button>
            </div>
            
            {/* Filters */}
            <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="用户名"
                  value={filterUsername}
                  onChange={e => setFilterUsername(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="项目ID"
                  value={filterProject}
                  onChange={e => setFilterProject(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <Button onClick={loadSubmissions}>搜索</Button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">任务</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">数据行</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {submissions.map((s: Submission) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">#{s.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{s.machine_id}</span>
                        <span className="text-gray-400 text-sm ml-1">p{s.page_index + 1}</span>
                      </td>
                      <td className="px-4 py-3 text-blue-600">{s.username}</td>
                      <td className="px-4 py-3">{s.row_count} 行</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{s.submitted_at}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedSubmission(s)}
                          className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          <Eye size={14} className="inline mr-1" /> 查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Submission Detail Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-lg">
                  提交详情 - {selectedSubmission.machine_id} (第{selectedSubmission.page_index + 1}页)
                </h3>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-4 grid md:grid-cols-2 gap-4">
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={`${STATIC_BASE_URL}${selectedSubmission.image}`}
                    alt="Task"
                    className="w-full h-auto"
                    style={{ transform: 'rotate(90deg) scale(0.7)' }}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="text-sm text-gray-500">
                    <p>用户: <span className="text-blue-600 font-medium">{selectedSubmission.username}</span></p>
                    <p>时间: {selectedSubmission.submitted_at}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">数据内容 ({selectedSubmission.data?.length || 0} 行)</h4>
                    {(selectedSubmission.data || []).map((row: any, i: number) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm">
                        <div className="font-medium text-blue-700 mb-1">{row.circuit_name}</div>
                        <div className="grid grid-cols-2 gap-1 text-gray-600">
                          {row.area && <span>区域: {row.area}</span>}
                          {row.voltage && <span>电压: {row.voltage}</span>}
                          {row.power && <span>功率: {row.power}</span>}
                          {row.max_current && <span>最大电流: {row.max_current}</span>}
                          {row.run_current && <span>运行电流: {row.run_current}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="font-bold text-lg mb-4">添加用户</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="至少2位"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="至少3位"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button onClick={handleAddUser} className="flex-1">创建</Button>
                <Button variant="outline" onClick={() => setShowAddUser(false)} className="flex-1">取消</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.FC<any>;
  color: string;
}> = ({ title, value, icon: Icon, color }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};
