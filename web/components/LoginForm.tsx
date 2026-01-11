import React, { useState } from 'react';
import { api } from '../services/api';
import { Button } from './Button';
import { LoginResponse } from '../types';
import { AlertTriangle, X } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (data: LoginResponse, username: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.login(username, password);
      api.setToken(data.token);
      onLoginSuccess(data, username);
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
             <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            <span className="text-blue-600">UNSIAO</span> HiCore
          </h1>
          <p className="text-sm text-gray-500 mt-1">数据登记系统</p>
        </div>

        {/* 内部产品警告 */}
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-medium">公司内部产品</p>
            <p className="text-amber-600 text-xs mt-1">本系统仅供授权人员使用，禁止外部访问</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <Button type="submit" className="w-full py-2.5" isLoading={loading}>
            登录
          </Button>
        </form>
      </div>

      {/* 底部信息 */}
      <div className="mt-6 text-center text-xs text-gray-400 space-y-1">
        <p>
          <button 
            onClick={() => setShowTerms(true)}
            className="text-blue-500 hover:text-blue-600 hover:underline"
          >
            使用条款
          </button>
        </p>
        <p>豫ICP备2024055216号-3</p>
      </div>

      {/* 使用条款弹窗 */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-lg">works.unsiao.com 使用条款</h3>
              <button 
                onClick={() => setShowTerms(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 text-sm text-gray-700 space-y-4 leading-relaxed">
              <p>欢迎使用 works.unsiao.com（以下简称"本平台"）。本平台由 unsiao.com 域名所有者开发并维护，旨在为公司内部资料整理工作提供技术支持，提升工作效率。在使用本平台前，请您仔细阅读并遵守以下使用条款。一旦您访问或使用本平台，即视为您已充分理解并同意接受本条款的全部内容。</p>
              
              <h4 className="font-bold text-gray-900 pt-2">一、使用范围与权限</h4>
              <p><strong>仅限内部使用：</strong>本平台仅供公司内部授权人员使用，严禁向任何外部人员、组织或第三方提供访问权限、账号信息或平台内容。</p>
              <p><strong>禁止滥用行为：</strong>用户不得以任何形式破坏、干扰、入侵、篡改或试图绕过本平台的正常运行机制，包括但不限于：</p>
              <ul className="list-disc list-inside pl-4 space-y-1 text-gray-600">
                <li>使用自动化脚本、爬虫或其他非人工方式大量访问或提取数据；</li>
                <li>上传含有病毒、木马、恶意代码等可能危害系统安全的内容；</li>
                <li>进行任何可能影响平台稳定性、安全性或性能的操作。</li>
              </ul>
              
              <h4 className="font-bold text-gray-900 pt-2">二、平台功能说明</h4>
              <p>本平台专为公司内部会勘表单扫描件的人工腾表（即信息录入与结构化处理）而设计，旨在提高资料整理效率。平台不提供任何面向公众的服务，亦不涉及任何收益性、增值性或付费功能。</p>
              
              <h4 className="font-bold text-gray-900 pt-2">三、知识产权与所有权</h4>
              <p>本平台（包括但不限于网站设计、源代码、数据库、界面、文档及相关内容）的所有权、知识产权及其他合法权益均归 unsiao.com 域名所有者 所有。未经明确书面授权，任何个人或组织不得复制、修改、分发、出售、出租、反向工程或以其他方式利用本平台的任何组成部分。</p>
              
              <h4 className="font-bold text-gray-900 pt-2">四、免责声明</h4>
              <p>本平台按"现状"和"可用"状态提供，不提供任何形式的明示或暗示担保，包括但不限于对平台功能完整性、准确性、安全性或适用性的保证。因不可抗力、系统维护、网络故障或其他非平台控制范围内原因导致的服务中断或数据丢失，平台所有者不承担相关责任。</p>
              
              <h4 className="font-bold text-gray-900 pt-2">五、联系方式</h4>
              <p>如您在使用过程中遇到任何问题，或对本条款有任何疑问，请通过以下方式联系我们：</p>
              <p className="text-gray-600">电话：17638636162<br/>邮箱：info@aosa.me</p>
              
              <h4 className="font-bold text-gray-900 pt-2">六、备案信息</h4>
              <p>本平台已依法完成备案：<strong>豫ICP备2024055216号-3</strong></p>
              
              <p className="text-gray-500 pt-4 border-t">最后更新日期：2026年1月11日</p>
              <p className="text-gray-500">请务必遵守上述条款。如有违反，平台有权立即终止您的使用权限，并保留追究相关法律责任的权利。感谢您的理解与配合！</p>
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <Button onClick={() => setShowTerms(false)} className="w-full">
                我已阅读并同意
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
