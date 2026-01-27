// assets/games/chess/scripts/HomePageController.ts
import { _decorator, Component, Node, Label, Button, find } from 'cc';
import { LevelSelection } from './LevelSelection';
import { I18nManager } from './I18nManager';

const { ccclass, property } = _decorator;

@ccclass('HomePageController')
export class HomePageController extends Component {
    @property(Node)
    levelSelectionNode: Node = null;
    
    @property(Label)
    titleLabel: Label = null;
    
    @property(Button)
    startGameButton: Button = null;
    
    @property(Label)
    gameNameLabel: Label = null;
    
    @property(Label)
    gameDescLabel: Label = null;
    
    // 【新增】添加i18n属性声明
    private i18n: I18nManager = null;

    protected onLoad() {
        console.log('[HomePageController] onLoad开始');
        
        // 【重要修复】1. 先初始化国际化管理器
        this.i18n = I18nManager.getInstance();
        
        // 【新增】如果没有找到，尝试创建
        if (!this.i18n) {
            console.log('[HomePageController] I18nManager未找到，尝试在Canvas下查找...');
            const canvas = find('Canvas');
            if (canvas) {
                const existingI18n = canvas.getChildByName('I18nManager');
                if (existingI18n) {
                    this.i18n = existingI18n.getComponent(I18nManager);
                    console.log('[HomePageController] 在Canvas下找到I18nManager');
                } else {
                    // 创建I18nManager节点
                    console.log('[HomePageController] 创建新的I18nManager节点');
                    const i18nNode = new Node('I18nManager');
                    i18nNode.parent = canvas;
                    this.i18n = i18nNode.addComponent(I18nManager);
                }
            }
        }
        
        if (!this.i18n) {
            console.error('[HomePageController] 无法初始化I18nManager');
            // 创建临时管理器作为备用
            this.i18n = new I18nManager();
        }
        
        // 【新增】确保I18nManager已加载
        this.scheduleOnce(() => {
            if (this.i18n && !this.i18n.isLoadedState()) {
                console.log('[HomePageController] I18nManager尚未加载，重新触发加载');
                this.i18n.loadLanguageData();
            }
        }, 0.1);
        
        // 2. 立即更新文本，不延迟
        this.updateTexts();
        
        // 3. 监听语言变化
        this.setupLanguageListener();
        
        // 4. 绑定按钮事件
        if (this.startGameButton) {
            this.startGameButton.node.on(Button.EventType.CLICK, this.onStartGameClicked, this);
        }
        
        // 5. 隐藏其他页面
        this.hideOtherPages();
        
        // 【新增】调试信息
        this.scheduleOnce(() => {
            console.log('[HomePageController] 初始化完成');
            console.log('[HomePageController] 当前语言:', this.i18n?.getCurrentLanguage());
            
            // 测试国际化
            if (this.i18n) {
                console.log('[HomePageController] 国际化测试:');
                console.log('- gameTitle:', this.i18n.t('gameTitle'));
                console.log('- StartGameButton:', this.i18n.t('StartGameButton'));
                console.log('- GameDescLabel:', this.i18n.t('GameDescLabel').substring(0, 50) + '...');
            }
        }, 0.2);
    }
        
