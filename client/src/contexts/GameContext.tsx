// ============================================================
// 寻箱决策平台 — 游戏状态管理
// 设计哲学：深海探险 × 精确数据推理
// ============================================================

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import {
  Node, TreasureState, SenseRecord, DecisionAdvice,
  TREASURE_ZONES, buildAdjacency, bayesianFilter,
  generateAdvice, bfsDistance, CITIES, prioritizeTreasures,
  ExploreStrategy,
} from "@/lib/gameEngine";

export interface MoveRecord {
  step: number;
  position: Node;
  signal: number[] | null; // null=无信号；[d]=单信号；[d1,d2]=双信号
  action: string;
  treasureFound?: string;
}

export interface GameState {
  currentPos: Node;
  treasures: TreasureState[];
  senseHistory: SenseRecord[];
  moveHistory: MoveRecord[];
  stepCount: number;
  gameStarted: boolean;
  gameOver: boolean;
  currentAdvice: DecisionAdvice | null;
  strategy: ExploreStrategy;
}

interface GameContextType {
  state: GameState;
  startGame: () => void;
  resetGame: () => void;
  submitSense: (pos: Node, signal: number[] | null) => void;
  markTreasureFound: (treasureId: string, pos: Node) => void;
  deleteRecord: (stepIndex: number) => void;
  updateAdvice: () => void;
  setStrategy: (s: ExploreStrategy) => void;
  getNodeStatus: (node: Node) => NodeStatus;
  getDistanceMap: () => Map<Node, number>;
}

export type NodeStatus =
  | "inactive"
  | "active"
  | "player"
  | "treasure"
  | "candidate-T1"
  | "candidate-T2"
  | "candidate-T3"
  | "candidate-T4"
  | "candidate-high"
  | "candidate-medium"
  | "candidate-low"
  | "eliminated"
  | "path"
  | "signal-1"
  | "signal-2"
  | "signal-3";

const GameContext = createContext<GameContextType | null>(null);

const INITIAL_POS: Node = "L6";

