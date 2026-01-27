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
            
            // 【新增】调试：显示关键键值
            this.debugKeyCheck();
            
            // 通知更新
            this.scheduleOnce(() => {
                this.node.emit('language-changed', this.currentLanguage);
                console.log(`[I18nManager] 发送语言变化事件: ${this.currentLanguage}`);
            }, 0.1);
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
                "level": "关卡 {0}",
                "remaining": "剩余",
                "step": "步",
                "tutorial": "教学",
                "moveCount": "移动{0}步",
                "remainingPieces": "剩余{0}子"
            },
            "en-US": {
                "gameTitle": "Diamond Chess",
                "selectLevel": "Select Level",
                "retry": "Retry",
                "undo": "Undo",
                "back": "Back",
                "homeBack": "Back to Home",
                "level": "Level {0}",
                "remaining": "Remaining",
                "step": "step",
                "tutorial": "Tutorial",
                "moveCount": "{0} moves",
                "remainingPieces": "{0} pieces left"
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
            
            // 【修改】即使未加载也提供基本翻译
            return this.getHardcodedTranslation(key, args);
        }
        
        let text = this.localeData.get(key);
        
        // 【新增】如果键未找到，尝试常见变体
        if (!text) {
            console.warn(`[I18nManager] 键未找到: ${key}`);
            
            // 尝试查找相似键（不区分大小写）
            const lowerKey = key.toLowerCase();
            for (const [k, v] of this.localeData) {
                if (k.toLowerCase() === lowerKey) {
                    text = v;
                    console.log(`[I18nManager] 找到相似键: ${k} -> ${key}`);
                    break;
                }
            }
            
            // 如果键包含数字，可能是动态键（如level_1），尝试去掉数字
            if (!text && key.includes('_')) {
                const baseKey = key.split('_')[0];
                text = this.localeData.get(baseKey);
                if (text) {
                    console.log(`[I18nManager] 使用基础键: ${baseKey} -> ${key}`);
                }
            }
            
            // 如果还是找不到，使用硬编码翻译
            if (!text) {
                console.warn(`[I18nManager] 无法找到键: ${key}，使用硬编码翻译`);
                return this.getHardcodedTranslation(key, args);
            }
        }
        
        // 【增强】参数替换逻辑
        if (args.length > 0) {
            try {
                return this.replaceParams(text, args);
            } catch (e) {
                console.error(`[I18nManager] 参数替换失败，键: ${key}, 文本: ${text}, 参数: ${args}`, e);
                
                // 尝试安全的替换
                return this.safeReplaceParams(text, args);
            }
        }
        
        return text;
    }
    
    // 【新增】安全参数替换方法
    private safeReplaceParams(text: string, args: any[]): string {
        let result = text;
        for (let i = 0; i < args.length; i++) {
            const placeholder = `{${i}}`;
            const argStr = args[i] !== undefined && args[i] !== null ? args[i].toString() : '';
            
            // 简单替换，避免正则问题
            result = result.split(placeholder).join(argStr);
        }
        return result;
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
    
    // 【新增】获取硬编码翻译
    private getHardcodedTranslation(key: string, args: any[]): string {
        // 常见键的硬编码英文翻译
        const hardcodedTranslations: { [key: string]: string } = {
            // 游戏页标题相关
            'level': 'Level {0}',
            'Level': 'Level {0}',
            'GameTitleLabel': 'Level {0}',
            
            // 结算弹窗相关
            'moveCount': '{0} moves',
            'remainingPieces': '{0} pieces left',
            'moveSteps': '{0} moves',
            'remainingPegs': '{0} pieces left',
            
            // 按钮文本
            'retry': 'Retry',
            'undo': 'Undo',
            'back': 'Back',
            'homeBack': 'Back to Home',
            'tryAgain': 'Try Again',
            'nextLevel': 'Next Level',
            
            // 提示消息
            'initialState': 'Already at initial state',
            'undoLimitExceeded': 'Undo limit reached',
            'stepLimitExceeded': 'Out of moves',
            
            // 标题和标签
            'gameTitle': 'Diamond Chess',
            'selectLevel': 'Select Level',
            'levelComplete': 'Level Complete',
            'gameOver': 'Game Over',
            'completeAll': 'Congratulations!',
            'lastLevel': 'This is the last level',
            'starRating': 'Rating',
            'tutorial': 'Tutorial',
            'step': 'step',
            'remaining': 'Remaining',
            
            // 首页相关
            'StartGameButton': 'Start Game',
            'GameDescTitle': 'Game Introduction',
            'GameDescLabel': 'Peg Solitaire originated in France and is a popular puzzle game worldwide.',
            
            // 教学相关
            'tutorialTitle': 'Game Rules',
            'tutorialButton': 'I Understand',
            'close': 'Close',
            'confirm': 'Confirm'
        };
        
        const translation = hardcodedTranslations[key] || key;
        
        // 如果有参数，进行替换
        if (args.length > 0) {
            return this.safeReplaceParams(translation, args);
        }
        
        return translation;
    }
    
    // 【新增】调试方法，检查所有键
    public debugKeys(): void {
        console.log('[I18nManager] 当前加载的键:');
        const keys = Array.from(this.localeData.keys());
        console.log(`总数: ${keys.length}`);
        
        // 按字母排序显示
        const sortedKeys = keys.sort();
        sortedKeys.forEach((key, index) => {
            const value = this.localeData.get(key);
            console.log(`${index + 1}. ${key}: "${value?.substring(0, 50)}${value && value.length > 50 ? '...' : ''}"`);
        });
    }
    
    // 【新增】调试：检查关键键值
    private debugKeyCheck(): void {
        const importantKeys = ['level', 'moveCount', 'remainingPieces', 'retry', 'undo', 'back'];
        console.log('[I18nManager] 重要键检查:');
        importantKeys.forEach(key => {
            const exists = this.localeData.has(key);
            const value = this.localeData.get(key);
            console.log(`  ${key}: ${exists ? '✅ 存在' : '❌ 缺失'} ${value ? `- 值: "${value}"` : ''}`);
        });
        
        // 显示前几个键值
        const keys = Array.from(this.localeData.keys()).slice(0, 5);
        console.log(`[I18nManager] 前5个键值:`, keys.map(key => `${key}: ${this.localeData.get(key)}`));
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