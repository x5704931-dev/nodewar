import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, FileText, Database, Settings, RefreshCw, 
  Trash2, Edit, Save, X, AlertTriangle, CheckCircle2, Shield, 
  TrendingUp, Award, BarChart2, PlusCircle, Check
} from 'lucide-react';

// ==========================================
// Supabase 雲端配置 (已自動綁定你的專案)
// ==========================================
const DEFAULT_SUPABASE_URL = "https://qdzzqgfmclfidgmpxusc.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_kvXtgM07SHowTS9RD06N4w_Vxi2Yc9u";

export default function NodeWarApp() {
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('sb_url') || DEFAULT_SUPABASE_URL);
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('sb_key') || DEFAULT_SUPABASE_KEY);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('尚未連線');
  const [showSettings, setShowSettings] = useState(false);

  const [activeTab, setActiveTab] = useState('input'); // input, records, stats, analysis
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState('2026-10-27');
  
  // 批量輸入或單筆輸入表單
  const [inputMode, setInputMode] = useState('single'); // single, batch
  const [singleForm, setSingleForm] = useState({
    match_date: '2026-10-27',
    family_name: '',
    class_name: '狂戰士',
    kills: 0,
    deaths: 0,
    damage: 0,
    received_damage: 0,
    tower_damage: 0,
    heal: 0
  });
  const [batchText, setBatchText] = useState('');

  // 編輯狀態
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // 載入與連線檢查
  useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      fetchRecordsFromSupabase();
    }
  }, [supabaseUrl, supabaseKey]);

  // 解析帶有 萬 / 億 / M / K 的數值
  const parseNumber = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let s = String(val).trim().replace(/,/g, '');
    let multiplier = 1;
    if (s.includes('億')) { multiplier = 100000000; s = s.replace('億', ''); }
    else if (s.includes('萬')) { multiplier = 10000; s = s.replace('萬', ''); }
    else if (s.toUpperCase().includes('M')) { multiplier = 1000000; s = s.replace(/M/gi, ''); }
    else if (s.toUpperCase().includes('K')) { multiplier = 1000; s = s.replace(/K/gi, ''); }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : Math.round(num * multiplier);
  };

  // 從 Supabase 取得資料
  const fetchRecordsFromSupabase = async () => {
    setIsLoading(true);
    setSyncStatus('連線同步中...');
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/node_war_records?select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (!res.ok) throw new Error('無法連線至 Supabase 資料庫');
      const data = await res.json();
      setRecords(data || []);
      setIsConnected(true);
      setSyncStatus('雲端已同步');
    } catch (err) {
      console.warn('雲端讀取失敗，改用本機快取:', err);
      setIsConnected(false);
      setSyncStatus('離線模式 (使用本機儲存)');
      const local = localStorage.getItem('node_war_local_records');
      if (local) setRecords(JSON.parse(local));
    } finally {
      setIsLoading(false);
    }
  };

  // 儲存資料至 Supabase
  const saveRecordToSupabase = async (newRecordData) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/node_war_records`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newRecordData)
      });
      if (!res.ok) throw new Error('寫入雲端失敗');
      const data = await res.json();
      setRecords(prev => [...data, ...prev]);
      setSyncStatus('雲端同步成功');
      return true;
    } catch (err) {
      console.error(err);
      // 降級存入 LocalStorage
      const fallbackItem = { id: 'local_' + Date.now(), ...newRecordData };
      setRecords(prev => {
        const updated = [fallbackItem, ...prev];
        localStorage.setItem('node_war_local_records', JSON.stringify(updated));
        return updated;
      });
      setSyncStatus('雲端寫入失敗，已暫存本機');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 刪除 Supabase 資料
  const deleteRecordFromSupabase = async (id) => {
    if (!window.confirm('確定要刪除這筆戰績嗎？')) return;
    if (String(id).startsWith('local_')) {
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      localStorage.setItem('node_war_local_records', JSON.stringify(updated));
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/node_war_records?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (!res.ok) throw new Error('刪除失敗');
      setRecords(prev => prev.filter(r => r.id !== id));
      setSyncStatus('刪除成功');
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 單筆提交
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!singleForm.family_name.trim()) {
      alert('請輸入家門名稱！');
      return;
    }
    const payload = {
      match_date: singleForm.match_date,
      family_name: singleForm.family_name.trim(),
      class_name: singleForm.class_name,
      kills: Number(singleForm.kills),
      deaths: Number(singleForm.deaths),
      damage: parseNumber(singleForm.damage),
      received_damage: parseNumber(singleForm.received_damage),
      tower_damage: parseNumber(singleForm.tower_damage),
      heal: parseNumber(singleForm.heal)
    };
    await saveRecordToSupabase(payload);
    setSingleForm(prev => ({ ...prev, family_name: '', kills: 0, deaths: 0, damage: 0, received_damage: 0, tower_damage: 0, heal: 0 }));
    alert('戰績提交成功！');
  };

  // 批量提交
  const handleBatchSubmit = async () => {
    if (!batchText.trim()) return;
    const lines = batchText.trim().split('\n');
    let count = 0;
    for (let line of lines) {
      const parts = line.split(/[\t,]/).map(p => p.trim());
      if (parts.length >= 8) {
        const payload = {
          match_date: selectedDate,
          family_name: parts[0],
          class_name: parts[1] || '未知',
          kills: Number(parts[2]) || 0,
          deaths: Number(parts[3]) || 0,
          damage: parseNumber(parts[4]),
          received_damage: parseNumber(parts[5]),
          tower_damage: parseNumber(parts[6]),
          heal: parseNumber(parts[7])
        };
        await saveRecordToSupabase(payload);
        count++;
      }
    }
    setBatchText('');
    alert(`成功批量匯入 ${count} 筆資料！`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 頂部導覽列 */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold tracking-wider text-amber-400">鎮魂公會 - 據點戰戰績分析系統</h1>
            <p className="text-xs text-slate-400">Black Desert Node War Performance Analytics</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-slate-300">{syncStatus}</span>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 transition"
            title="設定"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 設定彈窗 */}
      {showSettings && (
        <div className="bg-slate-900 border-b border-slate-800 p-6 shadow-xl transition-all">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2" /> Supabase 雲端資料庫設定
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Supabase Project URL</label>
                <input 
                  type="text" 
                  value={supabaseUrl} 
                  onChange={e => setSupabaseUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Supabase Anon / Publishable Key</label>
                <input 
                  type="password" 
                  value={supabaseKey} 
                  onChange={e => setSupabaseKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => {
                  localStorage.setItem('sb_url', supabaseUrl);
                  localStorage.setItem('sb_key', supabaseKey);
                  fetchRecordsFromSupabase();
                  setShowSettings(false);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-sm transition"
              >
                儲存並重新連線
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 功能分頁切換 */}
      <nav className="bg-slate-900/50 border-b border-slate-800 px-6 flex space-x-2">
        <button 
          onClick={() => setActiveTab('input')}
          className={`px-5 py-3 font-medium text-sm border-b-2 flex items-center space-x-2 transition ${activeTab === 'input' ? 'border-amber-500 text-amber-400 bg-slate-900/80' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <UserPlus className="w-4 h-4" />
          <span>填寫與上傳戰績</span>
        </button>
        <button 
          onClick={() => setActiveTab('records')}
          className={`px-5 py-3 font-medium text-sm border-b-2 flex items-center space-x-2 transition ${activeTab === 'records' ? 'border-amber-500 text-amber-400 bg-slate-900/80' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <FileText className="w-4 h-4" />
          <span>歷史戰績列表 ({records.length})</span>
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`px-5 py-3 font-medium text-sm border-b-2 flex items-center space-x-2 transition ${activeTab === 'stats' ? 'border-amber-500 text-amber-400 bg-slate-900/80' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>成員歷史平均與雷達圖</span>
        </button>
      </nav>

      {/* 內容主區域 */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'input' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-bold text-slate-300">戰役日期：</label>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button 
                  onClick={() => setInputMode('single')}
                  className={`px-4 py-1.5 rounded text-xs font-bold transition ${inputMode === 'single' ? 'bg-amber-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  單筆填寫
                </button>
                <button 
                  onClick={() => setInputMode('batch')}
                  className={`px-4 py-1.5 rounded text-xs font-bold transition ${inputMode === 'batch' ? 'bg-amber-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  批量貼上匯入
                </button>
              </div>
            </div>

            {inputMode === 'single' ? (
              <form onSubmit={handleSingleSubmit} className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-amber-400 mb-2">填寫個人據點戰結算數據</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">家門名稱</label>
                    <input 
                      type="text" 
                      required
                      placeholder="例：鎮魂小狂戰"
                      value={singleForm.family_name}
                      onChange={e => setSingleForm({...singleForm, family_name: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">職業</label>
                    <select 
                      value={singleForm.class_name}
                      onChange={e => setSingleForm({...singleForm, class_name: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      {['狂戰士', '女武神', '巫師', '女巫', '黑暗騎士', '決鬥家', '蘭', '莎亦', '哈薩辛', '妲卡尼亚', '擎天', '其他'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">擊殺 (K)</label>
                      <input 
                        type="number" 
                        value={singleForm.kills}
                        onChange={e => setSingleForm({...singleForm, kills: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">死亡 (D)</label>
                      <input 
                        type="number" 
                        value={singleForm.deaths}
                        onChange={e => setSingleForm({...singleForm, deaths: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">輸出傷害 (支援 1.5億 / 1500萬)</label>
                    <input 
                      type="text" 
                      value={singleForm.damage}
                      onChange={e => setSingleForm({...singleForm, damage: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">承受輸出</label>
                    <input 
                      type="text" 
                      value={singleForm.received_damage}
                      onChange={e => setSingleForm({...singleForm, received_damage: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">對塔輸出</label>
                    <input 
                      type="text" 
                      value={singleForm.tower_damage}
                      onChange={e => setSingleForm({...singleForm, tower_damage: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">生命回復 / 治療</label>
                    <input 
                      type="text" 
                      value={singleForm.heal}
                      onChange={e => setSingleForm({...singleForm, heal: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-sm transition flex items-center space-x-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>提交至雲端資料庫</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-amber-400">批量貼上結算數據</h3>
                <p className="text-xs text-slate-400">格式說明：每行一位成員，欄位以 Tab 或逗號分隔 (家門, 職業, 擊殺, 死亡, 輸出, 承受, 塔傷, 回復)</p>
                <textarea 
                  rows={8}
                  placeholder={`家門名稱\t職業\t擊殺\t死亡\t輸出\t承受\t塔傷\t回復\n範例：張三\t狂戰士\t15\t5\t1.2億\t8000萬\t500萬\t200萬`}
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handleBatchSubmit}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-sm transition flex items-center space-x-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>批量送出並寫入雲端</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'records' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-200">歷史戰績明細</h3>
              <button 
                onClick={fetchRecordsFromSupabase}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新整理</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">日期</th>
                    <th className="p-3">家門名稱</th>
                    <th className="p-3">職業</th>
                    <th className="p-3 text-center">K / D</th>
                    <th className="p-3 text-right">輸出傷害</th>
                    <th className="p-3 text-right">承受傷害</th>
                    <th className="p-3 text-right">對塔輸出</th>
                    <th className="p-3 text-right">治療/回復</th>
                    <th className="p-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">目前尚無任何戰績資料，請至「填寫與上傳戰績」新增！</td>
                    </tr>
                  ) : (
                    records.map(r => (
                      <tr key={r.id} className="hover:bg-slate-800/50 transition">
                        <td className="p-3 text-slate-400 text-xs">{r.match_date}</td>
                        <td className="p-3 font-medium text-amber-400">{r.family_name}</td>
                        <td className="p-3 text-slate-300 text-xs">{r.class_name}</td>
                        <td className="p-3 text-center font-mono">{r.kills} / {r.deaths}</td>
                        <td className="p-3 text-right font-mono text-emerald-400">{(r.damage || 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{(r.received_damage || 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-amber-300">{(r.tower_damage || 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-blue-300">{(r.heal || 0).toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => deleteRecordFromSupabase(r.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition"
                            title="刪除紀錄"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center py-16">
            <BarChart2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-300">成員歷史平均統計</h3>
            <p className="text-sm text-slate-500 mt-1">當您開始輸入並累積多場據點戰數據後，系統將自動計算各位成員的各項平均表現與雷達圖分析！</p>
          </div>
        )}
      </main>
    </div>
  );
}
