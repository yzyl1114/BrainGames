// assets/games/chess/scripts/BoardController.ts

import { LevelSelection } from './LevelSelection';
import { _decorator, Component, Node, Prefab, instantiate, UITransform, Vec3, v3, EventTouch, Label, tween, UIOpacity, Sprite, Color, Button, find, SpriteFrame,resources, director } from 'cc';
import { Peg } from './Peg';
import { BOARD_SIZE, TILE_STATE, LEVELS_DATA, evaluateResult, CENTER_POS } from './GameConfig'; 
import { TutorialManager } from './TutorialManager';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

const TILE_SIZE = 90; 

@ccclass('BoardController')
export class BoardController extends Component {
    @property(Prefab)
    public PegPrefab: Prefab = null; 
    
    @property(Node)
    public homePageNode: Node = null; // 新增：首页节点
    
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

    @property(Node)
    public levelSelectionNode: Node = null; // 关卡选择页面节点

    @property(Prefab)
    public tutorialPanelPrefab: Prefab = null; // 教学弹窗预制体
    
    private tutorialManager: TutorialManager = null; // 教学管理器
    private tutorialButton: Button = null; // 教学入口按钮

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

    // ===== 所有UI组件将在代码中动态获取，不再需要编辑器拖拽绑定 =====
    private uiRoot: Node = null; // UI总根节点 (对应预制体中的 UIRoot)

    // 通用UI组件引用
    private gameTitleLabel: Label = null;
    private stepCounterLabel: Label = null;
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

    // ==================== 核心初始化方法 ====================
    protected onLoad() {
        console.log("BoardController: onLoad start");
        
        // 1. 初始化UI（必须在其他逻辑之前）
        this.initUI();
        this.debugUIHierarchy();
        this.initTutorialSystem();
        
        // 2. 确保BoardRoot在UI上层
        if (this.boardRoot && this.uiRoot) {
            // 将BoardRoot移动到Canvas的最后一个子节点（最上层）
            const canvas = find('Canvas');
            if (canvas) {
                this.boardRoot.parent = canvas;
                this.boardRoot.setSiblingIndex(canvas.children.length - 2);
            }
        }

        // 3. 检查核心资源
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

        // 4. 默认隐藏游戏相关UI
        if (this.uiRoot) {
            this.uiRoot.active = false;  // 隐藏GameUI
        }
        if (this.boardRoot) {
            this.boardRoot.active = false;  // 隐藏棋盘
        }
        
        // 使用新的页面切换方法
        if (this.homePageNode) {
            console.log("首页节点已连接，切换到首页");
            this.switchToHomePage(); // 使用新方法
        } else if (this.levelSelectionNode) {
            console.log("没有首页节点，切换到关卡选择页");
            this.switchToLevelSelection();
        } else {
            console.log("没有首页和关卡选择页，直接进入游戏");
            this.loadLevel(this.currentLevelIndex);
        }

        // 5. 【关键修改】默认显示首页
        console.log("游戏初始化完成，等待用户操作");
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
            // 【重要】初始化时不显示
            this.uiRoot.active = false;
            
            const backgroundNode = this.uiRoot.getChildByPath('UIRoot/Background');
            if (backgroundNode) {
                backgroundNode.setSiblingIndex(0); // Background在GameUI内部也是第一个
            }
            
            console.log('[UI] GameUI inserted as first child of Canvas');            
        } else {
            // 备选方案：挂载到当前节点
            this.uiRoot.parent = this.node;
            console.warn('[UI] Canvas not found, parented UI to BoardController node.');
        }
        this.uiRoot.setPosition(0, 0, 0);
        console.log('[UI] GameUI Prefab instantiated.');

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

