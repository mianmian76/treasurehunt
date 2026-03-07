// ============================================================
// 寻箱决策平台 — 核心游戏引擎
// 设计哲学：深海探险 × 精确数据推理
// 包含：BFS路径计算、贝叶斯过滤、枢纽评分、多宝藏优先级
// ============================================================

export type Node = string;

// 地图节点集合
export const CITIES: Node[] = [
  "A3","A4","A5","A6","A7",
  "B2","B3","B4","B5","B6","B7","B8",
  "C1","C2","C3","C4","C5","C6","C7","C8","C9",
  "D2","D3","D7","D8","D9",
  "E1","E2","E3","E7","E8","E9",
  "F1","F2","F3","F7","F8","F9",
  "G1","G2","G3","G7","G8","G9",
  "H1","H2","H3","H7","H8","H9",
  "I1","I2","I3","I4","I5","I6","I7","I8","I9",
  "J1","J2","J3","J4","J5","J6","J7","J8","J9",
  "K2","K3","K4","K5","K6","K7","K8",
  "L3","L4","L5","L6","L7"
];

// 道路集合
export const ROADS: [Node, Node][] = [
  ["A3","B2"],["A3","B3"],["A3","A4"],["A4","B4"],["A4","A5"],["A5","B5"],["A5","B6"],["A5","A6"],
  ["A6","B6"],["A6","A7"],["A7","B7"],["A7","B8"],["B2","C1"],["B2","C2"],["B2","B3"],["B3","C3"],
  ["B3","B4"],["B4","C3"],["B4","C4"],["B4","B5"],["B5","C5"],["B5","B6"],["B6","C6"],["B6","B7"],
  ["B7","C7"],["B7","B8"],["B8","C8"],["B8","C9"],["C1","C2"],["C2","D2"],["C2","C3"],["C3","D3"],
  ["C3","C4"],["C4","D3"],["C4","C5"],["C5","C6"],["C6","D7"],["C6","C7"],["C7","D7"],["C7","C8"],
  ["C8","D8"],["C8","C9"],["C9","D9"],["D2","E2"],["D2","E3"],["D2","D3"],["D3","E3"],["D7","E7"],
  ["D7","D8"],["D8","E8"],["D8","D9"],["D9","E9"],["E1","F1"],["E1","E2"],["E2","F2"],["E2","E3"],
  ["E3","F3"],["E7","F7"],["E7","F8"],["E7","E8"],["E8","F8"],["E8","E9"],["E9","F9"],["F1","G1"],
  ["F1","F2"],["F2","G2"],["F2","F3"],["F3","G2"],["F3","G3"],["F7","G7"],["F7","F8"],["F8","G8"],
  ["F8","F9"],["F9","G9"],["G1","H1"],["G1","G2"],["G2","H2"],["G2","G3"],["G3","H3"],["G7","H7"],
  ["G7","G8"],["G8","H8"],["G8","G9"],["G9","H9"],["H1","I1"],["H1","H2"],["H2","I2"],["H2","H3"],
  ["H3","I3"],["H7","I7"],["H7","H8"],["H8","I8"],["H8","H9"],["H9","I8"],["H9","I9"],["I1","J1"],
  ["I1","I2"],["I2","J1"],["I2","J2"],["I2","J3"],["I2","I3"],["I3","J3"],["I3","I4"],["I4","J4"],
  ["I4","I5"],["I5","J5"],["I5","I6"],["I6","J6"],["I6","I7"],["I7","J7"],["I7","I8"],["I8","J8"],
  ["I8","I9"],["I9","J9"],["J1","K2"],["J1","J2"],["J2","K2"],["J2","J3"],["J3","K3"],["J3","J4"],
  ["J4","K4"],["J4","J5"],["J5","K5"],["J5","J6"],["J6","K6"],["J6","K7"],["J6","J7"],["J7","K7"],
  ["J7","J8"],["J8","K8"],["J8","J9"],["J9","K8"],["K2","L3"],["K2","K3"],["K3","L3"],["K3","K4"],
  ["K4","L4"],["K4","K5"],["K5","L4"],["K5","L5"],["K5","K6"],["K6","L6"],["K6","K7"],["K7","L7"],
  ["K7","K8"],["K8","L7"],["L3","L4"],["L4","L5"],["L5","L6"],["L6","L7"]
];

// 宝藏候选区域
export const TREASURE_ZONES: Record<string, Node[]> = {
  T1: ["A3","B2","B3","C1","C2","C3","D2","D3","E1","E2"],
  T2: ["H2","H3","I1","I2","I3","J1","J2","J3","K2","K3","K4"],
  T3: ["A7","B7","B8","C6","C7","C8","C9","D7","D8","D9","E9"],
  T4: ["H7","H8","H9","I6","I7","I8","I9","J7","J8","J9"]
};

