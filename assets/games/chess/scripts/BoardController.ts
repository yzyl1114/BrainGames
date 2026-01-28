// assets/games/chess/scripts/BoardController.ts

import { LevelSelection } from './LevelSelection';
import { _decorator, Component, Node, Prefab, instantiate, UITransform, Vec3, v3, EventTouch, Label, RichText, tween, UIOpacity, Sprite, Color, Button, find, SpriteFrame,resources, director } from 'cc';
import { Peg } from './Peg';
import { BOARD_SIZE, TILE_STATE, LEVELS_DATA, evaluateResult, CENTER_POS } from './GameConfig'; 
import { TutorialManager } from './TutorialManager';
import { AudioManager } from './AudioManager';
import { I18nManager } from './I18nManager';
import { CrazyGamesSaveManager } from './CrazyGamesSaveManager'; // 添加这行

const { ccclass, property } = _decorator;

const TILE_SIZE = 90; 

@ccclass('BoardController')
export class BoardController extends Component {
    @property(Prefab)
    public PegPrefab: Prefab = null; 
    
    @property(Node)
    public homePageNode: Node = null; // 首页节点
    
    @property(Node)
    public boardRoot: Node = null; 

    @property(Node)
    public feedbackNode: Node = null; // 反馈节点（可选）

    @property(Prefab)
    public gameUIPrefab: Prefab = null;

    @property(SpriteFrame)
    public boardTileSprite: SpriteFrame = null; // 棋盘格子图片

    @property(SpriteFrame)
    public boardBorderSprite: SpriteFrame = null; // 棋盘边框图片（可选）

    @property(SpriteFrame)
    private starActive: SpriteFrame = null; // 点亮的星星图标

    @property(SpriteFrame)
    private starInactive: SpriteFrame = null; // 未点亮的星星图标

    @property(Node)
    public levelSelectionNode: Node = null; // 关卡选择页面节点

    @property(Prefab)
    public tutorialPanelPrefab: Prefab = null; // 教学弹窗预制体
    
    private tutorialManager: TutorialManager = null; // 教学管理器
    private tutorialButton: Button = null; // 教学入口按钮

    // ====== 悔棋数字徽章相关 ======
    private undoBadgeNode: Node = null; // 悔棋数字徽章节点
    private undoBadgeLabel: Label = null; // 数字标签

    @property(SpriteFrame)
    private badgeCircleSprite: SpriteFrame = null;
    
    // ===== 棋盘背景相关 =====
    private boardTileNodes: Node[] = []; // 存储棋盘格子节点

    // ===== 音频相关属性 =====
    private audioButton: Button = null; // 音乐开关按钮
    private audioIcon: Sprite = null;   // 音乐图标Sprite

    @property(SpriteFrame)
    private musicOnSprite: SpriteFrame = null;

    @property(SpriteFrame)
    private musicOffSprite: SpriteFrame = null;

    @property(SpriteFrame)
    private tutorialIconSprite: SpriteFrame = null;

    // 【新增】棋子图片数组
    @property([SpriteFrame])
    private pegSprites: SpriteFrame[] = [];
    
    // 【新增】当前关卡使用的棋子图片
    private currentPegSprite: SpriteFrame = null;

    // ===== 步数限制相关 =====
    private stepLimit: number = 0; // 当前关卡的步数限制
    private remainingSteps: number = 0; // 剩余步数（倒数）

    // ===== 关卡进度相关 =====
    private saveManager: CrazyGamesSaveManager | null = null; // 改为可空类型

    // ===== 所有UI组件将在代码中动态获取，不再需要编辑器拖拽绑定 =====
    private uiRoot: Node = null; // UI总根节点 (对应预制体中的 UIRoot)

    // 通用UI组件引用
    private gameTitleLabel: Label = null;
    private stepCounterLabel: RichText = null;
    private tipsLabel: Label = null;
    private retryButton: Button = null;
    private undoButton: Button = null;
    private backButton: Button = null; // 返回按钮（在GameUI中）

    // 结算弹窗组件引用
    private settlementPanel: Node = null;
    private settlementTitle: Label = null;
    private settlementResult: Label = null;
    private settlementStats: Label = null;
    private settlementRetryBtn: Button = null;
    private settlementNextBtn: Button = null;

    // ===== 游戏状态变量 =====
    private currentLevelIndex: number = 0;
    private boardState: number[][] = [];     
    private activeNode: Node | null = null; 
    private activePegRow: number = -1;
    private activePegCol: number = -1;
    private dragOffset: Vec3 = v3(0, 0, 0);
    private touchStartPos: Vec3 = v3(0, 0, 0);
    private pegNodes: Map<string, Node> = new Map(); // 使用Map存储棋子节点
    
    // 历史记录和游戏状态
    private moveHistory: Array<{
        boardState: number[][];
        pegsInfo: Array<{row: number, col: number}>;
        stepCount: number;
    }> = [];
    private stepCount: number = 0; // 步数计数器
    private undoCount: number = 0; // 悔棋次数计数器
    private maxUndoCount: number = 5; // 最大悔棋次数（根据关卡动态调整）

    // 中英文适配
    private i18n: I18nManager = null;

    // ==================== 核心初始化方法 ====================
    protected onLoad() {
        console.log('BoardController: onLoad开始');
        
        // 【重要修复】1. 先初始化国际化管理器
        this.i18n = I18nManager.getInstance();
        
        // 【新增】如果没有找到，尝试创建
        if (!this.i18n) {
            console.log('I18nManager未找到，尝试在Canvas下查找或创建...');
            const canvas = find('Canvas');
            if (canvas) {
                const existingI18n = canvas.getChildByName('I18nManager');
                if (existingI18n) {
                    this.i18n = existingI18n.getComponent(I18nManager);
                    console.log('在Canvas下找到I18nManager');
                } else {
                    // 创建I18nManager节点
                    console.log('创建新的I18nManager节点');
                    const i18nNode = new Node('I18nManager');
                    i18nNode.parent = canvas;
                    this.i18n = i18nNode.addComponent(I18nManager);
                }
            }
        }
        
        if (!this.i18n) {
            console.error('无法初始化I18nManager');
            // 创建临时管理器作为备用
            this.i18n = new I18nManager();
        }
        
        // 【新增】确保I18nManager已加载
        this.scheduleOnce(() => {
            if (this.i18n && !this.i18n.isLoadedState()) {
                console.log('I18nManager尚未加载，重新触发加载');
                this.i18n.loadLanguageData();
            }
        }, 0.1);
        
        // 【新增】设置语言监听
        if (this.i18n && this.i18n.node) {
            this.i18n.node.on('language-changed', this.onLanguageChanged, this);
        }
        
        // 2. 初始化UI（必须在其他逻辑之前）
        this.initUI();
        this.debugUIHierarchy();
        this.initTutorialSystem();
        
        // 【修正】3. 延迟更新UI文本，确保UI组件已创建
        this.scheduleOnce(() => {
            this.updateGameUIText();
        }, 0.1);

        // 4. 确保BoardRoot在UI上层
        if (this.boardRoot && this.uiRoot) {
            // 将BoardRoot移动到Canvas的最后一个子节点（最上层）
            const canvas = find('Canvas');
            if (canvas) {
                this.boardRoot.parent = canvas;
                this.boardRoot.setSiblingIndex(canvas.children.length - 2);
            }
        }

        // 5. 检查核心资源
        if (!this.PegPrefab) {
            console.error("BoardController: PegPrefab is not assigned in the editor!");
            return;
        }
        if (!this.boardRoot) {
            console.error("BoardController: boardRoot is not assigned in the editor!");
            return;
        }
        if (!this.uiRoot) {
            console.error("BoardController: UI failed to initialize!");
            return; // 添加return，避免后续错误
        }

        // 6. 默认隐藏游戏相关UI
        if (this.uiRoot) {
            this.uiRoot.active = false;  // 隐藏GameUI
        }
        if (this.boardRoot) {
            this.boardRoot.active = false;  // 隐藏棋盘
        }
        
        // 使用新的页面切换方法
        if (this.homePageNode) {
            this.switchToHomePage(); // 使用新方法
        } else if (this.levelSelectionNode) {
            this.switchToLevelSelection();
        } else {
            this.loadLevel(this.currentLevelIndex);
        }

        // 7. 初始化保存管理器
        this.saveManager = CrazyGamesSaveManager.getInstance();
        if (this.saveManager) {
            console.log('✅ CrazyGamesSaveManager 初始化成功');
        } else {
            console.warn('⚠️ CrazyGamesSaveManager 初始化失败，使用本地存储');
        }

        // 监听保存事件
        director.on('game-paused', this.autoSaveBeforePause, this);

        // 8. 添加调试信息
        this.scheduleOnce(() => {
            console.log("游戏初始化完成，等待用户操作");
            console.log("当前语言:", this.i18n?.getCurrentLanguage());
            
            // 测试国际化
            if (this.i18n) {
                console.log('国际化测试:');
                console.log('- gameTitle:', this.i18n.t('gameTitle'));
                console.log('- retry:', this.i18n.t('retry'));
                console.log('- undo:', this.i18n.t('undo'));
                console.log('- level:', this.i18n.t('level', 1));
            }
        }, 0.2);
    }

