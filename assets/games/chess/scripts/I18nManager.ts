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
    private static _instancePromise: Promise<I18nManager> | null = null;
    
    @property
    languagePackPath: string = 'scripts/Language';
    
    private currentLanguage: Language = Language.EN_US;
    private localeData: Map<string, string> = new Map();
    private isLoaded: boolean = false;
    private initializationPromise: Promise<void> | null = null;
    
    public static getInstance(): I18nManager {
        return I18nManager._instance;
    }
    
    public static t(key: string, ...args: any[]): string {
        const instance = I18nManager._instance;
        if (!instance) {
            console.warn(`[I18nManager.t] No instance for key: ${key}`);
            return key;
        }
        return instance.t(key, ...args);
    }
    
    public static async waitForInstance(): Promise<I18nManager> {
        if (I18nManager._instance) {
            return I18nManager._instance;
        }
        
        if (!I18nManager._instancePromise) {
            I18nManager._instancePromise = new Promise((resolve) => {
                let checkCount = 0;
                const checkInterval = setInterval(() => {
                    checkCount++;
                    if (I18nManager._instance) {
                        clearInterval(checkInterval);
                        resolve(I18nManager._instance);
                    }
                    if (checkCount >= 50) {
                        clearInterval(checkInterval);
                        console.warn('[I18nManager] 等待实例超时');
                        resolve(null);
                    }
                }, 100);
            });
        }
        
        return I18nManager._instancePromise;
    }

    protected onLoad() {
        console.log('[I18nManager] onLoad - Initializing');
        
        if (I18nManager._instance && I18nManager._instance !== this) {
            console.log('[I18nManager] Duplicate instance, destroying this one');
            this.node.destroy();
            return;
        }
        
        I18nManager._instance = this;
        console.log('[I18nManager] ✅ Instance set');
        
        this.currentLanguage = Language.EN_US;
        console.log('[I18nManager] 强制设置为英文（Crazy Games版本）');
        
        this.node.name = 'I18nManager';
        
        this.initialize();
    }
    
    private async initialize(): Promise<void> {
        try {
            if (!this.languagePackPath || this.languagePackPath.trim() === '') {
                console.warn('[I18nManager] languagePackPath 为空，使用默认值');
                this.languagePackPath = 'resources/scripts/Language';
            }
            
            console.log(`[I18nManager] 开始初始化，路径: ${this.languagePackPath}`);
            
            await this.loadLanguageDataAsync();
            this.isLoaded = true;
            console.log('[I18nManager] ✅ 初始化完成');
            
            this.node.emit('language-changed', this.currentLanguage);
            console.log(`[I18nManager] 📢 立即发送语言变化事件: ${this.currentLanguage}`);
            
        } catch (error) {
            console.error('[I18nManager] 初始化失败:', error);
            this.loadFallbackData();
        }
    }
    
    private async loadLanguageDataAsync(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`[I18nManager] 加载语言数据: ${this.currentLanguage}`);
            
            const pathToLoad = this.languagePackPath || 'resources/scripts/Language';
            console.log(`[I18nManager] 尝试路径: ${pathToLoad}`);
            
            resources.load(pathToLoad, JsonAsset, (err, asset) => {
                if (err) {
                    console.warn(`[I18nManager] 路径 ${pathToLoad} 加载失败: ${err.message}`);
                    
                    this.tryAlternativePaths().then(() => {
                        resolve();
                    }).catch(() => {
                        console.log('[I18nManager] 所有路径失败，使用后备数据');
                        this.loadFallbackData();
                        resolve();
                    });
                    return;
                }
                
                if (asset?.json) {
                    console.log(`[I18nManager] ✅ 加载成功: ${pathToLoad}`);
                    this.processExternalData(asset.json);
                    resolve();
                } else {
                    console.error('[I18nManager] 加载的语言包数据为空');
                    this.loadFallbackData();
                    resolve();
                }
            });
        });
    }
    
    private async tryAlternativePaths(): Promise<void> {
        const possiblePaths = [
            'scripts/Language',
            'Language', 
            'resources/scripts/Language',
            'games/chess/scripts/Language'
        ];
        
        console.log('[I18nManager] 尝试备选路径:', possiblePaths);
        
        for (const path of possiblePaths) {
            try {
                await this.loadFromPath(path);
                console.log(`[I18nManager] ✅ 从路径加载成功: ${path}`);
                return;
            } catch (err) {
                console.warn(`[I18nManager] 路径 ${path} 加载失败`);
            }
        }
        
        throw new Error('所有路径尝试失败');
    }
    
    private loadFromPath(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`[I18nManager] 加载路径: ${path}`);
            resources.load(path, JsonAsset, (err, asset) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (asset?.json) {
                    this.languagePackPath = path;
                    this.processExternalData(asset.json);
                    resolve();
                } else {
                    reject(new Error('数据为空'));
                }
            });
        });
    }
    
    public loadLanguageData(): void {
        console.log('[I18nManager] loadLanguageData called');
        if (!this.isLoaded) {
            this.initialize();
        }
    }
    
    public async waitForLoad(): Promise<void> {
        if (this.isLoaded) {
            return;
        }
        
        if (this.initializationPromise) {
            await this.initializationPromise;
        } else {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
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
            
            this.scheduleOnce(() => {
                this.node.emit('language-changed', this.currentLanguage);
                console.log(`[I18nManager] 发送语言变化事件: ${this.currentLanguage}`);
            }, 0.1);
        } else {
            console.error(`[I18nManager] 未找到 ${this.currentLanguage} 的语言数据`);
            this.loadFallbackData();
        }
    }
    
    private loadFallbackData() {
        console.log(`[I18nManager] 使用后备数据: ${this.currentLanguage}`);
        
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
            
            this.scheduleOnce(() => {
                this.node.emit('language-changed', this.currentLanguage);
                console.log(`[I18nManager] 发送后备语言变化事件`);
            }, 0.1);
        }
    }
    
    public t(key: string, ...args: any[]): string {
        if (!this.isLoaded) {
            console.warn(`[I18nManager] 语言数据未加载，键: ${key}`);
            return this.getHardcodedTranslation(key, args);
        }
        
        let text = this.localeData.get(key);
        
        if (!text) {
            console.warn(`[I18nManager] 键未找到: ${key}`);
            
            const lowerKey = key.toLowerCase();
            for (const [k, v] of this.localeData) {
                if (k.toLowerCase() === lowerKey) {
                    text = v;
                    console.log(`[I18nManager] 找到相似键: ${k} -> ${key}`);
                    break;
                }
            }
            
            if (!text && key.includes('_')) {
                const baseKey = key.split('_')[0];
                text = this.localeData.get(baseKey);
                if (text) {
                    console.log(`[I18nManager] 使用基础键: ${baseKey} -> ${key}`);
                }
            }
            
            if (!text) {
                console.warn(`[I18nManager] 无法找到键: ${key}，使用硬编码翻译`);
                return this.getHardcodedTranslation(key, args);
            }
        }
        
        if (args.length > 0) {
            try {
                return this.replaceParams(text, args);
            } catch (e) {
                console.error(`[I18nManager] 参数替换失败，键: ${key}, 文本: ${text}, 参数: ${args}`, e);
                return this.safeReplaceParams(text, args);
            }
        }
        
        return text;
    }
    
    private safeReplaceParams(text: string, args: any[]): string {
        let result = text;
        for (let i = 0; i < args.length; i++) {
            const placeholder = `{${i}}`;
            const argStr = args[i] !== undefined && args[i] !== null ? args[i].toString() : '';
            result = result.split(placeholder).join(argStr);
        }
        return result;
    }
    
    private replaceParams(text: string, args: any[]): string {
        let result = text;
        for (let i = 0; i < args.length; i++) {
            const placeholder = `{${i}}`;
            result = result.split(placeholder).join(args[i].toString());
        }
        return result;
    }
    
    private getHardcodedTranslation(key: string, args: any[]): string {
        const hardcodedTranslations: { [key: string]: string } = {
            'level': 'Level {0}',
            'Level': 'Level {0}',
            'GameTitleLabel': 'Level {0}',
            'moveCount': '{0} moves',
            'remainingPieces': '{0} pieces left',
            'moveSteps': '{0} moves',
            'remainingPegs': '{0} pieces left',
            'retry': 'Retry',
            'undo': 'Undo',
            'back': 'Back',
            'homeBack': 'Back to Home',
            'tryAgain': 'Try Again',
            'nextLevel': 'Next Level',
            'initialState': 'Already at initial state',
            'undoLimitExceeded': 'Undo limit reached',
            'stepLimitExceeded': 'Out of moves',
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
            'StartGameButton': 'Start Game',
            'GameDescTitle': 'Game Introduction',
            'GameDescLabel': 'Peg Solitaire originated in France and is a popular puzzle game worldwide.',
            'tutorialTitle': 'Game Rules',
            'tutorialButton': 'I Understand',
            'close': 'Close',
            'confirm': 'Confirm'
        };
        
        const translation = hardcodedTranslations[key] || key;
        
        if (args.length > 0) {
            return this.safeReplaceParams(translation, args);
        }
        
        return translation;
    }
    
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
            this.initialize();
        }
    }
    
    public reloadLanguageData() {
        console.log(`[I18nManager] 重新加载语言数据`);
        this.isLoaded = false;
        this.localeData.clear();
        this.initialize();
    }
    
    public getAllKeys(): string[] {
        return Array.from(this.localeData.keys());
    }
    
    public hasKey(key: string): boolean {
        return this.localeData.has(key);
    }
    
    public debugKeys(): void {
        console.log('[I18nManager] 当前加载的键:');
        const keys = Array.from(this.localeData.keys());
        console.log(`总数: ${keys.length}`);
        
        const sortedKeys = keys.sort();
        sortedKeys.forEach((key, index) => {
            const value = this.localeData.get(key);
            console.log(`${index + 1}. ${key}: "${value?.substring(0, 50)}${value && value.length > 50 ? '...' : ''}"`);
        });
    }
    
    private debugKeyCheck(): void {
        const importantKeys = ['level', 'moveCount', 'remainingPieces', 'retry', 'undo', 'back'];
        importantKeys.forEach(key => {
            const exists = this.localeData.has(key);
            const value = this.localeData.get(key);
        });
    }
    
    protected onDestroy() {
        if (I18nManager._instance === this) {
            I18nManager._instance = null;
            console.log('[I18nManager] 实例已销毁');
        }
    }
}