// 构建邻接表
export function buildAdjacency(extraNodes: Node[] = []): Map<Node, Node[]> {
  const adj = new Map<Node, Node[]>();
  const allNodes = [...CITIES, ...extraNodes];
  for (const n of allNodes) adj.set(n, []);
  for (const [a, b] of ROADS) {
    if (adj.has(a) && adj.has(b)) {
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    }
  }
  return adj;
}

// BFS最短路径距离
export function bfsDistance(start: Node, targets: Node[], adj: Map<Node, Node[]>): Map<Node, number> {
  const dist = new Map<Node, number>();
  const queue: [Node, number][] = [[start, 0]];
  const visited = new Set<Node>([start]);
  dist.set(start, 0);

  while (queue.length > 0) {
    const [cur, d] = queue.shift()!;
    for (const nb of (adj.get(cur) || [])) {
      if (!visited.has(nb)) {
        visited.add(nb);
        dist.set(nb, d + 1);
        queue.push([nb, d + 1]);
      }
    }
  }
  return dist;
}

// BFS最短路径（返回路径）
export function bfsPath(start: Node, end: Node, adj: Map<Node, Node[]>): Node[] {
  if (start === end) return [start];
  const queue: Node[][] = [[start]];
  const visited = new Set<Node>([start]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const cur = path[path.length - 1];
    for (const nb of (adj.get(cur) || [])) {
      if (!visited.has(nb)) {
        const newPath = [...path, nb];
        if (nb === end) return newPath;
        visited.add(nb);
        queue.push(newPath);
      }
    }
  }
  return [];
}

// 感知历史记录
export interface SenseRecord {
  position: Node;
  signal: number[] | null; // null = 无信号；[d] = 单信号；[d1,d2] = 双信号（两个宝藏都在感知范围内）
}

// 宝藏状态
export interface TreasureState {
  id: string;
  candidates: Node[];
  found: boolean;
  foundAt?: Node;
}

// 贝叶斯过滤：根据所有历史感知记录过滤候选点
//
// 游戏规则：
//   无信号（null）：所有宝藏距离均 >= 4。
//   单信号 [d]：感知范围内恰好有1个宝藏，距离为 d。
//   双信号 [d1, d2]（d1 <= d2）：感知范围内恰好有2个宝藏，距离分别为 d1 和 d2。
//
// 对某个宝藏 T 的候选点过滤规则（signals = 信号数组，已排序）：
//
// 无信号：排除距离 < 4 的候选点。
//
// 有信号 signals：
//   1. 排除距离 < min(signals) 的候选点（最小信号约束）
//   2. 计算过滤后 T 的 minDist：
//      - 若 minDist 在 signals 中 且 该距离值未被其他宝藏占用 → T 是该信号的唯一来源 → 只保留距离 == minDist 的候选点
//      - 若 minDist 在 signals 中 但 该距离值被其他宝藏共享 → 信号来源不确定 → 只执行约束①
//      - 若 minDist <= 3 但不在 signals 中 → T 不在感知范围内 → 排除距离 <= 3 的候选点
//      - 若 minDist > 3 → T 不在感知范围内，无额外约束
//
// otherMinDists: 同一感知点处，其他宝藏的 minDist 集合（用于判断信号是否被共享）
export function bayesianFilter(
  candidates: Node[],
  history: SenseRecord[],
  adj: Map<Node, Node[]>,
  otherMinDistsPerRecord?: Map<string, number>[] // 每条记录对应的"其他宝藏 minDist 集合"，key=距离值 stringified
): Node[] {
  let filtered = [...candidates];

  for (let ri = 0; ri < history.length; ri++) {
    const record = history[ri];
    const distMap = bfsDistance(record.position, CITIES, adj);

    if (record.signal === null) {
      // 无信号：所有宝藏距离 >= 4（或距离=0，即玩家站在该候选点上但宝藏未被感知）
      // 保留距离=0（玩家当前位置，感知规则不计距离0）和距离>=4的候选点
      // 排除距离 1-3 的候选点（这些距离的宝藏应该产生信号但没有，说明不在这里）
      filtered = filtered.filter(c => {
        const d = distMap.get(c) ?? Infinity;
        return d === 0 || d >= 4;
      });
    } else {
      const signals = [...record.signal].sort((a, b) => a - b);
      const minSignal = signals[0];

      // 约束①：排除距离 < min(signals) 的候选点
      filtered = filtered.filter(c => (distMap.get(c) ?? Infinity) >= minSignal);

      // 约束②：根据 T 的 minDist 与 signals 的关系进一步收窄
      if (filtered.length > 0) {
        const minDist = Math.min(...filtered.map(c => distMap.get(c) ?? Infinity));
        // 获取其他宝藏在该感知点的 minDist 集合（用于判断信号是否被共享）
        const otherMinDists = otherMinDistsPerRecord?.[ri];

        if (minDist <= 3) {
          if (signals.includes(minDist)) {
            // 检查该距离值是否被其他宝藏共享
            const isShared = otherMinDists ? Array.from(otherMinDists.values()).includes(minDist) : false;
            if (!isShared) {
              // T 是该信号的唯一来源 → 只保留距离 == minDist 的候选点
              filtered = filtered.filter(c => (distMap.get(c) ?? Infinity) === minDist);
            }
            // 若被共享，只执行约束①（已完成），不进一步收窄
          } else {
            // T 的 minDist <= 3 但不在信号列表中 → T 不在感知范围内
            filtered = filtered.filter(c => (distMap.get(c) ?? Infinity) > 3);
          }
        }
        // 若 minDist > 3，T 不在感知范围内，无额外约束
      }
    }
  }

  return filtered;
}

