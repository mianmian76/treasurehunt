// ============================================================
// 寻箱决策平台 — 核心游戏引擎
// 设计哲学：深海探险 × 精确数据推理
// 包含：BFS路径计算、贝叶斯过滤、枢纽评分、多宝藏优先级
// v5.0 优化：
//   - 修复"走远路"问题：使用单节点增益/距离^幂评分
//   - 减少回头路：路径规划时优先避开已访问节点
//   - 中途重定向：每步感知后重新评估目标
//   - 节点通达性奖励：优先选择度数高的节点（减少死胡同）
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
  const parent = new Map<Node, Node>();
  const queue: Node[] = [start];
  const visited = new Set<Node>([start]);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nb of (adj.get(cur) || [])) {
      if (!visited.has(nb)) {
        visited.add(nb);
        parent.set(nb, cur);
        if (nb === end) {
          const path: Node[] = [];
          let node: Node | undefined = end;
          while (node !== undefined) {
            path.unshift(node);
            node = parent.get(node);
          }
          return path;
        }
        queue.push(nb);
      }
    }
  }
  return [];
}

// ============================================================
// v5.0 新增：优先避开已访问节点的路径规划
//
// 策略：
// 1. 先尝试完全避开已访问节点（允许起点和终点）
// 2. 如果避开路径不超过最短路径+1步，使用避开路径
// 3. 否则使用标准BFS最短路径
//
// 这样可以在不显著增加步数的前提下，大幅减少回头路
// ============================================================
export function bfsPathPreferUnvisited(
  start: Node,
  end: Node,
  adj: Map<Node, Node[]>,
  visitedNodes: Set<Node>
): Node[] {
  if (start === end) return [start];

  // 计算最短距离
  const distFromStart = bfsDistance(start, CITIES, adj);
  const minDist = distFromStart.get(end) ?? Infinity;
  if (minDist === Infinity) return [];

  // 尝试避开已访问节点的路径
  if (visitedNodes.size > 0) {
    const avoidSet = new Set<Node>(visitedNodes);
    avoidSet.delete(start);
    avoidSet.delete(end);

    const parent = new Map<Node, Node>();
    const queue: Node[] = [start];
    const seen = new Set<Node>([start]);
    let found = false;

    while (queue.length > 0 && !found) {
      const cur = queue.shift()!;
      for (const nb of (adj.get(cur) || [])) {
        if (!seen.has(nb) && !avoidSet.has(nb)) {
          seen.add(nb);
          parent.set(nb, cur);
          if (nb === end) {
            found = true;
            break;
          }
          queue.push(nb);
        }
      }
    }

    if (found) {
      const avoidPath: Node[] = [];
      let node: Node | undefined = end;
      while (node !== undefined) {
        avoidPath.unshift(node);
        node = parent.get(node);
      }
      const avoidLen = avoidPath.length - 1;
      // 避开路径不超过最短路径+1步，使用避开路径
      if (avoidLen <= minDist + 1) {
        return avoidPath;
      }
    }
  }

  // 使用标准BFS最短路径
  return bfsPath(start, end, adj);
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
// 无信号：排除距离 1-3 的候选点（这些距离应产生信号但没有，说明宝藏不在此处）。
// 关键：无信号过滤必须考虑已找到宝藏的贡献！
// 若感知范围内已有宝藏（通过 otherMinDists 传入），则无信号不可能成立，
// 不应对 T 应用无信号过滤。
//
// 有信号 signals：
//   1. 排除距离 < min(signals) 的候选点（最小信号约束）
//   2. 计算过滤后 T 的 minDist：
//      - 若 minDist 在 signals 中 且 该距离值未被其他宝藏占用 → T 是该信号的唯一来源 → 只保留距离 == minDist 的候选点
//      - 若 minDist 在 signals 中 但 该距离值被其他宝藏共享 → 信号来源不确定 → 只执行约束①
//      - 若 minDist <= 3 但不在 signals 中 → T 不在感知范围内 → 排除距离 <= 3 的候选点
//      - 若 minDist > 3 → T 不在感知范围内，无额外约束
//   3. 信号数量约束：感知范围内宝藏数必须等于 signals.length。
//      若其他宝藏已占用了所有信号（otherInRangeCount >= signals.length），
//      则 T 不在感知范围内，应排除距离 <= 3 的候选点。
//
// otherMinDistsAll: 所有其他宝藏的候选点 minDist（用于有信号时的 isShared 和 otherInRangeCount）
// otherMinDistsConfirmed: 只包含已找到宝藏的真实位置距离（用于无信号时的 confirmedInRange）
//
// 两者分开的原因：
//   - 有信号时：需要知道"其他宝藏是否可能产生了这个信号"，必须包含未找到宝藏的候选点 minDist
//   - 无信号时：只有位置确定的宝藏（已找到）才能可靠判断是否在范围内，
//     未找到宝藏的候选点未收敛，用其 minDist 会导致循环依赖
export interface OtherMinDistsRecord {
  all: Map<string, number>;       // 所有其他宝藏的候选点 minDist（含未找到）
  confirmed: Map<string, number>; // 只含已找到宝藏的真实位置距离
}

export function bayesianFilter(
  candidates: Node[],
  history: SenseRecord[],
  adj: Map<Node, Node[]>,
  otherMinDistsPerRecord?: OtherMinDistsRecord[] // 每条记录对应的"其他宝藏 minDist 集合"
): Node[] {
  let filtered = [...candidates];

  for (let ri = 0; ri < history.length; ri++) {
    const record = history[ri];
    const distMap = bfsDistance(record.position, CITIES, adj);
    const otherRec = otherMinDistsPerRecord?.[ri];
    // 有信号时用 all（包含未找到宝藏），无信号时用 confirmed（只含已找到宝藏）
    const otherMinDistsAll = otherRec?.all;
    const otherMinDistsConfirmed = otherRec?.confirmed;
    // 其他宝藏中在感知范围内（minDist <= 3）的数量（用 all，包含未找到宝藏）
    const otherInRangeCount = otherMinDistsAll ? Array.from(otherMinDistsAll.values()).filter(d => d <= 3).length : 0;

    if (record.signal === null) {
      // 无信号：感知范围内没有任何宝藏。
      //
      // 关键：只用已找到宝藏（confirmed）判断是否有宝藏在范围内。
      // 未找到宝藏的候选点未收敛，用其 minDist 会导致循环依赖：
      //   T4未过滤 → T4 minDist=3 → 其他宝藏跳过过滤 → T4也跳过过滤
      //
      // 正确逻辑：
      //   - 若有已找到的宝藏（位置确定）在感知范围内（d<=3），则无信号是矛盾的，
      //     保守处理：不对 T 进行任何过滤。
      //   - 否则，无信号说明 T 也在感知范围外，排除距离<=3的候选点。
      const confirmedInRange = otherMinDistsConfirmed
        ? Array.from(otherMinDistsConfirmed.values()).filter(d => d <= 3).length
        : 0;
      if (confirmedInRange === 0) {
        // 没有已确认的宝藏在范围内，无信号说明 T 也在范围外
        filtered = filtered.filter(c => {
          const d = distMap.get(c) ?? Infinity;
          return d === 0 || d >= 4;
        });
      }
      // 若 confirmedInRange > 0，已找到的宝藏在范围内但无信号是矛盾的，
      // 保守处理：不对 T 进行任何过滤。
    } else {
      const signals = [...record.signal].sort((a, b) => a - b);
      const minSignal = signals[0];

      // 约束①：排除距离 < min(signals) 的候选点
      filtered = filtered.filter(c => (distMap.get(c) ?? Infinity) >= minSignal);

      // 约束②：根据 T 的 minDist 与 signals 的关系进一步收窄
      if (filtered.length > 0) {
        const minDist = Math.min(...filtered.map(c => distMap.get(c) ?? Infinity));

        if (minDist <= 3) {
          if (signals.includes(minDist)) {
            // 检查该距离值是否被其他宝藏共享（用 all，包含未找到宝藏的候选点 minDist）
            const isShared = otherMinDistsAll
              ? Array.from(otherMinDistsAll.values()).some(d => d <= minDist && d <= 3)
              : false;
            if (!isShared) {
              // T 是该信号的唯一来源 → 只保留距离 == minDist 的候选点
              filtered = filtered.filter(c => (distMap.get(c) ?? Infinity) === minDist);
            }
            // 若被共享，只执行约束①（已完成），不进一步收窄
          } else {
            // T 的 minDist <= 3 但不在信号列表中
            // 约束③：信号数量约束——如果其他宝藏已占据了所有信号，
            // 则 T 不在感知范围内，应排除距离 <= 3 的候选点。
            if (otherInRangeCount >= signals.length) {
              // 其他宝藏已占据了所有信号，T 不在感知范围内
              filtered = filtered.filter(c => (distMap.get(c) ?? Infinity) > 3);
            }
            // 若其他宝藏未占据所有信号，T 可能占据其中一个，只执行约束①
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
      const inRangeCount = t.candidates.filter(c => (distFromHub.get(c) ?? Infinity) <= 3).length;
      const outRangeCount = t.candidates.filter(c => (distFromHub.get(c) ?? Infinity) > 3).length;
      const total = t.candidates.length;
      const pSignal = total > 0 ? inRangeCount / total : 0;
      const pNoSignal = 1 - pSignal;
      const expectedElim = pSignal * outRangeCount + pNoSignal * inRangeCount;
      totalExpectedElim += expectedElim;
    }
  }

  const decayFactor = distToHub === 0 ? 1 : Math.pow(decay, distToHub);
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
// 策略对应的距离惩罚指数：激进=2.0（强烈偏好近处），均衡=1.5，保守=1.0（更愿意走远）
export const STRATEGY_DECAY: Record<ExploreStrategy, number> = {
  aggressive: 2.0,
  balanced: 1.5,
  conservative: 1.0,
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

// 计算某节点作为感知点的信息增益
// 信息增益 = Σ(各宝藏的预期候选点排除数)
function computeInfoGain(
  pos: Node,
  treasures: TreasureState[],
  adj: Map<Node, Node[]>
): number {
  const distMap = bfsDistance(pos, CITIES, adj);
  let gain = 0;
  for (const t of treasures) {
    if (t.found || t.candidates.length === 0) continue;
    const cands = t.candidates;
    const inRange = cands.filter(c => {
      const d = distMap.get(c) ?? Infinity;
      return d >= 1 && d <= 3;
    }).length;
    if (inRange === 0) continue;
    const outRange = cands.length - inRange;
    const pSignal = inRange / cands.length;
    gain += pSignal * outRange + (1 - pSignal) * inRange;
  }
  return gain;
}

// 计算路径中经过已访问节点的数量（不含起点）
function countVisitedInPath(path: Node[], visitedNodes: Set<Node>): number {
  return path.slice(1).filter(n => visitedNodes.has(n)).length;
}

// ============================================================
// v5.0 核心改进：最优感知点选择算法
//
// 问题根因：旧算法用"路径总增益/步数"评分，导致远处节点因沿途节点多
// 而总增益虚高，压制了近处高价值节点。
//
// v5.0 改进：
// 1. 使用"单节点信息增益/步数^DIST_POWER"评分（加大距离惩罚）
// 2. 限制最大搜索距离（默认8步，保守策略12步）
// 3. 引入"候选区域吸引力"：当某宝藏候选点集中在某方向时，
//    优先选择朝该方向的感知点
// 4. 节点通达性奖励：度数越高（连接越多），越不容易成为死胡同
// 5. 路径规划优先避开已访问节点（减少回头路）
//    - 如果存在不经过已访问节点的路径且不超过最短路径+1步，优先使用
//    - 否则使用标准BFS最短路径
// 6. 感知点评分时，轻微惩罚需要回头的路径
// ============================================================

export function generateAdvice(
  currentPos: Node,
  treasures: TreasureState[],
  senseHistory: SenseRecord[],
  adj: Map<Node, Node[]>,
  strategy: ExploreStrategy = "balanced"
): DecisionAdvice | null {
  const activeTreasures = treasures.filter(t => !t.found && t.candidates.length > 0);
  if (activeTreasures.length === 0) return null;

  const distFromCurrent = bfsDistance(currentPos, CITIES, adj);
  const sensedNodes = new Set<Node>(senseHistory.map(r => r.position));

  // 计算节点度数（连接边数）
  const nodeDegree = new Map<Node, number>();
  adj.forEach((neighbors, node) => {
    nodeDegree.set(node, neighbors.length);
  });

  // ── 规则1：候选点=1，100%确定，立即前往（优先避回头路）────────────────
  // 若有多个确定宝藏，选最近的
  const certainTreasures = activeTreasures.filter(t => t.candidates.length === 1);
  if (certainTreasures.length > 0) {
    const t = certainTreasures.reduce((best, cur) => {
      const dBest = distFromCurrent.get(best.candidates[0]) ?? Infinity;
      const dCur = distFromCurrent.get(cur.candidates[0]) ?? Infinity;
      return dCur < dBest ? cur : best;
    });
    const target = t.candidates[0];
    const path = bfsPathPreferUnvisited(currentPos, target, adj, sensedNodes);
    return {
      targetNode: target,
      path,
      reason: `${t.id}位置已100%确定为${target}，直接前往`,
      expectedSignal: `到达${target}后找到${t.id}宝藏`,
      strategy: "direct",
      confidence: 100
    };
  }

  // ── 规则2：候选点≤3 且最近候选点距离≤5，直接踩点验证 ───────────────
  const urgentTreasures = activeTreasures
    .filter(t => t.candidates.length <= 3)
    .sort((a, b) => {
      if (a.candidates.length !== b.candidates.length) return a.candidates.length - b.candidates.length;
      const minDistA = Math.min(...a.candidates.map(c => distFromCurrent.get(c) ?? Infinity));
      const minDistB = Math.min(...b.candidates.map(c => distFromCurrent.get(c) ?? Infinity));
      return minDistA - minDistB;
    });
  if (urgentTreasures.length > 0) {
    const t = urgentTreasures[0];
    const minDist = Math.min(...t.candidates.map(c => distFromCurrent.get(c) ?? Infinity));
    if (minDist <= 5) {
      const unvisited = t.candidates.filter(c => !sensedNodes.has(c));
      const pool = unvisited.length > 0 ? unvisited : t.candidates;
      // 优先选择：距离最近，其次度数高（减少死胡同），其次回头路少
      const target = pool.reduce((best, c) => {
        const dBest = distFromCurrent.get(best) ?? Infinity;
        const dCur = distFromCurrent.get(c) ?? Infinity;
        if (dCur !== dBest) return dCur < dBest ? c : best;
        // 距离相同时，选度数高的
        const degBest = nodeDegree.get(best) ?? 1;
        const degCur = nodeDegree.get(c) ?? 1;
        return degCur > degBest ? c : best;
      });
      const path = bfsPathPreferUnvisited(currentPos, target, adj, sensedNodes);
      return {
        targetNode: target,
        path,
        reason: `${t.id}仅剩${t.candidates.length}个候选点(${t.candidates.join("、")})，直接踩点验证`,
        expectedSignal: `若找到宝藏则完成，否则继续排查剩余候选点`,
        strategy: "probe",
        confidence: Math.round(100 / t.candidates.length)
      };
    }
  }

  // ── 规则3：v5.0 改进版感知点选择算法 ─────────────────────────────
  //
  // 核心改进：
  //   1. 使用 gain / dist^DIST_POWER 评分（加大距离惩罚）
  //   2. 节点通达性奖励（度数越高越好）
  //   3. 路径规划优先避开已访问节点
  //   4. 轻微惩罚需要回头的路径
  //
  //   策略参数：
  //   - aggressive: DIST_POWER=2.0, MAX_DIST=6  （强烈偏好近处）
  //   - balanced:   DIST_POWER=1.5, MAX_DIST=8  （均衡）
  //   - conservative: DIST_POWER=1.0, MAX_DIST=12 （允许走远）

  const DIST_POWER = STRATEGY_DECAY[strategy]; // 距离惩罚指数
  const MAX_DIST = strategy === "aggressive" ? 6 : strategy === "balanced" ? 8 : 12;

  let bestScore = -1;
  let bestTarget: Node | null = null;
  let bestPath: Node[] = [];
  let bestGain = 0;
  let bestCovered = 0;

  for (const node of CITIES) {
    if (sensedNodes.has(node)) continue;
    const dist = distFromCurrent.get(node) ?? Infinity;
    if (dist > MAX_DIST || dist === Infinity) continue;

    // 计算目标节点本身的信息增益
    const gain = computeInfoGain(node, activeTreasures, adj);
    if (gain <= 0) continue;

    // 多宝藏覆盖奖励：目标节点能感知到的宝藏数量越多，奖励越高
    const distFromNode = bfsDistance(node, CITIES, adj);
    const covered = activeTreasures.filter(t =>
      t.candidates.some(c => {
        const d = distFromNode.get(c) ?? Infinity;
        return d >= 1 && d <= 3;
      })
    ).length;
    const coverageBonus = 1 + 0.2 * covered;

    // 节点通达性奖励：度数越高，越不容易成为死胡同
    // 度数1=死胡同（惩罚），度数2=通道，度数3+=枢纽（奖励）
    const degree = nodeDegree.get(node) ?? 1;
    const degreeBonus = degree >= 3 ? 1.0 : degree === 2 ? 0.9 : 0.7;

    // 计算到达该节点的路径（优先避开已访问节点）
    const pathToNode = bfsPathPreferUnvisited(currentPos, node, adj, sensedNodes);
    const actualDist = pathToNode.length - 1;

    // 轻微回头路惩罚（每经过一个已访问节点，惩罚15%）
    const backtracks = countVisitedInPath(pathToNode, sensedNodes);
    const backtackPenalty = 1.0 / (1 + 0.15 * backtracks);

    // 综合评分
    const score = actualDist > 0
      ? (gain * coverageBonus * degreeBonus * backtackPenalty) / Math.pow(actualDist, DIST_POWER)
      : gain * coverageBonus * degreeBonus * backtackPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestTarget = node;
      bestPath = pathToNode;
      bestGain = gain;
      bestCovered = covered;
    }
  }

  // 如果在限制距离内找不到，扩大搜索范围
  if (!bestTarget) {
    for (const node of CITIES) {
      if (sensedNodes.has(node)) continue;
      const dist = distFromCurrent.get(node) ?? Infinity;
      if (dist === Infinity) continue;

      const gain = computeInfoGain(node, activeTreasures, adj);
      if (gain <= 0) continue;

      const distFromNode = bfsDistance(node, CITIES, adj);
      const covered = activeTreasures.filter(t =>
        t.candidates.some(c => {
          const d = distFromNode.get(c) ?? Infinity;
          return d >= 1 && d <= 3;
        })
      ).length;
      const coverageBonus = 1 + 0.2 * covered;
      const degree = nodeDegree.get(node) ?? 1;
      const degreeBonus = degree >= 3 ? 1.0 : degree === 2 ? 0.9 : 0.7;
      const pathToNode = bfsPathPreferUnvisited(currentPos, node, adj, sensedNodes);
      const actualDist = pathToNode.length - 1;
      const backtracks = countVisitedInPath(pathToNode, sensedNodes);
      const backtackPenalty = 1.0 / (1 + 0.15 * backtracks);

      const score = actualDist > 0
        ? (gain * coverageBonus * degreeBonus * backtackPenalty) / Math.pow(actualDist, DIST_POWER)
        : gain * coverageBonus * degreeBonus * backtackPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = node;
        bestPath = pathToNode;
        bestGain = gain;
        bestCovered = covered;
      }
    }
  }

  if (!bestTarget) return null;

  // 生成多步路线预规划
  const multiStepPlan: StepPlan[] = [];
  multiStepPlan.push({
    step: 1,
    targetNode: bestTarget,
    reason: `信息增益最优感知点（覆盖${bestCovered}个宝藏区域，增益${bestGain.toFixed(1)}，需${bestPath.length - 1}步）`,
    expectedSignal: generateExpectedSignal(bestTarget, activeTreasures, adj),
  });

  // 预测第二步（假设第一步无信号）
  const simulatedTreasures = activeTreasures.map(t => ({
    ...t,
    candidates: bayesianFilter(t.candidates, [{ position: bestTarget!, signal: null }], adj),
  })).filter(t => t.candidates.length > 0);

  if (simulatedTreasures.length > 0) {
    const distFromBest = bfsDistance(bestTarget, CITIES, adj);
    const newSensed = new Set<Node>(Array.from(sensedNodes).concat([bestTarget]));
    let bestStep2Score = -1;
    let bestStep2: Node | null = null;
    for (const node of CITIES) {
      if (newSensed.has(node)) continue;
      const dist2 = distFromBest.get(node) ?? Infinity;
      if (dist2 > MAX_DIST || dist2 === Infinity) continue;
      const gain2 = computeInfoGain(node, simulatedTreasures, adj);
      if (gain2 <= 0) continue;

      const distFromNode2 = bfsDistance(node, CITIES, adj);
      const covered2 = simulatedTreasures.filter(t =>
        t.candidates.some(c => (distFromNode2.get(c) ?? Infinity) <= 3)
      ).length;
      const bonus2 = 1 + 0.2 * covered2;
      const degree2 = nodeDegree.get(node) ?? 1;
      const degreeBonus2 = degree2 >= 3 ? 1.0 : degree2 === 2 ? 0.9 : 0.7;

      const s2 = dist2 > 0
        ? (gain2 * bonus2 * degreeBonus2) / Math.pow(dist2, DIST_POWER)
        : gain2 * bonus2 * degreeBonus2;
      if (s2 > bestStep2Score) { bestStep2Score = s2; bestStep2 = node; }
    }
    if (bestStep2) {
      multiStepPlan.push({
        step: 2,
        targetNode: bestStep2,
        reason: `若第一步无信号，继续前往信息增益最优节点`,
        expectedSignal: generateExpectedSignal(bestStep2, simulatedTreasures, adj),
      });
    }
  }

  return {
    targetNode: bestTarget,
    path: bestPath,
    reason: `信息增益最优：前往${bestTarget}（覆盖${bestCovered}个宝藏区域，增益${bestGain.toFixed(1)}，需${bestPath.length - 1}步）`,
    expectedSignal: generateExpectedSignal(bestTarget, activeTreasures, adj),
    strategy: "sense",
    confidence: Math.min(95, Math.round(bestScore * 20)),
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
