
import React, { useState, useEffect } from 'react';
import { BookOpen, CheckSquare, FileSpreadsheet, MessageCircle, GraduationCap, LogOut } from 'lucide-react';
import { TabType } from './types';
import StaffSurvey from './components/StaffSurvey';
import CurriculumReflection from './components/CurriculumReflection';
import WorkReflection from './components/WorkReflection';
import SchoolSuggestions from './components/SchoolSuggestions';
import LoginScreen from './components/LoginScreen';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.SURVEY);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 로컬 스토리지에서 사용자 정보 확인 (브라우저 껐다 켜도 유지됨)
        const storedPhone = localStorage.getItem('userPhone');
        
        if (storedPhone) {
          setIsAuthenticated(true);
          setUserId(storedPhone);
        } else {
          // 로그인은 되어 있으나 ID(전화번호)가 없는 경우 -> 데이터 혼선 방지를 위해 강제 로그아웃
          signOut(auth);
          setIsAuthenticated(false);
          setUserId('');
        }
      } else {
        setIsAuthenticated(false);
        setUserId('');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (id: string) => {
    setUserId(id);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    if(window.confirm('로그아웃 하시겠습니까?')) {
      await signOut(auth);
      localStorage.clear(); // 로컬 스토리지 비우기
      setUserId('');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case TabType.SURVEY:
        return <StaffSurvey />;
      case TabType.CURRICULUM:
        return <CurriculumReflection userId={userId} />;
      case TabType.WORK:
        return <WorkReflection userId={userId} />;
      case TabType.SUGGESTION:
        return <SchoolSuggestions userId={userId} />;
      default:
        return <StaffSurvey />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      {/* Hero / Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-xl">
                 <GraduationCap className="w-10 h-10 text-green-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                  함께 만들어가는 <span className="text-green-700">벽방산울림</span> 교육과정 성찰회
                </h1>
                <p className="mt-1 text-lg text-gray-500">
                  Step-up Program: Reflection & Planning for 2025 (접속 ID: {userId})
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
              <button
                onClick={() => setActiveTab(TabType.SURVEY)}
                className={`${
                  activeTab === TabType.SURVEY
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm md:text-base flex items-center gap-2`}
              >
                <CheckSquare className="w-5 h-5" />
                교직원 설문
              </button>

              <button
                onClick={() => setActiveTab(TabType.CURRICULUM)}
                className={`${
                  activeTab === TabType.CURRICULUM
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm md:text-base flex items-center gap-2`}
              >
                <BookOpen className="w-5 h-5" />
                교육과정 되돌아보기
              </button>

              <button
                onClick={() => setActiveTab(TabType.WORK)}
                className={`${
                  activeTab === TabType.WORK
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm md:text-base flex items-center gap-2`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                업무 되돌아보기
              </button>

              <button
                onClick={() => setActiveTab(TabType.SUGGESTION)}
                className={`${
                  activeTab === TabType.SUGGESTION
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm md:text-base flex items-center gap-2`}
              >
                <MessageCircle className="w-5 h-5" />
                벽방교육 제언하기
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="transition-all duration-300 ease-in-out">
          {renderContent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-400">
            © 2024 Byeokbang Elementary School Research Department. Powered by Gemini AI.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
