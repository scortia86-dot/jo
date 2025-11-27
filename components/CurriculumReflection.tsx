
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Save, Plus, Trash2, Download, RefreshCcw, Edit3, Info, Send } from 'lucide-react';
import { PayoffItem } from '../types';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';

declare global {
  interface Window {
    html2canvas: any;
  }
}

interface Props {
  userId: string;
}

const CurriculumReflection: React.FC<Props> = ({ userId }) => {
  // Scale Settings
  const [minVal, setMinVal] = useState<number>(-5);
  const [maxVal, setMaxVal] = useState<number>(5);
  const [intervalVal, setIntervalVal] = useState<number>(1);

  // Data State
  const [items, setItems] = useState<PayoffItem[]>([]);

  // Input Form State
  const [formState, setFormState] = useState<Omit<PayoffItem, 'id' | 'ownerId'>>({
    activity: '',
    importance: 0,
    satisfaction: 0,
    proposer: '',
    grade: '',
    memo: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const captureRef = useRef<HTMLDivElement>(null);

  // Firestore Real-time Sync (Filtered by userId)
  useEffect(() => {
    if (!userId) return;
    
    // orderBy를 제거하고 클라이언트 측에서 정렬하여 복합 색인 오류 방지
    const q = query(
      collection(db, "curriculum_items"), 
      where("ownerId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedItems: PayoffItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PayoffItem));
      
      // 클라이언트 측 정렬 (최신순)
      loadedItems.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setItems(loadedItems);
    });
    return () => unsubscribe();
  }, [userId]);

  // Handlers
  const handleSubmit = async () => {
    if (!formState.activity.trim()) {
      alert('교육활동 이름을 입력해주세요.');
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const itemRef = doc(db, "curriculum_items", editingId);
        await updateDoc(itemRef, {
            ...formState,
            updatedAt: new Date()
        });
        alert('수정되었습니다.');
        handleResetForm();
      } else {
        // Add new
        await addDoc(collection(db, "curriculum_items"), {
            ...formState,
            ownerId: userId, // 소유자 ID 저장
            createdAt: new Date()
        });
        handleResetForm();
      }
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleEditClick = (item: PayoffItem) => {
    setFormState({
      activity: item.activity,
      importance: item.importance,
      satisfaction: item.satisfaction,
      proposer: item.proposer,
      grade: item.grade,
      memo: item.memo
    });
    setEditingId(item.id);
    // Scroll to form
    document.getElementById('input-form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleResetForm = () => {
    setFormState({ activity: '', importance: 0, satisfaction: 0, proposer: '', grade: '', memo: '' });
    setEditingId(null);
  };

  const handleRemoveItem = async (id: string) => {
    if(window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, "curriculum_items", id));
        if (editingId === id) handleResetForm();
      } catch (error) {
        console.error("Error removing document: ", error);
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleScaleSave = () => {
    alert('척도 설정이 적용되었습니다.');
  };

  const handleDownloadImage = async () => {
    if (captureRef.current && window.html2canvas) {
      try {
        const canvas = await window.html2canvas(captureRef.current, {
             scale: 2, // Higher resolution
             backgroundColor: '#f3f4f6' // Match body bg
        });
        const link = document.createElement('a');
        link.download = '교육과정_성찰_매트릭스.png';
        link.href = canvas.toDataURL();
        link.click();
      } catch (err) {
        console.error("Screen capture failed", err);
        alert("이미지 저장 중 오류가 발생했습니다.");
      }
    } else {
      alert("이미지 저장 기능을 로드하지 못했습니다.");
    }
  };

  // Helper to get quadrant name
  const getQuadrant = (imp: number, sat: number) => {
    const mid = (minVal + maxVal) / 2;
    // Q1: High Imp, High Sat (Top Right)
    if (imp >= mid && sat >= mid) return { code: 'Q1', label: '우선 추진', color: 'text-green-600 bg-green-50 border-green-200', pointColor: '#16a34a' };
    // Q2: Low Imp, High Sat (Top Left)
    if (imp < mid && sat >= mid) return { code: 'Q2', label: '선택 유지·축소', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', pointColor: '#ca8a04' };
    // Q3: High Imp, Low Sat (Bottom Right)
    if (imp >= mid && sat < mid) return { code: 'Q3', label: '개선 우선 과제', color: 'text-blue-600 bg-blue-50 border-blue-200', pointColor: '#2563eb' };
    // Q4: Low Imp, Low Sat (Bottom Left)
    return { code: 'Q4', label: '중단·정리 검토', color: 'text-red-600 bg-red-50 border-red-200', pointColor: '#dc2626' };
  };

  // Chart Calculations
  const chartSize = 1000; // Increased internal resolution
  const padding = 100; // More padding for labels
  const plotSize = chartSize - padding * 2;
  
  const getX = (val: number) => padding + ((val - minVal) / (maxVal - minVal)) * plotSize;
  const getY = (val: number) => chartSize - padding - ((val - minVal) / (maxVal - minVal)) * plotSize;
  const midX = getX((minVal + maxVal) / 2);
  const midY = getY((minVal + maxVal) / 2);

  // Scale generator
  const generateTicks = () => {
    const ticks = [];
    for (let i = minVal; i <= maxVal; i += intervalVal) {
      ticks.push(i);
    }
    return ticks;
  };

  // Calculate Label Positions (Avoid Overlap)
  const labelNodes = useMemo(() => {
    // 1. Map items to initial coordinates
    let nodes = items.map(item => ({
      ...item,
      x: getX(item.importance),
      y: getY(item.satisfaction),
      // Initial label position (slightly above the dot)
      lx: getX(item.importance),
      ly: getY(item.satisfaction) - 25, 
      q: getQuadrant(item.importance, item.satisfaction)
    }));

    // 2. Sort by Y ascending (top to bottom visually)
    nodes.sort((a, b) => a.y - b.y);

    // 3. Simple collision resolution
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < i; j++) {
        const current = nodes[i];
        const prev = nodes[j];

        // Approximate text width (Korean ~16px per char roughly at this scale)
        const widthCurr = current.activity.length * 16;
        const widthPrev = prev.activity.length * 16;

        const xDist = Math.abs(current.lx - prev.lx);
        const yDist = Math.abs(current.ly - prev.ly);

        // Check if labels overlap
        if (xDist < (widthCurr / 2 + widthPrev / 2 + 10) && yDist < 30) {
          // Collision detected: Move current label down
          current.ly += 30;
        }
      }
    }
    return nodes;
  }, [items, minVal, maxVal, chartSize]);

  return (
    <div className="space-y-8" ref={captureRef}>
      
      {/* Submission Notice Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl shadow-sm flex flex-col sm:flex-row items-start gap-4">
        <div className="bg-blue-100 p-2 rounded-full shrink-0">
          <Send className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-900">데이터 저장 안내</h3>
          <p className="text-blue-800 mt-1 text-sm leading-relaxed">
            입력하신 모든 내용은 <span className="font-bold">실시간으로 데이터베이스에 저장</span>됩니다. <br/>
            성찰회를 마친 후, 결과물 공유를 위해 하단의 <span className="font-bold bg-white px-1.5 py-0.5 rounded text-blue-700 shadow-sm mx-1">이미지 저장</span> 버튼을 눌러 결과물을 저장 후 연구부장에게 보내주세요.
          </p>
        </div>
      </div>

      {/* Step 1: Scale Setting - Orange */}
      <div className="bg-orange-50 rounded-xl border border-orange-200 overflow-hidden">
        <div className="bg-orange-400 px-6 py-3 flex items-center gap-2">
          <span className="bg-white text-orange-500 font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
          <h3 className="text-white font-bold text-lg">척도 설정</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">최소값 (예: -5)</label>
              <input 
                type="number" 
                value={minVal} 
                onChange={(e) => setMinVal(Number(e.target.value))}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">최대값 (예: 5)</label>
              <input 
                type="number" 
                value={maxVal} 
                onChange={(e) => setMaxVal(Number(e.target.value))}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">간격 (예: 1)</label>
              <input 
                type="number" 
                value={intervalVal} 
                onChange={(e) => setIntervalVal(Number(e.target.value))}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <button 
              onClick={handleScaleSave}
              className="bg-slate-700 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              설정 적용
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Input & Matrix - Blue */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 overflow-hidden" id="input-form-section">
        <div className="bg-blue-500 px-6 py-3 flex items-center gap-2">
          <span className="bg-white text-blue-500 font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
          <h3 className="text-white font-bold text-lg">교육활동 입력·수정</h3>
        </div>
        
        <div className="p-6">
           {/* Top Row: Form + Guide */}
           <div className="flex flex-col lg:flex-row gap-8 mb-8">
              
              {/* Left: Form */}
              <div className="flex-1 space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">교육활동 이름</label>
                    <input 
                      type="text" 
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formState.activity}
                      onChange={(e) => setFormState({...formState, activity: e.target.value})}
                      placeholder="예: 학예발표회"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">중요도 (가로축)</label>
                      <select 
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={formState.importance}
                        onChange={(e) => setFormState({...formState, importance: Number(e.target.value)})}
                      >
                        {generateTicks().map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">만족도 (세로축)</label>
                      <select 
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={formState.satisfaction}
                        onChange={(e) => setFormState({...formState, satisfaction: Number(e.target.value)})}
                      >
                        {generateTicks().map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">제안자 (선택)</label>
                    <input 
                      type="text" 
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formState.proposer}
                      onChange={(e) => setFormState({...formState, proposer: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">학년/부서 (선택)</label>
                    <input 
                      type="text" 
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formState.grade}
                      onChange={(e) => setFormState({...formState, grade: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택)</label>
                    <textarea 
                      rows={2}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                      value={formState.memo}
                      onChange={(e) => setFormState({...formState, memo: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={handleSubmit}
                      className={`text-white px-6 py-2 rounded-md transition-colors font-bold flex-1 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-800'}`}
                    >
                      {editingId ? '수정 저장' : '등록'}
                    </button>
                    <button 
                       onClick={handleResetForm}
                       className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      {editingId ? '취소' : '새로 입력'}
                    </button>
                  </div>
              </div>

              {/* Right: Guide Text */}
              <div className="flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-200 h-fit">
                 <h4 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    페이오프 매트릭스 안내
                 </h4>
                 <p className="text-gray-600 mb-4 leading-relaxed">
                    중요도와 만족도 두 축을 사용해 교육활동을 4분면에 배치하고, 
                    무엇을 먼저 유지·개선·정리할지 한눈에 볼 수 있는 도구입니다.
                 </p>
                 <ul className="space-y-4 text-sm">
                    <li className="flex gap-3">
                       <div className="min-w-[12px] mt-1.5 w-3 h-3 rounded-full bg-green-500"></div>
                       <div>
                          <strong className="text-green-700 block text-base">Q1: 우선 추진</strong>
                          <span className="text-gray-700">중요도·만족도가 모두 높은 활동<br/>→ 전교 차원의 확대·유지 우선 검토</span>
                       </div>
                    </li>
                    <li className="flex gap-3">
                       <div className="min-w-[12px] mt-1.5 w-3 h-3 rounded-full bg-yellow-500"></div>
                       <div>
                          <strong className="text-yellow-700 block text-base">Q2: 선택 유지·축소</strong>
                          <span className="text-gray-700">만족도는 높지만 상대적으로 중요도가 낮은 활동<br/>→ 유지하되 대상·규모·횟수 등을 조정</span>
                       </div>
                    </li>
                    <li className="flex gap-3">
                       <div className="min-w-[12px] mt-1.5 w-3 h-3 rounded-full bg-blue-500"></div>
                       <div>
                          <strong className="text-blue-700 block text-base">Q3: 개선 우선 과제</strong>
                          <span className="text-gray-700">중요도는 높으나 만족도가 낮은 활동<br/>→ 원인 분석 후 내용·방법·지원 체계 개선</span>
                       </div>
                    </li>
                    <li className="flex gap-3">
                       <div className="min-w-[12px] mt-1.5 w-3 h-3 rounded-full bg-red-500"></div>
                       <div>
                          <strong className="text-red-700 block text-base">Q4: 중단·정리 검토</strong>
                          <span className="text-gray-700">중요도와 만족도가 모두 낮은 활동<br/>→ 중단·통폐합 또는 다른 활동으로 대체 검토</span>
                       </div>
                    </li>
                 </ul>
                 <p className="mt-4 text-xs text-gray-400">
                    ※ 입력한 점수에 따라 아래 4분면 그래프에 자동으로 표시됩니다.
                 </p>
              </div>
           </div>

           {/* Bottom Row: Chart (Full Width, Large, Aspect Square) */}
           <div className="bg-white rounded-xl p-8 shadow-inner border border-gray-200">
              <div className="flex justify-between items-end mb-2">
                 <span className="font-bold text-gray-700">매트릭스 분석 결과</span>
                 <div className="text-right text-xs text-gray-500">
                    <div><strong>중요도:</strong> 학생·교사 만족도, 실행 용이성 종합 고려</div>
                    <div><strong>만족도:</strong> 교사·학생 배움 관련 만족도</div>
                 </div>
              </div>
              
              {/* Changed to aspect-square to maximize vertical space and prevent squishing */}
              <div className="w-full aspect-square max-h-[1000px] mx-auto">
               <svg viewBox={`0 0 ${chartSize} ${chartSize}`} className="w-full h-full bg-gray-50 border border-gray-200 rounded select-none">
                  {/* Background Colors for Quadrants */}
                  <rect x={midX} y={padding} width={plotSize/2} height={plotSize/2} fill="#f0fdf4" opacity="0.5" /> {/* Q1 Green */}
                  <rect x={padding} y={padding} width={plotSize/2} height={plotSize/2} fill="#fefce8" opacity="0.5" /> {/* Q2 Yellow */}
                  <rect x={midX} y={midY} width={plotSize/2} height={plotSize/2} fill="#eff6ff" opacity="0.5" /> {/* Q3 Blue */}
                  <rect x={padding} y={midY} width={plotSize/2} height={plotSize/2} fill="#fef2f2" opacity="0.5" /> {/* Q4 Red */}

                  {/* Grid Lines */}
                  {generateTicks().map(tick => (
                    <React.Fragment key={tick}>
                      {/* Vertical Lines */}
                      <line 
                        x1={getX(tick)} y1={padding} 
                        x2={getX(tick)} y2={chartSize - padding} 
                        stroke={tick === (minVal+maxVal)/2 ? "#374151" : "#e5e7eb"} 
                        strokeWidth={tick === (minVal+maxVal)/2 ? 3 : 1}
                        strokeDasharray={tick === (minVal+maxVal)/2 ? "0" : "4 4"}
                      />
                      {/* Horizontal Lines */}
                      <line 
                        x1={padding} y1={getY(tick)} 
                        x2={chartSize - padding} y2={getY(tick)} 
                        stroke={tick === (minVal+maxVal)/2 ? "#374151" : "#e5e7eb"} 
                        strokeWidth={tick === (minVal+maxVal)/2 ? 3 : 1}
                        strokeDasharray={tick === (minVal+maxVal)/2 ? "0" : "4 4"}
                      />
                      {/* Labels - Show ALL ticks including min/max */}
                       <text x={getX(tick)} y={chartSize - padding + 30} textAnchor="middle" fontSize="16" fill="#6b7280">{tick}</text>
                       <text x={padding - 20} y={getY(tick) + 6} textAnchor="end" fontSize="16" fill="#6b7280">{tick}</text>
                    </React.Fragment>
                  ))}

                  {/* Quadrant Labels (Watermarks) */}
                  <text x={chartSize - padding - 30} y={padding + 50} textAnchor="end" fontWeight="bold" fill="#166534" fontSize="24" opacity="0.8">Q1: 우선 추진</text>
                  <text x={padding + 30} y={padding + 50} textAnchor="start" fontWeight="bold" fill="#854d0e" fontSize="24" opacity="0.8">Q2: 선택 유지·축소</text>
                  <text x={chartSize - padding - 30} y={chartSize - padding - 30} textAnchor="end" fontWeight="bold" fill="#1e40af" fontSize="24" opacity="0.8">Q3: 개선 우선 과제</text>
                  <text x={padding + 30} y={chartSize - padding - 30} textAnchor="start" fontWeight="bold" fill="#991b1b" fontSize="24" opacity="0.8">Q4: 중단·정리 검토</text>

                  {/* Data Points & Labels */}
                  {labelNodes.map((node) => {
                    return (
                    <g key={node.id} className="transition-all duration-300 cursor-pointer hover:opacity-80">
                       <circle 
                          cx={node.x} 
                          cy={node.y} 
                          r="10" 
                          fill={node.q.pointColor}
                          stroke="white"
                          strokeWidth="3"
                          onClick={() => handleEditClick(node)}
                        />
                        {/* Text Background for better readability */}
                        <rect 
                          x={node.lx - (node.activity.length * 8) - 5} 
                          y={node.ly - 18} 
                          width={(node.activity.length * 16) + 10} 
                          height="24" 
                          rx="4"
                          fill="rgba(255,255,255,0.85)"
                        />
                        <text 
                          x={node.lx} 
                          y={node.ly} 
                          textAnchor="middle" 
                          fontSize="18" 
                          fill="#1f2937" 
                          fontWeight="bold"
                          style={{ textShadow: '0px 0px 4px rgba(255,255,255,0.5)' }}
                          onClick={() => handleEditClick(node)}
                        >
                          {node.activity}
                        </text>
                    </g>
                  )})}
               </svg>
              </div>
              
               {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 justify-center border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 bg-green-500 rounded-full"></div> Q1: 우선 추진</div>
                  <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 bg-yellow-500 rounded-full"></div> Q2: 선택 유지·축소</div>
                  <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 bg-blue-500 rounded-full"></div> Q3: 개선 우선 과제</div>
                  <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 bg-red-500 rounded-full"></div> Q4: 중단·정리 검토</div>
                </div>
           </div>
        </div>
      </div>

      {/* Step 3: List - Purple */}
       <div className="bg-purple-50 rounded-xl border border-purple-200 overflow-hidden">
        <div className="bg-purple-500 px-6 py-3 flex items-center gap-2">
          <span className="bg-white text-purple-500 font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
          <h3 className="text-white font-bold text-lg">전체 교육활동 목록</h3>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-white border-b">
                 <tr>
                    <th className="px-6 py-3 text-center w-16">No</th>
                    <th className="px-6 py-3">활동명</th>
                    <th className="px-6 py-3 text-center">중요도</th>
                    <th className="px-6 py-3 text-center">만족도</th>
                    <th className="px-6 py-3 text-center">사분면</th>
                    <th className="px-6 py-3 text-center">제안자</th>
                    <th className="px-6 py-3 text-center">학년</th>
                    <th className="px-6 py-3">메모</th>
                    <th className="px-6 py-3 text-center">편집</th>
                    <th className="px-6 py-3 text-center">삭제</th>
                 </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                 {items.map((item, index) => {
                   const q = getQuadrant(item.importance, item.satisfaction);
                   const isEditing = editingId === item.id;
                   return (
                    <tr key={item.id} className={`hover:bg-purple-50/30 ${isEditing ? 'bg-purple-100' : ''}`}>
                       <td className="px-6 py-4 text-center font-medium">{index + 1}</td>
                       <td className="px-6 py-4 font-medium text-gray-900">{item.activity}</td>
                       <td className="px-6 py-4 text-center">{item.importance}</td>
                       <td className="px-6 py-4 text-center">{item.satisfaction}</td>
                       <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs border ${q.color}`}>
                             {q.code}: {q.label}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-center">{item.proposer}</td>
                       <td className="px-6 py-4 text-center">{item.grade}</td>
                       <td className="px-6 py-4">{item.memo}</td>
                       <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="text-blue-600 hover:bg-blue-100 p-1.5 rounded transition-colors"
                          >
                             <Edit3 className="w-4 h-4" />
                          </button>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:bg-red-100 p-1.5 rounded transition-colors"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </td>
                    </tr>
                   );
                 })}
              </tbody>
           </table>
        </div>
      </div>

      {/* Step 4: Download - Green */}
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 overflow-hidden">
         <div className="bg-emerald-500 px-6 py-3 flex items-center gap-2">
          <span className="bg-white text-emerald-500 font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
          <h3 className="text-white font-bold text-lg">화면 이미지 다운로드</h3>
        </div>
        <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="text-sm text-emerald-800">
              <p>현재 웹앱 화면(그래프 포함)을 PNG 이미지로 저장합니다.</p>
              <p>연구부 성찰 자료, 워크숍 자료에 그대로 붙여넣어 활용할 수 있습니다.</p>
           </div>
           <button 
            onClick={handleDownloadImage}
            className="bg-slate-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
           >
              <Download className="w-5 h-5" />
              화면 이미지 저장
           </button>
        </div>
      </div>

    </div>
  );
};

export default CurriculumReflection;
