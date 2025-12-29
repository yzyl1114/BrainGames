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
        
        // 绑定按钮事件
        if (this.chessGameButton) {
            this.chessGameButton.node.on(Button.EventType.CLICK, this.onChessGameClicked, this);
        }
        
        // 初始化UI状态
        this.initUI();
        
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