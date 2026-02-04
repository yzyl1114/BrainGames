// assets/games/chess/scripts/CrazyGamesSDK.ts
import { _decorator, Component, director } from 'cc';

declare global {
    interface Window {
        CrazyGames?: any;
    }
}

const { ccclass, property } = _decorator;

@ccclass('CrazyGamesSDK')
export class CrazyGamesSDK extends Component {
    private static instance: CrazyGamesSDK;
    
    private isInitialized = false;
    
    public static getInstance(): CrazyGamesSDK {
        if (!CrazyGamesSDK.instance) {
            const canvas = director.getScene()?.getChildByName('Canvas');
            if (canvas) {
                let instance = canvas.getComponent(CrazyGamesSDK);
                if (!instance) {
                    instance = canvas.addComponent(CrazyGamesSDK);
                }
                CrazyGamesSDK.instance = instance;
            }
        }
        return CrazyGamesSDK.instance;
    }
    
    protected onLoad() {
        console.log('[CrazyGamesSDK] SDK开始初始化');
        
        // 单例模式
        if (CrazyGamesSDK.instance && CrazyGamesSDK.instance !== this) {
            this.destroy();
            return;
        }
        CrazyGamesSDK.instance = this;
        
        // 监听场景加载完成
        director.on(director.Director.EVENT_AFTER_SCENE_LAUNCH, this.initSDK, this);
        
        // 立即初始化
        this.initSDK();
    }
    
    private initSDK() {
        if (this.isInitialized) return;
        
        // 【新增】开发环境下自动启用调试
        if (this.isDevelopment()) {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('debug_crazygames', 'true');
                console.log('[CrazyGamesSDK] 开发环境，自动启用调试模式');
            }
        }
        
