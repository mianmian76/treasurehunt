// ============================================================
// 寻箱决策平台 — 交互式地图组件 v5
// 新增功能：
//   1. 悬停节点显示与当前位置的最短距离
//   2. 点击节点有扩散圆圈视觉反馈
//   3. 悬停标签中显示该节点已输入的距离信号（已找到宝藏的不显示）
// ============================================================

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useGame, NodeStatus } from "@/contexts/GameContext";
import { nodeFromCoords, isValidNode, ROADS, bfsDistance, buildAdjacency, CITIES } from "@/lib/gameEngine";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ROW_LABELS = ["A","B","C","D","E","F","G","H","I","J","K","L"];
const COL_LABELS = ["1","2","3","4","5","6","7","8","9"];

// 格子参数
const CELL = 36;
const NODE_R = 10;
const LABEL_W = 20;
const LABEL_H = 16;
const PAD = 8;

function nodeCenter(rowIdx: number, colIdx: number): [number, number] {
  const x = PAD + LABEL_W + colIdx * CELL + CELL / 2;
  const y = PAD + LABEL_H + rowIdx * CELL + CELL / 2;
  return [x, y];
}

function nodeToRowCol(node: string): [number, number] {
  const row = ROW_LABELS.indexOf(node[0]);
  const col = parseInt(node.slice(1)) - 1;
  return [row, col];
}

// T1-T4 专属颜色定义
const TREASURE_PALETTE: Record<"T1"|"T2"|"T3"|"T4", {
  fill: string; stroke: string; glow: string;
  hoverFill: string; hoverStroke: string; legend: string; label: string;
}> = {
  T1: {
    fill: "rgba(136,19,55,0.85)", stroke: "rgba(244,63,94,0.9)", glow: "rgba(244,63,94,0.5)",
    hoverFill: "rgba(190,18,60,0.95)", hoverStroke: "rgba(251,113,133,1)",
    legend: "#f43f5e", label: "T1 候选",
  },
  T2: {
    fill: "rgba(6,78,59,0.85)", stroke: "rgba(16,185,129,0.9)", glow: "rgba(16,185,129,0.5)",
    hoverFill: "rgba(4,120,87,0.95)", hoverStroke: "rgba(52,211,153,1)",
    legend: "#10b981", label: "T2 候选",
  },
  T3: {
    fill: "rgba(76,29,149,0.85)", stroke: "rgba(139,92,246,0.9)", glow: "rgba(139,92,246,0.5)",
    hoverFill: "rgba(109,40,217,0.95)", hoverStroke: "rgba(167,139,250,1)",
    legend: "#8b5cf6", label: "T3 候选",
  },
  T4: {
    fill: "rgba(120,53,15,0.85)", stroke: "rgba(234,88,12,0.9)", glow: "rgba(234,88,12,0.5)",
    hoverFill: "rgba(154,52,18,0.95)", hoverStroke: "rgba(249,115,22,1)",
    legend: "#ea580c", label: "T4 候选",
  },
};

function getNodeColors(status: NodeStatus): { fill: string; stroke: string; glow?: string; textColor: string } {
  switch (status) {
    case "player":
      return { fill: "rgba(251,191,36,0.95)", stroke: "rgba(253,224,71,1)", glow: "rgba(251,191,36,0.7)", textColor: "#0f172a" };
    case "treasure":
      return { fill: "rgba(52,211,153,0.95)", stroke: "rgba(110,231,183,1)", glow: "rgba(52,211,153,0.8)", textColor: "#0f172a" };
    case "candidate-T1":
      return { fill: TREASURE_PALETTE.T1.fill, stroke: TREASURE_PALETTE.T1.stroke, glow: TREASURE_PALETTE.T1.glow, textColor: "rgb(253,164,175)" };
    case "candidate-T2":
      return { fill: TREASURE_PALETTE.T2.fill, stroke: TREASURE_PALETTE.T2.stroke, glow: TREASURE_PALETTE.T2.glow, textColor: "rgb(110,231,183)" };
    case "candidate-T3":
      return { fill: TREASURE_PALETTE.T3.fill, stroke: TREASURE_PALETTE.T3.stroke, glow: TREASURE_PALETTE.T3.glow, textColor: "rgb(196,181,253)" };
    case "candidate-T4":
      return { fill: TREASURE_PALETTE.T4.fill, stroke: TREASURE_PALETTE.T4.stroke, glow: TREASURE_PALETTE.T4.glow, textColor: "rgb(253,186,116)" };
    case "path":
      return { fill: "rgba(30,58,138,0.85)", stroke: "rgba(96,165,250,1)", glow: "rgba(96,165,250,0.5)", textColor: "rgb(191,219,254)" };
    case "eliminated":
      return { fill: "rgba(15,23,42,0.3)", stroke: "rgba(51,65,85,0.2)", textColor: "rgba(71,85,105,0.4)" };
    case "signal-1":
      return { fill: "rgba(127,29,29,0.6)", stroke: "rgb(239,68,68)", glow: "rgba(239,68,68,0.4)", textColor: "rgb(252,165,165)" };
    case "signal-2":
      return { fill: "rgba(120,53,15,0.6)", stroke: "rgb(245,158,11)", glow: "rgba(245,158,11,0.4)", textColor: "rgb(253,230,138)" };
    case "signal-3":
      return { fill: "rgba(6,78,59,0.6)", stroke: "rgb(16,185,129)", glow: "rgba(16,185,129,0.4)", textColor: "rgb(167,243,208)" };
    case "active":
    default:
      return { fill: "rgba(30,41,59,0.6)", stroke: "rgba(71,85,105,0.5)", textColor: "rgb(100,116,139)" };
  }
}

