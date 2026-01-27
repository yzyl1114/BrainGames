// assets/games/chess/scripts/I18nManager.ts
import { _decorator, Component, resources, JsonAsset } from 'cc';
const { ccclass, property } = _decorator;

export enum Language {
    ZH_CN = 'zh-CN',
    EN_US = 'en-US'
}

@ccclass('I18nManager')
export class I18nManager extends Component {
    private static _instance: I18nManager = null;
    
    @property
    languagePackPath: string = 'scripts/Language';
    
    private currentLanguage: Language = Language.EN_US;
    private localeData: Map<string, string> = new Map();
    private isLoaded: boolean = false;
    
    // 简化的单例获取
    public static getInstance(): I18nManager {
        return I18nManager._instance;
    }
    
    // 静态翻译方法
    public static t(key: string, ...args: any[]): string {
        const instance = I18nManager._instance;
        if (!instance) {
            console.warn(`[I18nManager.t] No instance for key: ${key}`);
            return key;
        }
        return instance.t(key, ...args);
    }
    
    protected onLoad() {
        console.log('[I18nManager] onLoad - Initializing');
        
        // 简单的单例设置
        if (I18nManager._instance && I18nManager._instance !== this) {
            console.log('[I18nManager] Duplicate instance, destroying this one');
            this.node.destroy();
            return;
        }
        
        I18nManager._instance = this;
        console.log('[I18nManager] ✅ Instance set');
        
        // 【重要修改】强制设置为英文（针对Crazy Games）
        this.currentLanguage = Language.EN_US;
        console.log('[I18nManager] 强制设置为英文（Crazy Games版本）');
        
        // 【新增】如果需要测试中文，取消下面这行的注释
        // this.currentLanguage = Language.ZH_CN;
        
        // 立即加载语言数据
        this.loadLanguageData();
        
        // 【新增】确保节点名称为I18nManager，方便其他组件查找
        this.node.name = 'I18nManager';
        
        // 【新增】调试信息
        console.log(`[I18nManager] 初始化完成，语言: ${this.currentLanguage}`);
        console.log(`[I18nManager] 语言包路径: ${this.languagePackPath}`);
    }
    
    private detectLanguage() {
        this.currentLanguage = Language.EN_US;
        
        console.log('[I18nManager] 强制设置为英文（Crazy Games版本）');
        
        // 如果需要测试中文，可以取消注释下面这行
        // this.currentLanguage = Language.ZH_CN;
    }
    
    public loadLanguageData() {
        console.log(`[I18nManager] 开始加载语言数据: ${this.currentLanguage}`);
        
        if (!this.languagePackPath) {
            console.error('[I18nManager] 语言包路径未设置');
            return;
        }
        
        // 加载外部JSON文件
        resources.load(this.languagePackPath, JsonAsset, (err, asset) => {
            if (err) {
                console.error(`[I18nManager] 加载语言包失败: ${err.message}`);
                console.log(`[I18nManager] 路径: ${this.languagePackPath}`);
                
                // 【新增】加载失败时使用内置的默认数据作为备份
                this.loadFallbackData();
                return;
            }
            
            if (asset?.json) {
                console.log(`[I18nManager] ✅ 外部语言文件加载成功`);
                this.processExternalData(asset.json);
            } else {
                console.error('[I18nManager] 加载的语言包数据为空');
                this.loadFallbackData();
            }
        });
    }
    
    // 【新增】处理外部语言文件数据
    private processExternalData(externalData: any) {
        if (!externalData) {
            console.error('[I18nManager] 外部数据为空');
            this.loadFallbackData();
            return;
        }
        
        this.localeData.clear();
        
        const langData = externalData[this.currentLanguage];
        if (langData) {
            Object.keys(langData).forEach(key => {
                this.localeData.set(key, langData[key]);
            });
            
            this.isLoaded = true;
            console.log(`[I18nManager] ✅ 语言数据加载完成: ${this.currentLanguage}`);
            console.log(`[I18nManager] 加载条目数: ${this.localeData.size}`);
            
            // 通知更新
            this.scheduleOnce(() => {
                this.node.emit('language-changed', this.currentLanguage);
                console.log(`[I18nManager] 发送语言变化事件: ${this.currentLanguage}`);
            }, 0.1);
            
            // 【新增】调试：显示前几个键值
            const keys = Array.from(this.localeData.keys()).slice(0, 5);
            console.log(`[I18nManager] 前5个键值:`, keys.map(key => `${key}: ${this.localeData.get(key)}`));
        } else {
            console.error(`[I18nManager] 未找到 ${this.currentLanguage} 的语言数据`);
            this.loadFallbackData();
        }
    }
    