    // ==================== UI 初始化与动态绑定 ====================
    private initUI() {
        if (!this.gameUIPrefab) {
            console.error('[UI] GameUI Prefab is not assigned in BoardController!');
            return;
        }

        // 1. 实例化UI预制体
        this.uiRoot = instantiate(this.gameUIPrefab);
        // 查找Canvas作为父节点
        const canvas = find('Canvas');
        if (canvas) {
            this.uiRoot.parent = canvas;
            this.uiRoot.setSiblingIndex(0); // 设置为第一个子节点
            // 初始化时不显示
            this.uiRoot.active = false;
            
            const backgroundNode = this.uiRoot.getChildByPath('UIRoot/Background');
            if (backgroundNode) {
                backgroundNode.setSiblingIndex(0); // Background在GameUI内部也是第一个
            }
            
        } else {
            // 备选方案：挂载到当前节点
            this.uiRoot.parent = this.node;
            console.warn('[UI] Canvas not found, parented UI to BoardController node.');
        }
        this.uiRoot.setPosition(0, 0, 0);

        // 2. 安全获取组件的辅助函数
        const getComponent = <T extends Component>(path: string, type: new () => T): T | null => {
            const node = this.uiRoot.getChildByPath(path);
            if (node) {
                const comp = node.getComponent(type);
                if (comp) {
                    return comp;
                } else {
                    console.warn(`[UI] Found node at "${path}", but it has no ${type.name} component.`);
                }
            } else {
                console.warn(`[UI] Node not found at path: "${path}". Check the name in the prefab.`);
            }
            return null;
        };

        // 3. 【新增】初始化标题栏（放在UI节点查找之前）
        this.initGameTitleBar();

        // 4. 动态查找并绑定所有通用UI组件
        this.gameTitleLabel = getComponent('UIRoot/TitleBar/GameTitleLabel', Label);
        this.stepCounterLabel = getComponent('UIRoot/StepCounter', RichText);
        this.tipsLabel = getComponent('UIRoot/TipsLabel', Label);
        this.retryButton = getComponent('UIRoot/ButtonContainer/RetryButton', Button);
        this.undoButton = getComponent('UIRoot/ButtonContainer/UndoButton', Button);
        
        // 直接查找BackButton
        this.backButton = getComponent('UIRoot/TitleBar/BackButton', Button); 

        // 5. 动态查找并绑定结算弹窗组件
        this.settlementPanel = this.uiRoot.getChildByPath('UIRoot/SettlementPanel');
        if (this.settlementPanel) {
            this.settlementTitle = getComponent('UIRoot/SettlementPanel/PopupWindow/TitleLabel', Label);
            this.settlementResult = getComponent('UIRoot/SettlementPanel/PopupWindow/ResultLabel', Label);
            this.settlementStats = getComponent('UIRoot/SettlementPanel/PopupWindow/StatsLabel', Label);
            //this.settlementRetryBtn = getComponent('UIRoot/SettlementPanel/PopupWindow/BtnContainer/SettlementRetryBtn', Button);
            //this.settlementNextBtn = getComponent('UIRoot/SettlementPanel/PopupWindow/BtnContainer/SettlementNextBtn', Button);
            this.settlementRetryBtn = null;
            this.settlementNextBtn = null;
        } else {
            console.warn('[UI] SettlementPanel not found in UI prefab.');
        }

        // 6. 动态绑定按钮点击事件（替代编辑器Click Events设置）
        if (this.retryButton) {
            this.retryButton.node.on(Button.EventType.CLICK, this.retryLevel, this);
        }
        if (this.undoButton) {
            this.undoButton.node.on(Button.EventType.CLICK, this.undoMove, this);
        }
        if (this.settlementRetryBtn) {
            this.settlementRetryBtn.node.on(Button.EventType.CLICK, this.onSettlementRetry, this);
        }
        if (this.settlementNextBtn) {
            this.settlementNextBtn.node.on(Button.EventType.CLICK, this.onSettlementNext, this);
        }
        
        // 7. 动态绑定BackButton点击事件
        if (this.backButton) {
            const backTransform = this.backButton.node.getComponent(UITransform);
            const uiRootNode = find('Canvas/GameUI/UIRoot');
            const uiRootTransform = uiRootNode?.getComponent(UITransform);
            
            this.backButton.node.off(Button.EventType.CLICK); // 先移除旧的事件
            this.backButton.node.on(Button.EventType.CLICK, this.onBackToLevelSelect, this);
        } else {
            console.warn('[UI] BackButton not found in UI prefab!');
        }

        // 8. 创建教学入口按钮
        this.createTutorialButton();

        // 9. 创建音乐开关按钮
        this.createAudioButton(); 

        // 在创建完所有按钮后，创建悔棋数字徽章，使用标记避免重复创建
        this.scheduleOnce(() => {
            if (!this.undoBadgeNode || !this.undoBadgeNode.isValid) {
                this.createUndoBadge();
            } else {
                console.log('[UI] 悔棋数字徽章已存在，跳过创建');
            }
        }, 0.1);

        // 初始化UI状态
        if (this.tipsLabel) {
            this.tipsLabel.node.active = false; // 初始隐藏提示
        }
        if (this.settlementPanel) {
            this.settlementPanel.active = false; // 初始隐藏结算弹窗
        }
    }

    // ==================== 游戏关卡与状态管理 ====================
    public loadLevel(levelIndex: number) {
        
        // 保存当前关卡索引
        this.currentLevelIndex = levelIndex;

        // 【新增】在关卡开始时随机选择棋子图片
        this.currentPegSprite = this.selectRandomPegSprite();
        
        // 确保游戏UI和棋盘显示
        if (this.uiRoot) {
            this.uiRoot.active = true;
        }
        if (this.boardRoot) {
            this.boardRoot.active = true;
        }
        
        // 隐藏关卡选择页（如果显示）
        if (this.levelSelectionNode) {
            this.levelSelectionNode.active = false;
        }

        // 隐藏首页（如果显示）
        if (this.homePageNode) {
            this.homePageNode.active = false;
        }

        if (!this.boardRoot) {
            console.error("Critical nodes missing, cannot load level");
            return;
        }
        
        // 隐藏结算弹窗（如果正在显示）
        this.hideSettlementPanel();

        // 关闭教学弹窗（如果正在显示）
        if (this.tutorialManager && this.tutorialManager.isTutorialShowing()) {
            this.tutorialManager.hideTutorial();
        }

        this.destroyAllPegsOnly();  // 只销毁棋子，不销毁背景
        
        this.activeNode = null;
        this.activePegRow = -1;
        this.activePegCol = -1;
        
        // 检查是否需要重新生成背景，只有当没有背景或背景为空时才重新生成
        if (this.boardTileNodes.length === 0) {
            this.clearBoardBackground();
            this.generateBoardBackground(levelIndex);
        } else {
            console.log(`使用现有的背景，关卡 ${levelIndex}`);
        }

        // 重置游戏状态
        this.stepCount = 0;
        this.undoCount = 0;
        this.moveHistory = [];
        
        // 根据关卡设置最大悔棋次数
        this.setMaxUndoCount(levelIndex);
        
        // 初始化棋盘状态数组
        this.boardState = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            this.boardState[i] = [];
            for (let j = 0; j < BOARD_SIZE; j++) {
                this.boardState[i][j] = TILE_STATE.INVALID;
            }
        }

        // 检查是否为最后一关
        if (levelIndex >= LEVELS_DATA.length) {
            this.showGameCompletePanel();
            return;
        }

        const level = LEVELS_DATA[levelIndex];
        
        // 【新增】初始化步数限制
        this.stepLimit = level.stepLimit || 30; // 默认30步
        this.remainingSteps = this.stepLimit; // 初始化剩余步数

        // 更新游戏标题
        if (this.gameTitleLabel) {
            if (this.i18n) {
                // 使用国际化：Level 1, Level 2...
                this.gameTitleLabel.string = this.i18n.t('level', this.currentLevelIndex + 1);
            } else {
                // 回退：关卡 1, 关卡 2...
                this.gameTitleLabel.string = `关卡 ${this.currentLevelIndex + 1}`;
            }
            console.log(`[BoardController] 设置游戏标题: ${this.gameTitleLabel.string}`);
        }
        
        // 更新计步器显示（使用剩余步数）
        this.updateStepCounter();
        
        // 加载关卡布局
        this.boardState = [];
        for (let i = 0; i < level.layout.length; i++) {
            this.boardState[i] = [...level.layout[i]];
        }

        // 生成棋盘背景
        this.generateBoardBackground(levelIndex); 

