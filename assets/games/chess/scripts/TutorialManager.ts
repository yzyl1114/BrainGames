// assets/games/chess/scripts/TutorialManager.ts

import { _decorator, Component, Node, Prefab, instantiate, Button, Label, RichText, ScrollView, UITransform, Color, Sprite, find } from 'cc';
import { I18nManager } from './I18nManager'; // 【新增】导入国际化管理器

const { ccclass, property } = _decorator;

@ccclass('TutorialManager')
export class TutorialManager extends Component {
    @property(Prefab)
    public tutorialPanelPrefab: Prefab = null; // 教学弹窗预制体
    
    private tutorialPanel: Node = null; // 弹窗实例
    private isShowing: boolean = false;
    private i18n: I18nManager = null; // 【新增】国际化管理器引用
    
    // 【修改】移除硬编码的教学内容，改为从语言包动态获取
    protected onLoad() {
        // 获取国际化管理器实例
        this.i18n = I18nManager.getInstance();
        if (!this.i18n) {
            console.warn('[Tutorial] I18nManager not found');
            // 创建一个临时的
            const i18nNode = new Node('TempI18nManager');
            this.node.parent?.addChild(i18nNode);
            this.i18n = i18nNode.addComponent(I18nManager);
        }
        
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

        // 调试层级
        this.debugPanelHierarchy();

        // 修复背景层级
        this.fixBackgroundLayer();
        
        // 设置弹窗内容（使用国际化）
        this.setupTutorialContent(levelIndex);
        
        // 绑定按钮事件
        this.bindButtonEvents();
        
        this.isShowing = true;
        
        console.log('[Tutorial] Tutorial panel shown');
    }
    
    /**
     * 设置教学内容（国际化版本）
     */
    private setupTutorialContent(levelIndex: number) {
        // 【修改】使用国际化管理器获取文本
        
        // 设置标题
        const titleLabel = this.tutorialPanel.getChildByPath('PopupWindow/TitleLabel')?.getComponent(Label);
        if (titleLabel && this.i18n) {
            titleLabel.string = this.i18n.t('tutorialTitle');
        } else if (titleLabel) {
            titleLabel.string = "规则教学"; // 回退到中文
        }
        
        // 设置内容 - 直接使用富文本
        const contentText = this.tutorialPanel.getChildByPath('PopupWindow/ContentScrollView/view/content/TextContent');
        if (contentText) {
            const richText = contentText.getComponent(RichText);
            if (richText && this.i18n) {
                // 【关键修改】构建富文本内容
                const tutorialContent = this.buildTutorialContent();
                richText.string = tutorialContent;
                console.log('[Tutorial] 国际化教学内容已设置');
                
                // 调整文本区域宽度
                this.adjustRichTextSize(richText);
            } else if (richText) {
                // 如果没有国际化管理器，使用原始内容
                richText.string = this.buildFallbackTutorialContent();
                console.log('[Tutorial] 使用回退教学内容');
            } else {
                console.error('[Tutorial] TextContent节点没有RichText组件！');
            }
        } else {
            console.error('[Tutorial] 找不到TextContent节点！');
        }
        
        // 调整滚动视图
        const scrollView = this.tutorialPanel.getChildByPath('PopupWindow/ContentScrollView')?.getComponent(ScrollView);
        if (scrollView) {
            setTimeout(() => {
                scrollView.scrollToTop();
            }, 100);
        }
    }
    
    /**
     * 构建国际化教学内容
     */
    private buildTutorialContent(): string {
        if (!this.i18n) {
            return this.buildFallbackTutorialContent();
        }
        
        const content = [
            `${this.i18n.t('tutorialGoal')}`,
            `${this.i18n.t('tutorialGoalDesc')}\n`,
            
            `${this.i18n.t('tutorialBasicControls')}`,
            `${this.i18n.t('tutorialBasicDesc')}\n`,
            
            `${this.i18n.t('tutorialCoreRules')}`,
            `${this.i18n.t('tutorialCoreDesc')}\n`,
            
            `${this.i18n.t('tutorialFeatures')}`,
            `${this.i18n.t('tutorialFeaturesDesc')}\n`,
            
            `${this.i18n.t('tutorialStrategy')}`,
            `${this.i18n.t('tutorialStrategyDesc')}\n`,
            
            `${this.i18n.t('tutorialTip')}`
        ];
        
        return content.join('\n');
    }
    
    /**
     * 构建回退教学内容（当国际化不可用时）
     */
    private buildFallbackTutorialContent(): string {
        return `
🎯 <b>游戏目标</b>
通过连续的「跳吃」移动，让棋盘上的棋子越来越少。
最终目标：只剩1颗棋子，并位于棋盘中心。

🎮 <b>基本操作</b>
1. 选中棋子：点击想要移动的棋子
2. 执行移动：拖拽到目标位置后松手
3. 无效操作：如果移动不合法，棋子会自动归位

✅ <b>核心规则：跳吃</b>
• 必要条件：只能跳过相邻的棋子
• 目标位置：必须跳到空位上
• 跳吃效果：被跳过的棋子自动移除
• 重要提示：每次移动必须跳过一颗棋子，不能空走

⚡ <b>游戏功能</b>
• 重玩：重新开始当前关卡
• 悔棋：撤销上一步操作
• 教学：随时查看本规则说明

💡 <b>通关策略</b>
1. 观察先行：先分析棋盘整体布局
2. 中心优先：尽量让棋子向中心聚集
3. 连续跳吃：规划能连续多次跳吃的路线
4. 预留空间：为后续跳吃留出空位

<color=#888888><i>🌟 小贴士：请耐心思考，祝您挑战成功！</i></color>`;
    }
    
