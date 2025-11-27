
import React, { useState } from 'react';
import { Lock, GraduationCap, ArrowRight, Smartphone } from 'lucide-react';
import { auth } from '../services/firebase';
import { signInAnonymously } from 'firebase/auth';

interface LoginScreenProps {
  onLoginSuccess: (userId: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [phoneLast4, setPhoneLast4] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneLast4.length < 4) {
      setError('전화번호 뒷자리 4자리를 정확히 입력해주세요.');
      return;
    }
    if (!password.trim()) {
      setError('비밀번호를 설정해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Firebase 익명 로그인 (실제 인증은 아니지만 보안 규칙을 통과하기 위한 세션 생성)
      await signInAnonymously(auth);
      
      // 로컬 스토리지에 사용자 정보 영구 저장 (브라우저 닫아도 유지됨)
      localStorage.setItem('userPhone', phoneLast4);
      localStorage.setItem('userPass', password);
      
      // 상위 컴포넌트로 ID 전달
      onLoginSuccess(phoneLast4);
    } catch (err: any) {
      console.error(err);
      setError('로그인 시스템 접속 중 오류가 발생했습니다. 네트워크를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">벽방산울림 교육과정 성찰회</h1>
          <p className="text-green-100 text-sm">
            2025학년도 교육활동 성찰 및 2026학년도 계획 수립
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-gray-400" />
                휴대폰 번호 뒷자리
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="1234"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-lg tracking-widest text-center"
                value={phoneLast4}
                onChange={(e) => setPhoneLast4(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                비밀번호 설정
              </label>
              <input
                type="password"
                placeholder="본인 확인용 비밀번호 입력"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-2 text-xs text-gray-500">
                * 성찰 기록을 남기기 위한 본인 확인용 비밀번호를 자유롭게 설정해주세요.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-start gap-2">
                <div className="mt-0.5">⚠️</div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all
                ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-900 hover:shadow-lg transform hover:-translate-y-0.5'}
              `}
            >
              {isLoading ? '접속 중...' : '입장하기'}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
        </div>
        
        <div className="bg-gray-50 px-8 py-4 text-center text-xs text-gray-400 border-t border-gray-100">
          © Byeokbang Elementary School Research Dept.
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
