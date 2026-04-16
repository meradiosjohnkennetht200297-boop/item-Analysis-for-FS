/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Camera,
  Loader2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

type Option = 'A' | 'B' | 'C' | 'D';
type GroupType = 'Upper' | 'Lower' | 'Total';

interface ItemData {
  id: string;
  label: string;
  correctAnswer: Option;
  upper: Record<Option, number>;
  lower: Record<Option, number>;
  total: Record<Option, number>;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [items, setItems] = useState<ItemData[]>([
    {
      id: crypto.randomUUID(),
      label: 'Item 1',
      correctAnswer: 'A',
      upper: { A: 0, B: 0, C: 0, D: 0 },
      lower: { A: 0, B: 0, C: 0, D: 0 },
      total: { A: 0, B: 0, C: 0, D: 0 },
    }
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addItem = () => {
    const newItem: ItemData = {
      id: crypto.randomUUID(),
      label: `Item ${items.length + 1}`,
      correctAnswer: 'A',
      upper: { A: 0, B: 0, C: 0, D: 0 },
      lower: { A: 0, B: 0, C: 0, D: 0 },
      total: { A: 0, B: 0, C: 0, D: 0 },
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ItemData, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateCount = (itemId: string, group: 'upper' | 'lower' | 'total', option: Option, value: string) => {
    const numValue = parseInt(value) || 0;
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          [group]: {
            ...item[group],
            [option]: numValue
          }
        };
      }
      return item;
    }));
  };

  const resetAll = () => {
    if (confirm('Are you sure you want to reset all data?')) {
      setItems([{
        id: crypto.randomUUID(),
        label: 'Item 1',
        correctAnswer: 'A',
        upper: { A: 0, B: 0, C: 0, D: 0 },
        lower: { A: 0, B: 0, C: 0, D: 0 },
        total: { A: 0, B: 0, C: 0, D: 0 },
      }]);
    }
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: "Extract the data from this table of educational item analysis. The table contains rows for 'TOTAL', 'Upper Group', and 'Lower Group' for multiple items. For each item, extract the counts for options A, B, C, and D for each group. Also identify the correct answer if indicated (e.g., by a star, bolding, or highlight). If not indicated, default to 'A'. Return the data as a JSON array of objects.",
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                correctAnswer: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
                total: {
                  type: Type.OBJECT,
                  properties: {
                    A: { type: Type.NUMBER },
                    B: { type: Type.NUMBER },
                    C: { type: Type.NUMBER },
                    D: { type: Type.NUMBER },
                  },
                },
                upper: {
                  type: Type.OBJECT,
                  properties: {
                    A: { type: Type.NUMBER },
                    B: { type: Type.NUMBER },
                    C: { type: Type.NUMBER },
                    D: { type: Type.NUMBER },
                  },
                },
                lower: {
                  type: Type.OBJECT,
                  properties: {
                    A: { type: Type.NUMBER },
                    B: { type: Type.NUMBER },
                    C: { type: Type.NUMBER },
                    D: { type: Type.NUMBER },
                  },
                },
              },
              required: ['label', 'correctAnswer', 'total', 'upper', 'lower'],
            },
          },
        },
      });

      const extractedData = JSON.parse(response.text || '[]');
      if (extractedData.length > 0) {
        const newItems = extractedData.map((data: any) => ({
          id: crypto.randomUUID(),
          label: data.label || `Item ${items.length + 1}`,
          correctAnswer: data.correctAnswer || 'A',
          upper: {
            A: data.upper?.A || 0,
            B: data.upper?.B || 0,
            C: data.upper?.C || 0,
            D: data.upper?.D || 0,
          },
          lower: {
            A: data.lower?.A || 0,
            B: data.lower?.B || 0,
            C: data.lower?.C || 0,
            D: data.lower?.D || 0,
          },
          total: {
            A: data.total?.A || 0,
            B: data.total?.B || 0,
            C: data.total?.C || 0,
            D: data.total?.D || 0,
          },
        }));
        setItems(newItems);
      }
    } catch (error) {
      console.error("Scanning failed:", error);
      alert("Failed to scan the table. Please try again or enter data manually.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const calculateMetrics = (item: ItemData) => {
    const nUpper = Object.values(item.upper).reduce((a, b) => a + b, 0);
    const nLower = Object.values(item.lower).reduce((a, b) => a + b, 0);
    const nTotal = Object.values(item.total).reduce((a, b) => a + b, 0);

    const uCorrect = item.upper[item.correctAnswer];
    const lCorrect = item.lower[item.correctAnswer];
    const totalCorrect = item.total[item.correctAnswer];

    // Item Difficulty (P) = Total_correct / Total_N
    const difficulty = nTotal > 0 ? totalCorrect / nTotal : 0;

    // Item Discrimination (D) = (U_correct - L_correct) / N_group
    const discrimination = nUpper > 0 ? (uCorrect - lCorrect) / nUpper : 0;

    return { difficulty, discrimination, nTotal, totalCorrect };
  };

  const getAnalysis = (item: ItemData, difficulty: number, discrimination: number) => {
    let diffLabel = "";
    let diffRemark = "";
    let discLabel = "";
    let recommendation = "";
    let color = "text-gray-500";

    // Difficulty Interpretation
    if (difficulty > 0.75) {
      diffLabel = "Very easy";
      diffRemark = "(revise/discard)";
    } else if (difficulty >= 0.25) {
      diffLabel = "right difficulty";
      diffRemark = "(retain)";
    } else {
      diffLabel = "too difficult";
      diffRemark = "(revise/discard)";
    }

    // Discrimination Interpretation
    if (discrimination >= 0.46) {
      discLabel = "Positive discriminating power";
      recommendation = "Retain";
      color = "text-emerald-600";
    } else if (discrimination >= -0.50) {
      discLabel = "Could not discriminate";
      recommendation = "Revise";
      color = "text-amber-600";
    } else {
      discLabel = "Negative Discriminating power";
      recommendation = "Discard";
      color = "text-rose-600";
    }

    // Distractor Analysis
    const poorDistractors: Option[] = [];
    (['A', 'B', 'C', 'D'] as Option[]).forEach(opt => {
      if (opt !== item.correctAnswer) {
        // A distractor is poor if it attracts more or equal students from Upper than Lower
        if (item.upper[opt] >= item.lower[opt]) {
          poorDistractors.push(opt);
        }
      }
    });

    return { diffLabel, diffRemark, discLabel, recommendation, color, poorDistractors };
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-6 h-6 text-indigo-600" />
              <span className="text-xs font-mono font-bold tracking-widest text-indigo-600 uppercase">Educational Tools</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Item Analysis Pro</h1>
            <p className="text-gray-500 mt-1 max-w-2xl">
              Calculate item difficulty, discrimination, and distractor effectiveness using the 25% upper/lower group method.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleScan}
              accept="image/*"
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 border border-indigo-200 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              {isScanning ? 'Scanning...' : 'Scan Table'}
              {!isScanning && <Sparkles className="w-3 h-3 ml-1 text-indigo-400" />}
            </button>
            <button 
              onClick={resetAll}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button 
              onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </header>

        {/* Main Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-bottom border-gray-200">
                  <th className="p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider w-32">Item</th>
                  <th className="p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider w-32">Group</th>
                  <th className="p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider text-center">A</th>
                  <th className="p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider text-center">B</th>
                  <th className="p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider text-center">C</th>
                  <th className="p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider text-center">D</th>
                  <th className="p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider text-center">Correct</th>
                  <th className="p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider text-center">Difficulty</th>
                  <th className="p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider text-center">Discrimination</th>
                  <th className="p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Final Analysis</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const { difficulty, discrimination } = calculateMetrics(item);
                  const analysis = getAnalysis(item, difficulty, discrimination);
                  
                  return (
                    <React.Fragment key={item.id}>
                      {/* Total Row */}
                      <tr className="bg-gray-50/80 font-bold">
                        <td rowSpan={3} className="p-4 align-top bg-white border-b border-gray-100">
                          <input 
                            type="text" 
                            value={item.label}
                            onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                            className="w-full font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0"
                          />
                        </td>
                        <td className="p-4 text-sm uppercase tracking-wider text-gray-500">TOTAL</td>
                        {(['A', 'B', 'C', 'D'] as Option[]).map(opt => (
                          <td key={opt} className="p-2 text-center">
                            <input 
                              type="number" 
                              min="0"
                              value={item.total[opt] || ''}
                              onChange={(e) => updateCount(item.id, 'total', opt, e.target.value)}
                              className={`w-16 h-10 text-center border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${item.correctAnswer === opt ? 'bg-indigo-100 border-indigo-300 font-bold' : 'border-gray-300 bg-white/50'}`}
                            />
                          </td>
                        ))}
                        <td rowSpan={3} className="p-4 text-center align-middle bg-white border-b border-gray-100">
                          <select 
                            value={item.correctAnswer}
                            onChange={(e) => updateItem(item.id, 'correctAnswer', e.target.value as Option)}
                            className="w-16 h-10 text-center border border-indigo-200 bg-indigo-50 rounded-md font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </td>
                        <td rowSpan={3} className="p-4 text-center align-middle bg-white border-b border-gray-100">
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-mono font-bold text-gray-900">{difficulty.toFixed(2)}</span>
                            <div className="flex flex-col items-center leading-tight">
                              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{analysis.diffLabel}</span>
                              <span className="text-[9px] text-gray-400 italic">{analysis.diffRemark}</span>
                            </div>
                          </div>
                        </td>
                        <td rowSpan={3} className="p-4 text-center align-middle bg-white border-b border-gray-100">
                          <div className="flex flex-col items-center">
                            <span className={`text-lg font-mono font-bold ${analysis.color}`}>{discrimination.toFixed(2)}</span>
                            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center max-w-[100px]">{analysis.discLabel}</span>
                          </div>
                        </td>
                        <td rowSpan={3} className="p-4 align-middle bg-white border-b border-gray-100">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              {discrimination >= 0.46 ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              ) : discrimination >= -0.50 ? (
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                              )}
                              <div>
                                <div className={`text-sm font-bold ${analysis.color}`}>{analysis.recommendation}</div>
                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Status</div>
                              </div>
                            </div>
                            
                            {analysis.poorDistractors.length > 0 && (
                              <div className="pt-2 border-t border-gray-100">
                                <div className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-1">Revise Distractors:</div>
                                <div className="flex gap-1">
                                  {analysis.poorDistractors.map(opt => (
                                    <span key={opt} className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded border border-rose-100">
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td rowSpan={3} className="p-4 align-middle bg-white border-b border-gray-100">
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                            title="Remove Item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>

                      {/* Upper Group Row */}
                      <tr className="group hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-sm font-medium text-gray-600">Upper Group</td>
                        {(['A', 'B', 'C', 'D'] as Option[]).map(opt => (
                          <td key={opt} className="p-2 text-center">
                            <input 
                              type="number" 
                              min="0"
                              value={item.upper[opt] || ''}
                              onChange={(e) => updateCount(item.id, 'upper', opt, e.target.value)}
                              className={`w-16 h-10 text-center border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${item.correctAnswer === opt ? 'bg-indigo-50 border-indigo-200 font-bold' : 'border-gray-200'}`}
                            />
                          </td>
                        ))}
                      </tr>

                      {/* Lower Group Row */}
                      <tr className="group hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-sm font-medium text-gray-600">Lower Group</td>
                        {(['A', 'B', 'C', 'D'] as Option[]).map(opt => (
                          <td key={opt} className="p-2 text-center">
                            <input 
                              type="number" 
                              min="0"
                              value={item.lower[opt] || ''}
                              onChange={(e) => updateCount(item.id, 'lower', opt, e.target.value)}
                              className={`w-16 h-10 text-center border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${item.correctAnswer === opt ? 'bg-indigo-50 border-indigo-200 font-bold' : 'border-gray-200'}`}
                            />
                          </td>
                        ))}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900">Difficulty Index (P)</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex flex-col border-b border-gray-50 pb-2">
                <div className="flex justify-between"><span>0.76 - 1.00</span> <span className="font-mono font-bold text-indigo-600">Very easy</span></div>
                <div className="text-[10px] text-gray-400 uppercase font-bold italic">Remark: revise/discard</div>
              </li>
              <li className="flex flex-col border-b border-gray-50 py-2">
                <div className="flex justify-between"><span>0.25 - 0.75</span> <span className="font-mono font-bold text-indigo-600">right difficulty</span></div>
                <div className="text-[10px] text-gray-400 uppercase font-bold italic">Remark: retain</div>
              </li>
              <li className="flex flex-col pt-2">
                <div className="flex justify-between"><span>0.00 - 0.24</span> <span className="font-mono font-bold text-indigo-600">too difficult</span></div>
                <div className="text-[10px] text-gray-400 uppercase font-bold italic">Remark: revise/discard</div>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900">Discrimination Index (D)</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex flex-col border-b border-gray-50 pb-2">
                <div className="flex justify-between"><span>0.46 to 1.00</span> <span className="font-mono font-bold text-emerald-600">Positive power</span></div>
                <div className="text-[10px] text-gray-400 uppercase font-bold italic">Remark: Retain</div>
              </li>
              <li className="flex flex-col border-b border-gray-50 py-2">
                <div className="flex justify-between"><span>-0.50 to 0.45</span> <span className="font-mono font-bold text-amber-600">Could not discriminate</span></div>
                <div className="text-[10px] text-gray-400 uppercase font-bold italic">Remark: revise</div>
              </li>
              <li className="flex flex-col pt-2">
                <div className="flex justify-between"><span>-1.00 to -0.51</span> <span className="font-mono font-bold text-rose-600">Negative power</span></div>
                <div className="text-[10px] text-gray-400 uppercase font-bold italic">Remark: discard</div>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900">Distractor Analysis</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              A distractor is considered <span className="font-bold text-gray-900">functional</span> if it attracts more students from the <span className="italic">Lower Group</span> than the <span className="italic">Upper Group</span>. 
              Non-functional distractors should be revised or replaced.
            </p>
          </div>
        </div>

        {/* Export / Help */}
        <footer className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-xs font-medium uppercase tracking-widest">
          <div>© 2026 Item Analysis Pro • Educational Assessment Tool</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-indigo-600 transition-colors">Documentation</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Support</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