// 枢纽评分：评估某节点作为下一步感知点的价值
export interface HubScore {
  node: Node;
  totalScore: number;
  coverageCount: number;      // 能感知到的宝藏数量
  expectedElimination: number; // 预期排除候选点数
  distanceCost: number;        // 到达步数
  breakdown: string;
}

export function scoreHub(
  hubNode: Node,
  currentPos: Node,
  treasures: TreasureState[],
  adj: Map<Node, Node[]>,
  decay: number = 0.65
): HubScore {
  const distToHub = bfsDistance(currentPos, [hubNode], adj).get(hubNode) ?? Infinity;
  if (distToHub === Infinity) {
    return { node: hubNode, totalScore: 0, coverageCount: 0, expectedElimination: 0, distanceCost: Infinity, breakdown: "不可达" };
  }

  const distFromHub = bfsDistance(hubNode, CITIES, adj);
  let coverageCount = 0;
  let totalExpectedElim = 0;

  for (const t of treasures) {
    if (t.found || t.candidates.length === 0) continue;

    const minDist = Math.min(...t.candidates.map(c => distFromHub.get(c) ?? Infinity));
    if (minDist <= 3) {
      coverageCount++;
      const signalElim = t.candidates.filter(c => (distFromHub.get(c) ?? Infinity) > 3).length;
      const noSignalElim = t.candidates.filter(c => (distFromHub.get(c) ?? Infinity) <= 3).length;
      totalExpectedElim += (signalElim + noSignalElim) / 2;
    }
  }

  const decayFactor = distToHub === 0 ? 1 : Math.pow(decay, distToHub);
  // 降低 coverageCount 权重，让 totalExpectedElim（实际信息量）主导评分
  // 策略衰减系数直接影响远近选择：激进(0.5)=每多1步价值减半，保守(0.8)=每多1步价值降20%
  const infoScore = coverageCount * 0.5 + totalExpectedElim;
  const totalScore = infoScore * decayFactor;

  return {
    node: hubNode,
    totalScore,
    coverageCount,
    expectedElimination: totalExpectedElim,
    distanceCost: distToHub,
    breakdown: `覆盖${coverageCount}个宝藏，预期排除${totalExpectedElim.toFixed(1)}个候选点，需${distToHub}步`
  };
}

// 多宝藏优先级排序
export function prioritizeTreasures(
  treasures: TreasureState[],
  currentPos: Node,
  adj: Map<Node, Node[]>
): TreasureState[] {
  const distMap = bfsDistance(currentPos, CITIES, adj);

  return [...treasures]
    .filter(t => !t.found && t.candidates.length > 0)
    .sort((a, b) => {
      const minDistA = Math.min(...a.candidates.map(c => distMap.get(c) ?? Infinity));
      const minDistB = Math.min(...b.candidates.map(c => distMap.get(c) ?? Infinity));
      const scoreA = (1 / a.candidates.length) * (1 / Math.max(minDistA, 1));
      const scoreB = (1 / b.candidates.length) * (1 / Math.max(minDistB, 1));
      return scoreB - scoreA;
    });
}