        // 3. 动态查找并绑定所有通用UI组件
        this.gameTitleLabel = getComponent('UIRoot/GameTitleLabel', Label);
        this.stepCounterLabel = getComponent('UIRoot/StepCounter', Label);
        this.tipsLabel = getComponent('UIRoot/TipsLabel', Label);
        this.retryButton = getComponent('UIRoot/ButtonContainer/RetryButton', Button);
        this.undoButton = getComponent('UIRoot/ButtonContainer/UndoButton', Button);
        
        // 【修改这里】直接查找BackButton，而不是通过属性绑定
        this.backButton = getComponent('UIRoot/BackButton', Button); 

        // 4. 动态查找并绑定结算弹窗组件
        this.settlementPanel = this.uiRoot.getChildByPath('UIRoot/SettlementPanel');
        if (this.settlementPanel) {
            this.settlementTitle = getComponent('UIRoot/SettlementPanel/PopupWindow/TitleLabel', Label);
            this.settlementResult = getComponent('UIRoot/SettlementPanel/PopupWindow/ResultLabel', Label);
            this.settlementStats = getComponent('UIRoot/SettlementPanel/PopupWindow/StatsLabel', Label);
            this.settlementRetryBtn = getComponent('UIRoot/SettlementPanel/PopupWindow/BtnContainer/SettlementRetryBtn', Button);
            this.settlementNextBtn = getComponent('UIRoot/SettlementPanel/PopupWindow/BtnContainer/SettlementNextBtn', Button);
        } else {
            console.warn('[UI] SettlementPanel not found in UI prefab.');
        }

        // 5. 动态绑定按钮点击事件（替代编辑器Click Events设置）
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
        
        // 6. 动态绑定BackButton点击事件
        if (this.backButton) {
            console.log('[UI] BackButton found, binding click event');

            // 获取所有相关节点的信息
            const backTransform = this.backButton.node.getComponent(UITransform);
            const uiRootNode = find('Canvas/GameUI/UIRoot');
            const uiRootTransform = uiRootNode?.getComponent(UITransform);
            
            console.log('[UI] 详细层级信息:');
            console.log('  Canvas尺寸:', find('Canvas')?.getComponent(UITransform)?.contentSize);
            console.log('  GameUI位置:', this.uiRoot?.position);
            console.log('  UIRoot位置:', uiRootNode?.position);
            console.log('  UIRoot尺寸:', uiRootTransform?.contentSize);
            console.log('  UIRoot锚点:', uiRootTransform?.anchorPoint);
            console.log('  BackButton位置:', this.backButton.node.position);
            console.log('  BackButton世界位置:', this.backButton.node.worldPosition);
            console.log('  BackButton尺寸:', backTransform?.contentSize);
            console.log('  BackButton锚点:', backTransform?.anchorPoint);
            console.log('  BackButtonactive:', this.backButton.node.active);

            this.backButton.node.off(Button.EventType.CLICK); // 先移除旧的事件
            this.backButton.node.on(Button.EventType.CLICK, this.onBackToLevelSelect, this);
        } else {
            console.warn('[UI] BackButton not found in UI prefab!');
        }

        // 7. 创建教学入口按钮
        this.createTutorialButton();

        // 8. 创建音乐开关按钮
        this.createAudioButton(); 

        // 9. 初始化UI状态
        if (this.tipsLabel) {
            this.tipsLabel.node.active = false; // 初始隐藏提示
        }
        if (this.settlementPanel) {
            this.settlementPanel.active = false; // 初始隐藏结算弹窗
        }

