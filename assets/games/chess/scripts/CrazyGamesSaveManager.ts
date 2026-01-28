// CrazyGamesSaveManager.ts (适配Cocos Creator)
import { _decorator, Component, director } from 'cc';
import { CrazyGamesSDK } from './CrazyGamesSDK'; // 引入上面的SDK类

const { ccclass, property } = _decorator;

@ccclass('CrazyGamesSaveManager')
export class CrazyGamesSaveManager extends Component {
    private static instance: CrazyGamesSaveManager;
    private crazyGamesSDK: CrazyGamesSDK | null = null;
    
    public static getInstance(): CrazyGamesSaveManager {
        if (!CrazyGamesSaveManager.instance) {
            // 在Canvas上创建或获取实例
            const scene = director.getScene();
            if (scene) {
                const canvas = scene.getChildByName('Canvas');
                if (canvas) {
                    let instance = canvas.getComponent(CrazyGamesSaveManager);
                    if (!instance) {
                        instance = canvas.addComponent(CrazyGamesSaveManager);
                    }
                    CrazyGamesSaveManager.instance = instance;
                }
            }
        }
        return CrazyGamesSaveManager.instance;
    }
    
    protected onLoad() {
        console.log('[SaveManager] 初始化');
        
        // 单例检查
        if (CrazyGamesSaveManager.instance && CrazyGamesSaveManager.instance !== this) {
            this.destroy();
            return;
        }
        CrazyGamesSaveManager.instance = this;
        
        // 获取或等待SDK
        this.setupSDK();
        
        // 监听SDK初始化
        director.on('crazygames-sdk-initialized', this.onSDKInitialized, this);
    }
    
    private setupSDK() {
        // 尝试获取现有的SDK实例
        this.crazyGamesSDK = CrazyGamesSDK.getInstance();
        
        if (!this.crazyGamesSDK) {
            console.log('[SaveManager] 等待SDK初始化...');
            // SDK会在场景加载后初始化
        } else {
            console.log('[SaveManager] SDK已就绪');
        }
    }
    
    private onSDKInitialized() {
        console.log('[SaveManager] SDK已初始化');
        this.crazyGamesSDK = CrazyGamesSDK.getInstance();
    }
    
    // ========== 保存/加载方法 ==========
    
    public async saveGameData(key: string, data: any): Promise<boolean> {
        console.log(`[SaveManager] 保存数据: ${key}`);
        
        try {
            // 1. 优先使用Crazy Games平台API
            if (this.crazyGamesSDK) {
                const success = await this.crazyGamesSDK.setUserData({
                    [key]: JSON.stringify(data)
                });
                if (success) {
                    console.log(`[SaveManager] 数据已保存到平台: ${key}`);
                    return true;
                }
            }
            
            // 2. 回退到localStorage
            const localKey = `diamond_chess_${key}`;
            localStorage.setItem(localKey, JSON.stringify(data));
            console.log(`[SaveManager] 数据保存到localStorage: ${localKey}`);
            
            // 3. 在开发环境记录
            if (this.isDevelopment()) {
                console.log(`[SaveManager] 开发环境数据:`, data);
            }
            
            return true;
            
        } catch (error) {
            console.error(`[SaveManager] 保存失败 ${key}:`, error);
            
            // 终极回退：尝试最小化保存
            try {
                localStorage.setItem(`diamond_chess_${key}_emergency`, 
                    JSON.stringify({ 
                        error: 'fallback', 
                        data: this.simplifyData(data),
                        timestamp: Date.now() 
                    })
                );
            } catch (e) {
                console.error('[SaveManager] 紧急保存也失败了');
            }
            
            return false;
        }
    }
    
    public async loadGameData(key: string): Promise<any> {
        console.log(`[SaveManager] 加载数据: ${key}`);
        
        try {
            let platformData = null;
            
            // 1. 尝试从平台加载
            if (this.crazyGamesSDK) {
                const result = await this.crazyGamesSDK.getUserData([key]);
                if (result && result[key]) {
                    platformData = JSON.parse(result[key]);
                    console.log(`[SaveManager] 从平台加载数据: ${key}`);
                }
            }
            
            // 2. 如果平台有数据，使用它
            if (platformData) {
                return platformData;
            }
            
            // 3. 回退到localStorage
            const localKey = `diamond_chess_${key}`;
            const localData = localStorage.getItem(localKey);
            if (localData) {
                console.log(`[SaveManager] 从localStorage加载: ${localKey}`);
                return JSON.parse(localData);
            }
            
            // 4. 尝试紧急备份
            const emergencyKey = `diamond_chess_${key}_emergency`;
            const emergencyData = localStorage.getItem(emergencyKey);
            if (emergencyData) {
                console.log(`[SaveManager] 从紧急备份加载: ${emergencyKey}`);
                const parsed = JSON.parse(emergencyData);
                return parsed.data || null;
            }
            
            console.log(`[SaveManager] 没有找到数据: ${key}`);
            return null;
            
        } catch (error) {
            console.error(`[SaveManager] 加载失败 ${key}:`, error);
            return null;
        }
    }
    
