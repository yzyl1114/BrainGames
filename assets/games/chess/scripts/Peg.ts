// assets/games/chess/scripts/Peg.ts

import { _decorator, Component, Node, Sprite, Color, UITransform, EventTouch } from 'cc';
import { BoardController } from './BoardController';

const { ccclass, property } = _decorator;

@ccclass('Peg')
export class Peg extends Component {
    // 逻辑坐标
    public row: number = -1;
    public col: number = -1;
    
    // 引用主控制器，用于将输入转发给它
    private boardController: BoardController = null;
    
    // 棋子本体（Sprite组件所在节点，用于切换外观）
    @property(Node)
    public pegGraphic: Node = null;

    // 棋子激活状态的视觉反馈
    private isActive: boolean = false;
    
    onLoad() {
        if (!this.pegGraphic) {
            console.error("Peg component requires pegGraphic node reference.");
        }
        
        // 【关键修复1】确保有UITransform组件来接收输入
        if (!this.getComponent(UITransform)) {
            console.error("Peg Node is missing UITransform for input detection!");
        }
        
        // 【关键修复2】完整注册所有触摸事件
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        
        console.log(`Peg: Event listeners registered for node at (${this.row}, ${this.col})`);
    }
    
    /**
     * 初始化棋子逻辑坐标和控制器引用
     */
    public init(row: number, col: number, controller: BoardController) {
        this.row = row;
        this.col = col;
        this.boardController = controller;
        console.log(`Peg: Initialized at (${row}, ${col})`);
    }

    /**
     * 设置激活/非激活状态（用于选中状态）
     * @param active 是否激活
     */
    public setActive(active: boolean) {
        this.isActive = active;
        
        if (this.pegGraphic) {
             const sprite = this.pegGraphic.getComponent(Sprite);
             if (sprite) {
                 // 视觉效果：激活时变黄，非激活时恢复白色
                 sprite.color = active ? Color.YELLOW : Color.WHITE; 
             }
        }
    }
    
    // ================== 交互处理：转发给 BoardController ==================
    
    private onTouchStart(event: EventTouch) {
        console.log(`Peg ${this.row}, ${this.col} Touch Start!`);

        if (this.boardController) {
            this.boardController.handlePegTouchStart(this, event);
        }
    }
    
    private onTouchMove(event: EventTouch) {
        console.log(`Peg ${this.row}, ${this.col} Touch Move!`);
        
        if (this.boardController) {
            this.boardController.handlePegTouchMove(this, event);
        }
    }
    
    private onTouchEnd(event: EventTouch) {
        console.log(`Peg ${this.row}, ${this.col} Touch End!`);
        
        if (this.boardController) {
            this.boardController.handlePegTouchEnd(this, event);
        }
    }
    
    private onTouchCancel(event: EventTouch) {
        console.log(`Peg ${this.row}, ${this.col} Touch Cancel!`);
        this.onTouchEnd(event);
    }
}