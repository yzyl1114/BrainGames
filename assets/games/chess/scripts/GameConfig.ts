// assets/games/chess/scripts/GameConfig.ts

// 棋盘状态常量
export const TILE_STATE = {
    INVALID: -1, // 无效位置 | 棋盘外
    EMPTY: 0,    // 空位
    PEG: 1,      // 有棋子
    ACTIVE_PEG: 2 // 激活棋子（被选中，虽然在 BoardController 中未使用，但保留）
};

// 棋盘尺寸
export const BOARD_SIZE = 7;
// 中心点坐标 (3, 3)
export const CENTER_POS = { row: 3, col: 3 };

// 关卡数据 (数组中包含对象，每个对象有 name 和 layout)
// -1: 无效位置, 0: 空位, 1: 棋子
export const LEVELS_DATA = [
    // 关卡 0
    { name: "出人头地",stepLimit: 10,layout: [
        [-1, -1, 0, 0, 0, -1, -1],
        [-1, -1, 0, 1, 0, -1, -1],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0], 
        [0, 0, 0, 1, 0, 0, 0],
        [-1, -1, 0, 0, 0, -1, -1],
        [-1, -1, 0, 0, 0, -1, -1],
    ]},
    // 关卡 1
    { name: "三长两短",stepLimit: 15,layout: [
        [-1, -1, 0, 0, 0, -1, -1],
        [-1, -1, 1, 1, 0, -1, -1],
        [0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0],
        [-1, -1, 1, 1, 0, -1, -1],
        [-1, -1, 0, 0, 0, -1, -1],
    ]},
    // 关卡 2
    { name: "十字架",stepLimit: 15,layout: [
        [-1, -1, 1, 1, 1, -1, -1],
        [-1, -1, 1, 1, 1, -1, -1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 0, 1, 1, 1], // 中心(3,3)空
        [1, 1, 1, 1, 1, 1, 1],
        [-1, -1, 1, 1, 1, -1, -1],
        [-1, -1, 1, 1, 1, -1, -1],
    ]},
    // 关卡 3
    { name: "大十字",stepLimit: 25,layout: [
        [-1, -1, 0, 1, 0, -1, -1],
        [-1, -1, 1, 1, 1, -1, -1],
        [1, 1, 1, 0, 1, 1, 1],
        [1, 1, 0, 0, 0, 1, 1],
        [1, 1, 1, 0, 1, 1, 1],
        [-1, -1, 1, 1, 1, -1, -1],
        [-1, -1, 0, 1, 0, -1, -1],
    ]},
    // 关卡 4
    { name: "古字形",stepLimit: 25,layout: [
        [-1, -1, 1, 0, 1, -1, -1],
        [-1, -1, 1, 0, 1, -1, -1],
        [1, 1, 1, 0, 1, 1, 1],
        [0, 0, 0, 1, 0, 0, 0],
        [1, 1, 1, 0, 1, 1, 1],
        [-1, -1, 1, 0, 1, -1, -1],
        [-1, -1, 1, 0, 1, -1, -1],
    ]},
    // 更多关卡...
];

// 评价系统
export function evaluateResult(usedSteps: number, stepLimit: number): string {
    const remainingSteps = stepLimit - usedSteps;
    
    // 直接根据剩余步数判断
    if (remainingSteps >= stepLimit * 0.7) return "★★★★★";
    if (remainingSteps >= stepLimit * 0.5) return "★★★★☆";
    if (remainingSteps >= stepLimit * 0.3) return "★★★☆☆";
    if (remainingSteps >= stepLimit * 0.1) return "★★☆☆☆";
    return "★☆☆☆☆";
}