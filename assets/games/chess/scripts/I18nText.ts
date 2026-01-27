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
    private isInitialized: boolean = false;
    
    protected onLoad() {
        this.findTextComponent();
        
        // 如果键名为空，使用节点名
        if (!this.textKey || this.textKey.trim() === '') {
            this.textKey = this.node.name;
            console.log(`[I18nText] ${this.node.name}: Using node name as key`);
        }
        
        // 立即尝试更新
        this.tryUpdateText();
        
        // 监听语言变化
        const i18nManager = I18nManager.getInstance();
        if (i18nManager) {
            i18nManager.node.on('language-changed', this.updateText, this);
        }
    }
    
    private findTextComponent() {
        this.label = this.getComponent(Label);
        if (!this.label) {
            this.richText = this.getComponent(RichText);
        }
        
        // 如果是按钮，找按钮内的Label
        if (!this.label && !this.richText) {
            const button = this.getComponent(Button);
            if (button) {
                this.label = button.node.getComponentInChildren(Label);
            }
        }
    }
    
    private tryUpdateText() {
        const i18nManager = I18nManager.getInstance();
        
        if (!i18nManager) {
            console.log(`[I18nText] ${this.node.name}: No I18nManager, retrying...`);
            this.scheduleOnce(() => this.tryUpdateText(), 0.3);
            return;
        }
        
        if (!i18nManager.isLoadedState()) {
            console.log(`[I18nText] ${this.node.name}: I18nManager not loaded, retrying...`);
            this.scheduleOnce(() => this.tryUpdateText(), 0.3);
            return;
        }
        
        this.updateText();
    }
    
    public updateText() {
        const i18nManager = I18nManager.getInstance();
        if (!i18nManager) return;
        
        const text = i18nManager.t(this.textKey, ...this.params);
        
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