    // 【新增】加载后备数据（当外部文件加载失败时使用）
    private loadFallbackData() {
        console.log(`[I18nManager] 使用后备数据: ${this.currentLanguage}`);
        
        // 简化版的基础数据，确保关键功能正常
        const fallbackData = {
            "zh-CN": {
                "gameTitle": "独粒钻石棋",
                "selectLevel": "选择关卡",
                "retry": "重玩",
                "undo": "悔棋",
                "back": "返回",
                "homeBack": "返回首页",
                "level": "关卡",
                "remaining": "剩余",
                "step": "步",
                "tutorial": "教学"
            },
            "en-US": {
                "gameTitle": "Diamond Chess",
                "selectLevel": "Select Level",
                "retry": "Retry",
                "undo": "Undo",
                "back": "Back",
                "homeBack": "Back to Home",
                "level": "Level",
                "remaining": "Remaining",
                "step": "step",
                "tutorial": "Tutorial"
            }
        };
        
        this.localeData.clear();
        
        const langData = fallbackData[this.currentLanguage] || fallbackData['en-US'];
        if (langData) {
            Object.keys(langData).forEach(key => {
                this.localeData.set(key, langData[key]);
            });
            
            this.isLoaded = true;
            console.log(`[I18nManager] ✅ 后备数据加载完成: ${this.currentLanguage}`);
            console.log(`[I18nManager] 后备数据条目数: ${this.localeData.size}`);
            
            // 通知更新
            this.scheduleOnce(() => {
                this.node.emit('language-changed', this.currentLanguage);
                console.log(`[I18nManager] 发送后备语言变化事件`);
            }, 0.1);
        }
    }
    
    public t(key: string, ...args: any[]): string {
        if (!this.isLoaded) {
            console.warn(`[I18nManager] 语言数据未加载，键: ${key}`);
            
            // 即使未加载也返回键名，避免界面显示undefined
            if (args.length > 0) {
                return this.replaceParams(key, args);
            }
            return key;
        }
        
        let text = this.localeData.get(key);
        if (!text) {
            console.warn(`[I18nManager] 键未找到: ${key}`);
            
            // 如果键包含数字，可能是动态键（如level_1），尝试去掉数字
            if (key.includes('_')) {
                const baseKey = key.split('_')[0];
                text = this.localeData.get(baseKey);
            }
            
            if (!text) {
                // 如果还是找不到，返回键本身
                text = key;
            }
        }
        
        // 修复参数替换的正则表达式问题
        if (args.length > 0) {
            return this.replaceParams(text, args);
        }
        
        return text;
    }
    
    private replaceParams(text: string, args: any[]): string {
        let result = text;
        for (let i = 0; i < args.length; i++) {
            const placeholder = `{${i}}`;
            // 安全替换，避免正则问题
            result = result.split(placeholder).join(args[i].toString());
        }
        return result;
    }
    
    // 其他方法
    public getCurrentLanguage(): Language {
        return this.currentLanguage;
    }
    
    public isLoadedState(): boolean {
        return this.isLoaded;
    }
    
    public setLanguage(lang: Language) {
        if (this.currentLanguage !== lang) {
            this.currentLanguage = lang;
            console.log(`[I18nManager] 切换语言到: ${lang}`);
            this.loadLanguageData();
        }
    }
    
    // 【新增】重新加载语言数据的方法
    public reloadLanguageData() {
        console.log(`[I18nManager] 重新加载语言数据`);
        this.isLoaded = false;
        this.localeData.clear();
        this.loadLanguageData();
    }
    
    // 【新增】获取所有可用键
    public getAllKeys(): string[] {
        return Array.from(this.localeData.keys());
    }
    
    // 【新增】检查键是否存在
    public hasKey(key: string): boolean {
        return this.localeData.has(key);
    }
    
    protected onDestroy() {
        if (I18nManager._instance === this) {
            I18nManager._instance = null;
            console.log('[I18nManager] 实例已销毁');
        }
    }
}