        // 检查是否在Crazy Games平台
        if (this.isCrazyGamesPlatform()) {
            console.log('[CrazyGamesSDK] 检测到Crazy Games平台或调试模式');
            this.loadSDKScript();
        } else {
            console.log('[CrazyGamesSDK] 不在Crazy Games平台，跳过SDK初始化');
        }
    }
    
    private isDevelopment(): boolean {
        return typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('192.168.'));
    }

    private isCrazyGamesPlatform(): boolean {
        // 检测方式1：检查URL
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            return hostname.includes('crazygames.com') || 
                   hostname.includes('crazygames.io') ||
                   // 开发环境检测
                   localStorage.getItem('debug_crazygames') === 'true';
        }
        return false;
    }
    
    private loadSDKScript() {
        if (typeof document === 'undefined') return;
        
        // 检查是否已加载
        if (document.getElementById('crazygames-sdk')) {
            console.log('[CrazyGamesSDK] SDK脚本已存在');
            this.initializeSDK();
            return;
        }
        
        console.log('[CrazyGamesSDK] 加载SDK脚本...');
        const script = document.createElement('script');
        script.id = 'crazygames-sdk';
        script.src = 'https://sdk.crazygames.com/crazygames-sdk-v2.js';
        script.async = true;
        script.onload = () => {
            console.log('[CrazyGamesSDK] SDK脚本加载完成');
            this.initializeSDK();
        };
        script.onerror = (error) => {
            console.error('[CrazyGamesSDK] SDK脚本加载失败:', error);
        };
        
        document.head.appendChild(script);
    }
    
    private initializeSDK() {
        if (typeof window === 'undefined' || !window.CrazyGames) {
            console.error('[CrazyGamesSDK] SDK未加载成功');
            return;
        }
        
        try {
            window.CrazyGames.SDK.init();
            console.log('[CrazyGamesSDK] SDK初始化成功');
            this.isInitialized = true;
            
            // 设置游戏开始
            this.gameplayStart();
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 通知其他组件
            director.emit('crazygames-sdk-initialized');
            
        } catch (error) {
            console.error('[CrazyGamesSDK] SDK初始化失败:', error);
        }
    }
    
    // ========== 游戏生命周期方法 ==========
    
    public gameplayStart() {
        if (window.CrazyGames?.SDK?.game?.gameplayStart) {
            window.CrazyGames.SDK.game.gameplayStart();
            console.log('[CrazyGamesSDK] 游戏开始');
        }
    }
    
    public gameplayStop() {
        if (window.CrazyGames?.SDK?.game?.gameplayStop) {
            window.CrazyGames.SDK.game.gameplayStop();
            console.log('[CrazyGamesSDK] 游戏结束');
        }
    }
    
    public happytime() {
        if (window.CrazyGames?.SDK?.game?.happytime) {
            window.CrazyGames.SDK.game.happytime();
            console.log('[CrazyGamesSDK] HappyTime触发');
        }
    }
    
    // ========== 用户数据存储 ==========
    
    public async getUserData(keys: string[]): Promise<Record<string, any>> {
        if (window.CrazyGames?.SDK?.user?.getData) {
            try {
                const result = await window.CrazyGames.SDK.user.getData(keys);
                return result || {};
            } catch (error) {
                console.warn('[CrazyGamesSDK] 获取用户数据失败:', error);
                return {};
            }
        }
        return {};
    }
    
    public async setUserData(data: Record<string, any>): Promise<boolean> {
        if (window.CrazyGames?.SDK?.user?.setData) {
            try {
                await window.CrazyGames.SDK.user.setData(data);
                console.log('[CrazyGamesSDK] 用户数据保存成功');
                return true;
            } catch (error) {
                console.warn('[CrazyGamesSDK] 保存用户数据失败:', error);
                return false;
            }
        }
        return false;
    }
    
    // ========== 事件监听 ==========
    
    private setupEventListeners() {
        if (!window.CrazyGames?.SDK?.addEventListener) return;
        
        // 游戏暂停（当用户切换标签页等）
        window.CrazyGames.SDK.addEventListener('pause', () => {
            console.log('[CrazyGamesSDK] 游戏暂停');
            director.emit('game-paused');
        });
        
        // 游戏恢复
        window.CrazyGames.SDK.addEventListener('resume', () => {
            console.log('[CrazyGamesSDK] 游戏恢复');
            director.emit('game-resumed');
        });
        
        // 广告开始
        window.CrazyGames.SDK.addEventListener('adStarted', () => {
            console.log('[CrazyGamesSDK] 广告开始');
            director.emit('ad-started');
        });
        
        // 广告结束
        window.CrazyGames.SDK.addEventListener('adFinished', () => {
            console.log('[CrazyGamesSDK] 广告结束');
            director.emit('ad-finished');
        });
    }
    
    // ========== 广告相关 ==========
    
    public showRewardedAd(): Promise<boolean> {
        return new Promise((resolve) => {
            if (window.CrazyGames?.SDK?.ad?.requestRewardedAd) {
                window.CrazyGames.SDK.ad.requestRewardedAd({
                    adFinished: () => {
                        console.log('[CrazyGamesSDK] 激励广告完成');
                        resolve(true);
                    },
                    adError: () => {
                        console.log('[CrazyGamesSDK] 激励广告出错');
                        resolve(false);
                    }
                });
            } else {
                resolve(false);
            }
        });
    }
    
    public showInterstitialAd(): Promise<boolean> {
        return new Promise((resolve) => {
            if (window.CrazyGames?.SDK?.ad?.requestAd) {
                window.CrazyGames.SDK.ad.requestAd({
                    adStarted: () => {
                        console.log('[CrazyGamesSDK] 插屏广告开始');
                    },
                    adFinished: () => {
                        console.log('[CrazyGamesSDK] 插屏广告完成');
                        resolve(true);
                    },
                    adError: () => {
                        console.log('[CrazyGamesSDK] 插屏广告出错');
                        resolve(false);
                    }
                });
            } else {
                resolve(false);
            }
        });
    }
    
    protected onDestroy() {
        director.off(director.Director.EVENT_AFTER_SCENE_LAUNCH, this.initSDK, this);
    }
}