        console.log('[UI] UI initialization complete.');
    }

    // ==================== 游戏关卡与状态管理 ====================
    public loadLevel(levelIndex: number) {
        console.log(`Loading level ${levelIndex}`);
        
        // 保存当前关卡索引
        this.currentLevelIndex = levelIndex;
        
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

        // 【重要】隐藏首页（如果显示）
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

        this.boardRoot.destroyAllChildren();  
        
        this.activeNode = null;
        this.activePegRow = -1;
        this.activePegCol = -1;
        this.pegNodes.clear();
        
        // 清空旧的棋盘节点数组
        this.clearBoardBackground();

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
        
        // 更新游戏标题
        if (this.gameTitleLabel) {
            this.gameTitleLabel.string = `钻石棋游戏 - 关卡 ${levelIndex + 1}`;
        }
        
        // 更新计步器显示
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
            console.log('[UI] 教学入口按钮已激活');
        } else {
            console.warn('[UI] 教学入口按钮未找到');
        }
        console.log(`Level ${levelIndex} loaded: ${level.name}, pegs count: ${this.countPegs()}, max undo: ${this.maxUndoCount}`);
    }

    // 添加返回关卡选择的方法
    private onBackToLevelSelect() {
        console.log("返回关卡选择页面");
        
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
        console.log("从结算弹窗返回关卡选择");
        this.restoreGameUIAfterSettlement();
        this.hideSettlementPanel();
        this.onBackToLevelSelect(); // 调用相同的返回方法
    }

    // 添加更新关卡进度的方法
    private updateLevelProgress(levelIndex: number, score: string, stepCount: number, isCenterPeg: boolean = false) {
        // 如果有 LevelSelection 组件，调用其更新方法
        if (this.levelSelectionNode) {
            const levelSelection = this.levelSelectionNode.getComponent(LevelSelection);
            if (levelSelection && levelSelection.updateLevelProgress) {
                levelSelection.updateLevelProgress(levelIndex, score, stepCount);
            }
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
            
            console.log(`Level ${levelIndex} progress saved: ${score}, ${stepCount} steps`);
        } catch (e) {
            console.error("Failed to save level progress:", e);
        }
    }

    // ==================== 计步器与提示系统 ====================
    private updateStepCounter() {
        if (!this.stepCounterLabel) {
            console.warn("Step counter label not assigned");
            return;
        }
        
        const remainingUndo = this.maxUndoCount - this.undoCount;
        this.stepCounterLabel.string = `步数: ${this.stepCount} | 剩余悔棋: ${remainingUndo}次`;
    }
    
    private showTips(message: string, duration: number = 2.0) {
        if (!this.tipsLabel || !this.tipsLabel.isValid) {
            console.log("Tips:", message);
            return;
        }
        
        // 显示提示
        this.tipsLabel.string = message;
        this.tipsLabel.node.active = true;
        
        // 淡入淡出效果
        const opacity = this.tipsLabel.node.getComponent(UIOpacity) || this.tipsLabel.node.addComponent(UIOpacity);
        opacity.opacity = 0;
        
        tween(opacity)
            .to(0.3, { opacity: 255 })
            .delay(duration)
            .to(0.3, { opacity: 0 })
            .call(() => {
                this.tipsLabel.node.active = false;
            })
            .start();
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
        
        console.log(`Board background generated for level ${levelIndex}`);
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
        uiTransform.setContentSize(TILE_SIZE * 0.9, TILE_SIZE * 0.9); // 稍小于棋子
        
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
        
        this.moveHistory.push({
            boardState: boardCopy,
            pegsInfo: pegsInfo,
            stepCount: this.stepCount
        });
        
        // 限制历史记录长度（防止内存占用过大）
        if (this.moveHistory.length > 100) {
            this.moveHistory.shift();
        }
        
        console.log(`State saved. History size: ${this.moveHistory.length}, Step: ${this.stepCount}`);
    }
    
    public undoMove() {
        // 检查是否有历史记录
        if (this.moveHistory.length <= 1) {
            this.showTips("无法悔棋：已经是初始状态");
            return;
        }
        
        // 检查悔棋次数是否用完
        if (this.undoCount >= this.maxUndoCount) {
            this.showTips(`悔棋次数已用完（最多${this.maxUndoCount}次）`);
            return;
        }
        
        // 弹出当前状态（不需要）
        this.moveHistory.pop();
        
        // 获取上一步状态
        const lastState = this.moveHistory[this.moveHistory.length - 1];
        
        // 恢复棋盘状态
        for (let i = 0; i < BOARD_SIZE; i++) {
            this.boardState[i] = [...lastState.boardState[i]];
        }
        
        // 恢复步数
        this.stepCount = lastState.stepCount;
        
        // 清空当前所有棋子
        this.boardRoot.destroyAllChildren();
        this.pegNodes.clear();
        
        // 重新生成棋子
        for (const pegInfo of lastState.pegsInfo) {
            this.spawnPeg(pegInfo.row, pegInfo.col);
        }
        
        // 重置活动状态
        this.resetActiveState();
        
        // 更新悔棋计数
        this.undoCount++;
        
        // 更新计步器
        this.updateStepCounter();
        
        const remainingPegs = this.countPegs();
        const remainingUndo = this.maxUndoCount - this.undoCount;
        
        // 使用提示显示成功信息
        this.showTips(`悔棋成功！剩余悔棋${remainingUndo}次`);
        
        console.log(`Undo successful. Steps: ${this.stepCount}, Undo used: ${this.undoCount}/${this.maxUndoCount}, History: ${this.moveHistory.length}`);
    }
    
    private clearHistory() {
        this.moveHistory = [];
        this.stepCount = 0;
        this.undoCount = 0;
        console.log("Move history cleared");
    }

    // ==================== 结算弹窗系统 ====================
    private showGameCompletePanel() {
        if (this.settlementPanel && this.settlementTitle && this.settlementResult) {
            this.settlementPanel.active = true;
            this.settlementTitle.string = "恭喜通关！";
            this.settlementResult.string = "您已成功完成所有关卡！\n真是一位钻石棋大师！";
            this.settlementStats.string = "";
            
            // 禁用下一关按钮（已经是最后一关）
            if (this.settlementNextBtn) {
                this.settlementNextBtn.interactable = false;
                // 添加文本提示
                const nextBtnLabel = this.settlementNextBtn.node.getComponentInChildren(Label);
                if (nextBtnLabel) {
                    nextBtnLabel.string = "已是最后一关";
                }
            }
        }
    }
    
    private showSettlementPanel(isVictory: boolean, remainingPegs: number, resultText: string, stepCount: number, isCenterPeg: boolean = false) {
        if (!this.settlementPanel || !this.settlementTitle || !this.settlementResult || !this.settlementStats) {
            console.warn("Settlement panel components not fully assigned, falling back to tips.");
            this.showTips(isVictory ? 
                `恭喜! 剩余 ${remainingPegs} 颗. 评价: ${resultText}. 步数: ${stepCount}` :
                `游戏结束! 剩余 ${remainingPegs} 颗. 评价: ${resultText}. 步数: ${stepCount}`);
            return;
        }
        console.log("🔄 显示结算弹窗（层级调整方案）...");
        // ========== 调试信息 ==========
        console.log("🔍 调试信息：");
        
        // 获取Canvas并检查层级
        const canvas = find('Canvas');
        if (canvas) {
            console.log("Canvas子节点顺序:");
            canvas.children.forEach((child, index) => {
                console.log(`  [${index}] ${child.name}`);
            });
            
            // 【方案3】将BoardRoot移到GameUI下面
            if (this.boardRoot && this.uiRoot) {
                const boardRootIndex = this.boardRoot.getSiblingIndex();
                const uiRootIndex = this.uiRoot.getSiblingIndex();
                
                console.log(`BoardRoot索引: ${boardRootIndex}, UI Root索引: ${uiRootIndex}`);
                
                if (boardRootIndex > uiRootIndex) {
                    // BoardRoot在UI上面，需要移到下面
                    this.boardRoot.setSiblingIndex(uiRootIndex);
                    console.log(`✅ 将BoardRoot移到UI下面: ${boardRootIndex} → ${uiRootIndex}`);
                } else {
                    console.log(`ℹ️ BoardRoot已在UI下面 (${boardRootIndex} <= ${uiRootIndex})`);
                }
            }
        }
        
        // 检查结算弹窗位置
        if (this.settlementPanel) {
            const parent = this.settlementPanel.parent;
            console.log(`结算弹窗信息:`);
            console.log(`  - 父节点: ${parent?.name}`);
            console.log(`  - 当前兄弟索引: ${this.settlementPanel.getSiblingIndex()}`);
            console.log(`  - 父节点子节点总数: ${parent?.children.length || 0}`);
        }
        
        // 检查BoardRoot位置
        if (this.boardRoot) {
            console.log(`BoardRoot信息:`);
            console.log(`  - 父节点: ${this.boardRoot.parent?.name}`);
            console.log(`  - 兄弟索引: ${this.boardRoot.getSiblingIndex()}`);
        }
        // ========== 调试信息结束 ==========
        
        // 隐藏不需要的UI元素
        this.hideGameUIForSettlement();
        
        // 显示结算弹窗
        this.settlementPanel.active = true;
        
        // 将结算弹窗在UIRoot内部移到最上层
        if (this.settlementPanel.parent) {
            this.settlementPanel.setSiblingIndex(this.settlementPanel.parent.children.length - 1);
        }
        
        // 设置弹窗内容
        this.settlementTitle.string = isVictory ? "恭喜完成！" : "游戏结束！";
        
        let centerText = "";
        if (isVictory && isCenterPeg) {
            centerText = "\n(成功将棋子移至中心！)";
        }
        this.settlementResult.string = `评价: ${resultText}${centerText}`;
        this.settlementStats.string = `剩余棋子: ${remainingPegs}颗\n步数: ${stepCount}步`;
        
        // 设置下一关按钮状态
        if (this.settlementNextBtn) {
            const isLastLevel = this.currentLevelIndex >= LEVELS_DATA.length - 1;
            this.settlementNextBtn.interactable = isVictory && !isLastLevel;
            
            const nextBtnLabel = this.settlementNextBtn.node.getComponentInChildren(Label);
            if (nextBtnLabel) {
                if (isLastLevel) {
                    nextBtnLabel.string = "返回关卡选择";
                    // 修改按钮点击事件
                    this.settlementNextBtn.node.off(Button.EventType.CLICK);
                    this.settlementNextBtn.node.on(Button.EventType.CLICK, () => {
                        this.onSettlementBackToLevelSelect();
                    }, this);                    
                } else if (!isVictory) {
                    nextBtnLabel.string = "未完成";
                } else {
                    nextBtnLabel.string = "下一关";
                }
            }
        }
        
        console.log("✅ 结算弹窗显示完成");
    }

    // ========== 隐藏游戏UI元素 ==========
    private hideGameUIForSettlement() {
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
        
        console.log("📱 隐藏了游戏UI元素（标题、计步器、按钮）");
    }

    // 在restoreGameUIAfterSettlement中恢复
    private restoreGameUIAfterSettlement() {
        // 恢复BoardRoot层级
        const canvas = find('Canvas');
        if (canvas && this.boardRoot) {
            // 将BoardRoot移回原来的位置（在Camera和GameManager之间）
            this.boardRoot.setSiblingIndex(2);
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
        
        console.log("📱 恢复了游戏UI元素和层级");
    }
    
    private hideSettlementPanel() {
        if (this.settlementPanel) {
            this.settlementPanel.active = false;
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
        console.log("Settlement: Next level");
        this.restoreGameUIAfterSettlement(); // 恢复UI
        this.hideSettlementPanel();
        this.nextLevel();
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
        
        // 【重要修复】只暂停游戏按钮，不暂停返回按钮
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
    // 新增：页面切换辅助方法
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
        this.loadLevel(this.currentLevelIndex);
    }
    
    public nextLevel() {
        console.log("Loading next level");
        this.currentLevelIndex++;
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
        
        const audioManager = AudioManager.getInstance();
        if (audioManager && audioManager.playMoveSuccess) {
            audioManager.playMoveSuccess();
        }

        if (!this.activeNode || !this.activeNode.isValid) {
            console.error("Invalid node in executeJump");
            return;
        }
        
        // 保存当前状态到历史记录（在跳吃之前）
        this.saveCurrentState();
        
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
                
                // 增加步数
                this.stepCount++;
                
                // 更新计步器
                this.updateStepCounter();
                
                console.log(`Jump completed. Step: ${this.stepCount}, Board updated.`);
                this.resetActiveState();
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
        
        console.log(`[GameState] 剩余棋子: ${remainingPegs}, 位置: ${JSON.stringify(pegPositions)}`);
        
        // 情况1: 胜利 (只剩1颗)
        if (remainingPegs === 1) {
            console.log(`[GameState] ✅ 检测到胜利条件：只剩1颗棋子`);
            const isCenter = this.boardState[CENTER_POS.row][CENTER_POS.col] === TILE_STATE.PEG;
            const result = evaluateResult(remainingPegs, isCenter);
            
            console.log(`[GameState] 胜利详情：中心=${isCenter}, 评价=${result}, 步数=${this.stepCount}`);
            
            // 更新关卡进度
            this.updateLevelProgress(this.currentLevelIndex, result, this.stepCount, isCenter);
        
            // 显示胜利结算弹窗
            this.showSettlementPanel(true, remainingPegs, result, this.stepCount, isCenter);
            return;
        }

        // 情况2: 检查是否还有合法移动 (只有当棋子数>1时才检查)
        if (remainingPegs > 1) {
            const hasMove = this.hasValidMove();
            console.log(`[GameState] 剩余${remainingPegs}颗棋子，检查是否有合法移动: ${hasMove}`);
            
            if (!hasMove) {
                console.log(`[GameState] ❌ 检测到失败条件：无合法移动`);
                let foundCenterPeg = false;
                if (this.boardState[CENTER_POS.row][CENTER_POS.col] === TILE_STATE.PEG) {
                    foundCenterPeg = true;
                }
                const result = evaluateResult(remainingPegs, foundCenterPeg);
                // 显示失败结算弹窗
                this.showSettlementPanel(false, remainingPegs, result, this.stepCount);
            } else {
                console.log(`[GameState] 游戏继续，仍有合法移动`);
            }
        } else if (remainingPegs === 0) {
            console.warn(`[GameState] 异常：棋盘上无棋子！`);
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
    }
    
    private spawnPeg(r: number, c: number) {
        if (!this.PegPrefab) {
            console.error("Cannot spawn peg: PegPrefab is null");
            return;
        }
        
        const pegNode = instantiate(this.PegPrefab);
        pegNode.parent = this.boardRoot;
        
        const uiTransform = pegNode.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(TILE_SIZE, TILE_SIZE);
        }
        
        const pegComp = pegNode.getComponent(Peg);
        if (!pegComp) {
            console.error("Peg Prefab missing Peg component!");
            pegNode.destroy();
            return;
        }
        
        pegComp.init(r, c, this);
        
        pegNode.setPosition(this.getPegLocalPosition(r, c));
        
        // 保存节点到Map
        const key = `${r},${c}`;
        this.pegNodes.set(key, pegNode);
        
        console.log(`Spawned peg at (${r}, ${c})`);
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

    private createTutorialButton() {
        console.log('[UI] 开始创建教学入口按钮...');
        
        const tutorialContainer = new Node('TutorialEntry');
        const uiRootNode = this.uiRoot?.getChildByPath('UIRoot');
        
        if (!uiRootNode) {
            console.error('[UI] 找不到UIRoot节点！');
            return;
        }
        
        // 放在右上角
        tutorialContainer.parent = uiRootNode;
        tutorialContainer.setPosition(295, 550, 0);
        
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
        
        // 【修复】检查是否已有UITransform，避免重复添加
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
}