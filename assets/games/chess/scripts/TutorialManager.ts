// assets/games/chess/scripts/TutorialManager.ts

import { _decorator, Component, Node, Prefab, instantiate, Button, Label, RichText, ScrollView, UITransform, Color, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TutorialManager')
export class TutorialManager extends Component {
    @property(Prefab)
    public tutorialPanelPrefab: Prefab = null; // 教学弹窗预制体
    
    private tutorialPanel: Node = null; // 弹窗实例
    private isShowing: boolean = false;
    
    // 教学内容配置
    private tutorialContents = [
        {
            title: "钻石棋简明教学",
            content: `🎯 <color=#333333><b>游戏目标</b></color>
通过跳吃让棋子减少，直至只剩1颗棋子在中心位置！


🎮 <color=#333333><b>如何操作</b></color>
1️⃣ 点击选中棋子
2️⃣ 拖到目标位置松手
3️⃣ 目标位置无效则棋子归位


✅ <color=#333333><b>跳吃规则</b></color>
• 只能跳过相邻棋子
• 跳到空位（中间有1颗棋子）
• 被跳棋子自动移除


⚡ <color=#333333><b>操作提示</b></color>
• 重玩：重新开始当前关
• 悔棋：撤销上一步
• 教学：随时查看本说明


💡 <color=#333333><b>策略建议</b></color>
• 先观察，再移动，优先向中心移动，规划连续跳吃路线。


<color=#888888><i>祝你玩得开心！</i></color>`
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

        // 调试层级
        this.debugPanelHierarchy();

        // 修复背景层级
        this.fixBackgroundLayer();
        
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
        
        // 设置内容 - 直接使用富文本
        const contentText = this.tutorialPanel.getChildByPath('PopupWindow/ContentScrollView/view/content/TextContent');
        if (contentText) {
            const richText = contentText.getComponent(RichText);
            if (richText) {
                richText.string = tutorialData.content;
                console.log('[Tutorial] 富文本教学内容已设置');
                
                // 调整文本区域宽度
                this.adjustRichTextSize(richText);
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
     * 将HTML内容转换为纯文本
     */
    private cleanHtmlToPlainText(html: string): string {
        if (!html) return '';
        
        let text = html;
        
        // 1. 替换特定的HTML实体
        const htmlEntities: {[key: string]: string} = {
            '&nbsp;': ' ',
            '&lt;': '<',
            '&gt;': '>',
            '&amp;': '&',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'"
        };
        
        Object.keys(htmlEntities).forEach(entity => {
            text = text.replace(new RegExp(entity, 'g'), htmlEntities[entity]);
        });
        
        // 2. 替换换行标签为实际换行符
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<\/p>/gi, '\n');
        text = text.replace(/<\/div>/gi, '\n');
        
        // 3. 移除所有HTML标签
        text = text.replace(/<[^>]*>/g, '');
        
        // 4. 清理多余的空白字符
        text = text.replace(/\n\s*\n/g, '\n\n'); // 多个空行合并为双空行
        text = text.replace(/[ \t]+/g, ' ');      // 合并多个空格
        text = text.replace(/^\s+|\s+$/g, '');    // 去除首尾空格
        text = text.replace(/\n\s+|\s+\n/g, '\n'); // 清理行首行尾空格
        
        return text;
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