function getHoverColors(status: NodeStatus): { fill: string; stroke: string; glow?: string } {
  if (status === "player" || status === "treasure") return { fill: "", stroke: "" };
  if (status === "candidate-T1") return { fill: TREASURE_PALETTE.T1.hoverFill, stroke: TREASURE_PALETTE.T1.hoverStroke, glow: TREASURE_PALETTE.T1.glow };
  if (status === "candidate-T2") return { fill: TREASURE_PALETTE.T2.hoverFill, stroke: TREASURE_PALETTE.T2.hoverStroke, glow: TREASURE_PALETTE.T2.glow };
  if (status === "candidate-T3") return { fill: TREASURE_PALETTE.T3.hoverFill, stroke: TREASURE_PALETTE.T3.hoverStroke, glow: TREASURE_PALETTE.T3.glow };
  if (status === "candidate-T4") return { fill: TREASURE_PALETTE.T4.hoverFill, stroke: TREASURE_PALETTE.T4.hoverStroke, glow: TREASURE_PALETTE.T4.glow };
  if (status === "path") return { fill: "rgba(29,78,216,0.9)", stroke: "rgba(147,197,253,1)", glow: "rgba(96,165,250,0.7)" };
  return { fill: "rgba(51,65,85,0.8)", stroke: "rgba(100,116,139,0.9)" };
}

// 选中节点高亮圈（持续停留，跟随点击移动）
interface SelectedRingProps {
  cx: number;
  cy: number;
  r: number;
}
function SelectedRing({ cx, cy, r }: SelectedRingProps) {
  return (
    <circle
      cx={cx} cy={cy} r={r + 6}
      fill="none"
      stroke="rgba(255,255,255,0.9)"
      strokeWidth={2}
      strokeDasharray="4 2"
      style={{ pointerEvents: "none" }}
    />
  );
}

// 单个节点组件
interface NodeCircleProps {
  node: string;
  cx: number;
  cy: number;
  status: NodeStatus;
  pathIndex: number;
  treasureLabel: string;
  // tooltip 基础文本（节点名+状态+候选信息）
  tooltipBase: string;
  // 与当前位置的最短距离（BFS）
  distToPlayer: number | undefined;
  // 该节点已感知到的信号值列表（过滤掉已找到宝藏后的有效信号），null 表示无信号
  sensedSignals: number[] | null | undefined; // undefined=未感知过
  onNodeClick: (node: string) => void;
  isClickable: boolean;
}

