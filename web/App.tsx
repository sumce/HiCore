import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api } from './services/api';
import { LoginResponse } from './types';
import { LoginForm } from './components/LoginForm';
import { InitForm } from './components/InitForm';
import { Header } from './components/Header';
import { Workspace } from './components/Workspace';
import { AdminConsole } from './components/AdminConsole';

// 主应用内容
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; contribution: number; isAdmin: boolean } | null>(null);
  const [init, setInit] = useState(true);
  const [systemInitialized, setSystemInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    checkSystem();
  }, []);

  const checkSystem = async () => {
    try {
      const status = await api.checkSystemStatus();
      setSystemInitialized(status.initialized);
      
      if (status.initialized) {
        const token = api.getToken();
        const storedUser = localStorage.getItem('user_info');
        
        if (token && storedUser) {
          setIsAuthenticated(true);
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (e) {
      console.error('Failed to check system status', e);
      setSystemInitialized(true);
    } finally {
      setInit(false);
    }
  };

  const handleInitSuccess = () => {
    setSystemInitialized(true);
  };

  const handleLogin = (data: LoginResponse, username: string) => {
    api.setToken(data.token);
    const userInfo = { 
      name: username, 
      contribution: data.contribution || 0,
      isAdmin: data.is_admin || false
    };
    setUser(userInfo);
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    api.setToken(null);
    localStorage.removeItem('user_info');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/');
  };

  const updateContribution = () => {
    setUser(prev => {
      if (!prev) return null;
      const newUser = { ...prev, contribution: prev.contribution + 1 };
      localStorage.setItem('user_info', JSON.stringify(newUser));
      return newUser;
    });
  };

  if (init) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // 系统未初始化
  if (systemInitialized === false) {
    return <InitForm onInitSuccess={handleInitSuccess} />;
  }

  // 未登录
  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLogin} />;
  }

  return (
    <Routes>
      {/* 管理控制台 */}
      <Route 
        path="/console/*" 
        element={
          user?.isAdmin ? (
            <div className="h-screen flex flex-col bg-gray-100 font-sans text-gray-900">
              <AdminConsole onBack={() => navigate('/')} />
            </div>
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
      
      {/* 主工作区 */}
      <Route 
        path="/*" 
        element={
          <div className="h-screen flex flex-col bg-gray-100 font-sans text-gray-900">
            <Header 
              username={user?.name || 'User'} 
              contribution={user?.contribution || 0} 
              onLogout={handleLogout}
              isAdmin={user?.isAdmin || false}
              onAdminClick={() => navigate('/console')}
            />
            <main className="flex-1 overflow-hidden">
              <Workspace updateContribution={updateContribution} />
            </main>
          </div>
        } 
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
