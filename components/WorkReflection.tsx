
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Plus, Download, Trash2, X, Send, Edit, ArrowDownAZ, HelpCircle, FileSpreadsheet, Lightbulb, Save } from 'lucide-react';
import { extractActivitiesFromDoc } from '../services/geminiService';
import { WorkItem, WorkImprovementItem } from '../types';
import { db } from '../services/firebase';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { read, utils } from 'xlsx';

declare global {
  interface Window {
    html2canvas: any;
  }
}

interface Props {
  userId: string;
}

const WorkReflection: React.FC<Props> = ({ userId }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Work Item Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // For tracking edit mode
  const [newMonth, setNewMonth] = useState('3월');
  const [newDepartment, setNewDepartment] = useState('');
  const [newTitle, setNewTitle] = useState('');

  // Improvement Section State
  const [improvements, setImprovements] = useState<WorkImprovementItem[]>([]);
  const [impTarget, setImpTarget] = useState('');
  const [impReason, setImpReason] = useState('');
  const [impPlan, setImpPlan] = useState('');
  const [editingImpId, setEditingImpId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // Firestore Sync: Work Items (Filtered)
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "work_items"), 
      where("ownerId", "==", userId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WorkItem));
      // Sort client side (by month)
      setWorkItems(sortWorkItems(loadedItems));
    });
    return () => unsubscribe();
  }, [userId]);

  // Firestore Sync: Work Improvements (Filtered)
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "work_improvements"), 
      where("ownerId", "==", userId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WorkImprovementItem));
      
      // Sort client side (desc)
      loadedItems.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setImprovements(loadedItems);
    });
    return () => unsubscribe();
  }, [userId]);


  // Month Sorter (Academic Year: Mar -> Feb)
  const sortWorkItems = (items: WorkItem[]) => {
    const monthOrder = ['3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월', '1월', '2월'];
    return [...items].sort((a, b) => {
      const indexA = monthOrder.findIndex(m => a.month && a.month.includes(m));
      const indexB = monthOrder.findIndex(m => b.month && b.month.includes(m));
      
      const valA = indexA === -1 ? 99 : indexA;
      const valB = indexB === -1 ? 99 : indexB;
      
      return valA - valB;
    });
  };

  const handleSortClick = () => {
    setWorkItems(prev => sortWorkItems(prev));
    alert("3월부터 학사일정 순으로 정렬되었습니다.");
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    try {
      let dataToSend = '';
      let mimeTypeToSend = '';

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
         const arrayBuffer = await file.arrayBuffer();
         const workbook = read(arrayBuffer);
         const firstSheetName = workbook.SheetNames[0];
         const worksheet = workbook.Sheets[firstSheetName];
         const csvData = utils.sheet_to_csv(worksheet);
         dataToSend = csvData;
         mimeTypeToSend = 'text/plain'; 
      } else {
         const reader = new FileReader();
         const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = (e) => {
               const result = e.target?.result as string;
               resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
         });
         reader.readAsDataURL(file);
         dataToSend = await base64Promise;
         mimeTypeToSend = file.type;
      }

      const extractedData = await extractActivitiesFromDoc(dataToSend, mimeTypeToSend);
        
      const promises = [];
      for (const monthGroup of extractedData) {
        for (const activity of monthGroup.activities) {
            promises.push(addDoc(collection(db, "work_items"), {
              month: monthGroup.month,
              title: activity,
              department: '', 
              goal: '', lessonLearned: '', status: '', why: '', plan: '',
              ownerId: userId, // Add ownerId
              createdAt: new Date()
            }));
        }
      }
      await Promise.all(promises);
      alert(`분석이 완료되었습니다. ${promises.length}개의 주요 업무로 요약 정리되었습니다.`);

    } catch (error) {
      alert('파일 처리 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  // --- Work Item Handlers ---
  const openCreateModal = () => {
    setEditingId(null);
    setNewMonth('3월');
    setNewTitle('');
    // Load department from local state or last used if needed, or keep blank
    // Here we can restore from previous edit if desired, or just use state
    setIsModalOpen(true);
  };

  const openEditModal = (item: WorkItem) => {
    setEditingId(item.id);
    setNewMonth(item.month);
    setNewDepartment(item.department || '');
    setNewTitle(item.title);
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!newTitle.trim()) {
      alert('업무 제목을 입력해주세요.');
      return;
    }

    try {
        if (editingId) {
            const itemRef = doc(db, "work_items", editingId);
            await updateDoc(itemRef, {
                month: newMonth,
                department: newDepartment,
                title: newTitle,
            });
            alert('수정되었습니다.');
        } else {
            await addDoc(collection(db, "work_items"), {
                month: newMonth,
                department: newDepartment,
                title: newTitle,
                goal: '', lessonLearned: '', status: '', why: '', plan: '',
                ownerId: userId, // Add ownerId
                createdAt: new Date()
            });
        }
        
        setIsModalOpen(false);
        setNewTitle(''); 
        setNewMonth('3월');
        setEditingId(null);

    } catch (error) {
        console.error("Error saving document: ", error);
        alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleRemoveItem = async (id: string) => {
    if(window.confirm('이 항목을 삭제하시겠습니까?')) {
        try {
            await deleteDoc(doc(db, "work_items", id));
        } catch (error) {
            console.error("Error removing document: ", error);
        }
    }
  };

  // --- Improvement Item Handlers ---
  const handleSaveImprovement = async () => {
    if (!impTarget.trim() || !impPlan.trim()) {
        alert("대상 업무와 수정 방안을 모두 입력해주세요.");
        return;
    }

    try {
        if (editingImpId) {
            const docRef = doc(db, "work_improvements", editingImpId);
            await updateDoc(docRef, {
                targetWork: impTarget,
                reason: impReason,
                plan: impPlan,
                updatedAt: new Date()
            });
            alert("수정되었습니다.");
        } else {
            await addDoc(collection(db, "work_improvements"), {
                targetWork: impTarget,
                reason: impReason,
                plan: impPlan,
                ownerId: userId, // Add ownerId
                createdAt: new Date()
            });
            alert("제출되었습니다.");
        }
        setImpTarget('');
        setImpReason('');
        setImpPlan('');
        setEditingImpId(null);
    } catch (error) {
        console.error("Error saving improvement:", error);
        alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleEditImprovement = (item: WorkImprovementItem) => {
    setImpTarget(item.targetWork);
    setImpReason(item.reason);
    setImpPlan(item.plan);
    setEditingImpId(item.id);
    document.getElementById('improvement-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteImprovement = async (id: string) => {
    if(window.confirm('정말 삭제하시겠습니까?')) {
        try {
            await deleteDoc(doc(db, "work_improvements", id));
        } catch (error) {
            console.error("Error deleting improvement:", error);
        }
    }
  };

  const handleDownloadImage = async () => {
    if (captureRef.current && window.html2canvas) {
      try {
        const canvas = await window.html2canvas(captureRef.current, {
             scale: 2,
             backgroundColor: '#ffffff'
        });
        const link = document.createElement('a');
        link.download = '2025학년도_월별_업무_추진현황.png';
        link.href = canvas.toDataURL();
        link.click();
      } catch (err) {
        console.error("Capture failed", err);
        alert("이미지 저장 실패");
      }
    }
  };

  const months = ['3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월', '1월', '2월'];

  return (
    <div className="space-y-8" ref={captureRef}>
      
      {/* Submission Notice Banner */}
      <div className="bg-white border border-indigo-100 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 p-5 flex flex-col sm:flex-row items-start gap-4">
          <div className="bg-indigo-100 p-2 rounded-full shrink-0">
            <Send className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-indigo-900">데이터 저장 및 안내</h3>
            <p className="text-indigo-800 mt-1 text-sm leading-relaxed">
              입력하신 내용은 <span className="font-bold">데이터베이스에 자동 저장</span>됩니다. <br/>
              버튼을 눌러 결과물을 저장 후 연구부장에게 보내주세요.
            </p>
          </div>
        </div>
        
        {/* Edufine Guide */}
        <div className="p-5 bg-gray-50/50">
           <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
             <HelpCircle className="w-4 h-4 text-indigo-500" />
             K-에듀파인 업무 목록 다운로드 방법
           </h4>
           <div className="text-sm text-gray-600 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <ol className="list-decimal list-inside space-y-2">
                <li><span className="font-bold text-gray-800">K-에듀파인</span> 접속 → <span className="font-bold">문서관리</span> → <span className="font-bold">기안문서함</span> 클릭</li>
                <li>기안일자 기간 설정 (<span className="bg-yellow-100 px-1 rounded">2025.03. ~ 2026.02.</span>) 후 조회</li>
                <li>문서 목록이 나오면, 목록 위의 <span className="font-bold text-green-600">엑셀(Excel) 아이콘</span> 클릭하여 파일 다운로드</li>
                <li>(선택사항) 여러 파일인 경우 하나의 엑셀 파일로 시트 내용을 합치기</li>
                <li>아래 <span className="font-bold text-indigo-600">업무 목록 업로드</span> 버튼을 눌러 파일 선택</li>
              </ol>
           </div>
        </div>
      </div>

      {/* Header & Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
              업무 되돌아보기
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              2025학년도 업무를 월별로 정리하고 부서를 기록합니다. (자동 요약 기능 포함)
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={handleSortClick}
              className="flex items-center px-4 py-2 bg-white text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-200 font-medium shadow-sm transition-colors"
            >
              <ArrowDownAZ className="w-4 h-4 mr-2" />
              월별 오름차순 정렬
            </button>

            <button
              onClick={openCreateModal}
              className="flex items-center px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-gray-50 border border-indigo-200 font-medium shadow-sm transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              수기 입력
            </button>

            <input
              type="file"
              accept=".xlsx, .xls, .csv, application/pdf, image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 border border-indigo-200 font-medium shadow-sm transition-colors"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center"><span className="animate-spin mr-2">⌛</span> 분석 및 요약 중...</span>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5 mr-2" />
                  업무 목록 업로드
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* List View (Main) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        <div className="p-5 bg-indigo-900 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">2025학년도 월별 업무 추진 현황</h3>
          <div className="text-sm opacity-80">벽방초등학교</div>
        </div>

        {workItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-gray-600 uppercase tracking-wider w-24 border-r">
                    시기 (월)
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-gray-600 uppercase tracking-wider w-32 border-r">
                    부서
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">
                    추진 업무 (주요 업무 요약)
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-sm font-bold text-gray-400 w-32 print:hidden">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-indigo-600 border-r bg-gray-50/50">
                      {item.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-medium text-gray-600 border-r">
                      {item.department || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">
                      {item.title}
                    </td>
                    <td className="px-4 py-4 text-center print:hidden">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors p-2 rounded-full"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-full"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileSpreadsheet className="w-12 h-12 mb-3 opacity-20" />
            <p>등록된 업무가 없습니다. 엑셀/PDF 파일을 업로드하거나 수기로 입력해주세요.</p>
          </div>
        )}
      </div>

      {/* Improvement Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" id="improvement-form">
         <div className="p-5 bg-teal-700 text-white flex items-center gap-2">
           <Lightbulb className="w-6 h-6" />
           <h3 className="font-bold text-lg">업무 개선 및 수정 방안</h3>
         </div>
         
         <div className="p-6 bg-gray-50 border-b border-gray-200">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">대상 업무 (무엇을)</label>
                <input 
                  type="text" 
                  value={impTarget}
                  onChange={(e) => setImpTarget(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="예: 생존수영 실기교육, 학부모 총회 운영 등"
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">수정 이유 (Why)</label>
                <textarea 
                  value={impReason}
                  onChange={(e) => setImpReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 h-24 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="변경이나 개선이 필요한 이유를 작성해주세요."
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">수정 방안 (Plan)</label>
                <textarea 
                  value={impPlan}
                  onChange={(e) => setImpPlan(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 h-24 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="구체적인 개선 방안이나 계획을 작성해주세요."
                />
             </div>
           </div>
           <div className="flex justify-end gap-2">
             {editingImpId && (
                <button 
                  onClick={() => {
                    setEditingImpId(null);
                    setImpTarget('');
                    setImpReason('');
                    setImpPlan('');
                  }}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  취소
                </button>
             )}
             <button 
               onClick={handleSaveImprovement}
               className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-md transition-all"
             >
               <Save className="w-4 h-4" />
               {editingImpId ? '수정 완료' : '제출 (저장)'}
             </button>
           </div>
         </div>

         {/* Improvement List */}
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-teal-50">
                  <tr>
                     <th className="px-6 py-3 text-left text-xs font-bold text-teal-800 uppercase w-1/4">대상 업무</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-teal-800 uppercase w-1/4">수정 이유</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-teal-800 uppercase w-1/4">수정 방안</th>
                     <th className="px-6 py-3 text-center text-xs font-bold text-teal-800 uppercase w-24">관리</th>
                  </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                  {improvements.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        등록된 개선 방안이 없습니다. 위의 양식을 작성하여 제출해주세요.
                      </td>
                    </tr>
                  ) : (
                    improvements.map(imp => (
                      <tr key={imp.id} className="hover:bg-teal-50/30">
                         <td className="px-6 py-4 align-top font-medium text-gray-800">{imp.targetWork}</td>
                         <td className="px-6 py-4 align-top text-gray-600 whitespace-pre-wrap">{imp.reason}</td>
                         <td className="px-6 py-4 align-top text-gray-600 whitespace-pre-wrap">{imp.plan}</td>
                         <td className="px-6 py-4 align-top text-center">
                            <div className="flex items-center justify-center gap-2">
                               <button 
                                 onClick={() => handleEditImprovement(imp)}
                                 className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors"
                               >
                                 <Edit className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => handleDeleteImprovement(imp.id)}
                                 className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                         </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
      
      {/* Download Button - Always Visible */}
      <div className="flex justify-end">
          <button 
            onClick={handleDownloadImage}
            className="bg-slate-700 text-white px-5 py-2.5 rounded-lg font-bold shadow hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            이미지로 저장
          </button>
      </div>

      {/* Manual Input / Edit Modal for Work Items */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">
                {editingId ? '업무 내용 수정' : '업무 수기 입력'} (2025학년도)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-indigo-700 rounded-full p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">시기 (월)</label>
                <div className="grid grid-cols-4 gap-2">
                  {months.map(m => (
                    <button
                      key={m}
                      onClick={() => setNewMonth(m)}
                      className={`py-2 text-sm rounded-md font-medium transition-all ${
                        newMonth === m 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">부서</label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                  placeholder="예: 연구부, 교무부, 행정실"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">업무 제목</label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                  placeholder="예: 학부모 총회, 생존수영 실기교육"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveItem()}
                  autoFocus
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveItem}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-all"
              >
                {editingId ? '수정 완료' : '추가하기'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkReflection;