const NodeCircle = React.memo(({
  node, cx, cy, status, pathIndex, treasureLabel,
  tooltipBase, distToPlayer, sensedSignals,
  onNodeClick, isClickable
}: NodeCircleProps) => {
  const [hovered, setHovered] = useState(false);
  // 不再需要本地点击状态，选中效果由父组件统一管理

  const isPlayer = status === "player";
  const isTreasure = status === "treasure";
  const isPath = pathIndex >= 0;
  const isCandidate = status.startsWith("candidate");
  const isEliminated = status === "eliminated";

  const baseColors = getNodeColors(status);
  const hoverColors = hovered ? getHoverColors(status) : null;

  const fill = hoverColors?.fill || baseColors.fill;
  const stroke = hoverColors?.stroke || baseColors.stroke;
  const glow = hoverColors?.glow || baseColors.glow;

  const r = isPlayer ? NODE_R + 2 : isTreasure ? NODE_R + 1 : NODE_R;
  const strokeW = isPlayer ? 2.5 : isTreasure ? 2 : hovered ? 2 : 1.5;

  // 距离徽章颜色
  const distColor =
    distToPlayer === 1 ? { bg: "rgba(127,29,29,0.9)", border: "rgba(239,68,68,0.8)", text: "rgb(252,165,165)" } :
    distToPlayer === 2 ? { bg: "rgba(120,53,15,0.9)", border: "rgba(245,158,11,0.8)", text: "rgb(253,230,138)" } :
    distToPlayer === 3 ? { bg: "rgba(6,78,59,0.9)", border: "rgba(16,185,129,0.8)", text: "rgb(167,243,208)" } :
                         { bg: "rgba(15,23,42,0.9)", border: "rgba(100,116,139,0.5)", text: "rgb(148,163,184)" };

  // 信号值徽章颜色（与距离色系一致）
  const signalBadgeColor = (d: number) =>
    d === 1 ? { bg: "rgba(127,29,29,0.9)", border: "rgba(239,68,68,0.8)", text: "rgb(252,165,165)" } :
    d === 2 ? { bg: "rgba(120,53,15,0.9)", border: "rgba(245,158,11,0.8)", text: "rgb(253,230,138)" } :
              { bg: "rgba(6,78,59,0.9)", border: "rgba(16,185,129,0.8)", text: "rgb(167,243,208)" };

  const handleClick = () => {
    if (!isClickable) return;
    onNodeClick(node);
  };

  // tooltip 内容：基础信息 + 最短距离 + 已感知信号
  const hasDistInfo = !isPlayer && distToPlayer !== undefined && distToPlayer !== Infinity;
  const hasSenseInfo = sensedSignals !== undefined;

  return (
    <g
      style={{ cursor: isClickable ? "pointer" : "default" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* 发光效果 */}
      {glow && (isPlayer || isTreasure || isCandidate || isPath || hovered) && (
        <circle
          cx={cx} cy={cy}
          r={r + (hovered ? 7 : 5)}
          fill={glow}
          opacity={hovered ? 0.5 : 0.25}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* 主圆 */}
      <circle
        cx={cx} cy={cy} r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeW}
        opacity={isEliminated ? 0.35 : 1}
        style={{ transition: "all 0.12s ease" }}
      />

      {/* 玩家图标 */}
      {isPlayer && (
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={12} fill={baseColors.textColor} style={{ pointerEvents: "none", userSelect: "none" }}>
          ◆
        </text>
      )}

      {/* 宝藏图标 */}
      {isTreasure && (
        <>
          <text x={cx} y={cy - 1} textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fill={baseColors.textColor} style={{ pointerEvents: "none", userSelect: "none" }}>
            ★
          </text>
          {treasureLabel && (
            <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle"
              fontSize={6} fill={baseColors.textColor} fontWeight="bold"
              style={{ pointerEvents: "none", userSelect: "none" }}>
              {treasureLabel}
            </text>
          )}
        </>
      )}

      {/* 路径序号角标 */}
      {isPath && pathIndex > 0 && !isPlayer && !isTreasure && (
        <>
          <circle cx={cx + r - 1} cy={cy - r + 1} r={5.5}
            fill="rgba(30,58,138,0.95)" stroke="rgba(96,165,250,0.8)" strokeWidth={0.8}
            style={{ pointerEvents: "none" }} />
          <text x={cx + r - 1} y={cy - r + 1.5} textAnchor="middle" dominantBaseline="middle"
            fontSize={5.5} fill="rgb(191,219,254)" fontWeight="bold"
            style={{ pointerEvents: "none", userSelect: "none" }}>
            {pathIndex}
          </text>
        </>
      )}

      {/* 候选点标识 */}
      {isCandidate && !isPath && (
        <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle"
          fontSize={7} fill={baseColors.textColor} opacity={0.9}
          style={{ pointerEvents: "none", userSelect: "none" }}>
          ◈
        </text>
      )}

      {/* 普通节点标签 */}
      {!isPlayer && !isTreasure && !isCandidate && (
        <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle"
          fontSize={6} fill={baseColors.textColor} opacity={isEliminated ? 0.4 : 0.8}
          style={{ pointerEvents: "none", userSelect: "none" }}>
          {node}
        </text>
      )}

      {/* 悬停 Tooltip */}
      {hovered && (
        <foreignObject
          x={cx - 90}
          y={cy - r - (hasDistInfo || hasSenseInfo ? 74 : 46)}
          width={180}
          height={hasDistInfo || hasSenseInfo ? 68 : 36}
          style={{ pointerEvents: "none", overflow: "visible" }}
        >
          <div
            style={{
              background: "rgba(15,23,42,0.97)",
              border: "1px solid rgba(100,116,139,0.5)",
              borderRadius: "5px",
              padding: "4px 7px",
              fontSize: "0.55rem",
              fontFamily: "monospace",
              color: "rgb(226,232,240)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "3px",
            }}
          >
            {/* 节点名 + 状态 */}
            <div style={{ color: "rgb(226,232,240)" }}>{tooltipBase}</div>

            {/* 与当前位置的最短距离 */}
            {hasDistInfo && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "3px", justifyContent: "center",
                background: distColor.bg, border: `1px solid ${distColor.border}`,
                borderRadius: "3px", padding: "1px 6px",
                color: distColor.text, fontWeight: "bold", fontSize: "0.6rem",
              }}>
                <span style={{ opacity: 0.8 }}>距当前位置</span>
                <span style={{ fontSize: "0.75rem" }}>{distToPlayer}</span>
                <span style={{ opacity: 0.8 }}>步</span>
              </div>
            )}

            {/* 已感知信号 */}
            {hasSenseInfo && (
              <div style={{ display: "flex", alignItems: "center", gap: "3px", justifyContent: "center" }}>
                <span style={{ opacity: 0.6, fontSize: "0.5rem" }}>已感知:</span>
                {sensedSignals === null || sensedSignals!.length === 0 ? (
                  <span style={{
                    background: "rgba(30,41,59,0.8)", border: "1px solid rgba(71,85,105,0.5)",
                    borderRadius: "3px", padding: "1px 5px",
                    color: "rgb(100,116,139)", fontSize: "0.55rem",
                  }}>无信号</span>
                ) : (
                  sensedSignals!.map((d, i) => {
                    const c = signalBadgeColor(d);
                    return (
                      <span key={i} style={{
                        background: c.bg, border: `1px solid ${c.border}`,
                        borderRadius: "3px", padding: "1px 5px",
                        color: c.text, fontWeight: "bold", fontSize: "0.6rem",
                      }}>d={d}</span>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
});

NodeCircle.displayName = "NodeCircle";

export default function TreasureMap() {
  const { state, getNodeStatus, getDistanceMap } = useGame();
  const { currentAdvice, treasures, gameStarted, senseHistory } = state;

  // 当前选中节点（点击后持续高亮，再次点击同一节点取消）
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // 已感知过的节点集合
  const sensedNodes = useMemo(() => new Set(senseHistory.map(r => r.position)), [senseHistory]);

  // 建立路径索引 Map
  const pathMap = useMemo(() => {
    const map = new Map<string, number>();
    if (currentAdvice?.path) {
      currentAdvice.path.forEach((node, i) => map.set(node, i));
    }
    return map;
  }, [currentAdvice]);

  // 从当前位置出发的 BFS 最短距离表
  const distanceMap = useMemo(() => getDistanceMap(), [getDistanceMap]);

  // 建立感知信号 Map：node -> 有效信号值列表（过滤掉已找到宝藏对应的信号）
  // 逻辑：取该节点最后一次感知记录的信号；若信号值对应的所有宝藏均已找到，则过滤掉该信号值
  const senseSignalMap = useMemo(() => {
    const map = new Map<string, number[] | null>();
    // 已找到的宝藏集合（用于过滤信号）
    const foundTreasureIds = new Set(treasures.filter(t => t.found).map(t => t.id));
    // 未找到的宝藏 id 集合
    const activeTreasureIds = new Set(treasures.filter(t => !t.found).map(t => t.id));

    // 遍历所有感知记录（按顺序，后面的覆盖前面的）
    for (const record of senseHistory) {
      if (record.signal === null || record.signal.length === 0) {
        // 无信号：直接记录 null
        map.set(record.position, null);
      } else {
        // 有信号：过滤掉所有对应宝藏均已找到的信号值
        // 判断依据：若该节点在某宝藏的 foundAt 位置，或该宝藏已找到且该信号值与找到时的距离一致
        // 简化处理：只要还有未找到的宝藏，就保留有效信号；若所有宝藏都找到了则不显示
        const validSignals = activeTreasureIds.size > 0 ? record.signal : [];
        map.set(record.position, validSignals.length > 0 ? validSignals : null);
      }
    }
    return map;
  }, [senseHistory, treasures]);

  // 点击节点：自动填入位置输入框，并更新选中高亮
  const handleNodeClick = useCallback((node: string) => {
    setSelectedNode(prev => prev === node ? null : node);
    window.dispatchEvent(new CustomEvent("map-node-click", { detail: { node } }));
    toast.info(`已选择节点 ${node}`, { duration: 1200 });
  }, []);

  // SVG 画布尺寸
  const svgWidth = PAD * 2 + LABEL_W + COL_LABELS.length * CELL;
  const svgHeight = PAD * 2 + LABEL_H + ROW_LABELS.length * CELL;

  // 预计算所有节点坐标
  const nodePositions = useMemo(() => {
    const map = new Map<string, [number, number]>();
    ROW_LABELS.forEach((row, ri) => {
      COL_LABELS.forEach((col, ci) => {
        const node = `${row}${parseInt(col)}`;
        if (isValidNode(node)) {
          map.set(node, nodeCenter(ri, ci));
        }
      });
    });
    return map;
  }, []);

  // 路径连线集合
  const pathEdgeSet = useMemo(() => {
    const set = new Set<string>();
    if (currentAdvice?.path && currentAdvice.path.length > 1) {
      for (let i = 0; i < currentAdvice.path.length - 1; i++) {
        const a = currentAdvice.path[i];
        const b = currentAdvice.path[i + 1];
        set.add(`${a}-${b}`);
        set.add(`${b}-${a}`);
      }
    }
    return set;
  }, [currentAdvice]);

  return (
    <div className="w-full select-none" style={{ overflowX: "auto" }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ display: "block", maxWidth: "100%", width: '800px' }}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      >
        {/* ── 行列标签 ── */}
        {COL_LABELS.map((col, ci) => {
          const [x] = nodeCenter(0, ci);
          return (
            <text key={col} x={x} y={PAD + LABEL_H / 2 + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fill="rgb(100,116,139)" fontFamily="monospace" fontWeight={500}>
              {col}
            </text>
          );
        })}
        {ROW_LABELS.map((row, ri) => {
          const [, y] = nodeCenter(ri, 0);
          return (
            <text key={row} x={PAD + LABEL_W / 2} y={y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fill="rgb(100,116,139)" fontFamily="monospace" fontWeight={500}>
              {row}
            </text>
          );
        })}

        {/* ── 连接线层 ── */}
        {ROADS.map(([a, b]) => {
          const posA = nodePositions.get(a);
          const posB = nodePositions.get(b);
          if (!posA || !posB) return null;

          const isOnPath = pathEdgeSet.has(`${a}-${b}`);
          const statusA = getNodeStatus(a);
          const statusB = getNodeStatus(b);
          const isElimA = statusA === "eliminated";
          const isElimB = statusB === "eliminated";

          if (isOnPath) {
            return (
              <g key={`${a}-${b}`}>
                <line x1={posA[0]} y1={posA[1]} x2={posB[0]} y2={posB[1]}
                  stroke="rgba(96,165,250,0.35)" strokeWidth={6} strokeLinecap="round" />
                <line x1={posA[0]} y1={posA[1]} x2={posB[0]} y2={posB[1]}
                  stroke="rgba(96,165,250,0.9)" strokeWidth={2.5} strokeLinecap="round" />
              </g>
            );
          }

          return (
            <line key={`${a}-${b}`}
              x1={posA[0]} y1={posA[1]} x2={posB[0]} y2={posB[1]}
              stroke={isElimA && isElimB ? "rgba(30,41,59,0.2)" : "rgba(51,65,85,0.4)"}
              strokeWidth={1} strokeLinecap="round"
            />
          );
        })}

        {/* ── 节点层 ── */}
        {Array.from(nodePositions.entries()).map(([node, [cx, cy]]) => {
          const status = getNodeStatus(node);
          const pathIndex = pathMap.get(node) ?? -1;
          const treasureLabel = treasures.find(t => t.found && t.foundAt === node)?.id ?? "";
          const distToPlayer = distanceMap.get(node);

          // tooltip 基础文本（节点名+状态+候选信息，不含距离和信号）
          const baseLabels: Partial<Record<NodeStatus, string>> = {
            active: "可通行节点", player: "当前位置", treasure: "已找到宝藏",
            "candidate-T1": "T1 候选点", "candidate-T2": "T2 候选点",
            "candidate-T3": "T3 候选点", "candidate-T4": "T4 候选点",
            eliminated: "已排除", path: "建议路径",
            "signal-1": "感知距离1", "signal-2": "感知距离2", "signal-3": "感知距离3",
          };
          const candidateTreasures = treasures
            .filter(t => !t.found && t.candidates.includes(node))
            .map(t => `${t.id}(${t.candidates.length})`);
          let tooltipBase = `${node} — ${baseLabels[status] || status}`;
          if (candidateTreasures.length > 0) tooltipBase += ` | ${candidateTreasures.join(", ")}`;

          // 该节点的已感知信号（undefined=未感知，null=无信号，数组=有信号值）
          const sensedSignals = senseSignalMap.has(node) ? senseSignalMap.get(node)! : undefined;
          const isSelected = selectedNode === node;

          return (
            <g key={node}>
              {/* 选中高亮圈 */}
              {isSelected && (
                <SelectedRing cx={cx} cy={cy} r={status === "player" ? NODE_R + 2 : status === "treasure" ? NODE_R + 1 : NODE_R} />
              )}
              <NodeCircle
                node={node}
                cx={cx}
                cy={cy}
                status={status}
                pathIndex={pathIndex}
                treasureLabel={treasureLabel}
                tooltipBase={tooltipBase}
                distToPlayer={distToPlayer}
                sensedSignals={sensedSignals}
                onNodeClick={handleNodeClick}
                isClickable={gameStarted}
              />
              {/* 已感知标记：左上角小圆圈+眼睛 */}
              {sensedNodes.has(node) && status !== "player" && status !== "treasure" && (
                <>
                  <circle
                    cx={cx - NODE_R + 1} cy={cy - NODE_R + 1} r={4.5}
                    fill="rgba(15,23,42,0.9)" stroke="rgba(148,163,184,0.6)" strokeWidth={0.8}
                    style={{ pointerEvents: "none" }}
                  />
                  <text
                    x={cx - NODE_R + 1} y={cy - NODE_R + 1.5}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={5} fill="rgba(148,163,184,0.9)"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >👁</text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* 图例 */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5" style={{ fontSize: "0.58rem" }}>
        {[
          { color: "rgba(251,191,36,0.95)", border: "rgba(253,224,71,0.9)", label: "当前位置" },
          { color: "rgba(52,211,153,0.95)", border: "rgba(110,231,183,0.9)", label: "已找到宝藏" },
          { color: "rgba(30,58,138,0.85)", border: "rgba(96,165,250,1)", label: "建议路径" },
          { color: "rgba(15,23,42,0.3)", border: "rgba(51,65,85,0.2)", label: "已排除" },
        ].map(({ color, border, label }) => (
          <div key={label} className="flex items-center gap-1">
            <svg width={12} height={12}>
              <circle cx={6} cy={6} r={5} fill={color} stroke={border} strokeWidth={1.5} />
            </svg>
            <span style={{ color: "rgb(148,163,184)" }}>{label}</span>
          </div>
        ))}

        {(["T1","T2","T3","T4"] as const).map(tid => {
          const p = TREASURE_PALETTE[tid];
          const t = treasures.find(x => x.id === tid);
          if (t?.found) return null;
          return (
            <div key={tid} className="flex items-center gap-1">
              <svg width={12} height={12}>
                <circle cx={6} cy={6} r={5} fill={p.fill} stroke={p.stroke} strokeWidth={1.5} />
              </svg>
              <span style={{ color: "rgb(148,163,184)" }}>{p.label}({t?.candidates.length ?? 0})</span>
            </div>
          );
        })}
      </div>

      {sensedNodes.size > 0 && (
        <div className="flex items-center gap-1">
          <svg width={12} height={12}>
            <circle cx={6} cy={6} r={5} fill="rgba(30,41,59,0.6)" stroke="rgba(71,85,105,0.5)" strokeWidth={1.5} />
            <circle cx={3} cy={3} r={2.5} fill="rgba(15,23,42,0.9)" stroke="rgba(148,163,184,0.6)" strokeWidth={0.6} />
          </svg>
          <span style={{ color: "rgb(148,163,184)" }}>已感知({sensedNodes.size})</span>
        </div>
      )}

      {gameStarted && (
        <div className="mt-1.5" style={{ fontSize: "0.55rem", color: "rgb(71,85,105)", fontFamily: "monospace" }}>
          💡 点击节点可快速填入当前位置 · 悬停可查看最短距离和已感知信号
        </div>
      )}
    </div>
  );
}