    private updateTexts() {
        console.log('[HomePageController] 更新文本');
        
        if (!this.i18n) {
            console.warn('[HomePageController] 没有I18nManager');
            
            // 【新增】尝试重新获取
            this.i18n = I18nManager.getInstance();
            if (!this.i18n) {
                console.warn('[HomePageController] 重试失败，0.5秒后再次尝试...');
                this.scheduleOnce(() => this.updateTexts(), 0.5);
                return;
            }
        }
        
        // 【新增】确保国际化数据已加载
        if (!this.i18n.isLoadedState()) {
            console.log('[HomePageController] I18nManager未加载，等待...');
            this.scheduleOnce(() => this.updateTexts(), 0.3);
            return;
        }
        
        // 更新标题
        if (this.titleLabel) {
            const titleText = this.i18n.t('gameTitle');
            this.titleLabel.string = titleText;
            console.log(`[HomePageController] 设置标题: "${titleText}"`);
        }
        
        // 更新游戏名称
        if (this.gameNameLabel) {
            const gameNameText = this.i18n.t('gameTitle');
            this.gameNameLabel.string = gameNameText;
            console.log(`[HomePageController] 设置游戏名称: "${gameNameText}"`);
        }
        
        // 更新游戏描述
        if (this.gameDescLabel) {
            const gameDescText = this.i18n.t('GameDescLabel');
            this.gameDescLabel.string = gameDescText;
            console.log(`[HomePageController] 设置游戏描述 (长度: ${gameDescText.length})`);
            
            // 显示描述的前50个字符用于调试
            if (gameDescText.length > 50) {
                console.log(`[HomePageController] 描述预览: "${gameDescText.substring(0, 50)}..."`);
            }
        }
        
        // 更新按钮文字
        if (this.startGameButton) {
            const label = this.startGameButton.node.getComponentInChildren(Label);
            if (label) {
                const buttonText = this.i18n.t('StartGameButton');
                label.string = buttonText;
                console.log(`[HomePageController] 设置按钮文字: "${buttonText}"`);
            } else {
                console.warn('[HomePageController] 开始游戏按钮没有Label组件');
                
                // 【新增】尝试查找Label
                const foundLabel = this.startGameButton.node.getComponent(Label);
                if (foundLabel) {
                    const buttonText = this.i18n.t('StartGameButton');
                    foundLabel.string = buttonText;
                    console.log(`[HomePageController] 找到并设置按钮Label: "${buttonText}"`);
                }
            }
        }
        
        // 【新增】更新GameDescTitle（如果存在）
        const gameDescTitleLabel = this.node.getChildByName('GameDescTitle')?.getComponent(Label);
        if (gameDescTitleLabel) {
            const descTitleText = this.i18n.t('GameDescTitle');
            gameDescTitleLabel.string = descTitleText;
            console.log(`[HomePageController] 设置描述标题: "${descTitleText}"`);
        }
        
        console.log('[HomePageController] 文本更新完成');
    }
    
    private setupLanguageListener() {
        console.log('[HomePageController] 设置语言监听器');
        
        if (!this.i18n) {
            console.warn('[HomePageController] 没有I18nManager，无法设置监听器');
            // 尝试重新获取
            this.scheduleOnce(() => this.setupLanguageListener(), 0.5);
            return;
        }
        
        if (this.i18n.node) {
            // 移除旧的监听器（避免重复）
            this.i18n.node.off('language-changed', this.updateTexts, this);
            // 添加新的监听器
            this.i18n.node.on('language-changed', this.updateTexts, this);
            console.log('[HomePageController] ✅ 语言变化监听器已设置');
        } else {
            console.warn('[HomePageController] I18nManager没有node属性');
            
            // 备用方案：监听Canvas下的I18nManager节点
            const canvas = find('Canvas');
            if (canvas) {
                const i18nNode = canvas.getChildByName('I18nManager');
                if (i18nNode) {
                    i18nNode.off('language-changed', this.updateTexts, this);
                    i18nNode.on('language-changed', this.updateTexts, this);
                    console.log('[HomePageController] ✅ 通过Canvas找到I18nManager节点并设置监听');
                }
            }
        }
    }
    
    private hideOtherPages() {
        const levelSelection = find('Canvas/LevelSelection');
        if (levelSelection) levelSelection.active = false;
        
        const gameUI = find('Canvas/GameUI');
        if (gameUI) gameUI.active = false;
        
        const boardRoot = find('Canvas/BoardRoot');
        if (boardRoot) boardRoot.active = false;
    }
    
    private onStartGameClicked() {
        console.log('[HomePageController] Start game clicked');
        
        this.node.active = false;
        
        if (this.levelSelectionNode) {
            this.levelSelectionNode.active = true;
            const levelSelection = this.levelSelectionNode.getComponent(LevelSelection);
            if (levelSelection?.show) {
                levelSelection.show();
            }
        }
    }
    
    public show() {
        console.log('[HomePageController] show 方法被调用');
        
        this.node.active = true;
        this.hideOtherPages();
        
        // 【修改】延迟一点点确保国际化已加载
        this.scheduleOnce(() => {
            // 确保有I18nManager引用
            if (!this.i18n) {
                this.i18n = I18nManager.getInstance();
            }
            this.updateTexts();
        }, 0.1);
        
        console.log('[HomePageController] 首页显示完成');
    }
}