        // 生成棋子
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.boardState[r][c] === TILE_STATE.PEG) {
                    this.spawnPeg(r, c);
                }
            }
        }
        
        // 保存初始状态
        this.saveCurrentState();

        // 显示教学入口按钮
        if (this.tutorialButton) {
            this.tutorialButton.node.active = true; // 始终显示
        } else {
            console.warn('[UI] 教学入口按钮未找到');
        }

        // 更新UI文本
        this.updateGameUIText();
    }

    // 添加返回关卡选择的方法
    private onBackToLevelSelect() {
        
        // 关闭教学弹窗（如果正在显示）
        if (this.tutorialManager && this.tutorialManager.isTutorialShowing()) {
            this.tutorialManager.hideTutorial();
        }

        // 隐藏结算弹窗
        this.hideSettlementPanel();
        
        // 使用页面切换方法
        this.switchToLevelSelection();
    }

    // 添加从结算弹窗返回关卡选择的方法
    private onSettlementBackToLevelSelect() {
        this.restoreGameUIAfterSettlement();
        this.hideSettlementPanel();
        this.onBackToLevelSelect(); // 调用相同的返回方法
    }

    // 添加更新关卡进度的方法
    private updateLevelProgress(levelIndex: number, score: string, stepCount: number, isCenterPeg: boolean = false) {
        console.log('===================');
        console.log('【updateLevelProgress】开始更新关卡进度');
        console.log(`关卡索引: ${levelIndex}, 评价: ${score}, 步数: ${stepCount}`);
        
        // 如果有 LevelSelection 组件，调用其更新方法
        if (this.levelSelectionNode) {
            console.log(`levelSelectionNode 状态: ${this.levelSelectionNode.active ? '激活' : '未激活'}`);
            
            const levelSelection = this.levelSelectionNode.getComponent(LevelSelection);
            if (levelSelection && levelSelection.updateLevelProgress) {
                console.log('找到LevelSelection组件，调用updateLevelProgress');
                levelSelection.updateLevelProgress(levelIndex, score, stepCount);
            } else {
                console.warn('LevelSelection组件未找到或没有updateLevelProgress方法');
                
                // 尝试直接获取组件
                const allComponents = this.levelSelectionNode.getComponents('LevelSelection');
                console.log(`找到的LevelSelection组件数量: ${allComponents.length}`);
            }
        } else {
            console.warn('levelSelectionNode未设置');
        }
        
        // 同时保存到本地存储
        try {
            const progress = {
                levelIndex: levelIndex,
                score: score,
                stepCount: stepCount,
                isCenterPeg: isCenterPeg,
                completed: true,
                timestamp: Date.now()
            };
            
            // 保存单个关卡的进度
            localStorage.setItem(`diamond_chess_level_${levelIndex}`, JSON.stringify(progress));
            
            // 【新增】同时保存最大解锁关卡
            const nextLevelIndex = levelIndex + 1;
            if (nextLevelIndex < 100) { // 假设最多100关
                localStorage.setItem(`diamond_chess_max_unlocked`, nextLevelIndex.toString());
            }
            
            console.log(`Level ${levelIndex} progress saved: ${score}, ${stepCount} steps`);
            console.log(`下一关 ${nextLevelIndex} 已标记为解锁`);
        } catch (e) {
            console.error("Failed to save level progress:", e);
        }
        
        console.log('===================');
    }

    // ==================== 计步器与提示系统 ====================
    // 创建悔棋数字徽章
    private createUndoBadge() {
        
        // 【修复】检查是否已存在
        if (this.undoBadgeNode && this.undoBadgeNode.isValid) {
            return;
        }
        
        // 1. 找到悔棋按钮节点
        const undoButton = this.uiRoot?.getChildByPath('UIRoot/ButtonContainer/UndoButton');
        if (!undoButton) {
            console.warn('[UI] 找不到悔棋按钮节点');
            return;
        }
        
        // 【修复】检查悔棋按钮上是否已存在徽章
        const existingBadge = undoButton.getChildByName('UndoBadge');
        if (existingBadge && existingBadge.isValid) {
            this.undoBadgeNode = existingBadge;
            
            // 尝试获取标签组件
            const labelNode = this.undoBadgeNode.getChildByName('BadgeLabel');
            if (labelNode) {
                this.undoBadgeLabel = labelNode.getComponent(Label);
            }
            
            // 初始更新徽章
            this.updateUndoBadge();
            return;
        }
        
        // 2. 创建徽章节点
        this.undoBadgeNode = new Node('UndoBadge');
        this.undoBadgeNode.parent = undoButton; // 作为悔棋按钮的子节点
        this.undoBadgeNode.setPosition(70, 15, 10); // 右上角位置（相对于按钮）
        
        // 3. 添加背景圆形
        const badgeBg = new Node('BadgeBg');
        badgeBg.parent = this.undoBadgeNode;
        badgeBg.setPosition(0, 0, 0); 
        
        const bgSprite = badgeBg.addComponent(Sprite);
        
        
        if (this.badgeCircleSprite) {
            bgSprite.spriteFrame = this.badgeCircleSprite;
            bgSprite.color = Color.RED; // 将白色变为红色
        } else {
            bgSprite.color = Color.RED;
            console.warn('[UI] 圆形背景图片未设置，使用纯色');
        }

        bgSprite.type = Sprite.Type.SIMPLE;
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        
        // 【修复】检查是否已有UITransform
        let bgTransform = badgeBg.getComponent(UITransform);
        if (!bgTransform) {
            bgTransform = badgeBg.addComponent(UITransform);
        }
        bgTransform.setContentSize(30, 30); // 圆形直径30
        bgTransform.setAnchorPoint(0.5, 0.5);
        
        // 4. 添加数字标签
        const labelNode = new Node('BadgeLabel');
        labelNode.parent = this.undoBadgeNode;
        labelNode.setPosition(0, 0, 1);
        
        this.undoBadgeLabel = labelNode.addComponent(Label);
        this.undoBadgeLabel.string = this.maxUndoCount.toString();
        this.undoBadgeLabel.fontSize = 18;
        this.undoBadgeLabel.color = Color.WHITE;
        this.undoBadgeLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.undoBadgeLabel.verticalAlign = Label.VerticalAlign.CENTER;
        
        // 【修复】检查是否已有UITransform
        let labelTransform = labelNode.getComponent(UITransform);
        if (!labelTransform) {
            labelTransform = labelNode.addComponent(UITransform);
        }
        labelTransform.setContentSize(30, 30);
        labelTransform.setAnchorPoint(0.5, 0.5);
        
        // 5. 【新增】确保徽章节点在最上层
        this.undoBadgeNode.setSiblingIndex(undoButton.children.length);

        // 6. 初始更新徽章
        this.updateUndoBadge();
        
    }

    // 更新悔棋数字徽章
    private updateUndoBadge() {
        if (!this.undoBadgeLabel) return;
        
        const remainingUndo = this.maxUndoCount - this.undoCount;
        this.undoBadgeLabel.string = remainingUndo.toString();
        
    }

    // ==================== 计步器与提示系统 ====================
    private updateStepCounter() {
        if (!this.stepCounterLabel) {
            console.warn("Step counter label not assigned");
            return;
        }
        const remainingUndo = this.maxUndoCount - this.undoCount;
        

        // 根据剩余步数设置数字颜色和字号
        let numberColor = this.remainingSteps >= 3 ? "#333333" : "#FF5555"; // 白色或红色
        let numberSize = 40; // 数字字号
        let textSize =28; // 文字字号
        
        // 构建富文本字符串
        let richTextString;
        if (this.i18n) {
            richTextString = 
                `<color=#333333><size=${textSize}>${this.i18n.t('remaining')}</size></color>` +
                `<color=${numberColor}><size=${numberSize}>${this.remainingSteps}</size></color>` +
                `<color=#333333><size=${textSize}>${this.i18n.t('step')}</size></color>`;
        } else {
            richTextString = 
                `<color=#333333><size=${textSize}>剩余</size></color>` +
                `<color=${numberColor}><size=${numberSize}>${this.remainingSteps}</size></color>` +
                `<color=#333333><size=${textSize}>步</size></color>`;
        }
        
        // 设置富文本内容
        this.stepCounterLabel.string = richTextString;

        // 更新悔棋数字徽章
        this.updateUndoBadge();
    }
    
    private showTips(messageKey: string, duration: number = 2.0) {
        let message = messageKey;
        if (this.i18n) {
            message = this.i18n.t(messageKey);
        }
        
        if (!this.tipsLabel || !this.tipsLabel.isValid) {
            return;
        }
        
        
        // 获取背景节点
        let tipsBackground: Node | null = null;
        
        tipsBackground = this.tipsLabel.node.getChildByName('TipsBackground') || null;
        
        if (tipsBackground) {
            
            // 根据文字长度调整背景大小
            const textLength = message.length;
            const minWidth = 200;
            const maxWidth = 500;
            const padding = 40;
            const estimatedTextWidth = textLength * 20;
            const backgroundWidth = Math.max(minWidth, Math.min(maxWidth, estimatedTextWidth + padding));
            
            const backgroundTransform = tipsBackground.getComponent(UITransform);
            if (backgroundTransform) {
                backgroundTransform.setContentSize(backgroundWidth, 60);
            }
            
            // 直接显示，不通过动画
            tipsBackground.active = true;
            
            // 确保背景不透明
            const bgOpacity = tipsBackground.getComponent(UIOpacity);
            if (bgOpacity) {
                bgOpacity.opacity = 180; // 直接设置为180（70%透明）
            } else {
                // 如果没有UIOpacity组件，通过Sprite颜色设置透明度
                const bgSprite = tipsBackground.getComponent(Sprite);
                if (bgSprite) {
                    bgSprite.color = new Color(bgSprite.color.r, bgSprite.color.g, bgSprite.color.b, 180);
                }
            }
        } else {
            console.log(`[Tips] 未找到背景框`);
        }
        
        // 保存原始节点信息
        const canvas = find('Canvas');
        const originalParent = this.tipsLabel.node.parent;
        const originalPosition = this.tipsLabel.node.position.clone();
        const originalSiblingIndex = this.tipsLabel.node.getSiblingIndex();
        
        // 临时将节点移到Canvas最上层
        if (canvas) {
            // Tips文字移到Canvas最上层
            this.tipsLabel.node.parent = canvas;
            this.tipsLabel.node.setSiblingIndex(canvas.children.length - 1);
            this.tipsLabel.node.setPosition(originalPosition);
            
            // 背景也移到Canvas上层（在文字下面）
            if (tipsBackground && tipsBackground.isValid) {
                tipsBackground.parent = canvas;
                tipsBackground.setSiblingIndex(canvas.children.length - 2);
                // 不需要设置位置，因为相对位置已经正确
            }
        }
        
        // 显示提示文字
        this.tipsLabel.string = message;
        this.tipsLabel.node.active = true;
        
        // 直接设置文字不透明，不要动画
        const opacity = this.tipsLabel.node.getComponent(UIOpacity);
        if (opacity) {
            opacity.opacity = 255; // 直接设置为完全不透明
        }
        
        
        // 定时隐藏
        this.scheduleOnce(() => {
            
            this.tipsLabel.node.active = false;
            if (tipsBackground) {
                tipsBackground.active = false;
            }
            
            // 将节点移回原位
            this.restoreTipsToOriginalPosition(
                originalParent, 
                originalPosition, 
                originalSiblingIndex,
                tipsBackground
            );
        }, duration);
    }

    // 简化版的恢复方法
    private restoreTipsToOriginalPosition(
        originalParent: Node | null, 
        originalPosition: Vec3, 
        originalSiblingIndex: number,
        tipsBackground: Node | null
    ) {
        // 恢复Tips文字节点
        if (originalParent && this.tipsLabel && this.tipsLabel.isValid) {
            this.tipsLabel.node.parent = originalParent;
            this.tipsLabel.node.setSiblingIndex(originalSiblingIndex);
            this.tipsLabel.node.setPosition(originalPosition);
        }
        
        // 恢复背景节点
        if (tipsBackground && tipsBackground.isValid) {
            const originalBgParent = this.tipsLabel.node; // 背景应该在TipsLabel下
            if (originalBgParent) {
                tipsBackground.parent = originalBgParent;
                tipsBackground.setSiblingIndex(0); // 背景在文字下面
            }
        }
    }

    // ==================== 棋盘生成方法 ====================
    private generateBoardBackground(levelIndex: number) {
        // 清空旧的棋盘
        this.clearBoardBackground();
        
        const level = LEVELS_DATA[levelIndex];
        const tileSize = TILE_SIZE;
        
        // 遍历所有有效位置生成棋盘格子
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                // 只生成有效位置（非INVALID）
                if (level.layout[r][c] !== TILE_STATE.INVALID) {
                    this.createBoardTile(r, c, level.layout[r][c]);
                }
            }
        }
        
        // 可选：添加棋盘边框
        this.generateBoardBorder();
        
    }

    private createBoardTile(row: number, col: number, tileState: number) {
        // 创建棋盘格子节点
        const tileNode = new Node(`BoardTile_${row}_${col}`);
        tileNode.parent = this.boardRoot;
        
        // 设置位置（与棋子位置相同）
        const position = this.getPegLocalPosition(row, col);
        tileNode.setPosition(position.x, position.y, -10); // Z轴在棋子后面
        
        // 添加Sprite组件
        const sprite = tileNode.addComponent(Sprite);
        if (this.boardTileSprite) {
            sprite.spriteFrame = this.boardTileSprite;
        }
        
        // 根据位置状态设置颜色
        if (tileState === TILE_STATE.EMPTY) {
            sprite.color = Color.fromHEX(new Color(), "#F0F0F0"); // 空位浅色
        } else {
            sprite.color = Color.fromHEX(new Color(), "#E8E8E8"); // 有棋位置稍深
        }
        
        // 设置大小
        let uiTransform = tileNode.getComponent(UITransform);
        if (!uiTransform) {
            uiTransform = tileNode.addComponent(UITransform);
        }
        uiTransform.setContentSize(85, 85);
        
        // 保存节点引用
        this.boardTileNodes.push(tileNode);
    }

    private generateBoardBorder() {
        if (!this.boardBorderSprite) return;
        
        const boardSize = TILE_SIZE * BOARD_SIZE;
        const borderWidth = 10;
        
        // 生成四条边框
        const borders = [
            { name: "Border_Top", x: 0, y: boardSize/2 + borderWidth/2, width: boardSize + borderWidth*2, height: borderWidth },
            { name: "Border_Bottom", x: 0, y: -boardSize/2 - borderWidth/2, width: boardSize + borderWidth*2, height: borderWidth },
            { name: "Border_Left", x: -boardSize/2 - borderWidth/2, y: 0, width: borderWidth, height: boardSize },
            { name: "Border_Right", x: boardSize/2 + borderWidth/2, y: 0, width: borderWidth, height: boardSize },
        ];
        
        borders.forEach(border => {
            const borderNode = new Node(border.name);
            borderNode.parent = this.boardRoot;
            borderNode.setPosition(border.x, border.y, -5);
            
            const sprite = borderNode.addComponent(Sprite);
            sprite.spriteFrame = this.boardBorderSprite;
            sprite.color = Color.fromHEX(new Color(), "#8B4513"); // 棕色边框
            
            const uiTransform = borderNode.addComponent(UITransform);
            uiTransform.setContentSize(border.width, border.height);
            
            this.boardTileNodes.push(borderNode);
        });
    }

    private clearBoardBackground() {
        // 销毁所有棋盘格子节点
        this.boardTileNodes.forEach(node => {
            if (node && node.isValid) {
                node.destroy();
            }
        });
        this.boardTileNodes = [];
    }

    private destroyAllPegsOnly() {
        // 只销毁棋子节点，不销毁背景
        this.pegNodes.forEach((node) => {
            if (node && node.isValid) {
                node.destroy();
            }
        });
        this.pegNodes.clear();
    }

    // ==================== 调试方法 ====================
    private debugBoardHierarchy() {
        
        // 分类统计
        let tileCount = 0;
        let borderCount = 0;
        let pegCount = 0;
        let otherCount = 0;
        
        this.boardRoot.children.forEach((child, index) => {
            const name = child.name;
            if (name.includes('BoardTile')) {
                tileCount++;
            } else if (name.includes('Border')) {
                borderCount++;
            } else if (name.includes('Peg')) {
                pegCount++;
            } else {
                otherCount++;
                console.log(`  其他节点 [${index}]: ${name}`);
            }
        });
        
        
        // 检查背景节点引用是否有效
        let validTileRefs = 0;
        this.boardTileNodes.forEach((node, index) => {
            if (node && node.isValid) {
                validTileRefs++;
            } else {
                console.warn(`背景节点引用 [${index}] 无效`);
            }
        });
    }

    // ==================== 悔棋与历史记录系统 ====================
    private saveCurrentState() {
        // 深拷贝棋盘状态
        const boardCopy: number[][] = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            boardCopy[i] = [...this.boardState[i]];
        }
        
        // 收集所有棋子的位置信息
        const pegsInfo: Array<{row: number, col: number}> = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.boardState[r][c] === TILE_STATE.PEG) {
                    pegsInfo.push({row: r, col: c});
                }
            }
        }
        
        // 计算已用步数
        const usedSteps = this.stepLimit - this.remainingSteps;
        
        // 检查是否重复保存相同状态
        if (this.moveHistory.length > 0) {
            const lastState = this.moveHistory[this.moveHistory.length - 1];
            // 如果当前状态和上一个状态相同（步数和棋子数都相同），不保存
            if (lastState.stepCount === usedSteps && lastState.pegsInfo.length === pegsInfo.length) {
                return;
            }
        }
        
        this.moveHistory.push({
            boardState: boardCopy,
            pegsInfo: pegsInfo,
            stepCount: usedSteps // 保存已用步数
        });
        
        // 限制历史记录长度（防止内存占用过大）
        if (this.moveHistory.length > 100) {
            this.moveHistory.shift();
        }
        
    }
    
    public undoMove() {

        // 检查是否有历史记录
        if (this.moveHistory.length <= 1) {
            this.showTips("initialState"); // 修改为国际化键
            return;
        }
        
        // 检查悔棋次数是否用完
        if (this.undoCount >= this.maxUndoCount) {
            this.showTips("undoLimitExceeded"); // 修改为国际化键
            return;
        }
        
        // 获取当前状态信息（用于调试）
        const currentUsedSteps = this.stepLimit - this.remainingSteps;
        
        // 弹出当前状态
        const currentState = this.moveHistory.pop();
        
        // 获取上一步状态（现在这是最新的状态）
        if (this.moveHistory.length === 0) {
            console.error("[Undo] 错误：弹出当前状态后历史记录为空！");
            // 重新加载关卡
            this.retryLevel();
            return;
        }
        
        const lastState = this.moveHistory[this.moveHistory.length - 1];
        
        // 计算步数变化
        const stepDifference = (currentState?.stepCount || 0) - lastState.stepCount;
        
        // 恢复棋盘状态
        for (let i = 0; i < BOARD_SIZE; i++) {
            this.boardState[i] = [...lastState.boardState[i]];
        }
        
        // 恢复步数
        this.stepCount = lastState.stepCount;

        // 正确恢复剩余步数
        this.remainingSteps = this.stepLimit - lastState.stepCount;
        
        // 只销毁棋子，不销毁背景
        this.destroyAllPegsOnly();
        
        // 重新生成棋子
        for (const pegInfo of lastState.pegsInfo) {
            this.spawnPeg(pegInfo.row, pegInfo.col);
        }
        
        // 重置活动状态
        this.resetActiveState();
        
        // 更新悔棋计数
        this.undoCount++;
        
        // 更新计步器（只显示步数）和悔棋徽章
        this.updateStepCounter();
        
        // 使用提示显示成功信息
        this.showTips("success"); // 修改为国际化键        
    
        // 调试：输出当前所有历史记录
        console.log(`[Undo] 历史记录详情：`);
        this.moveHistory.forEach((state, index) => {
            console.log(`  [${index}] 步数: ${state.stepCount}, 棋子数: ${state.pegsInfo.length}`);
        });
    }
    
    private clearHistory() {
        this.moveHistory = [];
        this.stepCount = 0;
        this.undoCount = 0;
    }
    
    // ==================== 随机选择棋子图片的方法 ====================
    /**
     * 随机选择棋子图片
     */
    private selectRandomPegSprite(): SpriteFrame {
        if (this.pegSprites.length === 0) {
            console.warn("No peg sprites available, using default");
            return null;
        }
        
        // 随机选择一个索引
        const randomIndex = Math.floor(Math.random() * this.pegSprites.length);
        const selectedSprite = this.pegSprites[randomIndex];
        
        console.log(`随机选择了棋子图片: 索引 ${randomIndex}, 名称: ${selectedSprite ? selectedSprite.name : 'null'}`);
        
        return selectedSprite;
    }

    /**
     * 【新增】设置所有棋子的图片
     */
    private setAllPegsSprite(spriteFrame: SpriteFrame) {
        this.pegNodes.forEach((pegNode, key) => {
            const pegComp = pegNode.getComponent(Peg);
            if (pegComp && pegComp.pegGraphic) {
                const sprite = pegComp.pegGraphic.getComponent(Sprite);
                if (sprite) {
                    sprite.spriteFrame = spriteFrame;
                }
            }
        });
    }

    // ==================== 自动保存 ====================
    private autoSaveBeforePause() {
        console.log('游戏即将暂停，自动保存');
        this.quickSaveCurrentState();
    }

    private async quickSaveCurrentState() {
        if (!this.saveManager) {
            console.log('⚠️ saveManager 未初始化，跳过快速保存');
            return;
        }
        
        try {
            const quickSave = {
                levelIndex: this.currentLevelIndex,
                boardState: this.boardState,
                remainingSteps: this.remainingSteps,
                stepCount: this.stepCount,
                undoCount: this.undoCount,
                saveTime: Date.now()
            };
            
            await this.saveManager.saveGameData('quick_save', quickSave);
            console.log('✅ 快速保存完成');
        } catch (error) {
            console.error('❌ 快速保存失败:', error);
        }
    }

    // ==================== 结算弹窗系统 ====================
    private showGameCompletePanel() {
        if (this.settlementPanel && this.settlementTitle && this.settlementResult) {
            this.settlementPanel.active = true;
            this.settlementTitle.string = this.i18n ? this.i18n.t('completeAll') : "恭喜通关！";
            this.settlementResult.string = this.i18n ? this.i18n.t('masterTitle') : "您已成功完成所有关卡！\n真是一位钻石棋大师！";
            this.settlementStats.string = "";
            
            // 禁用下一关按钮（已经是最后一关）
            if (this.settlementNextBtn) {
                this.settlementNextBtn.interactable = false;
                // 添加文本提示
                const nextBtnLabel = this.settlementNextBtn.node.getComponentInChildren(Label);
                if (nextBtnLabel) {
                    nextBtnLabel.string = this.i18n ? this.i18n.t('lastLevel') : "已是最后一关";
                }
            }
        }
    }
    
    private showSettlementPanel(isVictory: boolean, remainingPegs: number, resultText: string, stepCount: number, isCenterPeg: boolean = false) {
        const remainingPegsForStars = isVictory ? remainingPegs : (remainingPegs > 0 ? remainingPegs : 0);

        if (!this.settlementPanel || !this.settlementTitle || !this.settlementResult || !this.settlementStats) {
            console.warn("Settlement panel components not fully assigned, falling back to tips.");
            this.showTips(isVictory ? 
                `恭喜! 剩余 ${remainingPegs} 颗. 评价: ${resultText}. 步数: ${stepCount}` :
                `游戏结束! 剩余 ${remainingPegs} 颗. 评价: ${resultText}. 步数: ${stepCount}`);
            return;
        }
        console.log("显示结算弹窗...");
        
        // 隐藏不需要的UI元素
        this.hideGameUIForSettlement();
        
        // 【额外添加】隐藏棋盘（BoardRoot）
        if (this.boardRoot) {
            this.boardRoot.active = false;
            console.log("隐藏BoardRoot（棋盘）");
        }

        // 显示结算弹窗
        this.settlementPanel.active = true;
        
        // 将结算弹窗在UIRoot内部移到最上层
        if (this.settlementPanel.parent) {
            this.settlementPanel.setSiblingIndex(this.settlementPanel.parent.children.length - 1);
        }
        
        // ==================== 新增：获取UI组件引用 ====================
        // 获取按钮容器和单按钮节点（需要在编辑器预制体中修改结构）
        const victoryButtonContainer = this.settlementPanel.getChildByPath('PopupWindow/VictoryButtonContainer');
        const failureButtonContainer = this.settlementPanel.getChildByPath('PopupWindow/FailureButtonContainer');
        const singleVictoryButton = this.settlementPanel.getChildByPath('PopupWindow/VictoryButtonContainer/SettlementSingleNextBtn')?.getComponent(Button);
        const singleFailureButton = this.settlementPanel.getChildByPath('PopupWindow/FailureButtonContainer/SettlementSingleRetryBtn')?.getComponent(Button);
        
        // ==================== 设置弹窗内容 ====================
        if (isVictory) {
            // 通关状态
            if (this.settlementTitle && this.i18n) {
                this.settlementTitle.string = this.i18n.t('levelComplete');
            } else {
                this.settlementTitle.string = "恭喜过关";
            }
            
            // 显示星星评价系统
            this.showVictoryStars(remainingPegsForStars);
            
            // 【修正】设置评价和统计文字
            if (this.settlementResult && this.i18n) {
                this.settlementResult.string = `${this.i18n.t('starRating')}: ${resultText}`;
            } else {
                this.settlementResult.string = `评价: ${resultText}`;
            }
            
            if (this.settlementStats && this.i18n) {
                const moveText = this.i18n.t('moveCount', stepCount);
                const remainingText = this.i18n.t('remainingPieces', remainingPegs);
                this.settlementStats.string = `${moveText}  ${remainingText}`;
            } else {
                this.settlementStats.string = `移动${stepCount}步  剩余${remainingPegs}子`;
            }
            
            // 按钮处理 - 只显示"下一关"按钮，居中显示
            if (victoryButtonContainer) {
                victoryButtonContainer.active = true;
            }
            if (failureButtonContainer) {
                failureButtonContainer.active = false;
            }
            
            // 处理"下一关"按钮
            if (singleVictoryButton) {
                const isLastLevel = this.currentLevelIndex >= LEVELS_DATA.length - 1;
                const nextBtnLabel = singleVictoryButton.node.getComponentInChildren(Label);
                if (nextBtnLabel) {
                    if (isLastLevel) {
                        if (this.i18n) {
                            nextBtnLabel.string = this.i18n.t('lastLevel');
                        } else {
                            nextBtnLabel.string = "返回关卡选择";
                        }
                        singleVictoryButton.interactable = true;
                        // 修改按钮点击事件
                        singleVictoryButton.node.off(Button.EventType.CLICK);
                        singleVictoryButton.node.on(Button.EventType.CLICK, () => {
                            this.onSettlementBackToLevelSelect();
                        }, this);                    
                    } else {
                        if (this.i18n) {
                            nextBtnLabel.string = this.i18n.t('nextLevel');
                        } else {
                            nextBtnLabel.string = "下一关";
                        }
                        singleVictoryButton.interactable = true;
                        // 修改按钮点击事件
                        singleVictoryButton.node.off(Button.EventType.CLICK);
                        singleVictoryButton.node.on(Button.EventType.CLICK, this.onSettlementNext, this);
                    }
                }
            }
            
        } else {
            // 失败状态
            if (this.settlementTitle && this.i18n) {
                this.settlementTitle.string = this.i18n.t('gameOver');
            } else {
                this.settlementTitle.string = "游戏结束";
            }
            
            // 显示失败状态的星星评价
            this.showVictoryStars(remainingPegsForStars); 
            
            // 【修正】设置评价和统计文字
            if (this.settlementResult && this.i18n) {
                this.settlementResult.string = `${this.i18n.t('starRating')}: ${resultText}`;
            } else {
                this.settlementResult.string = `评价: ${resultText}`;
            }
            
            if (this.settlementStats && this.i18n) {
                const moveText = this.i18n.t('moveCount', stepCount);
                const remainingText = this.i18n.t('remainingPieces', remainingPegs);
                this.settlementStats.string = `${moveText}  ${remainingText}`;
            } else {
                this.settlementStats.string = `移动${stepCount}步  剩余${remainingPegs}子`;
            }
            
            // 按钮处理 - 只显示"再试一次"按钮，居中显示
            if (victoryButtonContainer) {
                victoryButtonContainer.active = false;
            }
            if (failureButtonContainer) {
                failureButtonContainer.active = true;
            }
            
            // 处理"再试一次"按钮
            if (singleFailureButton) {
                singleFailureButton.interactable = true;
                const retryBtnLabel = singleFailureButton.node.getComponentInChildren(Label);
                if (retryBtnLabel) {
                    if (this.i18n) {
                        retryBtnLabel.string = this.i18n.t('tryAgain');
                    } else {
                        retryBtnLabel.string = "再试一次";
                    }
                }
                // 修改按钮点击事件
                singleFailureButton.node.off(Button.EventType.CLICK);
                singleFailureButton.node.on(Button.EventType.CLICK, this.onSettlementRetry, this);
            }
        }
        
        console.log("结算弹窗显示完成");

        // 通知保存管理器
        if (isVictory && this.saveManager) {
            try {
                this.saveManager.notifyGameCompleted(this.currentLevelIndex, resultText);
            } catch (error) {
                console.warn('通知保存管理器失败:', error);
            }
        }
}

    // ==================== 显示通关星星评价（3颗星系统）====================
    private showVictoryStars(remainingPegs: number) {
        // 先清除现有的星星
        this.clearVictoryStars();
        
        // 计算星级（使用GameConfig中的evaluateResult函数）
        let starCount5 = 0;
        let activeStarCount3 = 0;
        
        if (remainingPegs > 0) {
            // 【修改】这里 stepCount 实际上是剩余棋子数
            const resultText = evaluateResult(remainingPegs);
            starCount5 = (resultText.match(/★/g) || []).length; // 原始5星数量
            
            // 将5星转换为3星系统（与关卡列表页一致）
            if (remainingPegs === 1) {
                activeStarCount3 = 3; // 剩余1子：3颗亮星
            } else if (remainingPegs >= 2 && remainingPegs <= 3) {
                activeStarCount3 = 2; // 剩余2-3子：2颗亮星
            } else if (remainingPegs >= 4 && remainingPegs <= 5) {
                activeStarCount3 = 1; // 剩余4-5子：1颗亮星
            } else {
                activeStarCount3 = 0; // 剩余5子以上：0颗亮星
            }
        } else {
            // 失败状态：显示0颗亮星（全部灰色）
            activeStarCount3 = 0;
        }
        
        console.log(`星星评价: 剩余棋子=${remainingPegs}, 原始5星数量: ${starCount5}, 转换后3星数量: ${activeStarCount3}`);
        
        // 获取星星容器（需要在预制体中创建）
        const starContainer = this.settlementPanel.getChildByPath('PopupWindow/StarContainer');
        if (!starContainer) {
            console.warn("未找到StarContainer，无法显示星星");
            return;
        }
        
        starContainer.active = true;
        
        // 显示3颗星星（比关卡列表页大）
        const totalStars = 3;
        const starSize = 80; // 结算弹窗的星星要大很多
        const starSpacing = 40;
        const totalWidth = (starSize * totalStars) + (starSpacing * (totalStars - 1));
        const startX = -totalWidth / 2 + starSize / 2;
        
        for (let i = 0; i < totalStars; i++) {
            const starNode = new Node(`VictoryStar_${i}`);
            starNode.parent = starContainer;
            starNode.setPosition(startX + i * (starSize + starSpacing), 0, 0);
            
            // UITransform
            const uiTransform = starNode.addComponent(UITransform);
            uiTransform.setContentSize(starSize, starSize);
            uiTransform.setAnchorPoint(0.5, 0.5);
            
            // Sprite组件
            const starSprite = starNode.addComponent(Sprite);
            starSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            starSprite.type = Sprite.Type.SIMPLE;
            starSprite.trim = false;
            
            // 根据星级设置星星状态
            if (i < activeStarCount3) {
                if (this.starActive) {
                    starSprite.spriteFrame = this.starActive; // 点亮星星
                    starSprite.color = Color.WHITE;
                } else {
                    starSprite.color = Color.YELLOW;
                }
            } else {
                if (this.starInactive) {
                    starSprite.spriteFrame = this.starInactive; // 未点亮星星
                    starSprite.color = Color.WHITE;
                } else {
                    starSprite.color = Color.GRAY;
                }
            }
        }
    }

    // ==================== 新增：清空星星图标 ====================
    private clearVictoryStars() {
        const starContainer = this.settlementPanel.getChildByPath('PopupWindow/StarContainer');
        if (!starContainer) return;
        
        // 隐藏容器
        starContainer.active = false;
        
        // 销毁所有星星节点
        const starNodes: Node[] = [];
        starContainer.children.forEach((child) => {
            if (child.name.startsWith('VictoryStar_')) {
                starNodes.push(child);
            }
        });
        
        starNodes.forEach((starNode) => {
            if (starNode && starNode.isValid) {
                starNode.destroy();
            }
        });
    }

    // ========== 隐藏游戏UI元素 ==========
    private hideGameUIForSettlement() {
        
        // 隐藏标题栏
        const titleBarNode = this.uiRoot?.getChildByPath('UIRoot/TitleBar');
        if (titleBarNode) {
            titleBarNode.active = false;
        }
        
        // 隐藏标题
        if (this.gameTitleLabel && this.gameTitleLabel.node) {
            this.gameTitleLabel.node.active = false;
        }
        
        // 隐藏计步器
        if (this.stepCounterLabel && this.stepCounterLabel.node) {
            this.stepCounterLabel.node.active = false;
        }
        
        // 隐藏按钮容器
        const buttonContainer = this.uiRoot?.getChildByPath('UIRoot/ButtonContainer');
        if (buttonContainer) {
            buttonContainer.active = false;
        }
        
        // 隐藏提示（如果正在显示）
        if (this.tipsLabel && this.tipsLabel.node) {
            this.tipsLabel.node.active = false;
        }
        
        // 【新增】隐藏悔棋数字徽章
        if (this.undoBadgeNode) {
            this.undoBadgeNode.active = false;
        }

        // 隐藏教学和音乐按钮
        if (this.tutorialButton) {
            this.tutorialButton.node.active = false;
        }
        if (this.audioButton) {
            this.audioButton.node.active = false;
        }

        console.log("隐藏了游戏UI元素（标题、计步器、按钮）");
    }

    private restoreGameUIAfterSettlement() {
        
        // 恢复BoardRoot层级
        const canvas = find('Canvas');
        if (canvas && this.boardRoot) {
            // 将BoardRoot移回原来的位置（在Camera和GameManager之间）
            this.boardRoot.setSiblingIndex(2);
        }
        
        // 恢复显示棋盘
        if (this.boardRoot) {
            this.boardRoot.active = true;
            console.log("显示BoardRoot（棋盘）");
        }

        // 恢复标题栏
        const titleBarNode = this.uiRoot?.getChildByPath('UIRoot/TitleBar');
        if (titleBarNode) {
            titleBarNode.active = true;
        }

        // 恢复UI元素
        if (this.gameTitleLabel && this.gameTitleLabel.node) {
            this.gameTitleLabel.node.active = true;
        }
        
        if (this.stepCounterLabel && this.stepCounterLabel.node) {
            this.stepCounterLabel.node.active = true;
        }
        
        const buttonContainer = this.uiRoot?.getChildByPath('UIRoot/ButtonContainer');
        if (buttonContainer) {
            buttonContainer.active = true;
        }
        
        // 【新增】恢复悔棋数字徽章
        if (this.undoBadgeNode) {
            this.undoBadgeNode.active = true;
        }

        // 恢复教学和音乐按钮
        if (this.tutorialButton) {
            this.tutorialButton.node.active = true;
        }
        if (this.audioButton) {
            this.audioButton.node.active = true;
        }

        console.log("恢复了游戏UI元素和层级");
    }
    
    private hideSettlementPanel() {
        if (this.settlementPanel) {
            this.settlementPanel.active = false;
            // 清空星星
            this.clearVictoryStars();
        }
    }
    
    // 结算弹窗按钮事件 - 再玩一次
    public onSettlementRetry() {
        console.log("Settlement: Retry level");
        this.restoreGameUIAfterSettlement(); // 恢复UI
        this.hideSettlementPanel();
        this.retryLevel();
    }
    
    // 结算弹窗按钮事件 - 下一关
    public onSettlementNext() {
        
        // 恢复UI
        this.restoreGameUIAfterSettlement();
        
        // 隐藏结算弹窗
        this.hideSettlementPanel();
        
        // 计算下一关索引
        const nextLevelIndex = this.currentLevelIndex + 1;
        console.log(`准备加载关卡: ${nextLevelIndex}`);
        
        // 检查是否是最后一关
        if (nextLevelIndex >= LEVELS_DATA.length) {
            console.log("已经是最后一关，显示完成面板");
            this.showGameCompletePanel();
            return;
        }
        
        // 直接加载下一关
        console.log(`调用 loadLevel(${nextLevelIndex})`);
        this.loadLevel(nextLevelIndex);
    }


    // ==================== 教学系统相关方法 ====================
    private showTutorialPanel() {
        console.log('[UI] 显示教学弹窗');
        
        if (this.tutorialManager) {
            this.tutorialManager.showTutorial(this.currentLevelIndex);
            this.pauseGameInteraction(true);
        } else {
            console.warn('[UI] Tutorial manager not initialized');
            this.createEmergencyTutorialPanel();
        }
    }

    private createEmergencyTutorialPanel() {
        if (!this.tutorialPanelPrefab) {
            console.error('[UI] Cannot create tutorial panel: prefab missing');
            return;
        }
        
        const panel = instantiate(this.tutorialPanelPrefab);
        const canvas = find('Canvas');
        if (canvas) {
            panel.parent = canvas;
            panel.setSiblingIndex(canvas.children.length);
            
            const closeButton = panel.getChildByPath('PopupWindow/CloseButton')?.getComponent(Button);
            const confirmButton = panel.getChildByPath('PopupWindow/BtnContainer/ConfirmButton')?.getComponent(Button);
            
            const hidePanel = () => {
                panel.destroy();
                this.pauseGameInteraction(false);
            };
            
            if (closeButton) {
                closeButton.node.on(Button.EventType.CLICK, hidePanel, this);
            }
            if (confirmButton) {
                confirmButton.node.on(Button.EventType.CLICK, hidePanel, this);
            }
        }
    }

    private pauseGameInteraction(pause: boolean) {
        // 暂停棋子交互
        this.pegNodes.forEach((node) => {
            const button = node.getComponent(Button);
            if (button) {
                button.interactable = !pause;
            }
        });
        
        // 只暂停游戏按钮，不暂停返回按钮
        // 返回按钮应该始终可用
        if (this.retryButton) this.retryButton.interactable = !pause;
        if (this.undoButton) this.undoButton.interactable = !pause;
        // 【修改】不暂停返回按钮：if (this.backButton) this.backButton.interactable = !pause;
        
        // 暂停结算弹窗（如果有）
        if (this.settlementPanel && this.settlementPanel.active) {
            if (this.settlementRetryBtn) this.settlementRetryBtn.interactable = !pause;
            if (this.settlementNextBtn) this.settlementNextBtn.interactable = !pause;
        }
        
        console.log('[UI] 游戏交互状态:', pause ? '暂停' : '恢复', '返回按钮始终可用');
    }

    // ==================== 游戏流程控制 ====================
    // 页面切换辅助方法
    private switchToHomePage() {
        console.log("🚀 切换到首页");
        
        // 隐藏游戏相关UI
        if (this.uiRoot) {
            this.uiRoot.active = false;
            console.log("✅ 隐藏GameUI");
        }
        if (this.boardRoot) {
            this.boardRoot.active = false;
            console.log("✅ 隐藏BoardRoot");
        }
        
        // 显示首页
        if (this.homePageNode) {
            this.homePageNode.active = true;
            console.log("✅ 显示首页");
        }
        
        // 隐藏关卡选择页
        if (this.levelSelectionNode) {
            this.levelSelectionNode.active = false;
            console.log("✅ 隐藏关卡选择页");
        }
        
        // 隐藏结算弹窗（如果正在显示）
        this.hideSettlementPanel();
        
        // 关闭教学弹窗（如果正在显示）
        if (this.tutorialManager && this.tutorialManager.isTutorialShowing()) {
            this.tutorialManager.hideTutorial();
        }
    }

    private switchToLevelSelection() {
        console.log("🚀 切换到关卡选择");
        
        // 隐藏游戏相关UI
        if (this.uiRoot) {
            this.uiRoot.active = false;
            console.log("✅ 隐藏GameUI");
        }
        if (this.boardRoot) {
            this.boardRoot.active = false;
            console.log("✅ 隐藏BoardRoot");
        }
        
        // 显示关卡选择页
        if (this.levelSelectionNode) {
            this.levelSelectionNode.active = true;
            const levelSelection = this.levelSelectionNode.getComponent(LevelSelection);
            if (levelSelection && levelSelection.show) {
                levelSelection.show();
            }
            console.log("✅ 显示关卡选择页");
        }
        
        // 隐藏首页
        if (this.homePageNode) {
            this.homePageNode.active = false;
            console.log("✅ 隐藏首页");
        }
        
        // 隐藏结算弹窗（如果正在显示）
        this.hideSettlementPanel();
        
        // 关闭教学弹窗（如果正在显示）
        if (this.tutorialManager && this.tutorialManager.isTutorialShowing()) {
            this.tutorialManager.hideTutorial();
        }
    }
    
    public retryLevel() {
        console.log("Retrying current level");
        this.clearHistory();  // 清空历史记录
        
        // 【新增】重置悔棋计数
        this.undoCount = 0;
        
        this.loadLevel(this.currentLevelIndex);
    }
    
    public nextLevel() {
        console.log("====================");
        console.log("nextLevel() 被调用");
        console.log(`原关卡索引: ${this.currentLevelIndex}`);
        
        const nextIndex = this.currentLevelIndex + 1;
        console.log(`新关卡索引: ${nextIndex}`);
        
        if (nextIndex >= LEVELS_DATA.length) {
            console.log("已是最后一关，不加载");
            return;
        }
        
        this.currentLevelIndex = nextIndex;
        this.loadLevel(this.currentLevelIndex);
    }

    // ==================== 游戏核心逻辑（保持不变） ====================
    private getPegLocalPosition(r: number, c: number): Vec3 {
        const x = (c - 3) * TILE_SIZE;
        const y = (3 - r) * TILE_SIZE; 
        return v3(x, y, 0);
    }

    private getLogicPosition(worldPos: Vec3): { row: number, col: number } | null {
        const boardUITransform = this.boardRoot.getComponent(UITransform);
        if (!boardUITransform) {
            console.warn("BoardRoot missing UITransform component");
            return null;
        }
        
        const localPos = boardUITransform.convertToNodeSpaceAR(worldPos);
        
        const col = Math.round(localPos.x / TILE_SIZE) + 3;
        const row = 3 - Math.round(localPos.y / TILE_SIZE);
        
        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
            return { row, col };
        }
        return null;
    }
    
    private checkJumpValidity(r1: number, c1: number, r2: number, c2: number): { row: number, col: number } | null {
        if (r2 < 0 || r2 >= BOARD_SIZE || c2 < 0 || c2 >= BOARD_SIZE) return null;
        if (this.boardState[r2][c2] === TILE_STATE.INVALID) return null;
        if (this.boardState[r2][c2] !== TILE_STATE.EMPTY) return null;

        const dr = Math.abs(r1 - r2);
        const dc = Math.abs(c1 - c2);
        if (!((dr === 2 && dc === 0) || (dr === 0 && dc === 2))) return null;
        
        const eatR = (r1 + r2) / 2;
        const eatC = (c1 + c2) / 2;
        
        if (this.boardState[eatR][eatC] !== TILE_STATE.PEG) return null;
        
        console.log(`Valid jump from (${r1}, ${c1}) to (${r2}, ${c2}), eat (${eatR}, ${eatC})`);
        return { row: eatR, col: eatC };
    }
    
    // ==================== 棋子拖拽逻辑 ====================
    public handlePegTouchStart(peg: Peg, event: EventTouch) {
        console.log(`TouchStart: peg at (${peg.row}, ${peg.col})`);
        
        // 记录活动棋子
        this.activeNode = peg.node;
        this.activePegRow = peg.row;
        this.activePegCol = peg.col;
        
        if (!this.activeNode || !this.activeNode.isValid) {
            console.error("Peg node is invalid!");
            this.activeNode = null;
            return;
        }

        // 激活棋子
        peg.setActive(true);
        
        // 记录触摸起始位置
        const touchUIPos = event.getUILocation();
        this.touchStartPos = v3(touchUIPos.x, touchUIPos.y, 0);
        
        // 记录棋子当前位置
        const pegWorldPos = this.activeNode.getWorldPosition();
        this.dragOffset.x = pegWorldPos.x - this.touchStartPos.x;
        this.dragOffset.y = pegWorldPos.y - this.touchStartPos.y;
        
        console.log(`TouchStart: touch (${this.touchStartPos.x}, ${this.touchStartPos.y}), offset (${this.dragOffset.x}, ${this.dragOffset.y})`);
    }
    
    public handlePegTouchMove(peg: Peg, event: EventTouch) {
        // 安全检查
        if (!this.activeNode || !this.activeNode.isValid) {
            console.warn("No active node in TouchMove");
            return;
        }
        
        if (peg.row !== this.activePegRow || peg.col !== this.activePegCol) {
            console.warn("Wrong peg in TouchMove");
            return;
        }
        
        // 获取当前触摸位置
        const touchUIPos = event.getUILocation();
        const currentTouchPos = v3(touchUIPos.x, touchUIPos.y, 0);
        
        // 计算新的世界位置
        const newWorldPos = v3(
            currentTouchPos.x + this.dragOffset.x,
            currentTouchPos.y + this.dragOffset.y,
            0
        );
        
        console.log(`TouchMove: current (${currentTouchPos.x}, ${currentTouchPos.y}), new world (${newWorldPos.x}, ${newWorldPos.y})`);
        
        // 直接设置世界位置
        this.activeNode.setWorldPosition(newWorldPos);
        
        // 安全地更新反馈（如果feedbackNode存在）
        this.safeUpdateFeedback(newWorldPos);
    }
    
    private safeUpdateFeedback(worldPos: Vec3) {
        // 安全检查：如果feedbackNode不存在或无效，直接返回
        if (!this.feedbackNode || !this.feedbackNode.isValid) {
            return;
        }
        
        const targetLogicPos = this.getLogicPosition(worldPos);
        
        // 先隐藏反馈节点
        this.feedbackNode.active = false;
        
        if (targetLogicPos) {
            const eatenPos = this.checkJumpValidity(
                this.activePegRow, 
                this.activePegCol, 
                targetLogicPos.row, 
                targetLogicPos.col
            );
            
            if (eatenPos) {
                // 显示绿色反馈（有效跳吃）
                this.feedbackNode.active = true;
                this.feedbackNode.setPosition(this.getPegLocalPosition(targetLogicPos.row, targetLogicPos.col));
                
                const feedbackSprite = this.feedbackNode.getComponent(Sprite);
                if (feedbackSprite) {
                    feedbackSprite.color = Color.GREEN;
                }
            } else {
                // 显示红色反馈（无效位置）
                this.feedbackNode.active = true;
                this.feedbackNode.setPosition(this.getPegLocalPosition(targetLogicPos.row, targetLogicPos.col));
                
                const feedbackSprite = this.feedbackNode.getComponent(Sprite);
                if (feedbackSprite) {
                    feedbackSprite.color = Color.RED;
                }
            }
        }
    }
    
    public handlePegTouchEnd(peg: Peg, event: EventTouch) {
        console.log(`TouchEnd: peg at (${peg.row}, ${peg.col})`);
        
        if (!this.activeNode || !this.activeNode.isValid) {
            console.warn("No active node in TouchEnd");
            return;
        }
        
        if (peg.row !== this.activePegRow || peg.col !== this.activePegCol) {
            console.warn("Wrong peg in TouchEnd");
            this.resetActiveState();
            return;
        }
        
        // 安全地隐藏反馈节点
        if (this.feedbackNode && this.feedbackNode.isValid) {
            this.feedbackNode.active = false;
        }
        
        // 获取当前位置
        const currentWorldPos = this.activeNode.getWorldPosition();
        const targetLogicPos = this.getLogicPosition(currentWorldPos);
        
        console.log(`TouchEnd: world pos (${currentWorldPos.x}, ${currentWorldPos.y}), target ${targetLogicPos ? `(${targetLogicPos.row}, ${targetLogicPos.col})` : 'null'}`);
        
        // 1. 尝试跳吃
        if (targetLogicPos) {
            const eatenPos = this.checkJumpValidity(
                this.activePegRow, 
                this.activePegCol, 
                targetLogicPos.row, 
                targetLogicPos.col
            );
            
            if (eatenPos) {
                console.log(`Valid jump detected, executing...`);
                this.executeJump(peg, targetLogicPos.row, targetLogicPos.col, eatenPos);
                return; 
            }
        }
        
        // 2. 无效跳吃：棋子归位
        console.log(`Invalid jump or out of board, resetting peg position`);
        this.resetPegPosition(peg);
    }
    
    private resetPegPosition(peg: Peg) {
        if (!this.activeNode) return;
        
        // 播放移动失败音效
        const audioManager = AudioManager.getInstance();
        if (audioManager && audioManager.playMoveFail) {
            audioManager.playMoveFail();
        }

        peg.setActive(false);
        
        tween(this.activeNode)
            .to(0.1, { position: this.getPegLocalPosition(this.activePegRow, this.activePegCol) })
            .call(() => {
                console.log(`Peg reset to original position (${this.activePegRow}, ${this.activePegCol})`);
                this.resetActiveState();
            })
            .start();
    }
    
    private resetActiveState() {
        this.activeNode = null;
        this.activePegRow = -1;
        this.activePegCol = -1;
    }
    
    private executeJump(peg: Peg, targetR: number, targetC: number, eatenPos: { row: number, col: number }) {
        console.log(`Executing jump: peg (${this.activePegRow}, ${this.activePegCol}) -> (${targetR}, ${targetC}), eat (${eatenPos.row}, ${eatenPos.col})`);
        
        // 【新增】检查剩余步数
        if (this.remainingSteps <= 0) {
            console.log("步数已用尽，无法移动");
            this.showTips("stepLimitExceeded"); // 修改为国际化键
            this.resetPegPosition(peg);
            return;
        }

        const audioManager = AudioManager.getInstance();
        if (audioManager && audioManager.playMoveSuccess) {
            audioManager.playMoveSuccess();
        }

        if (!this.activeNode || !this.activeNode.isValid) {
            console.error("Invalid node in executeJump");
            return;
        }
        
        peg.setActive(false);
        
        const originalRow = this.activePegRow;
        const originalCol = this.activePegCol;
        
        // 更新棋盘状态：清空起点
        this.boardState[originalRow][originalCol] = TILE_STATE.EMPTY;
        
        // 找到并移除被吃的棋子
        const eatenKey = `${eatenPos.row},${eatenPos.col}`;
        const eatenNode = this.pegNodes.get(eatenKey);
        
        if (eatenNode && eatenNode.isValid) {
            console.log(`Removing eaten peg at (${eatenPos.row}, ${eatenPos.col})`);
            
            const opacityComp = eatenNode.getComponent(UIOpacity) || eatenNode.addComponent(UIOpacity);
            
            tween(eatenNode)
                .parallel(
                    tween().to(0.15, { scale: v3(0.1, 0.1, 0.1) }),
                    tween(opacityComp).to(0.15, { opacity: 0 })
                )            
                .call(() => {
                    eatenNode.destroy();
                    this.pegNodes.delete(eatenKey);
                    this.boardState[eatenPos.row][eatenPos.col] = TILE_STATE.EMPTY;
                })
                .start();
        } else {
            console.warn(`Eaten peg node not found at (${eatenPos.row}, ${eatenPos.col})`);
            this.boardState[eatenPos.row][eatenPos.col] = TILE_STATE.EMPTY;
        }
        
        // 移动棋子到目标位置
        const targetLocalPos = this.getPegLocalPosition(targetR, targetC);
        
        console.log(`Moving peg from (${originalRow}, ${originalCol}) to (${targetR}, ${targetC})`);
        
        tween(this.activeNode)
            .to(0.2, { position: targetLocalPos })
            .call(() => {
                // 更新棋盘状态：设置终点
                this.boardState[targetR][targetC] = TILE_STATE.PEG;
                
                // 更新棋子逻辑坐标
                peg.row = targetR;
                peg.col = targetC;
                
                // 更新节点Map
                const originalKey = `${originalRow},${originalCol}`;
                const newKey = `${targetR},${targetC}`;
                this.pegNodes.delete(originalKey);
                this.pegNodes.set(newKey, this.activeNode);
                
                // 【关键修复】在这里减少步数
                this.remainingSteps--;
                console.log(`[ExecuteJump] 剩余步数减少为: ${this.remainingSteps}`);

                // 【关键修复】在这里保存状态！在移动完成后保存
                this.saveCurrentState();

                // 更新计步器
                this.updateStepCounter();
                
                console.log(`Jump completed. 剩余步数: ${this.remainingSteps}/${this.stepLimit}, Board updated.`);
                this.resetActiveState();
                
                // 【新增】检查游戏状态（包括步数是否用尽）
                this.checkGameState();        
            })
            .start();
    }
    
    private findPegNode(row: number, col: number): Node | null {
        const key = `${row},${col}`;
        return this.pegNodes.get(key) || null;
    }
    
    // ==================== 游戏状态检查 ====================
    private checkGameState() {
        let remainingPegs = 0;
        // 同时找出所有棋子的位置，方便调试
        const pegPositions: [number, number][] = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.boardState[r][c] === TILE_STATE.PEG) {
                    remainingPegs++;
                    pegPositions.push([r, c]);
                }
            }
        }
        
        // 计算实际步数
        const actualSteps = this.stepLimit - this.remainingSteps;
        
        console.log(`[GameState] 剩余棋子: ${remainingPegs}, 位置: ${JSON.stringify(pegPositions)}, 剩余步数: ${this.remainingSteps}, 实际步数: ${actualSteps}`);
        
        // 情况1: 胜利 (只剩1颗) 
        if (remainingPegs === 1) {
            console.log(`[GameState] ✅ 检测到胜利条件：只剩1颗棋子`);
            const isCenter = this.boardState[CENTER_POS.row][CENTER_POS.col] === TILE_STATE.PEG;
            const result = evaluateResult(remainingPegs);

            this.updateLevelProgress(this.currentLevelIndex, result, actualSteps, isCenter);

            // 传入实际步数，不是剩余棋子数
            this.showSettlementPanel(true, remainingPegs, result, actualSteps, isCenter);
            return;
        }

        // 情况2: 步数用尽（游戏失败）
        if (this.remainingSteps <= 0) {
            console.log(`[GameState] ❌ 检测到步数用尽`);
            const result = evaluateResult(remainingPegs);
            // 传入实际步数，不是剩余棋子数
            this.showSettlementPanel(false, remainingPegs, result, actualSteps);
            return;
        }

        // 情况3: 检查是否还有合法移动 (只有当棋子数>1时才检查)
        if (remainingPegs > 1) {
            const hasMove = this.hasValidMove();
            
            if (!hasMove) {
                console.log(`[GameState] ❌ 检测到失败条件：无合法移动`);
                let foundCenterPeg = false;
                if (this.boardState[CENTER_POS.row][CENTER_POS.col] === TILE_STATE.PEG) {
                    foundCenterPeg = true;
                }
                const result = evaluateResult(remainingPegs);
                // 传入实际步数，不是剩余棋子数
                this.showSettlementPanel(false, remainingPegs, result, actualSteps);
            }  
        }
    }
    
    private hasValidMove(): boolean {
        const directions = [[0, 2], [0, -2], [2, 0], [-2, 0]]; 
        
        for (let r1 = 0; r1 < BOARD_SIZE; r1++) {
            for (let c1 = 0; c1 < BOARD_SIZE; c1++) {
                if (this.boardState[r1][c1] === TILE_STATE.PEG) {
                    for (const [dr, dc] of directions) {
                        const r2 = r1 + dr;
                        const c2 = c1 + dc;
                        
                        // 直接调用检查方法并记录结果
                        const jumpResult = this.checkJumpValidity(r1, c1, r2, c2);
                        if (jumpResult) {
                            console.log(`[ValidMove] ✅ 找到合法移动: (${r1},${c1}) -> (${r2},${c2}), 吃 (${jumpResult.row},${jumpResult.col})`);
                            return true; 
                        }
                    }
                }
            }
        }
        console.log(`[ValidMove] ❌ 未找到任何合法移动`);
        return false; 
    }
    
    // ==================== 辅助方法 ====================
    private countPegs(): number {
        let count = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.boardState[r][c] === TILE_STATE.PEG) {
                    count++;
                }
            }
        }
        return count;
    }
    
    private setMaxUndoCount(levelIndex: number) {
        if (levelIndex < 30) {
            this.maxUndoCount = 5; // 1-30关：5次
        } else if (levelIndex < 60) {
            this.maxUndoCount = 7; // 31-60关：7次
        } else {
            this.maxUndoCount = 9; // 61+关：9次
        }

        // 【新增】如果徽章已创建，更新初始值
        if (this.undoBadgeLabel) {
            this.updateUndoBadge();
        }
    }
    
    private spawnPeg(r: number, c: number) {
        if (!this.PegPrefab) {
            console.error("Cannot spawn peg: PegPrefab is null");
            return;
        }
        
        const pegNode = instantiate(this.PegPrefab);
        
        // 确保棋子显示在背景之上
        pegNode.parent = this.boardRoot;
        pegNode.setSiblingIndex(this.boardRoot.children.length); // 放在最后面（最上层）
        
        const uiTransform = pegNode.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(70, 70); 
        }
        
        const pegComp = pegNode.getComponent(Peg);
        if (!pegComp) {
            console.error("Peg Prefab missing Peg component!");
            pegNode.destroy();
            return;
        }
        
        // 【修改】传递当前选择的棋子图片给Peg组件
        pegComp.init(r, c, this, this.currentPegSprite);
        
        pegNode.setPosition(this.getPegLocalPosition(r, c));
        
        // 保存节点到Map
        const key = `${r},${c}`;
        this.pegNodes.set(key, pegNode);
        
        console.log(`Spawned peg at (${r}, ${c}), 层级索引: ${pegNode.getSiblingIndex()}`);
    }


    private initTutorialSystem() {
        console.log('[Tutorial] 初始化教学系统...');
        
        // 创建教学管理器节点
        const tutorialManagerNode = new Node('TutorialManager');
        tutorialManagerNode.parent = this.node;
        
        // 添加教学管理器组件
        this.tutorialManager = tutorialManagerNode.addComponent(TutorialManager);
        
        // 检查并设置预制体
        if (this.tutorialPanelPrefab) {
            this.tutorialManager.tutorialPanelPrefab = this.tutorialPanelPrefab;
            console.log('[Tutorial] 教学弹窗预制体已设置');
        } else {
            console.warn('[Tutorial] 教学弹窗预制体未分配，请在编辑器中设置');
            // 可以尝试从资源动态加载
            // this.loadTutorialPrefabFromResources();
        }
        
        console.log('[Tutorial] Tutorial system initialized');
    }

    // 可选：动态加载预制体
    private loadTutorialPrefabFromResources() {
        console.log('[Tutorial] 尝试从资源动态加载教学弹窗预制体...');
        // 这里可以根据你的资源管理方式实现
    }

    // 【新增】初始化游戏标题栏
    private initGameTitleBar() {
        console.log('[UI] 初始化游戏标题栏...');
        
        // 1. 找到标题栏节点
        const titleBarNode = this.uiRoot?.getChildByPath('UIRoot/TitleBar');
        if (!titleBarNode) {
            console.warn('[UI] 未找到TitleBar节点，可能未在编辑器中创建');
            return;
        }
        
        // 2. 设置标题栏位置（与关卡选择页一致）
        const canvasHeight = 1334;
        const titleBarY = canvasHeight / 2 - 60;
        titleBarNode.setPosition(0, titleBarY, 0);
        
        console.log(`[UI] 游戏标题栏位置设置: (0, ${titleBarY})`);
        
        // 3. 找到标题文字并更新
        const titleLabel = titleBarNode.getChildByPath('GameTitleLabel')?.getComponent(Label);
        if (titleLabel) {
            // 标题文字会在loadLevel时更新为"关卡 X"
            titleLabel.color = Color.WHITE; // 确保是白色
        }
        
        // 4. 确保返回按钮事件绑定正确
        const backButton = titleBarNode.getChildByPath('BackButton')?.getComponent(Button);
        if (backButton) {
            // 移除旧事件，绑定新事件
            backButton.node.off(Button.EventType.CLICK);
            backButton.node.on(Button.EventType.CLICK, this.onBackToLevelSelect, this);
            console.log('[UI] 标题栏返回按钮事件绑定完成');
        }
        
        // 5. 将标题栏移到合适层级（确保在最上层显示）
        titleBarNode.setSiblingIndex(999);
    }

    private createTutorialButton() {
        console.log('[UI] 开始创建教学入口按钮...');
        
        const tutorialContainer = new Node('TutorialEntry');
        const uiRootNode = this.uiRoot?.getChildByPath('UIRoot');
        
        if (!uiRootNode) {
            console.error('[UI] 找不到UIRoot节点！');
            return;
        }
        
        // 放在底部
        tutorialContainer.parent = uiRootNode;
        tutorialContainer.setPosition(-180, -567, 0);
        //tutorialContainer.setPosition(295, 550, 0);

        
        // 添加UITransform组件
        const containerTransform = tutorialContainer.addComponent(UITransform);
        containerTransform.setContentSize(60, 60);
        containerTransform.setAnchorPoint(0.5, 0.5);
        
        // 创建问号图标
        const iconNode = new Node('QuestionIcon');
        iconNode.parent = tutorialContainer;
        iconNode.setPosition(0, 0, 0);
        
        const iconTransform = iconNode.addComponent(UITransform);
        iconTransform.setContentSize(60, 60); // 设置图标显示尺寸
        iconTransform.setAnchorPoint(0.5, 0.5);
        
        const iconSprite = iconNode.addComponent(Sprite);
        
        // 设置 Sprite 尺寸模式
        iconSprite.sizeMode = Sprite.SizeMode.CUSTOM; // 使用自定义尺寸
        iconSprite.type = Sprite.Type.SIMPLE;
        iconSprite.trim = false; // 关闭裁切
        
        // 使用上传的问号图标
        if (this.tutorialIconSprite) {
            iconSprite.spriteFrame = this.tutorialIconSprite;
            console.log('[UI] 使用自定义教学图标');
            
            // 【可选】如果你希望完全填充，也可以这样设置：
            // iconSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        } else {
            console.warn('[UI] 教学图标未设置，使用默认颜色');
            iconSprite.color = Color.BLUE;
        }
        
        // 添加按钮组件
        const tutorialButton = tutorialContainer.addComponent(Button);
        tutorialButton.transition = Button.Transition.COLOR;
        tutorialButton.normalColor = new Color(255, 255, 255, 255);
        tutorialButton.hoverColor = new Color(200, 200, 255, 255);
        tutorialButton.pressedColor = new Color(150, 150, 255, 255);
        tutorialButton.disabledColor = new Color(100, 100, 100, 100);
        
        tutorialButton.node.on(Button.EventType.CLICK, this.showTutorialPanel, this);
        
        console.log('[UI] 教学图标按钮创建完成');
        console.log('[UI] 图标尺寸:', iconTransform.contentSize);

        this.tutorialButton = tutorialButton;
    }

    private createAudioButton() {
        console.log('[UI] 创建音乐开关按钮...');
        
        const audioContainer = new Node('AudioButton');
        const uiRootNode = this.uiRoot?.getChildByPath('UIRoot');
        
        if (!uiRootNode) {
            console.error('[UI] 找不到UIRoot节点！');
            return;
        }
        
        audioContainer.parent = uiRootNode;
        //audioContainer.setPosition(-300, 450, 0);
        audioContainer.setPosition(295, 480, 0);
        
        
        const transform = audioContainer.addComponent(UITransform);
        transform.setContentSize(60, 60); 
        transform.setAnchorPoint(0.5, 0.5);

        // 添加图标Sprite
        const iconSprite = audioContainer.addComponent(Sprite);
        
        // 先设置白色，确保可见
        iconSprite.color = Color.WHITE;

        if (this.musicOnSprite) {
            console.log('[Audio] 设置音乐开启图标');
            
            iconSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            iconSprite.type = Sprite.Type.SIMPLE;
            iconSprite.trim = false;
            iconSprite.spriteFrame = this.musicOnSprite;
        } else {
            console.warn('[Audio] musicOnSprite 未设置');
            iconSprite.color = Color.YELLOW;
        }
        
        // 添加按钮组件
        const audioButton = audioContainer.addComponent(Button);
        
        // 禁用颜色过渡，使用纯按钮交互
        audioButton.transition = Button.Transition.NONE; // 不改变颜色
        audioButton.interactable = true;
        audioButton.node.on(Button.EventType.CLICK, this.toggleAudio, this);
        
        // 【可选】添加悬停效果（通过代码而不是Button颜色）
        audioButton.node.on(Node.EventType.MOUSE_ENTER, () => {
            iconSprite.color = new Color(200, 200, 200, 255); // 悬停时变灰
        }, this);
        
        audioButton.node.on(Node.EventType.MOUSE_LEAVE, () => {
            iconSprite.color = Color.WHITE; // 离开时恢复白色
        }, this);
        
        audioButton.node.on(Node.EventType.TOUCH_START, () => {
            iconSprite.color = new Color(150, 150, 150, 255); // 按下时更灰
        }, this);
        
        audioButton.node.on(Node.EventType.TOUCH_END, () => {
            iconSprite.color = Color.WHITE; // 释放时恢复
        }, this);
        
        // 保存引用
        this.audioButton = audioButton;
        this.audioIcon = iconSprite;
        
        console.log('[UI] 音乐开关按钮创建完成');
        
        setTimeout(() => {
            this.checkAudioManager();
        }, 1000);
    }

    private checkAudioManager() {
        // 方式1：使用单例
        let audioManager = AudioManager.getInstance();
        
        if (!audioManager) {
            console.log('[Audio] 单例未获取到，尝试直接查找...');
            
            // 方式2：从当前场景查找
            const scene = director.getScene();
            if (scene) {
                // 查找所有节点的AudioManager组件
                const findAllAudioManagers = (node: Node): AudioManager | null => {
                    // 检查当前节点
                    const comp = node.getComponent(AudioManager);
                    if (comp) return comp;
                    
                    // 检查子节点
                    for (const child of node.children) {
                        const childComp = findAllAudioManagers(child);
                        if (childComp) return childComp;
                    }
                    
                    return null;
                };
                
                audioManager = findAllAudioManagers(scene);
            }
        }
        
        if (audioManager) {
            console.log('[Audio] ✅ AudioManager 已找到，节点:', audioManager.node?.name);
            console.log('[Audio] 当前静音状态:', audioManager.isMutedState() ? '静音' : '开启');
        } else {
            // 改为警告而不是错误，因为可能在某些情况下正常
            console.warn('[Audio] ⚠️ 未找到 AudioManager，但音乐功能可能正常');
            
            // 调试：列出场景中的所有节点
            console.log('[Audio] 场景节点检查:');
            const scene = director.getScene();
            if (scene) {
                scene.children.forEach((node, index) => {
                    console.log(`  [${index}] ${node.name}`);
                });
            }
        }
    }

    /**
     * 添加调试边框（红色边框以便看到按钮区域）
     */
    private addDebugBorder(parent: Node) {
        const borderNode = new Node('DebugBorder');
        borderNode.parent = parent;
        borderNode.setPosition(0, 0, 1); // Z轴在前
        
        const borderSprite = borderNode.addComponent(Sprite);
        borderSprite.color = Color.RED; // 红色边框
        borderSprite.type = Sprite.Type.SIMPLE;
        
        // 检查是否已有UITransform，避免重复添加
        let borderTransform = borderNode.getComponent(UITransform);
        if (!borderTransform) {
            borderTransform = borderNode.addComponent(UITransform);
        }
        borderTransform.setContentSize(54, 54); // 比按钮大4像素
        
        console.log('[Debug] 添加了红色调试边框');
    }

    private toggleAudio() {
        console.log('[Audio] 点击音乐按钮');

        const audioManager = AudioManager.getInstance();
        if (audioManager) {
            console.log('[Audio] AudioManager 实例找到');
            const isNowMuted = audioManager.toggleMute();
            console.log('[Audio] 声音状态切换:', isNowMuted ? '静音' : '开启');
            
            // 播放按钮点击音效（静音状态下不播放）
            if (!isNowMuted && audioManager.playButtonClick) {
                audioManager.playButtonClick();
                console.log('[Audio] 播放按钮点击音效');
            }
            
            // 更新按钮图标
            this.updateAudioButtonIcon();
        } else {
            console.error('[Audio] AudioManager 未找到！');
            // 临时切换图标
            this.toggleIconManually();
        }
    }

    // 临时手动切换图标
    private toggleIconManually() {
        if (!this.audioIcon) return;
        
        // 检查当前显示的是哪个图标
        const currentSprite = this.audioIcon.spriteFrame;
        const isCurrentlyMuted = currentSprite === this.musicOffSprite;
        
        console.log('[Audio] 手动切换图标，当前状态:', isCurrentlyMuted ? '静音' : '开启');
        
        if (isCurrentlyMuted) {
            this.audioIcon.spriteFrame = this.musicOnSprite;
        } else {
            this.audioIcon.spriteFrame = this.musicOffSprite;
        }
    }

    private updateAudioButtonIcon() {
        if (!this.audioIcon) return;
        
        const audioManager = AudioManager.getInstance();
        const isMuted = audioManager ? audioManager.isMutedState() : false;
        
        // 直接使用绑定的 SpriteFrame
        if (isMuted) {
            if (this.musicOffSprite) {
                this.audioIcon.spriteFrame = this.musicOffSprite;
            } else {
                console.warn('[Audio] 静音图标未设置');
                this.audioIcon.color = Color.RED; // 调试用
            }
        } else {
            if (this.musicOnSprite) {
                this.audioIcon.spriteFrame = this.musicOnSprite;
            } else {
                console.warn('[Audio] 音乐开启图标未设置');
                this.audioIcon.color = Color.GREEN; // 调试用
            }
        }
        
        console.log('[UI] 更新音乐按钮图标，状态:', isMuted ? '静音' : '开启');
    }

    private debugUIHierarchy() {
        console.log('=== UI层级调试 ===');
        
        // 遍历Canvas的所有子节点
        const canvas = find('Canvas');
        if (canvas) {
            console.log('Canvas子节点:');
            canvas.children.forEach((child, index) => {
                const transform = child.getComponent(UITransform);
                console.log(`  [${index}] ${child.name}: pos=${child.position}, active=${child.active}, size=${transform?.contentSize?.width}x${transform?.contentSize?.height}`);
            });
        }
        
        // 检查GameUI层级
        const gameUI = find('Canvas/GameUI');
        if (gameUI) {
            console.log('GameUI子节点:');
            gameUI.children.forEach((child, index) => {
                console.log(`  [${index}] ${child.name}: active=${child.active}`);
            });
        }
        
        // 检查UIRoot层级
        const uiRoot = find('Canvas/GameUI/UIRoot');
        if (uiRoot) {
            console.log('UIRoot子节点:');
            uiRoot.children.forEach((child, index) => {
                const transform = child.getComponent(UITransform);
                console.log(`  [${index}] ${child.name}: pos=${child.position}, active=${child.active}, size=${transform?.contentSize?.width}x${transform?.contentSize?.height}`);
            });
        }
    }

    // ==================== 修改后的国际化UI更新方法 ====================
    private updateGameUIText() {
        if (!this.i18n) {
            console.warn('updateGameUIText: i18n not available');
            return;
        }
        
        // 更新标题（关卡标题）
        if (this.gameTitleLabel) {
            // 使用带参数的形式
            this.gameTitleLabel.string = this.i18n.t('level', this.currentLevelIndex + 1);
            console.log(`[BoardController] updateGameUIText: 标题 = ${this.gameTitleLabel.string}`);
        }
        
        // 更新按钮文本 - 直接修改按钮的Label
        this.updateButtonTextDirectly();
        
        // 更新结算弹窗按钮文本
        if (this.settlementPanel && this.settlementPanel.active) {
            this.updateSettlementText();
        }
        
        // 更新计步器
        this.updateStepCounter();
    }

    // 新增：直接更新按钮文本的方法
    private updateButtonTextDirectly() {
        if (!this.i18n) return;
        
        // 重玩按钮
        if (this.retryButton) {
            const retryLabel = this.retryButton.node.getComponentInChildren(Label);
            if (retryLabel) {
                retryLabel.string = this.i18n.t('retry');
            }
        }
        
        // 悔棋按钮
        if (this.undoButton) {
            const undoLabel = this.undoButton.node.getComponentInChildren(Label);
            if (undoLabel) {
                undoLabel.string = this.i18n.t('undo');
            }
        }
        
        // 返回按钮
        if (this.backButton) {
            const backLabel = this.backButton.node.getComponentInChildren(Label);
            if (backLabel) {
                backLabel.string = this.i18n.t('back');
            }
        }
    }

    // 新增：更新结算弹窗文本
    private updateSettlementText() {
        if (!this.i18n || !this.settlementPanel.active) return;
        
        // 更新按钮文本
        if (this.settlementRetryBtn) {
            const retryLabel = this.settlementRetryBtn.node.getComponentInChildren(Label);
            if (retryLabel) {
                retryLabel.string = this.i18n.t('tryAgain');
            }
        }
        
        if (this.settlementNextBtn) {
            const nextLabel = this.settlementNextBtn.node.getComponentInChildren(Label);
            if (nextLabel) {
                const isLastLevel = this.currentLevelIndex >= LEVELS_DATA.length - 1;
                nextLabel.string = this.i18n.t(isLastLevel ? 'lastLevel' : 'nextLevel');
            }
        }
    }

    // ==================== 添加监听语言变化 ====================
    protected start() {
        // 监听语言变化事件
        const i18nNode = find('I18nManager');
        if (i18nNode) {
            i18nNode.on('language-changed', this.onLanguageChanged, this);
        }
    }

    protected onDestroy() {
        // 移除事件监听
        const i18nNode = find('I18nManager');
        if (i18nNode) {
            i18nNode.off('language-changed', this.onLanguageChanged, this);
        }
        
        // 【新增】移除 game-paused 事件监听
        director.off('game-paused', this.autoSaveBeforePause, this);
    }

    private onLanguageChanged() {
        console.log('BoardController: Language changed, updating UI text...');
        this.updateGameUIText();
        this.updateStepCounter(); // 如果需要更新计步器
    }
}