// ============================================================
// 寻箱决策平台 — 决策面板组件
// 设计哲学：深海探险 × 精确数据推理
// ============================================================

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { CITIES, TREASURE_COLORS, STRATEGY_LABELS, STRATEGY_DESCS, ExploreStrategy } from "@/lib/gameEngine";
import { toast } from "sonner";

const SIGNAL_BUTTONS = [
  { value: 0, label: "无信号", color: "text-slate-400", borderColor: "border-slate-500" },
  { value: 1, label: "距离 1", color: "text-red-400", borderColor: "border-red-500" },
  { value: 2, label: "距离 2", color: "text-amber-400", borderColor: "border-amber-500" },
  { value: 3, label: "距离 3", color: "text-emerald-400", borderColor: "border-emerald-500" },
];

// 信号颜色映射
function getSignalColor(d: number): string {
  if (d === 1) return "text-red-400";
  if (d === 2) return "text-amber-400";
  if (d === 3) return "text-emerald-400";
  return "text-slate-400";
}

export default function DecisionPanel() {
  const { state, submitSense, markTreasureFound, deleteRecord, setStrategy } = useGame();
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const { currentPos, treasures, currentAdvice, moveHistory, stepCount, strategy } = state;

  const [inputPos, setInputPos] = useState(currentPos);
  // selectedSignals: [] = 无信号选中；[0] = 无信号；[1]/[2]/[3] = 单信号；[1,2]等 = 双信号
  // 用 Set 存储已选信号值，0 代表无信号
  const [selectedSignals, setSelectedSignals] = useState<Set<number>>(new Set());
  const [foundTreasure, setFoundTreasure] = useState<string>("none");
  const [activeTab, setActiveTab] = useState<"input" | "analysis" | "history">("input");

  // 切换信号选择：无信号(0)与有信号互斥；有信号最多选2个
  const toggleSignal = (val: number) => {
    setSelectedSignals(prev => {
      const next = new Set(prev);
      if (val === 0) {
        // 无信号：清除所有有信号，切换无信号
        if (next.has(0)) { next.delete(0); } else { next.clear(); next.add(0); }
      } else {
        // 有信号：先清除无信号
        next.delete(0);
        if (next.has(val)) {
          next.delete(val);
        } else {
          if (next.size >= 2) {
            // 已有2个信号，替换最早选的（取最小值替换）
            const arr = Array.from(next).sort((a, b) => a - b);
            next.delete(arr[0]);
          }
          next.add(val);
        }
      }
      return next;
    });
  };

  // 将 selectedSignals 转为 submitSense 需要的格式
  const getSignalValue = (): number[] | null => {
    if (selectedSignals.has(0) || selectedSignals.size === 0) return null;
    return Array.from(selectedSignals).sort((a, b) => a - b);
  };

  // 监听地图节点点击事件，自动填入位置并切换到输入面板
  useEffect(() => {
    const handler = (e: Event) => {
      const node = (e as CustomEvent).detail?.node;
      if (node) {
        setInputPos(node);
        setActiveTab("input");
      }
    };
    window.addEventListener("map-node-click", handler);
    return () => window.removeEventListener("map-node-click", handler);
  }, []);

  const activeTreasures = treasures.filter(t => !t.found);
  const foundTreasures = treasures.filter(t => t.found);

  const handleSubmit = () => {
    const pos = inputPos.toUpperCase().trim();
    if (!CITIES.includes(pos)) {
      toast.error(`节点 ${pos} 不在地图上，请检查输入`);
      return;
    }

    if (foundTreasure === "found") {
      // 自动判断当前位置属于哪个宝藏（候选点包含该位置的宝藏）
      const matchedTreasure = activeTreasures.find(t => t.candidates.includes(pos));
      if (!matchedTreasure) {
        toast.error(`节点 ${pos} 不在任何宝藏的候选点中，请检查输入`);
        return;
      }
      submitSense(pos, null);
      markTreasureFound(matchedTreasure.id, pos);
      toast.success(`🎉 ${matchedTreasure.id} 宝藏已在 ${pos} 找到！`);
    } else {
      const signal = getSignalValue();
      submitSense(pos, signal);
      if (signal === null) {
        toast.info(`🔇 在 ${pos} 无信号`);
      } else if (signal.length === 1) {
        toast.info(`📡 在 ${pos} 感知到距离 ${signal[0]} 的信号`);
      } else {
        toast.info(`📡 在 ${pos} 感知到双信号 ${signal[0]} 和 ${signal[1]}`);
      }
    }

    setInputPos(pos);
    setFoundTreasure("none"); // 重置为未找到
    setSelectedSignals(new Set());
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* 进度条 */}
      <div className="panel-card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[0.65rem] font-mono text-slate-400 uppercase tracking-wider">游戏进度</span>
          <span className="text-[0.65rem] font-mono text-amber-400">{foundTreasures.length}/4 宝藏</span>
        </div>
        <div className="flex gap-2">
          {treasures.map(t => (
            <div key={t.id} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${
                t.found ? "bg-amber-400" : "bg-slate-700"
              }`} />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[0.55rem] font-mono" style={{ color: TREASURE_COLORS[t.id] }}>
                  {t.id}
                </span>
                {t.found ? (
                  <span className="text-[0.5rem] text-amber-400">✓{t.foundAt}</span>
                ) : (
                  <span className="text-[0.5rem] text-slate-500">{t.candidates.length}个候选</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[0.6rem] font-mono text-slate-400">
          <span>当前位置: <span className="text-amber-400">{currentPos}</span></span>
          <span>步数: <span className="text-amber-400">{stepCount}</span></span>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-1 panel-card p-1">
        {[
          { id: "input" as const, label: "📍 输入感知" },
          { id: "analysis" as const, label: "🧠 推理分析" },
          { id: "history" as const, label: "📜 历史记录" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 rounded text-[0.65rem] font-medium transition-all ${
              activeTab === tab.id
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* 输入面板 */}
        {activeTab === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="panel-card p-3 flex flex-col gap-3"
          >
            <div>
              <label className="text-[0.6rem] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                当前位置节点
              </label>
              <input
                type="text"
                value={inputPos}
                onChange={e => setInputPos(e.target.value.toUpperCase())}
                placeholder="如 I6"
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded px-2 py-1.5 text-sm font-mono text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div>
              <label className="text-[0.6rem] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                感知信号
                <span className="ml-1 text-slate-600 normal-case">
                  {selectedSignals.size === 0 || selectedSignals.has(0)
                    ? "（单选）"
                    : selectedSignals.size === 1
                    ? "（可再选1个双信号）"
                    : "（已选2个信号）"}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SIGNAL_BUTTONS.map(btn => {
                  const isSelected = selectedSignals.has(btn.value);
                  return (
                    <button
                      key={btn.value}
                      onClick={() => toggleSignal(btn.value)}
                      className={`py-1.5 rounded border text-[0.65rem] font-mono transition-all ${
                        isSelected
                          ? `${btn.borderColor} ${btn.color} bg-current/10`
                          : "border-slate-600/40 text-slate-500 hover:border-slate-500/60"
                      }`}
                    >
                      <span className={isSelected ? btn.color : ""}>
                        {isSelected && btn.value !== 0 && "✓ "}{btn.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* 双信号预览 + 测试不足警告 */}
              {selectedSignals.size === 2 && !selectedSignals.has(0) && (
                <div className="mt-1.5 space-y-1">
                  <div className="px-2 py-1 rounded bg-blue-900/20 border border-blue-500/30 text-[0.6rem] font-mono text-blue-300">
                    双信号模式：{Array.from(selectedSignals).sort((a,b)=>a-b).map(d => `d=${d}`).join(" + ")}
                  </div>
                  <div className="px-2 py-1 rounded bg-yellow-900/20 border border-yellow-600/40 text-[0.6rem] font-mono text-yellow-400">
                    ⚠ 双信号功能测试不足，推理结果仅供参考
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[0.6rem] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                是否找到宝藏？
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setFoundTreasure("none")}
                  className={`py-1.5 rounded border text-[0.6rem] font-mono transition-all ${
                    foundTreasure === "none"
                      ? "border-slate-400 text-slate-300 bg-slate-700/30"
                      : "border-slate-600/40 text-slate-500 hover:border-slate-500/60"
                  }`}
                >
                  未找到
                </button>
                <button
                  onClick={() => setFoundTreasure("found")}
                  className={`py-1.5 rounded border text-[0.6rem] font-mono transition-all ${
                    foundTreasure === "found"
                      ? "border-amber-400 text-amber-300 bg-amber-900/30"
                      : "border-slate-600/40 text-slate-500 hover:border-slate-500/60"
                  }`}
                >
                  🎉 找到宝藏
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 hover:border-amber-400/70 rounded text-amber-400 text-sm font-medium transition-all"
            >
              提交感知结果
            </button>
          </motion.div>
        )}

        {/* 推理分析面板 */}
        {activeTab === "analysis" && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-2 overflow-y-auto"
          >
            {/* 策略选择器 */}
            <div className="panel-card p-3">
              <div className="text-[0.65rem] font-mono text-slate-400 uppercase tracking-wider mb-2">探索策略</div>
              <div className="flex gap-1.5">
                {(["aggressive", "balanced", "conservative"] as ExploreStrategy[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStrategy(s)}
                    className={`flex-1 py-1.5 rounded text-[0.6rem] font-mono font-medium border transition-all ${
                      strategy === s
                        ? s === "aggressive"
                          ? "bg-red-900/50 border-red-500/70 text-red-300"
                          : s === "balanced"
                          ? "bg-amber-900/50 border-amber-500/70 text-amber-300"
                          : "bg-blue-900/50 border-blue-500/70 text-blue-300"
                        : "bg-slate-900/30 border-slate-700/50 text-slate-500 hover:border-slate-500/70 hover:text-slate-400"
                    }`}
                    title={STRATEGY_DESCS[s]}
                  >
                    {STRATEGY_LABELS[s]}
                  </button>
                ))}
              </div>
              <div className="text-[0.55rem] text-slate-500 mt-1.5">{STRATEGY_DESCS[strategy]}</div>
            </div>

            {/* 建议移动 */}
            {currentAdvice && (
              <div className="panel-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[0.65rem] font-mono text-amber-400 uppercase tracking-wider">建议移动</span>
                  <span className={`ml-auto text-[0.55rem] px-1.5 py-0.5 rounded font-mono ${
                    currentAdvice.strategy === "direct"
                      ? "bg-emerald-900/40 text-emerald-400 border border-emerald-600/40"
                      : currentAdvice.strategy === "probe"
                      ? "bg-amber-900/40 text-amber-400 border border-amber-600/40"
                      : "bg-blue-900/40 text-blue-400 border border-blue-600/40"
                  }`}>
                    {currentAdvice.strategy === "direct" ? "直接前往" : currentAdvice.strategy === "probe" ? "踩点验证" : "感知探测"}
                  </span>
                </div>

                <div className="bg-slate-900/40 rounded p-2 mb-2">
                  <div className="text-[0.6rem] text-slate-400 mb-1">目标节点</div>
                  <div className="text-lg font-mono font-bold text-amber-400">{currentAdvice.targetNode}</div>
                </div>

                <div className="bg-slate-900/40 rounded p-2 mb-2">
                  <div className="text-[0.6rem] text-slate-400 mb-1">完整路径</div>
                  <div className="text-[0.65rem] font-mono text-blue-300 flex flex-wrap gap-1">
                    {currentAdvice.path.map((node, i) => (
                      <React.Fragment key={node}>
                        <span className={node === currentAdvice.targetNode ? "text-amber-400 font-bold" : ""}>
                          {node}
                        </span>
                        {i < currentAdvice.path.length - 1 && <span className="text-slate-600">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="text-[0.55rem] text-slate-500 mt-1">共 {currentAdvice.path.length - 1} 步</div>
                </div>

                <div className="bg-slate-900/40 rounded p-2 mb-2">
                  <div className="text-[0.6rem] text-slate-400 mb-1">推理依据</div>
                  <div className="text-[0.6rem] text-slate-300">{currentAdvice.reason}</div>
                </div>

                <div className="bg-slate-900/40 rounded p-2 mb-2">
                  <div className="text-[0.6rem] text-slate-400 mb-1">预期感知</div>
                  <div className="text-[0.6rem] text-emerald-300">{currentAdvice.expectedSignal}</div>
                </div>

                {/* 多步路线预规划 */}
                {currentAdvice.multiStepPlan && currentAdvice.multiStepPlan.length > 1 && (
                  <div className="bg-slate-900/40 rounded p-2">
                    <div className="text-[0.6rem] text-slate-400 mb-2">路线预规划</div>
                    <div className="space-y-1.5">
                      {currentAdvice.multiStepPlan.map((plan, i) => (
                        <div key={i} className={`flex items-start gap-2 p-1.5 rounded ${
                          i === 0 ? "bg-amber-900/20 border border-amber-600/30" : "bg-slate-800/40 border border-slate-700/30"
                        }`}>
                          <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[0.5rem] font-bold font-mono ${
                            i === 0 ? "bg-amber-500/30 text-amber-300" : "bg-slate-700/50 text-slate-400"
                          }`}>{plan.step}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`font-mono font-bold text-[0.65rem] ${
                                i === 0 ? "text-amber-400" : "text-slate-300"
                              }`}>{plan.targetNode}</span>
                              <span className="text-[0.5rem] text-slate-500 truncate">{plan.reason}</span>
                            </div>
                            <div className="text-[0.55rem] text-emerald-400/70">{plan.expectedSignal}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 各宝藏候选点 */}
            <div className="panel-card p-3">
              <div className="text-[0.65rem] font-mono text-slate-400 uppercase tracking-wider mb-2">候选点状态</div>
              <div className="space-y-2">
                {treasures.map(t => (
                  <div key={t.id} className="bg-slate-900/40 rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[0.65rem] font-mono font-bold" style={{ color: TREASURE_COLORS[t.id] }}>
                        {t.id}
                      </span>
                      {t.found ? (
                        <span className="text-[0.55rem] text-amber-400">✓ 已找到 @ {t.foundAt}</span>
                      ) : (
                        <span className="text-[0.55rem] text-slate-400">{t.candidates.length} 个候选点</span>
                      )}
                    </div>
                    {!t.found && (
                      <div className="flex flex-wrap gap-1">
                        {t.candidates.map(c => (
                          <span key={c} className="text-[0.55rem] font-mono px-1 py-0.5 rounded bg-slate-800 border border-slate-600/40 text-slate-300">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 历史记录面板 */}
        {activeTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="panel-card p-3 overflow-y-auto max-h-96"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.65rem] font-mono text-slate-400 uppercase tracking-wider">移动历史</span>
              <span className="text-[0.55rem] text-slate-500">点击 × 删除错误记录</span>
            </div>
            <div className="space-y-1.5">
              {[...moveHistory].map((record, originalIndex) => (
                <div
                  key={originalIndex}
                  className={`flex items-start gap-2 p-1.5 rounded text-[0.6rem] transition-all ${
                    confirmDeleteIndex === originalIndex
                      ? "bg-red-900/30 border border-red-500/50"
                      : record.treasureFound
                      ? "bg-amber-900/20 border border-amber-600/30"
                      : "bg-slate-900/30 border border-transparent"
                  }`}
                >
                  <span className="font-mono text-slate-500 shrink-0 w-5 text-right">{record.step}</span>
                  <span className={`flex-1 ${
                    confirmDeleteIndex === originalIndex ? "text-red-300" :
                    record.treasureFound ? "text-amber-300" : "text-slate-300"
                  }`}>
                    {record.action}
                  </span>
                  {record.signal !== null && !(record.signal.length === 1 && record.signal[0] === 0) && !record.treasureFound && confirmDeleteIndex !== originalIndex && (
                    <span className="shrink-0 font-mono font-bold flex gap-0.5">
                      {record.signal.map((d, i) => (
                        <span key={i} className={getSignalColor(d)}>d={d}</span>
                      ))}
                    </span>
                  )}
                  {/* 删除按钮区域（起点 step=0 不可删除） */}
                  {record.step !== 0 && (
                    confirmDeleteIndex === originalIndex ? (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => {
                            deleteRecord(originalIndex);
                            setConfirmDeleteIndex(null);
                            toast.success(`已删除步骤 ${record.step} 的记录，候选点已重新计算`);
                          }}
                          className="px-1.5 py-0.5 rounded bg-red-600/80 hover:bg-red-500 text-white text-[0.55rem] font-mono transition-all"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => setConfirmDeleteIndex(null)}
                          className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[0.55rem] font-mono transition-all"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteIndex(originalIndex)}
                        className="shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-red-900/50 text-slate-600 hover:text-red-400 transition-all text-[0.7rem] leading-none"
                        title="删除此记录"
                      >
                        ×
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
