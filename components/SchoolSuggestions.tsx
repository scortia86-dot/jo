
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Target, 
  History, 
  TrendingUp, 
  HelpCircle, 
  Lightbulb, 
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  Check,
  Save
} from 'lucide-react';
import { SuggestionItem } from '../types';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';

interface Props {
  userId: string;
}

const SchoolSuggestions: React.FC<Props> = ({ userId }) => {
  const [items, setItems] = useState<SuggestionItem[]>([]);
  const [drafts, setDrafts] = useState<SuggestionItem[]>([]); // DB에 저장되지 않은 새 카드

  // Firestore Sync (Filtered)
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "suggestion_items"), 
      where("ownerId", "==", userId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SuggestionItem));
      
      // Sort client side (desc)
      loadedItems.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setItems(loadedItems);
    }, (error) => {
      console.error("데이터 불러오기 실패:", error);
    });
    return () => unsubscribe();
  }, [userId]);

  // 새 제안 카드 추가 (로컬 상태만 업데이트)
  const handleAddDraft = () => {
    const newDraft: SuggestionItem = {
      id: `draft-${Date.now()}`,
      category: '일반',
      title: '',
      goal: '',
      lessonLearned: '',
      status: '',
      why: '',
      plan: '',
    };
    setDrafts(prev => [newDraft, ...prev]);
  };

  // DB에 저장
  const handleSaveDraft = async (draft: SuggestionItem) => {
    if (!draft.title.trim()) {
      alert("제언 제목을 입력해주세요.");
      return;
    }

    try {
      // id 제외하고 저장 (Firestore가 ID 자동 생성)
      const { id, ...data } = draft;
      
      // undefined 값 방지를 위해 빈 문자열로 fallback
      const cleanData = {
        category: data.category || '일반',
        title: data.title || '',
        goal: data.goal || '',
        lessonLearned: data.lessonLearned || '',
        status: data.status || '',
        why: data.why || '',
        plan: data.plan || '',
        ownerId: userId, // Add ownerId
        createdAt: new Date()
      };

      await addDoc(collection(db, "suggestion_items"), cleanData);
      
      // 저장 성공 시 Draft 목록에서 제거
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      alert("성공적으로 저장되었습니다.");
    } catch (e: any) {
      console.error("Error saving draft", e);
      let errorMessage = "저장 중 알 수 없는 오류가 발생했습니다.";
      if (e.code === 'permission-denied') {
        errorMessage = "저장 권한이 없습니다.";
      } else if (e.code === 'not-found') {
        errorMessage = "데이터베이스 연결 오류";
      }
      alert(`저장 실패!\n\n${errorMessage}`);
    }
  };

  const handleRemoveDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  const handleDraftChange = (id: string, field: keyof SuggestionItem, value: string) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  // 기존 아이템 삭제
  const handleRemoveItem = async (id: string) => {
    if(window.confirm('정말 삭제하시겠습니까?')) {
        try {
            await deleteDoc(doc(db, "suggestion_items", id));
        } catch (e: any) {
            console.error("Error removing suggestion", e);
        }
    }
  };

  // 기존 아이템 로컬 변경
  const handleItemChange = (id: string, field: keyof SuggestionItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // 기존 아이템 자동 저장 (onBlur)
  const handleItemBlur = async (id: string, field: keyof SuggestionItem, value: string) => {
      try {
          const itemRef = doc(db, "suggestion_items", id);
          await updateDoc(itemRef, {
              [field]: value,
              updatedAt: new Date()
          });
      } catch (e) {
          console.error("Error saving field", e);
      }
  };

  const renderCard = (item: SuggestionItem, isDraft: boolean) => (
    <div key={item.id} className={`rounded-2xl shadow-xl border overflow-hidden group transition-all duration-300 ${isDraft ? 'border-orange-300 shadow-orange-100 ring-2 ring-orange-100' : 'bg-white shadow-gray-200/50 border-gray-100 hover:shadow-2xl'}`}>
       {/* Card Header */}
       <div className={`px-6 py-5 border-b flex justify-between items-start gap-4 ${isDraft ? 'bg-orange-50/50 border-orange-100' : 'bg-gradient-to-r from-gray-50 to-white border-gray-100'}`}>
          <div className="flex-1">
             <div className="flex items-center gap-2 mb-3">
                {isDraft ? (
                   <span className="bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm animate-pulse">
                     작성 중 (Unsaved)
                   </span>
                ) : (
                   <span className="bg-gray-800 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                     등록 완료
                   </span>
                )}
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                   <Check className="w-3 h-3" /> Suggestion Title
                </span>
             </div>
             <input
                className="bg-transparent border-none text-xl font-bold text-gray-800 focus:ring-0 w-full placeholder-gray-300 p-0 hover:bg-black/5 rounded transition-colors"
                placeholder="교육활동 제목을 입력하세요 (예: 가족 등반 대회)"
                value={item.title}
                onChange={(e) => isDraft ? handleDraftChange(item.id, 'title', e.target.value) : handleItemChange(item.id, 'title', e.target.value)}
                onBlur={(e) => !isDraft && handleItemBlur(item.id, 'title', e.target.value)}
                autoFocus={isDraft}
             />
          </div>
          <div className="flex gap-2">
            {isDraft && (
               <button 
                onClick={() => handleSaveDraft(item)} 
                className="flex items-center gap-1 bg-orange-600 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-orange-700 transition-colors"
               >
                 <Save className="w-4 h-4" />
                 저장
               </button>
            )}
            <button 
              onClick={() => isDraft ? handleRemoveDraft(item.id) : handleRemoveItem(item.id)} 
              className="text-gray-400 hover:text-red-500 p-2.5 transition-colors bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:bg-red-50 hover:border-red-100"
              title="삭제"
            >
               <Trash2 className="w-5 h-5" />
            </button>
          </div>
       </div>

       {/* Card Body */}
       <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          {/* Goal */}
          <div className="space-y-2 group/field">
             <label className="flex items-center gap-2 text-sm font-bold text-indigo-700">
                <div className="p-1.5 bg-indigo-100 rounded-lg group-hover/field:bg-indigo-200 transition-colors shadow-sm">
                  <Target className="w-4 h-4" />
                </div>
                목표 (Goal)
             </label>
             <textarea
                className="w-full p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all resize-none focus:bg-white"
                rows={3}
                placeholder="해야하는 것, 수치화, 정량 목표"
                value={item.goal}
                onChange={(e) => isDraft ? handleDraftChange(item.id, 'goal', e.target.value) : handleItemChange(item.id, 'goal', e.target.value)}
                onBlur={(e) => !isDraft && handleItemBlur(item.id, 'goal', e.target.value)}
             />
          </div>

          {/* Lesson Learned */}
          <div className="space-y-2 group/field">
             <label className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <div className="p-1.5 bg-emerald-100 rounded-lg group-hover/field:bg-emerald-200 transition-colors shadow-sm">
                  <History className="w-4 h-4" />
                </div>
                이전 (Lesson Learned)
             </label>
             <textarea
                className="w-full p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all resize-none focus:bg-white"
                rows={3}
                placeholder="올해는 이렇게 진행했음 (성과/반성)"
                value={item.lessonLearned}
                onChange={(e) => isDraft ? handleDraftChange(item.id, 'lessonLearned', e.target.value) : handleItemChange(item.id, 'lessonLearned', e.target.value)}
                onBlur={(e) => !isDraft && handleItemBlur(item.id, 'lessonLearned', e.target.value)}
             />
          </div>

          {/* Status */}
          <div className="space-y-2 group/field">
             <label className="flex items-center gap-2 text-sm font-bold text-blue-700">
                <div className="p-1.5 bg-blue-100 rounded-lg group-hover/field:bg-blue-200 transition-colors shadow-sm">
                  <TrendingUp className="w-4 h-4" />
                </div>
                현황 (State of Business)
             </label>
             <textarea
                className="w-full p-4 bg-blue-50/30 border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all resize-none focus:bg-white"
                rows={3}
                placeholder="소요 예산, 인력 현황 등"
                value={item.status}
                onChange={(e) => isDraft ? handleDraftChange(item.id, 'status', e.target.value) : handleItemChange(item.id, 'status', e.target.value)}
                onBlur={(e) => !isDraft && handleItemBlur(item.id, 'status', e.target.value)}
             />
          </div>

          {/* Why */}
          <div className="space-y-2 group/field">
             <label className="flex items-center gap-2 text-sm font-bold text-amber-700">
                <div className="p-1.5 bg-amber-100 rounded-lg group-hover/field:bg-amber-200 transition-colors shadow-sm">
                  <HelpCircle className="w-4 h-4" />
                </div>
                개선 이유 (Why)
             </label>
             <textarea
                className="w-full p-4 bg-amber-50/30 border border-amber-100 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all resize-none focus:bg-white"
                rows={3}
                placeholder="불편함, 발전 방향, 변경이 필요한 이유"
                value={item.why}
                onChange={(e) => isDraft ? handleDraftChange(item.id, 'why', e.target.value) : handleItemChange(item.id, 'why', e.target.value)}
                onBlur={(e) => !isDraft && handleItemBlur(item.id, 'why', e.target.value)}
             />
          </div>

          {/* Plan */}
          <div className="md:col-span-2 space-y-2 group/field mt-2">
             <label className="flex items-center gap-2 text-sm font-bold text-rose-700">
                <div className="p-1.5 bg-rose-100 rounded-lg group-hover/field:bg-rose-200 transition-colors shadow-sm">
                  <Lightbulb className="w-4 h-4" />
                </div>
                내년 계획 (Strategic Priorities)
             </label>
              <div className="relative group-focus-within:ring-2 ring-rose-200 rounded-xl transition-shadow">
                <textarea
                   className="w-full p-5 bg-rose-50/30 border border-rose-100 rounded-xl text-sm focus:ring-0 focus:border-rose-300 transition-all focus:bg-white min-h-[120px]"
                   rows={3}
                   placeholder="2026학년도 수정 방안 및 구체적 계획을 작성해주세요."
                   value={item.plan}
                   onChange={(e) => isDraft ? handleDraftChange(item.id, 'plan', e.target.value) : handleItemChange(item.id, 'plan', e.target.value)}
                   onBlur={(e) => !isDraft && handleItemBlur(item.id, 'plan', e.target.value)}
                />
                <div className="absolute bottom-4 right-4 pointer-events-none transition-opacity duration-500 opacity-30 group-focus-within:opacity-10">
                   <Lightbulb className="w-16 h-16 text-rose-200" strokeWidth={1.5} />
                </div>
              </div>
          </div>
       </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Notice Banner */}
      <div className="bg-gradient-to-r from-orange-50 via-orange-50 to-amber-50 border-l-4 border-orange-500 p-6 rounded-xl shadow-md flex flex-col md:flex-row items-start md:items-center gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-200 rounded-full opacity-20 blur-xl"></div>
        <div className="bg-white p-3 rounded-full shadow-sm shrink-0 z-10">
           <FileSpreadsheet className="w-8 h-8 text-orange-600" />
        </div>
        <div className="z-10">
           <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             자동 저장 안내
             <span className="text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full uppercase tracking-wide">Auto-Sync</span>
           </h3>
           <p className="text-gray-700 mt-2 text-base leading-relaxed">
              새 제안 카드 추가 후 <span className="font-bold bg-orange-600 text-white px-1.5 py-0.5 rounded text-xs mx-1">저장</span> 버튼을 누르면 자동으로 데이터베이스에 저장됩니다.
           </p>
        </div>
      </div>

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
         <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <div className="bg-yellow-100 p-1.5 rounded-lg">
                <Sparkles className="w-6 h-6 text-yellow-600" fill="currentColor" />
              </div>
              2026학년도 업무 추진 수정 제언
            </h2>
            <p className="text-gray-500 mt-2 ml-1">
              더 나은 학교를 위한 선생님의 창의적인 아이디어를 자유롭게 제안해주세요.
            </p>
         </div>
         <button
           onClick={handleAddDraft}
           className="flex items-center px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-black transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-bold text-sm group"
         >
           <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
           새 제안 카드 추가
         </button>
      </div>

      {/* Cards List */}
      <div className="grid gap-8">
         {items.length === 0 && drafts.length === 0 && (
             <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
                <Lightbulb className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-gray-400 text-lg font-medium">등록된 제언이 없습니다.</p>
                <button onClick={handleAddDraft} className="mt-4 text-orange-600 font-bold hover:underline flex items-center gap-1">
                   첫 번째 제언을 작성해보세요 <Plus className="w-4 h-4" />
                </button>
             </div>
         )}
         
         {/* Drafts (Unsaved) */}
         {drafts.map(draft => renderCard(draft, true))}

         {/* Saved Items */}
         {items.map(item => renderCard(item, false))}
      </div>
    </div>
  );
};

export default SchoolSuggestions;