    // ========== 专为你的游戏优化的方法 ==========
    
    public async saveLevelProgress(levelData: any): Promise<boolean> {
        const progressData = {
            maxUnlockedLevel: levelData.currentMaxUnlockedLevel || 0,
            levelDataList: levelData.levelDataList || [],
            lastSaveTime: Date.now(),
            version: '1.0.0' // 数据版本，方便以后升级
        };
        
        // 保存整体进度
        const success1 = await this.saveGameData('level_progress', progressData);
        
        // 同时保存每个已完成的关卡（冗余备份）
        if (levelData.levelDataList) {
            for (let i = 0; i < levelData.levelDataList.length; i++) {
                const level = levelData.levelDataList[i];
                if (level.isCompleted) {
                    await this.saveGameData(`level_${i}`, {
                        index: i,
                        score: level.bestScore,
                        steps: level.stepCount,
                        completed: true,
                        timestamp: Date.now()
                    });
                }
            }
        }
        
        // 触发保存成功事件
        if (success1) {
            director.emit('game-progress-saved');
        }
        
        return success1;
    }
    
    public async loadLevelProgress(): Promise<any> {
        console.log('[SaveManager] 加载关卡进度');
        
        // 1. 尝试加载整体进度
        const progress = await this.loadGameData('level_progress');
        
        if (progress) {
            console.log(`[SaveManager] 加载到进度，最大解锁关卡: ${progress.maxUnlockedLevel + 1}`);
            return progress;
        }
        
        // 2. 如果没有整体进度，尝试从单个关卡重建
        console.log('[SaveManager] 没有整体进度，尝试重建...');
        return await this.reconstructProgress();
    }
    
    private async reconstructProgress(): Promise<any> {
        const levelDataList = [];
        let maxUnlocked = 0;
        
        // 检查前20关的状态
        for (let i = 0; i < 20; i++) {
            const levelData = await this.loadGameData(`level_${i}`);
            if (levelData) {
                levelDataList[i] = {
                    levelIndex: i,
                    isUnlocked: true,
                    isCompleted: levelData.completed || false,
                    bestScore: levelData.score || '',
                    stepCount: levelData.steps || 0
                };
                maxUnlocked = i;
            }
        }
        
        // 填充缺失的关卡
        for (let i = 0; i < 129; i++) {
            if (!levelDataList[i]) {
                levelDataList[i] = {
                    levelIndex: i,
                    isUnlocked: i === 0 || i <= maxUnlocked,
                    isCompleted: false,
                    bestScore: '',
                    stepCount: 0
                };
            }
        }
        
        console.log(`[SaveManager] 重建进度完成，最大解锁: ${maxUnlocked + 1}`);
        
        return {
            maxUnlockedLevel: maxUnlocked,
            levelDataList: levelDataList,
            reconstructed: true,
            timestamp: Date.now()
        };
    }
    
    // ========== 辅助方法 ==========
    
    private isDevelopment(): boolean {
        return typeof window !== 'undefined' && 
               (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1');
    }
    
    private simplifyData(data: any): any {
        // 简化数据，避免存储过大
        if (typeof data !== 'object') return data;
        
        if (Array.isArray(data)) {
            return data.slice(0, 10); // 只保留前10个
        }
        
        const simple: any = {};
        for (const key in data) {
            if (Object.keys(simple).length >= 5) break; // 最多5个属性
            simple[key] = typeof data[key] === 'object' ? '[Object]' : data[key];
        }
        return simple;
    }
    
    // ========== 游戏事件集成 ==========
    
    public notifyGameStarted() {
        if (this.crazyGamesSDK) {
            this.crazyGamesSDK.gameplayStart();
        }
        console.log('[SaveManager] 游戏开始');
    }
    
    public notifyGameCompleted(levelIndex: number, score: string) {
        if (this.crazyGamesSDK) {
            this.crazyGamesSDK.gameplayStop();
            
            // 如果是好成绩，触发happytime
            if (score.includes('★★★★★')) {
                this.crazyGamesSDK.happytime();
            }
        }
        console.log(`[SaveManager] 关卡完成: ${levelIndex + 1}, 评价: ${score}`);
    }
    
    protected onDestroy() {
        director.off('crazygames-sdk-initialized', this.onSDKInitialized, this);
    }
}