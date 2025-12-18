System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Sprite, Color, UITransform, _dec, _dec2, _class, _class2, _descriptor, _crd, ccclass, property, Peg;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }

  function _reportPossibleCrUseOfBoardController(extras) {
    _reporterNs.report("BoardController", "./BoardController", _context.meta, extras);
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
      Sprite = _cc.Sprite;
      Color = _cc.Color;
      UITransform = _cc.UITransform;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "72eb8U0gu9EKrFJEbuMJT23", "Peg", undefined); // assets/games/chess/scripts/Peg.ts


      __checkObsolete__(['_decorator', 'Component', 'Node', 'Sprite', 'Color', 'UITransform', 'EventTouch']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("Peg", Peg = (_dec = ccclass('Peg'), _dec2 = property(Node), _dec(_class = (_class2 = class Peg extends Component {
        constructor(...args) {
          super(...args);
          // 逻辑坐标
          this.row = -1;
          this.col = -1;
          // 引用主控制器，用于将输入转发给它
          this.boardController = null;

          // 棋子本体（Sprite组件所在节点，用于切换外观）
          _initializerDefineProperty(this, "pegGraphic", _descriptor, this);

          // 棋子激活状态的视觉反馈
          this.isActive = false;
        }

        onLoad() {
          if (!this.pegGraphic) {
            console.error("Peg component requires pegGraphic node reference.");
          } // 【关键修复1】确保有UITransform组件来接收输入


          if (!this.getComponent(UITransform)) {
            console.error("Peg Node is missing UITransform for input detection!");
          } // 【关键修复2】完整注册所有触摸事件


          this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
          this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
          this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
          this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
          console.log(`Peg: Event listeners registered for node at (${this.row}, ${this.col})`);
        }
        /**
         * 初始化棋子逻辑坐标和控制器引用
         */


        init(row, col, controller) {
          this.row = row;
          this.col = col;
          this.boardController = controller;
          console.log(`Peg: Initialized at (${row}, ${col})`);
        }
        /**
         * 设置激活/非激活状态（用于选中状态）
         * @param active 是否激活
         */


        setActive(active) {
          this.isActive = active;

          if (this.pegGraphic) {
            const sprite = this.pegGraphic.getComponent(Sprite);

            if (sprite) {
              // 视觉效果：激活时变黄，非激活时恢复白色
              sprite.color = active ? Color.YELLOW : Color.WHITE;
            }
          }
        } // ================== 交互处理：转发给 BoardController ==================


        onTouchStart(event) {
          console.log(`Peg ${this.row}, ${this.col} Touch Start!`);

          if (this.boardController) {
            this.boardController.handlePegTouchStart(this, event);
          }
        }

        onTouchMove(event) {
          console.log(`Peg ${this.row}, ${this.col} Touch Move!`);

          if (this.boardController) {
            this.boardController.handlePegTouchMove(this, event);
          }
        }

        onTouchEnd(event) {
          console.log(`Peg ${this.row}, ${this.col} Touch End!`);

          if (this.boardController) {
            this.boardController.handlePegTouchEnd(this, event);
          }
        }

        onTouchCancel(event) {
          console.log(`Peg ${this.row}, ${this.col} Touch Cancel!`);
          this.onTouchEnd(event);
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "pegGraphic", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=7adfd34315e352aa0126987c79345acfe858ab6c.js.map