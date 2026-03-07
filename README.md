# 寻箱决策平台 — Treasure Hunt Decision Engine
https://mianmian76.github.io/treasurehunt/

> 基于 BFS 最短路径 + 贝叶斯过滤推理的智能决策助手，帮助你以最少步数找到全部 4 个宝藏。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)

---

## 项目简介

**寻箱决策平台**是一个交互式寻宝游戏辅助工具，将 AI 决策算法可视化呈现在浏览器中。玩家在 12×9 的网格地图上移动，通过感知信号（距离 1/2/3 步时触发）逐步定位 4 个隐藏宝藏，而平台会实时给出基于算法推理的最优移动建议。

整个平台以**古典探险地图**为视觉风格，融合深海军蓝背景、琥珀金高亮色调，以及 SVG 动态路径绘制，兼顾探险感与数据精确感。

---

## 核心算法

平台内置的决策引擎（`gameEngine.ts`）实现了以下算法：

| 算法模块 | 说明 |
|---|---|
| **BFS 最短路径** | 计算当前位置到所有候选点的最短距离，并生成完整移动路径 |
| **贝叶斯过滤** | 累积历史感知记录，逐步排除不可能的候选点 |
| **枢纽评分** | 综合多宝藏覆盖率、信息熵减少量、步数代价，评估每个节点的感知价值 |
| **多宝藏优先级** | 按 `(1/候选点数量) × (1/最近距离)` 公式动态排序，优先处理最确定的宝藏 |
| **探索策略档位** | 支持激进/均衡/保守三档，通过衰减系数调节距离与信息量的权衡 |

---

## 技术栈

- **前端框架**：React 19 + TypeScript 5.6
- **构建工具**：Vite 7
- **样式方案**：Tailwind CSS v4
- **UI 组件库**：shadcn/ui（Radix UI 基础）
- **动画库**：Framer Motion
- **路由**：Wouter
- **后端**：Express（仅用于生产环境静态文件服务）
- **包管理器**：pnpm

---

## 目录结构

```
treasure-hunt/
├── client/                   # 前端代码
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── components/       # 业务组件
│       │   ├── TreasureMap.tsx     # SVG 交互地图
│       │   ├── DecisionPanel.tsx   # 决策面板（输入/分析/历史）
│       │   ├── ErrorBoundary.tsx
│       │   └── ui/                 # shadcn/ui 基础组件
│       ├── contexts/
│       │   ├── GameContext.tsx     # 游戏状态管理
│       │   └── ThemeContext.tsx
│       ├── hooks/
│       ├── lib/
│       │   ├── gameEngine.ts       # 核心决策算法
│       │   └── utils.ts
│       └── pages/
│           ├── Home.tsx            # 主页面（落地页 + 游戏页）
│           └── NotFound.tsx
├── server/
│   └── index.ts              # Express 静态文件服务
├── shared/
│   └── const.ts
├── docs/
│   └── ai-prompt.md          # 寻宝决策智能体 Prompt（v2.0）
├── ideas.md                  # 设计理念文档
├── package.json
├── vite.config.ts
├── tsconfig.json
└── components.json           # shadcn/ui 配置
```

---

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 10+

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/your-username/treasure-hunt-platform.git
cd treasure-hunt-platform

# 安装依赖
pnpm install

# 启动开发服务器（默认端口 3000）
pnpm dev
```

### 生产构建

```bash
# 构建前端静态资源 + 后端服务
pnpm build

# 启动生产服务器
pnpm start
```

---

## 游戏玩法

1. 打开页面后点击**开始游戏**，起点固定为 `L6`。
2. 在右侧**输入感知**面板中，输入你当前所在的节点（如 `I6`），并选择感知到的信号（无信号 / 距离1 / 距离2 / 距离3）。
3. 点击**提交感知结果**，系统会在左侧地图上实时更新候选点，并在**推理分析**面板给出下一步最优移动建议（含完整路径）。
4. 按照建议移动，重复上述步骤，直到找到全部 4 个宝藏。
5. 在**历史记录**面板可查看所有移动记录，并支持删除错误记录后自动重算。

---

## 地图说明

地图为 12行(A–L) × 9列(1–9) 的网格，共 80 个可通行节点，4 个宝藏候选区域互不重叠：

| 宝藏 | 候选节点（共 N 个） |
|---|---|
| T1 | A3, B2, B3, C1, C2, C3, D2, D3, E1, E2 |
| T2 | H2, H3, I1, I2, I3, J1, J2, J3, K2, K3, K4 |
| T3 | A7, B7, B8, C6, C7, C8, C9, D7, D8, D9, E9 |
| T4 | H7, H8, H9, I6, I7, I8, I9, J7, J8, J9 |

---

## AI Prompt

`docs/ai-prompt.md` 包含了配套的**寻宝决策智能体 Prompt（v2.0）**，可直接粘贴到支持自定义 System Prompt 的 AI 对话工具（如 Claude、GPT-4 等）中使用，实现纯文字版本的决策辅助。

---

## License

[MIT](./LICENSE)
