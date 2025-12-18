System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, _crd, TILE_STATE, BOARD_SIZE, CENTER_POS, LEVELS_DATA;

  // 评价系统
  function evaluateResult(remainingPegs, isCenterPeg) {
    if (remainingPegs === 1 && isCenterPeg) return "天才";
    if (remainingPegs === 1) return "大师 (非中心)";
    if (remainingPegs === 2) return "大师";
    if (remainingPegs === 3) return "尖子";
    if (remainingPegs === 4) return "聪明";
    if (remainingPegs === 5) return "颇好";
    return "还需努力";
  }

  _export("evaluateResult", evaluateResult);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "12131o1TgZD8pu+HBFhEwzB", "GameConfig", undefined);

      // assets/games/chess/scripts/GameConfig.ts
      // 棋盘状态常量
      _export("TILE_STATE", TILE_STATE = {
        INVALID: -1,
        // 无效位置 | 棋盘外
        EMPTY: 0,
        // 空位
        PEG: 1,
        // 有棋子
        ACTIVE_PEG: 2 // 激活棋子（被选中，虽然在 BoardController 中未使用，但保留）

      }); // 棋盘尺寸


      _export("BOARD_SIZE", BOARD_SIZE = 7); // 中心点坐标 (3, 3)


      _export("CENTER_POS", CENTER_POS = {
        row: 3,
        col: 3
      }); // 关卡数据 (数组中包含对象，每个对象有 name 和 layout)
      // -1: 无效位置, 0: 空位, 1: 棋子


      _export("LEVELS_DATA", LEVELS_DATA = [// 关卡 0: 十字架 (传统起点布局)
      {
        name: "十字架",
        layout: [[-1, -1, 1, 1, 1, -1, -1], [-1, -1, 1, 1, 1, -1, -1], [1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 0, 1, 1, 1], // 中心(3,3)空
        [1, 1, 1, 1, 1, 1, 1], [-1, -1, 1, 1, 1, -1, -1], [-1, -1, 1, 1, 1, -1, -1]]
      }, // 关卡 1: 大十字
      {
        name: "大十字",
        layout: [[-1, -1, 0, 1, 0, -1, -1], [-1, -1, 1, 1, 1, -1, -1], [1, 1, 1, 0, 1, 1, 1], [1, 1, 0, 0, 0, 1, 1], [1, 1, 1, 0, 1, 1, 1], [-1, -1, 1, 1, 1, -1, -1], [-1, -1, 0, 1, 0, -1, -1]]
      }, // 关卡 2: 古字形
      {
        name: "古字形",
        layout: [[-1, -1, 1, 0, 1, -1, -1], [-1, -1, 1, 0, 1, -1, -1], [1, 1, 1, 0, 1, 1, 1], [0, 0, 0, 1, 0, 0, 0], [1, 1, 1, 0, 1, 1, 1], [-1, -1, 1, 0, 1, -1, -1], [-1, -1, 1, 0, 1, -1, -1]]
      } // 更多关卡...
      ]);

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=cad22c50ff2fc11a0772419a45aedbe9b4b73ffa.js.map