// 探索策略档位
export type ExploreStrategy = "aggressive" | "balanced" | "conservative";
// 策略对应的衰减系数：激进=0.5（更重视近距离），均衡=0.65，保守=0.8（更愿意走远）
export const STRATEGY_DECAY: Record<ExploreStrategy, number> = {
  aggressive: 0.5,
  balanced: 0.65,
  conservative: 0.8,
};
export const STRATEGY_LABELS: Record<ExploreStrategy, string> = {
  aggressive: "激进",
  balanced: "均衡",
  conservative: "保守",
};
export const STRATEGY_DESCS: Record<ExploreStrategy, string> = {
  aggressive: "优先就近探索，步数最省",
  balanced: "平衡距离与信息量",
  conservative: "允许走更远获取更多信息",
};

// 多步路线计划
export interface StepPlan {
  step: number;       // 第几步（1-based）
  targetNode: Node;
  reason: string;
  expectedSignal: string;
}

// 生成决策建议
export interface DecisionAdvice {
  targetNode: Node;
  path: Node[];
  reason: string;
  expectedSignal: string;
  strategy: "direct" | "sense" | "probe";
  confidence: number; // 0-100
  multiStepPlan?: StepPlan[]; // 2-3步预规划
}

export function generateAdvice(
  currentPos: Node,
  treasures: TreasureState[],
  senseHistory: SenseRecord[],
  adj: Map<Node, Node[]>,
  strategy: ExploreStrategy = "balanced"
): DecisionAdvice | null {
  const activeTreasures = treasures.filter(t => !t.found && t.candidates.length > 0);
  if (activeTreasures.length === 0) return null;

  // 如果有宝藏100%确定（候选点=1），直接前往
  for (const t of activeTreasures) {
    if (t.candidates.length === 1) {
      const target = t.candidates[0];
      const path = bfsPath(currentPos, target, adj);
      return {
        targetNode: target,
        path,
        reason: `${t.id}位置已100%确定为${target}，直接前往`,
        expectedSignal: `到达${target}后找到${t.id}宝藏`,
        strategy: "direct",
        confidence: 100
      };
    }
  }

  // 如果有宝藏候选点≤4，直接踩点（候选点少时直接验证比感知更高效）
  // 优先选择候选点最少且距离最近的宝藏
  const distFromCurrent0 = bfsDistance(currentPos, CITIES, adj);
  const urgentTreasures = activeTreasures
    .filter(t => t.candidates.length <= 4)
    .sort((a, b) => {
      // 候选点越少越优先，相同时选距离最近的
      if (a.candidates.length !== b.candidates.length) return a.candidates.length - b.candidates.length;
      const minDistA = Math.min(...a.candidates.map(c => distFromCurrent0.get(c) ?? Infinity));
      const minDistB = Math.min(...b.candidates.map(c => distFromCurrent0.get(c) ?? Infinity));
      return minDistA - minDistB;
    });
  if (urgentTreasures.length > 0) {
    const t = urgentTreasures[0];
    // 选择距离最近的候选点，优先选未感知过的（避免死循环）
    const sensedSet = new Set<Node>(senseHistory.map(r => r.position));
    const unvisited = t.candidates.filter(c => !sensedSet.has(c));
    const pool = unvisited.length > 0 ? unvisited : t.candidates;
    const target = pool.reduce((best, c) => {
      const dBest = distFromCurrent0.get(best) ?? Infinity;
      const dC = distFromCurrent0.get(c) ?? Infinity;
      return dC < dBest ? c : best;
    });
    const path = bfsPath(currentPos, target, adj);
    return {
      targetNode: target,
      path,
      reason: `${t.id}仅剩${t.candidates.length}个候选点(${t.candidates.join("、")})，直接踩点验证`,
      expectedSignal: `若找到宝藏则完成，否则继续排查剩余候选点`,
      strategy: "probe",
      confidence: Math.round(100 / t.candidates.length)
    };
  }

  // 评估候选节点：限制在距离当前位置 5 步内，避免远距离回头路
  const decay = STRATEGY_DECAY[strategy];
  const MAX_HUB_DISTANCE = 5;
  const distFromCurrent = bfsDistance(currentPos, CITIES, adj);

  // 已感知过的节点集合（排除重复感知，除非是唯一候选点）
  const sensedNodes = new Set<Node>(senseHistory.map(r => r.position));

  const candidateHubs = new Set<Node>();
  for (const node of CITIES) {
    const d = distFromCurrent.get(node) ?? Infinity;
    if (d <= MAX_HUB_DISTANCE && !sensedNodes.has(node)) candidateHubs.add(node);
  }

  let bestHub: HubScore | null = null;
  for (const hub of Array.from(candidateHubs)) {
    const score = scoreHub(hub, currentPos, activeTreasures, adj, decay);
    if (score.totalScore > 0 && (!bestHub || score.totalScore > bestHub.totalScore)) {
      bestHub = score;
    }
  }

  // 如果 5 步内没有有效节点，扩大到全图（极少情况）
  if (!bestHub || bestHub.distanceCost === Infinity) {
    for (const t of activeTreasures) {
      for (const c of t.candidates) {
        if (!sensedNodes.has(c)) candidateHubs.add(c);
        for (const nb of (adj.get(c) || [])) {
          if (!sensedNodes.has(nb)) candidateHubs.add(nb);
        }
      }
    }
    for (const hub of Array.from(candidateHubs)) {
      const score = scoreHub(hub, currentPos, activeTreasures, adj, decay);
      if (score.totalScore > 0 && (!bestHub || score.totalScore > bestHub.totalScore)) {
        bestHub = score;
      }
    }
  }

  if (!bestHub || bestHub.distanceCost === Infinity) return null;

  const finalPath = bfsPath(currentPos, bestHub.node, adj);

  // 生成多步路线预规划：在第一步目标节点的基础上，预测两种情况下的第二步建议
  const multiStepPlan: StepPlan[] = [];
  multiStepPlan.push({
    step: 1,
    targetNode: bestHub.node,
    reason: bestHub.breakdown,
    expectedSignal: generateExpectedSignal(bestHub.node, activeTreasures, adj),
  });

  // 预测第二步：假设第一步无信号（最保守的情况）
  if (activeTreasures.length > 0) {
    // 模拟无信号过滤
    const simulatedTreasures = activeTreasures.map(t => ({
      ...t,
      candidates: bayesianFilter(t.candidates, [{ position: bestHub!.node, signal: null }], adj),
    })).filter(t => t.candidates.length > 0);

    if (simulatedTreasures.length > 0) {
      const step2Hubs = new Set<Node>();
      const distFromStep1 = bfsDistance(bestHub.node, CITIES, adj);
      for (const node of CITIES) {
        if ((distFromStep1.get(node) ?? Infinity) <= MAX_HUB_DISTANCE) step2Hubs.add(node);
      }
      let bestStep2: HubScore | null = null;
      for (const hub of Array.from(step2Hubs)) {
        const score = scoreHub(hub, bestHub!.node, simulatedTreasures, adj, decay);
        if (score.totalScore > 0 && (!bestStep2 || score.totalScore > bestStep2.totalScore)) {
          bestStep2 = score;
        }
      }
      if (bestStep2 && bestStep2.distanceCost !== Infinity) {
        multiStepPlan.push({
          step: 2,
          targetNode: bestStep2.node,
          reason: `若第一步无信号：${bestStep2.breakdown}`,
          expectedSignal: generateExpectedSignal(bestStep2.node, simulatedTreasures, adj),
        });
      }
    }
  }

  return {
    targetNode: bestHub.node,
    path: finalPath,
    reason: bestHub.breakdown,
    expectedSignal: generateExpectedSignal(bestHub.node, activeTreasures, adj),
    strategy: "sense",
    confidence: Math.min(95, Math.round(bestHub.totalScore * 10)),
    multiStepPlan,
  };
}