    private adjustRichTextSize(richText: RichText) {
        const uiTransform = richText.node.getComponent(UITransform);
        if (!uiTransform) return;
        
        const scrollView = this.tutorialPanel.getChildByPath('PopupWindow/ContentScrollView')?.getComponent(ScrollView);
        if (scrollView) {
            const scrollViewTransform = scrollView.node.getComponent(UITransform);
            if (scrollViewTransform) {
                // 计算可用宽度（ScrollView宽度减去边距）
                const availableWidth = scrollViewTransform.contentSize.width - 40;
                
                // 设置富文本的最大宽度
                richText.maxWidth = availableWidth;
                uiTransform.setContentSize(availableWidth, uiTransform.contentSize.height);
                
                console.log(`[Tutorial] 富文本区域调整为: ${availableWidth}px 宽`);
            }
        }
    }
    
    /**
     * 绑定按钮事件（国际化按钮文本）
     */
    private bindButtonEvents() {
        // 关闭按钮
        const closeButton = this.tutorialPanel.getChildByPath('PopupWindow/CloseButton')?.getComponent(Button);
        if (closeButton && this.i18n) {
            // 更新关闭按钮文本（如果按钮上有Label）
            const closeLabel = closeButton.node.getComponentInChildren(Label);
            if (closeLabel) {
                closeLabel.string = this.i18n.t('close');
            }
            
            closeButton.node.off(Button.EventType.CLICK);
            closeButton.node.on(Button.EventType.CLICK, this.hideTutorial, this);
        }
        
        // 确认按钮
        const confirmButton = this.tutorialPanel.getChildByPath('PopupWindow/BtnContainer/ConfirmButton')?.getComponent(Button);
        if (confirmButton && this.i18n) {
            // 更新确认按钮文本
            const confirmLabel = confirmButton.node.getComponentInChildren(Label);
            if (confirmLabel) {
                confirmLabel.string = this.i18n.t('tutorialButton'); // 使用 "我知道了" 或 "I Understand"
            }
            
            confirmButton.node.off(Button.EventType.CLICK);
            confirmButton.node.on(Button.EventType.CLICK, this.hideTutorial, this);
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
    
    /**
     * 修复背景层级
     */
    private fixBackgroundLayer() {
        if (!this.tutorialPanel) return;
        
        const background = this.tutorialPanel.getChildByName('Background');
        if (background) {
            // 1. 设置Z轴位置（确保在最底层）
            background.setPosition(0, 0, -10); // Z轴负值，确保在最下面
            
            // 2. 确保在兄弟节点中最先（索引最小）
            background.setSiblingIndex(0);
            
            // 3. 检查并设置尺寸（确保覆盖全屏）
            const bgTransform = background.getComponent(UITransform);
            if (bgTransform) {
                const canvas = find('Canvas');
                if (canvas) {
                    const canvasTransform = canvas.getComponent(UITransform);
                    if (canvasTransform) {
                        bgTransform.setContentSize(canvasTransform.width, canvasTransform.height);
                        console.log('[Tutorial] 背景尺寸已设为全屏:', bgTransform.contentSize);
                    }
                }
            }
            
            // 4. 检查透明度
            const sprite = background.getComponent(Sprite);
            if (sprite) {
                // 确保不是完全透明
                if (sprite.color.a < 100) {
                    sprite.color = new Color(sprite.color.r, sprite.color.g, sprite.color.b, 180);
                    console.log('[Tutorial] 调整背景透明度为180');
                }
            }
            
            console.log('[Tutorial] 背景层级已修复，位置:', background.position, '兄弟索引:', background.getSiblingIndex());
        } else {
            console.warn('[Tutorial] 未找到Background节点');
            
            // 调试：列出所有子节点
            console.log('[Tutorial] 弹窗子节点:');
            this.tutorialPanel.children.forEach((child, index) => {
                console.log(`  [${index}] ${child.name}: pos=${child.position}, active=${child.active}`);
            });
        }
    }
    
    private debugPanelHierarchy() {
        if (!this.tutorialPanel) return;
        
        console.log('=== 教学弹窗层级调试 ===');
        console.log('弹窗根节点位置:', this.tutorialPanel.position);
        console.log('弹窗世界位置:', this.tutorialPanel.worldPosition);
        console.log('弹窗激活状态:', this.tutorialPanel.active);
        
        console.log('子节点列表:');
        this.tutorialPanel.children.forEach((child, index) => {
            const transform = child.getComponent(UITransform);
            const sprite = child.getComponent(Sprite);
            console.log(`  [${index}] ${child.name}:`);
            console.log(`    位置: ${child.position}`);
            console.log(`    世界位置: ${child.worldPosition}`);
            console.log(`    激活: ${child.active}`);
            console.log(`    尺寸: ${transform?.contentSize?.width}x${transform?.contentSize?.height}`);
            console.log(`    Sprite颜色: ${sprite?.color?.toString()}`);
            console.log(`    Sprite透明度: ${sprite?.color?.a}`);
        });
        
        // 检查Canvas上的所有UI
        const canvas = find('Canvas');
        if (canvas) {
            console.log('=== Canvas层级 ===');
            canvas.children.forEach((child, index) => {
                console.log(`  [${index}] ${child.name}: pos=${child.position}, active=${child.active}`);
            });
        }
    }
}