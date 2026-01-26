// assets/games/chess/scripts/I18nText.ts
import { _decorator, Component, Label, Sprite } from 'cc';
import { I18nManager } from './I18nManager';

const { ccclass, property } = _decorator;

@ccclass('I18nText')
export class I18nText extends Component {
    @property
    textKey: string = '';
    
    @property({ type: [String] })
    params: string[] = [];
    
    private label: Label = null;
    private i18n: I18nManager = null;
    
    protected onLoad() {
        this.label = this.getComponent(Label);
        this.i18n = I18nManager.getInstance();
        
        this.updateText();
        
        // 监听语言变化
        const i18nNode = find('I18nManager');
        if (i18nNode) {
            i18nNode.on('language-changed', this.updateText, this);
        }
    }
    
    private updateText() {
        if (!this.label || !this.i18n) return;
        
        const text = this.i18n.t(this.textKey, ...this.params);
        this.label.string = text;
    }
    
    protected onDestroy() {
        const i18nNode = find('I18nManager');
        if (i18nNode) {
            i18nNode.off('language-changed', this.updateText, this);
        }
    }
}