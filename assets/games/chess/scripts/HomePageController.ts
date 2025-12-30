// assets/games/chess/scripts/HomePageController.ts

import { _decorator, Component, Node, Label, Button, director, find } from 'cc';
import { LevelSelection } from './LevelSelection';

const { ccclass, property } = _decorator;

@ccclass('HomePageController')
export class HomePageController extends Component {
    @property(Node)
    public levelSelectionNode: Node = null; // 关卡选择页节点
    
    @property(Label)
    public titleLabel: Label = null; // 标题
    
    @property(Button)
    public chessGameButton: Button = null; // 钻石棋游戏入口按钮
    
    protected onLoad() {
        console.log("HomePageController: onLoad");
        
        // 【添加】调试信息
        console.log("🔍 HomePage节点调试:");
        console.log("节点位置:", this.node.position);
        console.log("节点缩放:", this.node.scale);
        console.log("节点active:", this.node.active);
        
        const transform = this.node.getComponent(cc.UITransform);
        if (transform) {
            console.log("节点尺寸:", transform.contentSize);
        }
        
        // 检查子节点
        console.log("📦 子节点列表:");
        this.node.children.forEach((child, index) => {
            console.log(`  [${index}] ${child.name}:`, {
                active: child.active,
                position: child.position,
                scale: child.scale
            });
        });
        
        // 【添加】专门检查游戏卡片
        const cardNode = this.node.getChildByName('ChessGameCard');
        if (cardNode) {
            console.log("🎮 找到游戏卡片:", {
                name: cardNode.name,
                active: cardNode.active,
                position: cardNode.position,
                scale: cardNode.scale,
                worldPos: cardNode.worldPosition
            });
            
            const cardTransform = cardNode.getComponent(cc.UITransform);
            if (cardTransform) {
                console.log("卡片尺寸:", cardTransform.contentSize);
            }
        } else {
            console.error("❌ 未找到ChessGameCard节点！请检查预制体结构");
        }
        
        // 绑定按钮事件
        if (this.chessGameButton) {
            console.log("✅ 找到ChessGameButton按钮");
            this.chessGameButton.node.on(cc.Button.EventType.CLICK, this.onChessGameClicked, this);
        } else {
            console.error("❌ ChessGameButton按钮未找到或未连接");
        }
        
        // 【重要】确保首页是唯一显示的页面
        this.ensureOnlyHomePageVisible();
    }
 
    private ensureOnlyHomePageVisible() {
        // 隐藏其他可能的页面
        const levelSelection = find('Canvas/LevelSelection');
        if (levelSelection) {
            levelSelection.active = false;
        }
        
        const gameUI = find('Canvas/GameUI');
        if (gameUI) {
            gameUI.active = false;
        }
        
        const boardRoot = find('Canvas/BoardRoot');
        if (boardRoot) {
            boardRoot.active = false;
        }
    }

    private initUI() {
        // 设置标题
        if (this.titleLabel) {
            this.titleLabel.string = "我CPU烧了";
        }
    }
    
    private onChessGameClicked() {
        console.log("点击钻石棋游戏入口");
        
        // 隐藏首页
        this.node.active = false;
        
        // 显示关卡选择页
        if (this.levelSelectionNode) {
            this.levelSelectionNode.active = true;
            
            // 刷新关卡选择页数据
            const levelSelection = this.levelSelectionNode.getComponent(LevelSelection);
            if (levelSelection && levelSelection.show) {
                levelSelection.show();
            }
        } else {
            console.error("LevelSelectionNode not assigned!");
        }
    }
    
    // 从关卡选择页返回到首页
    public show() {
        this.node.active = true;
        console.log("显示首页");

        // 【建议添加】确保其他页面隐藏
        this.ensureOnlyHomePageVisible();
    }
}