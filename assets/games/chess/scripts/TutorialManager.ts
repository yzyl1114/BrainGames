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
            content: `<color=#4CAF50><size=30><b>游戏目标</b></size></color>
    <color=#2196F3><b>核心目标</b></color>：通过跳吃的方式，让棋盘上的棋子尽可能减少。

    <color=#FF9800><b>最终评价</b></color>：
    • <color=#E91E63><b>天才</b></color>：只剩1颗棋子在<color=#9C27B0>中心位置(3,3)</color>
    • <color=#FF5722><b>大师</b></color>：只剩1颗棋子（非中心）
    • <color=#FFC107><b>尖子</b></color>：剩余3颗棋子
    • <color=#8BC34A><b>聪明</b></color>：剩余4颗棋子
    • <color=#00BCD4><b>颇好</b></color>：剩余5颗棋子

    <br/>
    <color=#4CAF50><size=30><b>游戏规则</b></size></color>

    <color=#2196F3><b>1. 移动方式</b></color>
    • 选中一颗棋子（会变<color=#FFEB3B>黄色</color>）
    • 拖动到目标位置

    <color=#2196F3><b>2. 跳吃条件</b></color>
    • 只能跳过<color=#FF9800>相邻的棋子</color>
    • 跳到<color=#4CAF50>空位</color>（显示绿色提示）
    • 被跳过的棋子会被<color=#F44336>移除</color>

    <color=#2196F3><b>3. 无效移动</b></color>
    • 拖动到已有棋子的位置（红色提示）
    • 拖动到棋盘外
    • 拖动距离不合适

    <color=#2196F3><b>4. 胜利条件</b></color>
    • 只剩1颗棋子 → <color=#4CAF50>游戏胜利</color>

    <color=#2196F3><b>5. 失败条件</b></color>
    • 无合法移动且棋子数>1 → <color=#F44336>游戏结束</color>

    <br/>
    <color=#4CAF50><size=30><b>操作说明</b></size></color>

    <color=#2196F3><b>鼠标/触摸操作</b></color>
    • <color=#FFEB3B>点击棋子</color>：选中（变为黄色）
    • <color=#4CAF50>拖动到绿色位置</color>：执行跳吃
    • <color=#F44336>拖动到红色位置</color>：取消，棋子归位
    • <color=#9E9E9E>松开无效位置</color>：自动返回原位

    <color=#2196F3><b>游戏界面按钮</b></color>
    • <color=#2196F3>【重玩】</color>：重新开始当前关卡
    • <color=#FF9800>【悔棋】</color>：撤销上一步操作（最多5次）
    • <color=#9C27B0>【返回】</color>：回到关卡选择页面
    • <color=#4CAF50>【教学】</color>：查看本教学（随时可看）

    <br/>
    <color=#4CAF50><size=30><b>高级技巧</b></size></color>

    <color=#2196F3><b>策略建议</b></color>
    1. <color=#FF9800>先观察全局</color>：不要急于移动
    2. <color=#4CAF50>中心优先</color>：尽量让棋子靠近中心
    3. <color=#9C27B0>连锁跳吃</color>：规划连续跳吃路线
    4. <color=#00BCD4>保留后路</color>：不要把自己堵死

    <br/>
    <color=#4CAF50><size=30><b>关卡系统</b></size></color>

    • <color=#2196F3>125个精心设计的关卡</color>
    • <color=#4CAF50>逐级解锁</color>：完成当前关卡解锁下一关
    • <color=#FF9800>进度保存</color>：自动保存最佳成绩
    • <color=#9C27B0>随时重玩</color>：可重复挑战提高评价

    <color=#E91E63><b>祝你游戏愉快！</b></color>`
        },
    ];
    
    protected onLoad() {
        // 确保预制体已加载
        if (!this.tutorialPanelPrefab) {
            console.log('[Tutorial] Tutorial panel prefab will be set later.');
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
        
        // 设置内容 - 现在使用 Label 而不是 RichText
        const contentText = this.tutorialPanel.getChildByPath('PopupWindow/ContentScrollView/view/content/TextContent');
        if (contentText) {
            // 使用 Label 组件
            const label = contentText.getComponent(Label);
            if (label) {
                // 直接使用纯文本（去掉富文本标签）
                const plainText = tutorialData.content
                    .replace(/<[^>]*>/g, '') // 移除所有HTML标签
                    .replace(/&nbsp;/g, ' ')  // 替换空格
                    .replace(/&lt;/g, '<')    // 替换 <
                    .replace(/&gt;/g, '>')    // 替换 >
                    .replace(/&amp;/g, '&')   // 替换 &
                    .replace(/\\n/g, '\n')    // 替换换行符
                    .trim();
                
                label.string = plainText;
                console.log('[Tutorial] 教学内容已设置到Label');
            } else {
                console.warn('[Tutorial] TextContent节点没有Label组件');
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
    
    public setTutorialPrefab(prefab: Prefab) {
        this.tutorialPanelPrefab = prefab;
        console.log('[Tutorial] Tutorial prefab set');
    }

    /**
     * 根据关卡动态调整教学内容
     */
    public setCurrentLevel(levelIndex: number) {
        console.log(`[Tutorial] Current level set to: ${levelIndex}`);
    }
    
    onDestroy() {
        if (this.tutorialPanel) {
            this.tutorialPanel.destroy();
        }
    }
}