function createInitialTreasures(): TreasureState[] {
  return Object.entries(TREASURE_ZONES).map(([id, candidates]) => ({
    id,
    candidates: [...candidates],
    found: false,
  }));
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>({
    currentPos: INITIAL_POS,
    treasures: createInitialTreasures(),
    senseHistory: [],
    moveHistory: [],
    stepCount: 0,
    gameStarted: false,
    gameOver: false,
    currentAdvice: null,
    strategy: "balanced",
  });

  const adj = useMemo(() => buildAdjacency(), []);

  const updateAdvice = useCallback(() => {
    setState(prev => {
      const advice = generateAdvice(prev.currentPos, prev.treasures, prev.senseHistory, adj, prev.strategy);
      return { ...prev, currentAdvice: advice };
    });
  }, [adj]);

  const setStrategy = useCallback((s: ExploreStrategy) => {
    setState(prev => {
      const advice = generateAdvice(prev.currentPos, prev.treasures, prev.senseHistory, adj, s);
      return { ...prev, strategy: s, currentAdvice: advice };
    });
  }, [adj]);

  const startGame = useCallback(() => {
    const initialTreasures = createInitialTreasures();
    setState(prev => {
    const advice = generateAdvice(INITIAL_POS, initialTreasures, [], adj, prev.strategy);
    return {
      currentPos: INITIAL_POS,
      treasures: initialTreasures,
      senseHistory: [],
      moveHistory: [{
        step: 0,
        position: INITIAL_POS,
        signal: null,
        action: "游戏开始，起点 L6"
      }],
      stepCount: 0,
      gameStarted: true,
      gameOver: false,
      currentAdvice: advice,
      strategy: prev.strategy,
    };
    });
  }, [adj]);

  const resetGame = useCallback(() => {
    setState(prev => ({
      currentPos: INITIAL_POS,
      treasures: createInitialTreasures(),
      senseHistory: [],
      moveHistory: [],
      stepCount: 0,
      gameStarted: false,
      gameOver: false,
      currentAdvice: null,
      strategy: prev.strategy,
    }));
  }, []);

  // 计算某条感知记录对应的“其他宝藏 minDist 集啊”
  // 用于 bayesianFilter 判断信号是否被多个宝藏共享
  //
  // 修复：只包含「已找到」宝藏的真实位置距离。
  // 未找到的宝藏候选点尚未收敛，将其 minDist 纳入计算会导致循环依赖问题：
  //   如果 T4 候选点还包含 I6，I6 距 L6 为 3步，则对 T1 计算时会认为
  //   “T4 在范围内”，导致无信号时跳过对 T1 的过滤，同时 T4 自身也因其他宝藏而被跳过。
  //
  // 已找到的宝藏位置确定，可靠地参与信号归因；
  // 未找到的宝藏不参与（其位置不确定，不能用于判断无信号的合理性）。
  const computeOtherMinDists = useCallback((
    record: SenseRecord,
    treasures: TreasureState[],
    currentTreasureId: string
  ): Map<string, number> => {
    const result = new Map<string, number>();
    const distMap = bfsDistance(record.position, CITIES, adj);
    for (const t of treasures) {
      if (t.id === currentTreasureId) continue;
      // 只包含已找到的宝藏（位置确定）
      // 未找到的宝藏不纳入，避免循环依赖问题
      if (t.found && t.foundAt) {
        const minDist = distMap.get(t.foundAt) ?? Infinity;
        if (minDist <= 3) result.set(t.id, minDist);
      }
      // 未找到的宝藏不参与 otherMinDists
    }
    return result;
  }, [adj]);

  const submitSense = useCallback((pos: Node, signal: number[] | null) => {
    setState(prev => {
      const record: SenseRecord = { position: pos, signal };

      // 更新所有宝藏的候选点
      // 只用新增记录增量过滤（t.candidates已经是之前所有历史过滤后的结果）
      const newTreasures = prev.treasures.map(t => {
        if (t.found) return t;
        // 计算其他宝藏在该感知点的 minDist（传入当前候选点状态）
        const otherMinDists = computeOtherMinDists(record, prev.treasures, t.id);
        const newCandidates = bayesianFilter(t.candidates, [record], adj, [otherMinDists]);
        return { ...t, candidates: newCandidates };
      });

      const newHistory = [...prev.senseHistory, record];
      const newStep = prev.stepCount + 1;

      const moveRecord: MoveRecord = {
        step: newStep,
        position: pos,
        signal,
        action: signal === null
          ? `移动到 ${pos}，无信号`
          : signal.length === 1
            ? `移动到 ${pos}，感知到距离 ${signal[0]}`
            : `移动到 ${pos}，感知到双信号 ${signal.join('和')}`
      };

      const newState = {
        ...prev,
        currentPos: pos,
        treasures: newTreasures,
        senseHistory: newHistory,
        moveHistory: [...prev.moveHistory, moveRecord],
        stepCount: newStep,
      };

      const advice = generateAdvice(pos, newTreasures, newHistory, adj, prev.strategy);
      return { ...newState, currentAdvice: advice };
    });
  }, [adj]);

  // 删除指定步骤的感知记录，并从初始候选点重新计算所有宝藏候选点
  const deleteRecord = useCallback((stepIndex: number) => {
    setState(prev => {
      // stepIndex 对应 moveHistory 中的索引（step=0 是起点，不可删除）
      const recordToDelete = prev.moveHistory[stepIndex];
      if (!recordToDelete || recordToDelete.step === 0) return prev;

      // 从 moveHistory 和 senseHistory 中移除该记录
      const newMoveHistory = prev.moveHistory.filter((_, i) => i !== stepIndex);
      const newSenseHistory = prev.senseHistory.filter(
        r => !(r.position === recordToDelete.position && r.signal === recordToDelete.signal)
      );

      // 重新步骤编号
      const renumberedHistory = newMoveHistory.map((r, i) => ({ ...r, step: i }));

      // 从初始候选点重新应用所有剩余感知记录（逐条增量过滤）
      const freshTreasures = createInitialTreasures().map(fresh => {
        // 保留已找到宝藏的状态
        const existing = prev.treasures.find(t => t.id === fresh.id);
        if (existing?.found) return existing;
        return fresh;
      });

      // 逐步迭代计算：每轮对所有宝藏同时应用同一条感知记录
      // 修复：与 submitSense 的增量过滤保持一致的 otherMinDists 计算基准。
      // submitSense 中，每条记录的 otherMinDists 基于“该记录应用前的候选点状态”计算。
      // 因此重算时同样应该：先快照当前候选点状态，再基于快照计算 otherMinDists，最后再过滤。
      let recomputedTreasures = freshTreasures.map(t => ({ ...t, candidates: t.found ? t.candidates : [...t.candidates] }));
      for (let ri = 0; ri < newSenseHistory.length; ri++) {
        const record = newSenseHistory[ri];
        // 快照本轮开始前的候选点状态（用于计算 otherMinDists）
        // 这与 submitSense 中使用 prev.treasures（过滤前状态）的行为保持一致
        const snapshotTreasures = recomputedTreasures;
        const nextTreasures = snapshotTreasures.map(t => {
          if (t.found) return t;
          // 基于快照（过滤前状态）计算 otherMinDists
          const otherMinDists = computeOtherMinDists(record, snapshotTreasures, t.id);
          const candidates = bayesianFilter(t.candidates, [record], adj, [otherMinDists]);
          return { ...t, candidates };
        });
        recomputedTreasures = nextTreasures;
      }

      // 更新当前位置为最新记录的位置
      const lastRecord = renumberedHistory[renumberedHistory.length - 1];
      const newPos = lastRecord?.position ?? INITIAL_POS;
      const newStep = renumberedHistory.length - 1;

      const advice = generateAdvice(newPos, recomputedTreasures, newSenseHistory, adj, prev.strategy);

      return {
        ...prev,
        currentPos: newPos,
        treasures: recomputedTreasures,
        senseHistory: newSenseHistory,
        moveHistory: renumberedHistory,
        stepCount: newStep,
        currentAdvice: advice,
      };
    });
  }, [adj]);

  const markTreasureFound = useCallback((treasureId: string, pos: Node) => {
    setState(prev => {
      const newTreasures = prev.treasures.map(t => {
        if (t.id === treasureId) {
          return { ...t, found: true, foundAt: pos, candidates: [pos] };
        }
        return t;
      });

      const foundCount = newTreasures.filter(t => t.found).length;
      const gameOver = foundCount === 4;

      const moveRecord: MoveRecord = {
        step: prev.stepCount,
        position: pos,
        signal: [0],
        action: `🎉 在 ${pos} 发现 ${treasureId} 宝藏！`,
        treasureFound: treasureId
      };

      const updatedHistory = [...prev.moveHistory];
      if (updatedHistory.length > 0) {
        updatedHistory[updatedHistory.length - 1] = {
          ...updatedHistory[updatedHistory.length - 1],
          treasureFound: treasureId,
          action: `🎉 在 ${pos} 发现 ${treasureId} 宝藏！`
        };
      } else {
        updatedHistory.push(moveRecord);
      }

      const advice = gameOver ? null : generateAdvice(pos, newTreasures, prev.senseHistory, adj, prev.strategy);

      return {
        ...prev,
        treasures: newTreasures,
        moveHistory: updatedHistory,
        gameOver,
        currentAdvice: advice,
      };
    });
  }, [adj]);

  const getNodeStatus = useCallback((node: Node): NodeStatus => {
    if (!CITIES.includes(node)) return "inactive";

    if (node === state.currentPos) return "player";

    // 检查是否是已找到的宝藏位置
    for (const t of state.treasures) {
      if (t.found && t.foundAt === node) return "treasure";
    }

    // 检查是否在建议路径上
    if (state.currentAdvice?.path.includes(node) && node !== state.currentPos) {
      return "path";
    }

    // 检查候选点状态 —— 优先按宝藏ID着色（T1/T2/T3/T4）
    const candidateTreasures = state.treasures.filter(t => !t.found && t.candidates.includes(node));
    if (candidateTreasures.length > 0) {
      // 若只属于一个宝藏，使用该宝藏的专属颜色
      if (candidateTreasures.length === 1) {
        const tid = candidateTreasures[0].id as "T1" | "T2" | "T3" | "T4";
        return `candidate-${tid}` as NodeStatus;
      }
      // 若属于多个宝藏（极少见），回退到通用颜色
      return "candidate-medium";
    }

    // 检查是否已被排除（曾经是候选点但现在不是）
    const wasCandidate = Object.values(TREASURE_ZONES).some(zone => zone.includes(node));
    if (wasCandidate) {
      const stillCandidate = state.treasures.some(t => !t.found && t.candidates.includes(node));
      if (!stillCandidate) return "eliminated";
    }

    return "active";
  }, [state]);

  const getDistanceMap = useCallback(() => {
    return bfsDistance(state.currentPos, CITIES, adj);
  }, [state.currentPos, adj]);

  return (
    <GameContext.Provider value={{
      state,
      startGame,
      resetGame,
      submitSense,
      markTreasureFound,
      deleteRecord,
      updateAdvice,
      setStrategy,
      getNodeStatus,
      getDistanceMap,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
