import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SubmissionItem } from '../types';
import { STATIC_BASE_URL } from '../constants';
import { Clock, Edit, ChevronLeft, FolderOpen } from 'lucide-react';
import { Button } from './Button';

interface HistoryListProps {
  onEdit: (submission: SubmissionItem) => void;
  onBack: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ onEdit, onBack }) => {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('');

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const data = await api.getSubmissions();
      setSubmissions(data);
    } catch (e) {
      console.error('Failed to load submissions', e);
    } finally {
      setLoading(false);
    }
  };

  // 获取所有项目列表
  const projects = [...new Set(submissions.map(s => s.project_id))].sort().reverse();
  
  // 筛选后的提交记录
  const filteredSubmissions = filterProject 
    ? submissions.filter(s => s.project_id === filterProject)
    : submissions;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 z-10 flex-wrap">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">我的提交记录</h2>
        <span className="text-sm text-gray-500">共 {filteredSubmissions.length} 条</span>
        
        {/* 项目筛选 */}
        {projects.length > 1 && (
          <div className="ml-auto flex items-center gap-2">
            <FolderOpen size={16} className="text-gray-400" />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部项目</option>
              {projects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Clock size={48} className="mb-4 opacity-50" />
          <p>暂无提交记录</p>
        </div>
      ) : (
        <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubmissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                <img
                  src={`${STATIC_BASE_URL}${sub.image}`}
                  alt={sub.machine_id}
                  className="w-full h-full object-contain"
                  style={{ transform: 'rotate(90deg) scale(0.7)' }}
                />
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                  第 {sub.page_index + 1} 页
                </div>
                {/* 项目标签 */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-xs rounded font-medium">
                  {sub.project_id}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg text-gray-900">{sub.machine_id}</span>
                </div>
                
                <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                  <Clock size={12} />
                  {sub.submitted_at}
                </div>
                
                <div className="text-sm text-gray-600 mb-3">
                  {sub.data?.length || 0} 条数据记录
                </div>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onEdit(sub)}
                >
                  <Edit size={14} className="mr-2" />
                  查看/修改
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
