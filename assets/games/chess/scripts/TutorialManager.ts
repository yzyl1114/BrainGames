// assets/games/chess/scripts/TutorialManager.ts

import { _decorator, Component, Node, Prefab, instantiate, Button, Label, RichText, ScrollView, UITransform, Color, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TutorialManager')
export class TutorialManager extends Component {
    @property(Prefab)
    public tutorialPanelPrefab: Prefab = null; // 教学弹窗预制体
    
    private tutorialPanel: Node = null; // 弹窗实例
    private isShowing: boolean = false;
    
    // 教学内容配置（可以根据关卡动态调整）
    private tutorialContents = [
        {
            title: "钻石棋游戏教学",
            content: `## 游戏目标
通过跳吃的方式，让棋盘上的棋子尽可能减少，最终目标是：
- **天才**：只剩1颗棋子在中心位置
- **大师**：只剩1颗棋子（非中心）
- **其他评价**：根据剩余棋子数量评价

## 游戏规则
1. **移动方式**：选中一颗棋子，拖动到目标位置
2. **跳吃条件**：只能跳过相邻棋子，跳到空位
3. **被吃棋子**：被跳过的棋子会被移除
4. **胜利条件**：只剩1颗棋子
5. **失败条件**：无合法移动且棋子数>1

## 操作说明
- **选中棋子**：点击棋子（变为黄色）
- **移动棋子**：拖动到可跳位置（绿色提示）
- **取消移动**：拖动到无效位置（红色提示）
- **悔棋**：点击悔棋按钮（最多5次）
- **重玩**：点击重玩按钮重新开始
- **关卡选择**：返回按钮选择其他关卡`
        },
        // 可以添加更多教学内容，比如高级技巧等
    ];
    
    protected onLoad() {
        // 确保预制体已加载
        if (!this.tutorialPanelPrefab) {
            console.error('[Tutorial] Tutorial panel prefab not assigned!');
        }
    }
    
    /**
     * 显示教学弹窗
     */
    public showTutorial(levelIndex: number = 0) {
        if (this.isShowing) return;
        
        if (!this.tutorialPanelPrefab) {
            console.error('[Tutorial] Cannot show tutorial: prefab missing');
            return;
        }
        
        // 实例化弹窗
        this.tutorialPanel = instantiate(this.tutorialPanelPrefab);
        
        // 挂载到Canvas
        const canvas = this.node.scene.getChildByName('Canvas');
        if (canvas) {
            this.tutorialPanel.parent = canvas;
            this.tutorialPanel.setSiblingIndex(canvas.children.length); // 置顶显示
        } else {
            this.tutorialPanel.parent = this.node;
        }
        
        // 居中显示
        this.tutorialPanel.setPosition(0, 0, 0);
        
        // 设置弹窗内容
        this.setupTutorialContent(levelIndex);
        
        // 绑定按钮事件
        this.bindButtonEvents();
        
        this.isShowing = true;
        
        console.log('[Tutorial] Tutorial panel shown');
    }
    
    /**
     * 设置教学内容
     */
    private setupTutorialContent(levelIndex: number) {
        const contentIndex = Math.min(levelIndex, this.tutorialContents.length - 1);
        const tutorialData = this.tutorialContents[contentIndex];
        
        // 设置标题
        const titleLabel = this.tutorialPanel.getChildByPath('PopupWindow/TitleLabel')?.getComponent(Label);
        if (titleLabel) {
            titleLabel.string = tutorialData.title;
        }
        
        // 设置内容
        const contentText = this.tutorialPanel.getChildByPath('PopupWindow/ContentScrollView/view/content/TextContent');
        if (contentText) {
            // 尝试使用RichText
            const richText = contentText.getComponent(RichText);
            if (richText) {
                // 处理Markdown格式（简化版）
                let formattedContent = tutorialData.content
                    .replace(/## (.*?)\n/g, '<size=30><color=#4CAF50><b>$1</b></color></size>\n')
                    .replace(/\*\*(.*?)\*\*/g, '<color=#FF9800><b>$1</b></color>')
                    .replace(/\n/g, '<br/>');
                
                richText.string = formattedContent;
            } else {
                // 使用普通Label
                const label = contentText.getComponent(Label);
                if (label) {
                    // 移除Markdown格式
                    const plainText = tutorialData.content
                        .replace(/#/g, '')
                        .replace(/\*\*/g, '');
                    label.string = plainText;
                }
            }
        }
        
        // 调整滚动视图
        const scrollView = this.tutorialPanel.getChildByPath('PopupWindow/ContentScrollView')?.getComponent(ScrollView);
        if (scrollView) {
            // 滚动到顶部
            setTimeout(() => {
                scrollView.scrollToTop();
            }, 100);
        }
    }
    
    /**
     * 绑定按钮事件
     */
    private bindButtonEvents() {
        // 关闭按钮
        const closeButton = this.tutorialPanel.getChildByPath('PopupWindow/CloseButton')?.getComponent(Button);
        if (closeButton) {
            closeButton.node.off(Button.EventType.CLICK);
            closeButton.node.on(Button.EventType.CLICK, this.hideTutorial, this);
        }
        
        // 确认按钮
        const confirmButton = this.tutorialPanel.getChildByPath('PopupWindow/BtnContainer/ConfirmButton')?.getComponent(Button);
        if (confirmButton) {
            confirmButton.node.off(Button.EventType.CLICK);
            confirmButton.node.on(Button.EventType.CLICK, this.hideTutorial, this);
        }
        
        // 背景点击关闭（可选）
        const background = this.tutorialPanel.getChildByPath('Background');
        if (background) {
            const button = background.getComponent(Button) || background.addComponent(Button);
            button.transition = Button.Transition.COLOR;
            button.normalColor = Color.TRANSPARENT;
            button.node.off(Button.EventType.CLICK);
            button.node.on(Button.EventType.CLICK, this.hideTutorial, this);
        }
    }
    
    /**
     * 隐藏教学弹窗
     */
    public hideTutorial() {
        if (!this.isShowing || !this.tutorialPanel) return;
        
        // 淡出动画（可选）
        this.tutorialPanel.destroy();
        this.tutorialPanel = null;
        this.isShowing = false;
        
        console.log('[Tutorial] Tutorial panel hidden');
    }
    
    /**
     * 检查是否正在显示
     */
    public isTutorialShowing(): boolean {
        return this.isShowing;
    }
    
    /**
     * 根据关卡动态调整教学内容
     */
    public setCurrentLevel(levelIndex: number) {
        // 可以根据关卡难度显示不同的教学重点
        console.log(`[Tutorial] Current level set to: ${levelIndex}`);
    }
    
    onDestroy() {
        if (this.tutorialPanel) {
            this.tutorialPanel.destroy();
        }
    }
}