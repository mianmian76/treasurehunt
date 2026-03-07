// ============================================================
// 寻箱决策平台 — 主页面
// 设计哲学：深海探险 × 精确数据推理
// 布局：左侧地图(60%) + 右侧决策面板(40%)
// ============================================================

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameProvider, useGame } from "@/contexts/GameContext";
import TreasureMap from "@/components/TreasureMap";
import DecisionPanel from "@/components/DecisionPanel";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663408463158/Es6DbMBYzgzeArssDosATH/hero-bg-9JDxdDiSqkF4HJAL3WdqGK.webp";
const TREASURE_CHEST = "https://d2xsxph8kpxj0f.cloudfront.net/310519663408463158/Es6DbMBYzgzeArssDosATH/treasure-chest-gB8KRs3LyuoxtrumCxgWuA.webp";

function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${HERO_BG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 暗色遮罩 */}
      <div className="absolute inset-0 bg-slate-950/70" />

      {/* 内容 */}
      <div className="relative z-10 text-center max-w-2xl px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.img
            src={TREASURE_CHEST}
            alt="宝藏"
            className="w-32 h-32 mx-auto mb-6 object-contain"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.h1
          className="text-4xl md:text-5xl font-bold mb-3 text-amber-400"
          style={{ fontFamily: "'Cinzel', serif" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          寻箱决策平台
        </motion.h1>

        <motion.p
          className="text-slate-300 text-base mb-2"
          style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Treasure Hunt Decision Engine v2.0
        </motion.p>

        <motion.p
          className="text-slate-400 text-sm mb-8 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          基于 BFS 最短路径 + 贝叶斯过滤推理的智能决策助手<br />
          帮助你以最少步数找到全部 4 个宝藏
        </motion.p>

        {/* 特性卡片 */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {[
            { icon: "🗺️", title: "交互地图", desc: "实时可视化候选点与路径" },
            { icon: "🧠", title: "贝叶斯推理", desc: "累积约束精确定位宝藏" },
            { icon: "⚡", title: "枢纽评分", desc: "最大化信息量/步数比" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-amber-400 text-xs font-medium mb-1" style={{ fontFamily: "'Cinzel', serif" }}>{title}</div>
              <div className="text-slate-400 text-[0.6rem]">{desc}</div>
            </div>
          ))}
        </motion.div>

        <motion.button
          onClick={onStart}
          className="px-8 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 hover:border-amber-400 rounded-lg text-amber-400 text-base font-medium transition-all"
          style={{ fontFamily: "'Cinzel', serif" }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          开始游戏
        </motion.button>

        <motion.p
          className="text-slate-500 text-[0.65rem] mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          起点固定为 L6 · 地图 12行(A-L) × 9列(1-9) · 共 4 个宝藏
        </motion.p>
      </div>
    </div>
  );
}

function GamePage() {
  const { state, resetGame } = useGame();
  const foundCount = state.treasures.filter(t => t.found).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.14 0.04 240)" }}>
      {/* 顶部导航栏 */}
      <header className="border-b border-slate-700/50 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src={TREASURE_CHEST} alt="logo" className="w-7 h-7 object-contain" />
          <h1 className="text-amber-400 font-bold text-sm" style={{ fontFamily: "'Cinzel', serif" }}>
            寻箱决策平台
          </h1>
          <span className="text-slate-500 text-[0.6rem] font-mono">v2.0</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {state.treasures.map(t => (
              <div
                key={t.id}
                className={`w-6 h-6 rounded flex items-center justify-center text-[0.6rem] font-mono font-bold border transition-all ${
                  t.found
                    ? "bg-amber-500/30 border-amber-400/60 text-amber-300"
                    : "bg-slate-800/60 border-slate-600/40 text-slate-500"
                }`}
              >
                {t.found ? "★" : t.id.replace("T", "")}
              </div>
            ))}
          </div>
          <span className="text-slate-400 text-[0.65rem] font-mono">步数: <span className="text-amber-400">{state.stepCount}</span></span>
          <button
            onClick={resetGame}
            className="text-[0.65rem] text-slate-400 hover:text-slate-300 border border-slate-600/40 hover:border-slate-500/60 px-2 py-1 rounded transition-all"
          >
            重新开始
          </button>
        </div>
      </header>

      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：地图区域 */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="max-w-2xl mx-auto">
            <div className="panel-card p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[0.65rem] font-mono text-slate-400 uppercase tracking-wider">探险地图</span>
                <span className="text-[0.6rem] font-mono text-slate-500">12行(A-L) × 9列(1-9)</span>
              </div>
              <TreasureMap />
            </div>

            {/* 策略说明 */}
            <div className="panel-card p-3 mt-3">
              <div className="text-[0.65rem] font-mono text-slate-400 uppercase tracking-wider mb-2">决策策略说明</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { color: "text-emerald-400", label: "高概率候选", desc: "仅剩1个候选点" },
                  { color: "text-amber-400", label: "候选点", desc: "2-4个候选点" },
                  { color: "text-blue-400", label: "建议路径", desc: "AI推荐移动路线" },
                  { color: "text-slate-400", label: "已排除", desc: "贝叶斯过滤排除" },
                ].map(({ color, label, desc }) => (
                  <div key={label} className="flex items-start gap-1.5">
                    <span className={`text-[0.6rem] font-mono ${color} shrink-0`}>■</span>
                    <div>
                      <div className={`text-[0.6rem] font-medium ${color}`}>{label}</div>
                      <div className="text-[0.55rem] text-slate-500">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：决策面板 */}
        <div className="w-80 shrink-0 border-l border-slate-700/50 p-3 overflow-y-auto">
          <DecisionPanel />
        </div>
      </div>

      {/* 游戏结束弹窗 */}
      <AnimatePresence>
        {state.gameOver && (
          <motion.div
            className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="panel-card p-8 max-w-md w-full mx-4 text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <motion.img
                src={TREASURE_CHEST}
                alt="宝藏"
                className="w-24 h-24 mx-auto mb-4 object-contain"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
              />
              <h2 className="text-2xl font-bold text-amber-400 mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
                恭喜通关！
              </h2>
              <p className="text-slate-300 text-sm mb-4">
                你用 <span className="text-amber-400 font-bold text-lg">{state.stepCount}</span> 步找到了全部 4 个宝藏！
              </p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {state.treasures.map(t => (
                  <div key={t.id} className="bg-amber-900/20 border border-amber-600/30 rounded p-2">
                    <div className="text-amber-400 font-mono font-bold text-sm">{t.id}</div>
                    <div className="text-slate-300 text-xs font-mono">{t.foundAt}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={resetGame}
                className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 hover:border-amber-400/70 rounded text-amber-400 font-medium transition-all"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                再来一局
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GameContent() {
  const { state, startGame } = useGame();

  if (!state.gameStarted) {
    return <LandingPage onStart={startGame} />;
  }

  return <GamePage />;
}

export default function Home() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
