// assets/games/chess/scripts/HomePageController.ts

import { _decorator, Component, Node, Label, Button, director, find } from 'cc';
import { LevelSelection } from './LevelSelection';

const { ccclass, property } = _decorator;

@ccclass('HomePageController')
export class HomePageController extends Component {
    @property(Node)
    public levelSelectionNode: Node = null;
    
    @property(Label)
    public titleLabel: Label = null;
    
    @property(Button)
    public startGameButton: Button = null;
    
    protected onLoad() {
        // 【重要】只绑定开始游戏按钮事件
        if (this.startGameButton) {
            console.log('绑定开始游戏按钮事件');
            this.startGameButton.node.on(Button.EventType.CLICK, this.onStartGameClicked, this);
        } else {
            console.error("StartGameButton按钮未找到或未连接");
        }
        
        // 确保首页是唯一显示的页面
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

    private onStartGameClicked() {
        console.log('开始游戏按钮被点击');
        
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
            console.error("LevelSelectionNode未分配!");
        }
    }

    private initUI() {
        if (this.titleLabel) {
            this.titleLabel.string = "独粒钻石棋";
        }
    }
    
    private onChessGameClicked() {
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
            console.error("LevelSelectionNode未分配!");
        }
    }
    
    // 从关卡选择页返回到首页
    public show() {
        this.node.active = true;
        this.ensureOnlyHomePageVisible();
    }
}