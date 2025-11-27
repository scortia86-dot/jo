import React from 'react';
import { ExternalLink, ClipboardList } from 'lucide-react';

const StaffSurvey: React.FC = () => {
  const surveyLink = "https://ksurv.kr/aUM-Pj84PA";

  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white shadow rounded-xl border border-gray-200 text-center h-96">
      <div className="bg-blue-50 p-4 rounded-full mb-6">
        <ClipboardList className="w-12 h-12 text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">교직원 교육과정 만족도 설문</h2>
      <p className="text-gray-600 mb-8 max-w-lg">
        2025학년도 벽방초등학교 교육과정 운영에 대한 교직원 분들의 소중한 의견을 듣습니다.
        설문 결과는 2026학년도 계획 수립의 기초 자료로 활용됩니다.
      </p>
      <a
        href={surveyLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
      >
        설문 참여하기
        <ExternalLink className="ml-2 w-4 h-4" />
      </a>
      <p className="mt-4 text-sm text-gray-400">
        (새 창에서 설문지가 열립니다)
      </p>
    </div>
  );
};

export default StaffSurvey;