function generateExpectedSignal(
  node: Node,
  treasures: TreasureState[],
  adj: Map<Node, Node[]>
): string {
  const distMap = bfsDistance(node, CITIES, adj);
  const signals: string[] = [];

  for (const t of treasures) {
    const minDist = Math.min(...t.candidates.map(c => distMap.get(c) ?? Infinity));
    if (minDist <= 3) {
      signals.push(`可能感知到${t.id}的距离${minDist}信号`);
    }
  }

  return signals.length > 0 ? signals.join("；") : "可能无信号（继续缩小范围）";
}

// 节点坐标系统（用于地图渲染）
export function parseNode(node: Node): { row: number; col: number } | null {
  if (!node || node.length < 2) return null;
  const rowChar = node[0];
  const col = parseInt(node.slice(1));
  const row = rowChar.charCodeAt(0) - 'A'.charCodeAt(0);
  if (isNaN(col) || row < 0 || row > 11 || col < 1 || col > 9) return null;
  return { row, col };
}

export function nodeFromCoords(row: number, col: number): Node {
  return String.fromCharCode('A'.charCodeAt(0) + row) + col;
}

// 判断节点是否在地图上
export const CITY_SET = new Set(CITIES);
export function isValidNode(node: Node): boolean {
  return CITY_SET.has(node);
}

// 获取宝藏颜色
export const TREASURE_COLORS: Record<string, string> = {
  T1: "#e8a838",  // 琥珀金
  T2: "#38a8e8",  // 天蓝
  T3: "#38e8a8",  // 翡翠绿
  T4: "#e838a8",  // 玫瑰红
};
