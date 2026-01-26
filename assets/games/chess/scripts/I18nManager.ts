// assets/games/chess/scripts/I18nManager.ts
import { _decorator, Component, resources, JsonAsset } from 'cc';
const { ccclass, property } = _decorator;

export enum Language {
    ZH_CN = 'zh-CN',
    EN_US = 'en-US'
}

@ccclass('I18nManager')
export class I18nManager extends Component {
    private static instance: I18nManager = null;
    
    private currentLanguage: Language = Language.EN_US; // 默认英文（针对Crazy Games）
    private localeData: Map<string, string> = new Map();
    private isLoaded: boolean = false;
    
    public static getInstance(): I18nManager {
        return I18nManager.instance;
    }
    
    protected onLoad() {
        if (I18nManager.instance && I18nManager.instance !== this) {
            this.destroy();
            return;
        }
        I18nManager.instance = this;
        
        // 检测平台/环境
        this.detectPlatformLanguage();
        
        // 加载语言包
        this.loadLanguagePack();
    }
    
    /**
     * 检测平台语言
     */
    private detectPlatformLanguage() {
        // 可以根据不同发布平台设置不同默认语言
        // 比如：抖音小程序默认中文，Crazy Games默认英文
        
        // 这里可以添加平台检测逻辑
        // 例如：if (platform === 'douyin') this.currentLanguage = Language.ZH_CN;
        // else if (platform === 'crazygames') this.currentLanguage = Language.EN_US;
    }
    
    /**
     * 加载语言包
     */
    private loadLanguagePack() {
        const langFile = `games/chess/locales/${this.currentLanguage}`;
        
        resources.load(langFile, JsonAsset, (err, asset) => {
            if (err) {
                console.error('Failed to load language pack:', err);
                return;
            }
            
            this.localeData.clear();
            const data = asset.json;
            
            Object.keys(data).forEach(key => {
                this.localeData.set(key, data[key]);
            });
            
            this.isLoaded = true;
            console.log(`Language pack loaded: ${this.currentLanguage}`);
            
            // 通知所有组件语言已加载
            this.node.emit('language-changed', this.currentLanguage);
        });
    }
    
    /**
     * 获取翻译文本
     */
    public t(key: string, ...args: any[]): string {
        if (!this.isLoaded) {
            console.warn('Language pack not loaded yet');
            return key;
        }
        
        let text = this.localeData.get(key) || key;
        
        // 处理参数替换 {0}, {1}...
        if (args.length > 0) {
            args.forEach((arg, index) => {
                text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), arg.toString());
            });
        }
        
        return text;
    }
    
    /**
     * 切换语言（如果需要）
     */
    public setLanguage(lang: Language) {
        if (this.currentLanguage !== lang) {
            this.currentLanguage = lang;
            this.loadLanguagePack();
        }
    }
    
    /**
     * 获取当前语言
     */
    public getCurrentLanguage(): Language {
        return this.currentLanguage;
    }
}