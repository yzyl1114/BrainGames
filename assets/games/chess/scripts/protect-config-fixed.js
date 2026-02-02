// scripts/protect-config-fixed.js
const fs = require('fs');
const path = require('path');

console.log('🔒 开始保护 GameConfig.ts...');

// 读取原始文件
const content = fs.readFileSync('GameConfig.ts', 'utf8');

// 提取关卡数据
const levelDataMatch = content.match(/export const LEVELS_DATA = \[([\s\S]*?)\];/s);
if (!levelDataMatch) {
    console.error('❌ 找不到 LEVELS_DATA');
    process.exit(1);
}

// 简单编码（避免使用保留关键字）
let encoded = levelDataMatch[1]
    .replace(/\s+/g, ' ')  // 压缩空格
    .replace(/-1/g, 'A')   // -1 -> A
    .replace(/0/g, 'B')    // 0 -> B
    .replace(/1/g, 'C');   // 1 -> C

console.log(`📊 编码前大小: ${levelDataMatch[1].length} 字符`);
console.log(`📊 编码后大小: ${encoded.length} 字符`);

// 创建保护后的内容（注意：不使用 'protected' 作为变量名）
const protectedContent = `// ============================================
// 钻石棋 - 受保护的配置文件
// 自动生成，请勿直接修改
// 生成时间: ${new Date().toLocaleString()}
// ============================================

// 棋盘状态常量
export const TILE_STATE = {
    INVALID: -1,
    EMPTY: 0,
    PEG: 1,
    ACTIVE_PEG: 2
};

// 棋盘尺寸
export const BOARD_SIZE = 7;

// 中心点坐标
export const CENTER_POS = { row: 3, col: 3 };

// ============================================
// 加密的关卡数据
// ============================================

// 编码数据（使用安全的变量名）
const _ENCRYPTED_DATA = \`${encoded}\`;

// 解码函数
function _decodeLevels() {
    try {
        // 恢复原始数据
        let decoded = _ENCRYPTED_DATA
            .replace(/A/g, '-1')
            .replace(/B/g, '0')
            .replace(/C/g, '1');
        
        // 转换为数组
        return eval('[' + decoded + ']');
    } catch (error) {
        console.error('❌ 解码关卡数据失败:', error);
        return [];
    }
}

// 导出解码后的关卡数据
export const LEVELS_DATA = _decodeLevels();

// ============================================
// 评价函数
// ============================================

export function evaluateResult(remainingPegs) {
    if (remainingPegs === 1) return "★★★★★";
    if (remainingPegs >= 2 && remainingPegs <= 3) return "★★★★☆";
    if (remainingPegs >= 4 && remainingPegs <= 5) return "★★★☆☆";
    if (remainingPegs >= 6 && remainingPegs <= 7) return "★★☆☆☆";
    if (remainingPegs >= 8 && remainingPegs <= 10) return "★☆☆☆☆";
    return "☆☆☆☆☆";
}

// 混淆代码（可选）
const _OBF = [${Array(5).fill().map(() => Math.random()).join(', ')}];
`;

// 保存文件
fs.writeFileSync('GameConfig_protected.ts', protectedContent);

console.log('✅ 保护完成！生成文件: GameConfig_protected.ts');
console.log('');
console.log('📋 下一步操作:');
console.log('1. 修改以下文件中的 import 语句:');
console.log('   - BoardController.ts');
console.log('   - LevelSelection.ts');
console.log('');
console.log('2. 将 "from \'./GameConfig\'" 改为 "from \'./GameConfig_protected\'"');
console.log('');
console.log('3. 测试游戏是否正常运行');