// assets/games/chess/scripts/I18nText.ts
import { _decorator, Component, Label, RichText, Button } from 'cc';
import { I18nManager } from './I18nManager';

const { ccclass, property } = _decorator;

@ccclass('I18nText')
export class I18nText extends Component {
    @property
    textKey: string = '';
    
    @property
    params: string[] = [];
    
    @property
    autoUpdate: boolean = true;
    
    private label: Label | null = null;
    private richText: RichText | null = null;
    
    protected onLoad() {
        this.findTextComponent();
        
        if (!this.textKey || this.textKey.trim() === '') {
            this.textKey = this.node.name;
            console.log(`[I18nText] ${this.node.name}: Using node name as key`);
        }
        
        // 【修改】更简单的初始化方式
        this.scheduleOnce(() => {
            this.tryUpdateText();
        }, 0.1);
        
        // 监听语言变化
        const i18nManager = I18nManager.getInstance();
        if (i18nManager) {
            i18nManager.node.on('language-changed', this.updateText, this);
        } else {
            // 如果还没有实例，稍后再监听
            this.scheduleOnce(() => {
                const manager = I18nManager.getInstance();
                if (manager) {
                    manager.node.on('language-changed', this.updateText, this);
                }
            }, 0.5);
        }
    }
    
    private findTextComponent() {
        this.label = this.getComponent(Label);
        if (!this.label) {
            this.richText = this.getComponent(RichText);
        }
        
        if (!this.label && !this.richText) {
            const button = this.getComponent(Button);
            if (button) {
                this.label = button.node.getComponentInChildren(Label);
            }
        }
    }
    
    private async tryUpdateText() {
        const i18nManager = I18nManager.getInstance();
        
        if (!i18nManager) {
            console.log(`[I18nText] ${this.node.name}: I18nManager 未找到，等待...`);
            
            // 等待实例
            try {
                const manager = await I18nManager.waitForInstance();
                if (manager) {
                    console.log(`[I18nText] ${this.node.name}: 获取到 I18nManager 实例`);
                    await manager.waitForLoad();
                    this.updateText();
                } else {
                    // 如果还是获取不到，使用默认文本
                    console.warn(`[I18nText] ${this.node.name}: 无法获取 I18nManager，使用后备方案`);
                    this.updateTextWithFallback();
                }
            } catch (error) {
                console.error(`[I18nText] ${this.node.name}: 等待实例出错`, error);
                this.updateTextWithFallback();
            }
            return;
        }
        
        // 检查是否已加载
        if (!i18nManager.isLoadedState()) {
            console.log(`[I18nText] ${this.node.name}: 等待 I18nManager 加载...`);
            await i18nManager.waitForLoad();
        }
        
        this.updateText();
    }
    
    private updateTextWithFallback() {
        // 简单的后备翻译
        const fallbackTranslations: { [key: string]: string } = {
            'level': 'Level',
            'retry': 'Retry',
            'undo': 'Undo',
            'back': 'Back',
            'remaining': 'Remaining',
            'step': 'step',
            'gameTitle': 'Diamond Chess',
            'selectLevel': 'Select Level'
        };
        
        let text = fallbackTranslations[this.textKey] || this.textKey;
        
        // 参数替换
        if (this.params.length > 0) {
            for (let i = 0; i < this.params.length; i++) {
                text = text.replace(`{${i}}`, this.params[i]);
            }
        }
        
        this.applyText(text);
    }
    
    public updateText() {
        const i18nManager = I18nManager.getInstance();
        if (!i18nManager) {
            console.warn(`[I18nText] ${this.node.name}: 更新文本时 I18nManager 不可用`);
            this.updateTextWithFallback();
            return;
        }
        
        const text = i18nManager.t(this.textKey, ...this.params);
        this.applyText(text);
    }
    
    private applyText(text: string) {
        if (this.label) {
            if (this.label.string !== text) {
                this.label.string = text;
                console.log(`[I18nText] ✅ ${this.node.name}: "${text}"`);
            }
        } else if (this.richText) {
            if (this.richText.string !== text) {
                this.richText.string = text;
                console.log(`[I18nText] ✅ ${this.node.name}: "${text}"`);
            }
        }
    }
    
    protected start() {
        if (this.autoUpdate) {
            this.scheduleOnce(() => {
                this.updateText();
            }, 0.2);
        }
    }
    
    protected onDestroy() {
        const i18nManager = I18nManager.getInstance();
        if (i18nManager) {
            i18nManager.node.off('language-changed', this.updateText, this);
        }
    }
}