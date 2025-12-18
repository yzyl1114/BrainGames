System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Prefab, instantiate, UITransform, v3, Label, tween, UIOpacity, Sprite, Color, Peg, BOARD_SIZE, TILE_STATE, LEVELS_DATA, evaluateResult, CENTER_POS, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _descriptor6, _crd, ccclass, property, TILE_SIZE, BoardController;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }

  function _reportPossibleCrUseOfPeg(extras) {
    _reporterNs.report("Peg", "./Peg", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBOARD_SIZE(extras) {
    _reporterNs.report("BOARD_SIZE", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTILE_STATE(extras) {
    _reporterNs.report("TILE_STATE", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfLEVELS_DATA(extras) {
    _reporterNs.report("LEVELS_DATA", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfevaluateResult(extras) {
    _reporterNs.report("evaluateResult", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCENTER_POS(extras) {
    _reporterNs.report("CENTER_POS", "./GameConfig", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      Node = _cc.Node;
      Prefab = _cc.Prefab;
      instantiate = _cc.instantiate;
      UITransform = _cc.UITransform;
      v3 = _cc.v3;
      Label = _cc.Label;
      tween = _cc.tween;
      UIOpacity = _cc.UIOpacity;
      Sprite = _cc.Sprite;
      Color = _cc.Color;
    }, function (_unresolved_2) {
      Peg = _unresolved_2.Peg;
    }, function (_unresolved_3) {
      BOARD_SIZE = _unresolved_3.BOARD_SIZE;
      TILE_STATE = _unresolved_3.TILE_STATE;
      LEVELS_DATA = _unresolved_3.LEVELS_DATA;
      evaluateResult = _unresolved_3.evaluateResult;
      CENTER_POS = _unresolved_3.CENTER_POS;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "0f724cLlFpONpK4EY/E2fZM", "BoardController", undefined); // assets/games/chess/scripts/BoardController.ts


      __checkObsolete__(['_decorator', 'Component', 'Node', 'Prefab', 'instantiate', 'UITransform', 'Vec3', 'v3', 'EventTouch', 'Label', 'tween', 'UIOpacity', 'Sprite', 'Color']);

      ({
        ccclass,
        property
      } = _decorator);
      TILE_SIZE = 90;

      _export("BoardController", BoardController = (_dec = ccclass('BoardController'), _dec2 = property(Prefab), _dec3 = property(Node), _dec4 = property(Node), _dec5 = property(Label), _dec6 = property(Label), _dec7 = property(Label), _dec(_class = (_class2 = class BoardController extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "PegPrefab", _descriptor, this);

          _initializerDefineProperty(this, "boardRoot", _descriptor2, this);

          _initializerDefineProperty(this, "feedbackNode", _descriptor3, this);

          // 反馈节点（可选）
          _initializerDefineProperty(this, "resultLabel", _descriptor4, this);

          _initializerDefineProperty(this, "stepCounterLabel", _descriptor5, this);

          // 新增：计步器标签
          _initializerDefineProperty(this, "tipsLabel", _descriptor6, this);

          // 新增：提示标签
          this.currentLevelIndex = 0;
          this.boardState = [];
          this.activeNode = null;
          this.activePegRow = -1;
          this.activePegCol = -1;
          this.dragOffset = v3(0, 0, 0);
          this.touchStartPos = v3(0, 0, 0);
          this.pegNodes = new Map();
          // 使用Map存储棋子节点
          // 新增：历史记录和游戏状态
          this.moveHistory = [];
          this.stepCount = 0;
          // 步数计数器
          this.undoCount = 0;
          // 悔棋次数计数器
          this.maxUndoCount = 5;
        }

        // 最大悔棋次数（根据关卡动态调整）
        onLoad() {
          console.log("BoardController: onLoad start");

          if (!this.PegPrefab) {
            console.error("BoardController: PegPrefab is not assigned in the editor!");
            return;
          }

          if (!this.boardRoot) {
            console.error("BoardController: boardRoot is not assigned in the editor!");
            return;
          }

          if (!this.resultLabel) {
            console.error("BoardController: resultLabel is not assigned in the editor!");
            return;
          }

          this.loadLevel(this.currentLevelIndex);
        }

        loadLevel(levelIndex) {
          console.log("Loading level " + levelIndex);

          if (!this.boardRoot || !this.resultLabel) {
            console.error("Critical nodes missing, cannot load level");
            return;
          }

          this.boardRoot.destroyAllChildren();
          this.activeNode = null;
          this.activePegRow = -1;
          this.activePegCol = -1;
          this.pegNodes.clear(); // 重置游戏状态

          this.stepCount = 0;
          this.undoCount = 0;
          this.moveHistory = []; // 根据关卡设置最大悔棋次数

          this.setMaxUndoCount(levelIndex);
          this.boardState = [];

          for (var i = 0; i < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE); i++) {
            this.boardState[i] = [];

            for (var j = 0; j < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
              error: Error()
            }), BOARD_SIZE) : BOARD_SIZE); j++) {
              this.boardState[i][j] = (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
                error: Error()
              }), TILE_STATE) : TILE_STATE).INVALID;
            }
          }

          if (levelIndex >= (_crd && LEVELS_DATA === void 0 ? (_reportPossibleCrUseOfLEVELS_DATA({
            error: Error()
          }), LEVELS_DATA) : LEVELS_DATA).length) {
            this.resultLabel.string = "所有关卡完成! 恭喜您！";

            if (this.stepCounterLabel) {
              this.stepCounterLabel.string = "";
            }

            return;
          }

          var level = (_crd && LEVELS_DATA === void 0 ? (_reportPossibleCrUseOfLEVELS_DATA({
            error: Error()
          }), LEVELS_DATA) : LEVELS_DATA)[levelIndex];
          this.resultLabel.string = "\u5173\u5361 " + (levelIndex + 1) + ": " + level.name; // 更新计步器显示

          this.updateStepCounter();
          this.boardState = [];

          for (var _i = 0; _i < level.layout.length; _i++) {
            this.boardState[_i] = [...level.layout[_i]];
          }

          for (var r = 0; r < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE); r++) {
            for (var c = 0; c < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
              error: Error()
            }), BOARD_SIZE) : BOARD_SIZE); c++) {
              if (this.boardState[r][c] === (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
                error: Error()
              }), TILE_STATE) : TILE_STATE).PEG) {
                this.spawnPeg(r, c);
              }
            }
          } // 保存初始状态


          this.saveCurrentState();
          console.log("Level " + levelIndex + " loaded: " + level.name + ", pegs count: " + this.countPegs() + ", max undo: " + this.maxUndoCount);
        } // 新增：根据关卡设置最大悔棋次数


        setMaxUndoCount(levelIndex) {
          if (levelIndex < 30) {
            this.maxUndoCount = 5; // 1-30关：5次
          } else if (levelIndex < 60) {
            this.maxUndoCount = 7; // 31-60关：7次
          } else {
            this.maxUndoCount = 9; // 61+关：9次
          }
        } // 新增：更新计步器显示


        updateStepCounter() {
          if (!this.stepCounterLabel) {
            console.warn("Step counter label not assigned");
            return;
          }

          var remainingUndo = this.maxUndoCount - this.undoCount;
          this.stepCounterLabel.string = "\u6B65\u6570: " + this.stepCount + " | \u5269\u4F59\u6094\u68CB: " + remainingUndo + "\u6B21";
        } // 新增：显示临时提示


        showTips(message, duration) {
          if (duration === void 0) {
            duration = 2.0;
          }

          if (!this.tipsLabel || !this.tipsLabel.isValid) {
            console.log("Tips:", message);
            return;
          } // 显示提示


          this.tipsLabel.string = message;
          this.tipsLabel.node.active = true; // 淡入效果

          var opacity = this.tipsLabel.node.getComponent(UIOpacity) || this.tipsLabel.node.addComponent(UIOpacity);
          opacity.opacity = 0;
          tween(opacity).to(0.3, {
            opacity: 255
          }).delay(duration).to(0.3, {
            opacity: 0
          }).call(() => {
            this.tipsLabel.node.active = false;
          }).start();
        } // 新增：保存当前状态到历史记录


        saveCurrentState() {
          // 深拷贝棋盘状态
          var boardCopy = [];

          for (var i = 0; i < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE); i++) {
            boardCopy[i] = [...this.boardState[i]];
          } // 收集所有棋子的位置信息


          var pegsInfo = [];

          for (var r = 0; r < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE); r++) {
            for (var c = 0; c < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
              error: Error()
            }), BOARD_SIZE) : BOARD_SIZE); c++) {
              if (this.boardState[r][c] === (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
                error: Error()
              }), TILE_STATE) : TILE_STATE).PEG) {
                pegsInfo.push({
                  row: r,
                  col: c
                });
              }
            }
          }

          this.moveHistory.push({
            boardState: boardCopy,
            pegsInfo: pegsInfo,
            stepCount: this.stepCount
          }); // 限制历史记录长度（防止内存占用过大）

          if (this.moveHistory.length > 100) {
            this.moveHistory.shift();
          }

          console.log("State saved. History size: " + this.moveHistory.length + ", Step: " + this.stepCount);
        } // 悔棋功能,修改undoMove方法，使用提示代替resultLabel


        undoMove() {
          // 检查是否有历史记录
          if (this.moveHistory.length <= 1) {
            this.showTips("无法悔棋：已经是初始状态");
            return;
          } // 检查悔棋次数是否用完


          if (this.undoCount >= this.maxUndoCount) {
            this.showTips("\u6094\u68CB\u6B21\u6570\u5DF2\u7528\u5B8C\uFF08\u6700\u591A" + this.maxUndoCount + "\u6B21\uFF09");
            return;
          } // 弹出当前状态（不需要）


          this.moveHistory.pop(); // 获取上一步状态

          var lastState = this.moveHistory[this.moveHistory.length - 1]; // 恢复棋盘状态

          for (var i = 0; i < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE); i++) {
            this.boardState[i] = [...lastState.boardState[i]];
          } // 恢复步数


          this.stepCount = lastState.stepCount; // 清空当前所有棋子

          this.boardRoot.destroyAllChildren();
          this.pegNodes.clear(); // 重新生成棋子

          for (var pegInfo of lastState.pegsInfo) {
            this.spawnPeg(pegInfo.row, pegInfo.col);
          } // 重置活动状态


          this.resetActiveState(); // 更新悔棋计数

          this.undoCount++; // 更新计步器

          this.updateStepCounter();
          var remainingPegs = this.countPegs();
          var remainingUndo = this.maxUndoCount - this.undoCount; // 使用提示显示成功信息

          this.showTips("\u6094\u68CB\u6210\u529F\uFF01\u5269\u4F59\u68CB\u5B50: " + remainingPegs + "\uFF0C\u5269\u4F59\u6094\u68CB: " + remainingUndo + "\u6B21");
          console.log("Undo successful. Steps: " + this.stepCount + ", Undo used: " + this.undoCount + "/" + this.maxUndoCount + ", History: " + this.moveHistory.length);
        } // 新增：清空历史记录


        clearHistory() {
          this.moveHistory = [];
          this.stepCount = 0;
          this.undoCount = 0;
          console.log("Move history cleared");
        }

        getPegLocalPosition(r, c) {
          var x = (c - 3) * TILE_SIZE;
          var y = (3 - r) * TILE_SIZE;
          return v3(x, y, 0);
        }

        getLogicPosition(worldPos) {
          var boardUITransform = this.boardRoot.getComponent(UITransform);

          if (!boardUITransform) {
            console.warn("BoardRoot missing UITransform component");
            return null;
          }

          var localPos = boardUITransform.convertToNodeSpaceAR(worldPos);
          var col = Math.round(localPos.x / TILE_SIZE) + 3;
          var row = 3 - Math.round(localPos.y / TILE_SIZE);

          if (row >= 0 && row < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE) && col >= 0 && col < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE)) {
            return {
              row,
              col
            };
          }

          return null;
        }

        checkJumpValidity(r1, c1, r2, c2) {
          if (r2 < 0 || r2 >= (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE) || c2 < 0 || c2 >= (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE)) return null;
          if (this.boardState[r2][c2] === (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
            error: Error()
          }), TILE_STATE) : TILE_STATE).INVALID) return null;
          if (this.boardState[r2][c2] !== (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
            error: Error()
          }), TILE_STATE) : TILE_STATE).EMPTY) return null;
          var dr = Math.abs(r1 - r2);
          var dc = Math.abs(c1 - c2);
          if (!(dr === 2 && dc === 0 || dr === 0 && dc === 2)) return null;
          var eatR = (r1 + r2) / 2;
          var eatC = (c1 + c2) / 2;
          if (this.boardState[eatR][eatC] !== (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
            error: Error()
          }), TILE_STATE) : TILE_STATE).PEG) return null;
          console.log("Valid jump from (" + r1 + ", " + c1 + ") to (" + r2 + ", " + c2 + "), eat (" + eatR + ", " + eatC + ")");
          return {
            row: eatR,
            col: eatC
          };
        } // =================== 保持原有的拖拽逻辑 ===================


        handlePegTouchStart(peg, event) {
          console.log("TouchStart: peg at (" + peg.row + ", " + peg.col + ")"); // 记录活动棋子

          this.activeNode = peg.node;
          this.activePegRow = peg.row;
          this.activePegCol = peg.col;

          if (!this.activeNode || !this.activeNode.isValid) {
            console.error("Peg node is invalid!");
            this.activeNode = null;
            return;
          } // 激活棋子


          peg.setActive(true); // 记录触摸起始位置

          var touchUIPos = event.getUILocation();
          this.touchStartPos = v3(touchUIPos.x, touchUIPos.y, 0); // 记录棋子当前位置

          var pegWorldPos = this.activeNode.getWorldPosition();
          this.dragOffset.x = pegWorldPos.x - this.touchStartPos.x;
          this.dragOffset.y = pegWorldPos.y - this.touchStartPos.y;
          console.log("TouchStart: touch (" + this.touchStartPos.x + ", " + this.touchStartPos.y + "), offset (" + this.dragOffset.x + ", " + this.dragOffset.y + ")");
        }

        handlePegTouchMove(peg, event) {
          // 安全检查
          if (!this.activeNode || !this.activeNode.isValid) {
            console.warn("No active node in TouchMove");
            return;
          }

          if (peg.row !== this.activePegRow || peg.col !== this.activePegCol) {
            console.warn("Wrong peg in TouchMove");
            return;
          } // 获取当前触摸位置


          var touchUIPos = event.getUILocation();
          var currentTouchPos = v3(touchUIPos.x, touchUIPos.y, 0); // 计算新的世界位置

          var newWorldPos = v3(currentTouchPos.x + this.dragOffset.x, currentTouchPos.y + this.dragOffset.y, 0);
          console.log("TouchMove: current (" + currentTouchPos.x + ", " + currentTouchPos.y + "), new world (" + newWorldPos.x + ", " + newWorldPos.y + ")"); // 直接设置世界位置

          this.activeNode.setWorldPosition(newWorldPos); // 安全地更新反馈（如果feedbackNode存在）

          this.safeUpdateFeedback(newWorldPos);
        }

        safeUpdateFeedback(worldPos) {
          // 安全检查：如果feedbackNode不存在或无效，直接返回
          if (!this.feedbackNode || !this.feedbackNode.isValid) {
            return;
          }

          var targetLogicPos = this.getLogicPosition(worldPos); // 先隐藏反馈节点

          this.feedbackNode.active = false;

          if (targetLogicPos) {
            var eatenPos = this.checkJumpValidity(this.activePegRow, this.activePegCol, targetLogicPos.row, targetLogicPos.col);

            if (eatenPos) {
              // 显示绿色反馈（有效跳吃）
              this.feedbackNode.active = true;
              this.feedbackNode.setPosition(this.getPegLocalPosition(targetLogicPos.row, targetLogicPos.col));
              var feedbackSprite = this.feedbackNode.getComponent(Sprite);

              if (feedbackSprite) {
                feedbackSprite.color = Color.GREEN;
              }
            } else {
              // 显示红色反馈（无效位置）
              this.feedbackNode.active = true;
              this.feedbackNode.setPosition(this.getPegLocalPosition(targetLogicPos.row, targetLogicPos.col));

              var _feedbackSprite = this.feedbackNode.getComponent(Sprite);

              if (_feedbackSprite) {
                _feedbackSprite.color = Color.RED;
              }
            }
          }
        }

        handlePegTouchEnd(peg, event) {
          console.log("TouchEnd: peg at (" + peg.row + ", " + peg.col + ")");

          if (!this.activeNode || !this.activeNode.isValid) {
            console.warn("No active node in TouchEnd");
            return;
          }

          if (peg.row !== this.activePegRow || peg.col !== this.activePegCol) {
            console.warn("Wrong peg in TouchEnd");
            this.resetActiveState();
            return;
          } // 安全地隐藏反馈节点


          if (this.feedbackNode && this.feedbackNode.isValid) {
            this.feedbackNode.active = false;
          } // 获取当前位置


          var currentWorldPos = this.activeNode.getWorldPosition();
          var targetLogicPos = this.getLogicPosition(currentWorldPos);
          console.log("TouchEnd: world pos (" + currentWorldPos.x + ", " + currentWorldPos.y + "), target " + (targetLogicPos ? "(" + targetLogicPos.row + ", " + targetLogicPos.col + ")" : 'null')); // 1. 尝试跳吃

          if (targetLogicPos) {
            var eatenPos = this.checkJumpValidity(this.activePegRow, this.activePegCol, targetLogicPos.row, targetLogicPos.col);

            if (eatenPos) {
              console.log("Valid jump detected, executing...");
              this.executeJump(peg, targetLogicPos.row, targetLogicPos.col, eatenPos);
              return;
            }
          } // 2. 无效跳吃：棋子归位


          console.log("Invalid jump or out of board, resetting peg position");
          this.resetPegPosition(peg);
        }

        resetPegPosition(peg) {
          if (!this.activeNode) return;
          peg.setActive(false);
          tween(this.activeNode).to(0.1, {
            position: this.getPegLocalPosition(this.activePegRow, this.activePegCol)
          }).call(() => {
            console.log("Peg reset to original position (" + this.activePegRow + ", " + this.activePegCol + ")");
            this.resetActiveState();
          }).start();
        }

        resetActiveState() {
          this.activeNode = null;
          this.activePegRow = -1;
          this.activePegCol = -1;
        }

        executeJump(peg, targetR, targetC, eatenPos) {
          console.log("Executing jump: peg (" + this.activePegRow + ", " + this.activePegCol + ") -> (" + targetR + ", " + targetC + "), eat (" + eatenPos.row + ", " + eatenPos.col + ")");

          if (!this.activeNode || !this.activeNode.isValid) {
            console.error("Invalid node in executeJump");
            return;
          } // 保存当前状态到历史记录（在跳吃之前）


          this.saveCurrentState();
          peg.setActive(false);
          var originalRow = this.activePegRow;
          var originalCol = this.activePegCol; // 更新棋盘状态：清空起点

          this.boardState[originalRow][originalCol] = (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
            error: Error()
          }), TILE_STATE) : TILE_STATE).EMPTY; // 找到并移除被吃的棋子

          var eatenKey = eatenPos.row + "," + eatenPos.col;
          var eatenNode = this.pegNodes.get(eatenKey);

          if (eatenNode && eatenNode.isValid) {
            console.log("Removing eaten peg at (" + eatenPos.row + ", " + eatenPos.col + ")");
            var opacityComp = eatenNode.getComponent(UIOpacity) || eatenNode.addComponent(UIOpacity);
            tween(eatenNode) // 这里加上eatenNode
            .parallel(tween().to(0.15, {
              scale: v3(0.1, 0.1, 0.1)
            }), // 这里去掉eatenNode
            tween(opacityComp).to(0.15, {
              opacity: 0
            })).call(() => {
              eatenNode.destroy();
              this.pegNodes.delete(eatenKey);
              this.boardState[eatenPos.row][eatenPos.col] = (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
                error: Error()
              }), TILE_STATE) : TILE_STATE).EMPTY;
            }).start();
          } else {
            console.warn("Eaten peg node not found at (" + eatenPos.row + ", " + eatenPos.col + ")");
            this.boardState[eatenPos.row][eatenPos.col] = (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
              error: Error()
            }), TILE_STATE) : TILE_STATE).EMPTY;
          } // 移动棋子到目标位置


          var targetLocalPos = this.getPegLocalPosition(targetR, targetC);
          console.log("Moving peg from (" + originalRow + ", " + originalCol + ") to (" + targetR + ", " + targetC + ")");
          tween(this.activeNode).to(0.2, {
            position: targetLocalPos
          }).call(() => {
            // 更新棋盘状态：设置终点
            this.boardState[targetR][targetC] = (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
              error: Error()
            }), TILE_STATE) : TILE_STATE).PEG; // 更新棋子逻辑坐标

            peg.row = targetR;
            peg.col = targetC; // 更新节点Map

            var originalKey = originalRow + "," + originalCol;
            var newKey = targetR + "," + targetC;
            this.pegNodes.delete(originalKey);
            this.pegNodes.set(newKey, this.activeNode); // 增加步数

            this.stepCount++; // 更新计步器

            this.updateStepCounter();
            console.log("Jump completed. Step: " + this.stepCount + ", Board updated.");
            this.resetActiveState();
            this.checkGameState();
          }).start();
        }

        findPegNode(row, col) {
          var key = row + "," + col;
          return this.pegNodes.get(key) || null;
        }

        countPegs() {
          var count = 0;

          for (var r = 0; r < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE); r++) {
            for (var c = 0; c < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
              error: Error()
            }), BOARD_SIZE) : BOARD_SIZE); c++) {
              if (this.boardState[r][c] === (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
                error: Error()
              }), TILE_STATE) : TILE_STATE).PEG) {
                count++;
              }
            }
          }

          return count;
        }

        checkGameState() {
          var remainingPegs = 0;

          for (var r = 0; r < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE); r++) {
            for (var c = 0; c < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
              error: Error()
            }), BOARD_SIZE) : BOARD_SIZE); c++) {
              if (this.boardState[r][c] === (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
                error: Error()
              }), TILE_STATE) : TILE_STATE).PEG) {
                remainingPegs++;
              }
            }
          }

          console.log("Game state check: " + remainingPegs + " pegs remaining");

          if (remainingPegs === 1) {
            var isCenter = this.boardState[(_crd && CENTER_POS === void 0 ? (_reportPossibleCrUseOfCENTER_POS({
              error: Error()
            }), CENTER_POS) : CENTER_POS).row][(_crd && CENTER_POS === void 0 ? (_reportPossibleCrUseOfCENTER_POS({
              error: Error()
            }), CENTER_POS) : CENTER_POS).col] === (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
              error: Error()
            }), TILE_STATE) : TILE_STATE).PEG;
            var result = (_crd && evaluateResult === void 0 ? (_reportPossibleCrUseOfevaluateResult({
              error: Error()
            }), evaluateResult) : evaluateResult)(remainingPegs, isCenter);
            this.resultLabel.string = "\u606D\u559C! \u5269\u4F59 " + remainingPegs + " \u9897. \u8BC4\u4EF7: " + result + ". \u6B65\u6570: " + this.stepCount;
            console.log("Victory! Remaining pegs: " + remainingPegs + ", center: " + isCenter + ", result: " + result + ", steps: " + this.stepCount);
            setTimeout(() => {
              this.currentLevelIndex++;
              this.loadLevel(this.currentLevelIndex);
            }, 3000);
            return;
          }

          if (remainingPegs > 1 && !this.hasValidMove()) {
            console.log("No valid moves remaining");
            var foundCenterPeg = false;

            if (this.boardState[(_crd && CENTER_POS === void 0 ? (_reportPossibleCrUseOfCENTER_POS({
              error: Error()
            }), CENTER_POS) : CENTER_POS).row][(_crd && CENTER_POS === void 0 ? (_reportPossibleCrUseOfCENTER_POS({
              error: Error()
            }), CENTER_POS) : CENTER_POS).col] === (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
              error: Error()
            }), TILE_STATE) : TILE_STATE).PEG) {
              foundCenterPeg = true;
            }

            var _result = (_crd && evaluateResult === void 0 ? (_reportPossibleCrUseOfevaluateResult({
              error: Error()
            }), evaluateResult) : evaluateResult)(remainingPegs, foundCenterPeg);

            this.resultLabel.string = "\u6E38\u620F\u7ED3\u675F! \u5269\u4F59 " + remainingPegs + " \u9897. \u8BC4\u4EF7: " + _result + ". \u6B65\u6570: " + this.stepCount;
          }
        }

        hasValidMove() {
          var directions = [[0, 2], [0, -2], [2, 0], [-2, 0]];

          for (var r1 = 0; r1 < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
            error: Error()
          }), BOARD_SIZE) : BOARD_SIZE); r1++) {
            for (var c1 = 0; c1 < (_crd && BOARD_SIZE === void 0 ? (_reportPossibleCrUseOfBOARD_SIZE({
              error: Error()
            }), BOARD_SIZE) : BOARD_SIZE); c1++) {
              if (this.boardState[r1][c1] === (_crd && TILE_STATE === void 0 ? (_reportPossibleCrUseOfTILE_STATE({
                error: Error()
              }), TILE_STATE) : TILE_STATE).PEG) {
                for (var [dr, dc] of directions) {
                  var r2 = r1 + dr;
                  var c2 = c1 + dc;

                  if (this.checkJumpValidity(r1, c1, r2, c2)) {
                    console.log("Found valid move from (" + r1 + ", " + c1 + ") to (" + r2 + ", " + c2 + ")");
                    return true;
                  }
                }
              }
            }
          }

          return false;
        }

        nextLevel() {
          console.log("Loading next level");
          this.currentLevelIndex++;
          this.loadLevel(this.currentLevelIndex);
        } // 修改：重玩功能


        retryLevel() {
          console.log("Retrying current level");
          this.clearHistory(); // 清空历史记录

          this.loadLevel(this.currentLevelIndex);
        }

        spawnPeg(r, c) {
          if (!this.PegPrefab) {
            console.error("Cannot spawn peg: PegPrefab is null");
            return;
          }

          var pegNode = instantiate(this.PegPrefab);
          pegNode.parent = this.boardRoot;
          var uiTransform = pegNode.getComponent(UITransform);

          if (uiTransform) {
            uiTransform.setContentSize(TILE_SIZE, TILE_SIZE);
          }

          var pegComp = pegNode.getComponent(_crd && Peg === void 0 ? (_reportPossibleCrUseOfPeg({
            error: Error()
          }), Peg) : Peg);

          if (!pegComp) {
            console.error("Peg Prefab missing Peg component!");
            pegNode.destroy();
            return;
          }

          pegComp.init(r, c, this);
          pegNode.setPosition(this.getPegLocalPosition(r, c)); // 保存节点到Map

          var key = r + "," + c;
          this.pegNodes.set(key, pegNode);
          console.log("Spawned peg at (" + r + ", " + c + ")");
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "PegPrefab", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "boardRoot", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "feedbackNode", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "resultLabel", [_dec5], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor5 = _applyDecoratedDescriptor(_class2.prototype, "stepCounterLabel", [_dec6], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor6 = _applyDecoratedDescriptor(_class2.prototype, "tipsLabel", [_dec7], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=8a2f6377ed988cf78588938d67b96f62697bb7f4.js.map