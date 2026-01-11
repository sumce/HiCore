import React from 'react';
import { LogOut, Award, User as UserIcon, Settings } from 'lucide-react';

interface HeaderProps {
  username: string;
  contribution: number;
  onLogout: () => void;
  isAdmin?: boolean;
  onAdminClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ username, contribution, onLogout, isAdmin, onAdminClick }) => {
  return (
    <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-gray-800 tracking-tight leading-tight">
            <span className="text-blue-600">UNSIAO</span> HiCore
          </h1>
          <span className="text-[10px] text-gray-400 font-medium tracking-wider">数据登记系统</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
          <Award size={18} />
          <span className="text-sm font-medium">积分: {contribution}</span>
        </div>

        <div className="h-6 w-px bg-gray-200"></div>

        <div className="flex items-center gap-2">
          {isAdmin && onAdminClick && (
            <button
              onClick={onAdminClick}
              className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors flex items-center gap-1"
            >
              <Settings size={16} /> 管理
            </button>
          )}
          
          <div className="bg-gray-100 p-1.5 rounded-full text-gray-600">
             <UserIcon size={18} />
          </div>
          <span className="text-sm font-medium text-gray-700 hidden md:block">{username}</span>
          <button 
            onClick={onLogout}
            className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
            title="退出登录"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
