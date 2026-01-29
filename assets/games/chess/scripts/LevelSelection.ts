import { _decorator, Component, Node, Prefab, instantiate, Label, Button, Sprite, Color, ScrollView, UITransform, Layout, SpriteFrame, find, Size, Vec3,tween } from 'cc';
import { LEVELS_DATA, evaluateResult } from './GameConfig';
import { HomePageController } from './HomePageController';
import { I18nManager } from './I18nManager';
import { CrazyGamesSaveManager } from './CrazyGamesSaveManager';

const { ccclass, property } = _decorator;

// 关卡数据接口
interface LevelData {
    levelIndex: number;
    isUnlocked: boolean;
    bestScore: string; // 最佳评价
    stepCount: number; // 最佳步数
    isCompleted: boolean;
}

@ccclass('LevelSelection')
export class LevelSelection extends Component {
    @property(Prefab)
    public levelCardPrefab: Prefab = null; // 关卡卡片预制体
    
    @property(Node)
    public levelContainer: Node = null; // 关卡容器（ScrollView的内容）
    
    @property(ScrollView)
    public scrollView: ScrollView = null; // 滚动视图

    @property(Node)
    loadingMask: Node = null!;

    @property(Node)
    loadingAnimation: Node = null!;

    private isLoading: boolean = false;
    
    @property(Button)
    public backButton: Button = null; // 返回游戏按钮（如果需要）

    @property(Node)
    public titleBar: Node = null; // 标题栏容器

    @property(Button)
    public homeBackButton: Button = null; // 新增：返回首页按钮
    
    @property(Node)
    public homePageNode: Node = null; // 新增：首页节点引用
    
    @property(Label)
    public titleLabel: Label = null; // 标题
    
    @property(SpriteFrame)
    public starActive: SpriteFrame = null; // 点亮的星星图标
    
    @property(SpriteFrame)
    public starInactive: SpriteFrame = null; // 未点亮的星星图标

    @property(SpriteFrame)
    public lockedSprite: SpriteFrame = null; // 锁图标
    
    @property(SpriteFrame)
    public unlockedSprite: SpriteFrame = null; // 解锁图标
    
    @property(SpriteFrame)
    public completedSprite: SpriteFrame = null; // 已完成图标
    
    private levelDataList: LevelData[] = [];
    private currentMaxUnlockedLevel: number = 0;

    private i18n: I18nManager = null;

    private saveManager: CrazyGamesSaveManager | null = null;
    
    protected onLoad() {
        // 【第一步】先初始化国际化管理器
        this.i18n = I18nManager.getInstance();
        if (!this.i18n) {
            console.warn('LevelSelection: I18nManager not found');
            const i18nNode = new Node('TempI18nManager');
            this.node.parent?.addChild(i18nNode);
            this.i18n = i18nNode.addComponent(I18nManager);
        }
        
        // 【新增】需要在这里初始化 saveManager
        this.saveManager = CrazyGamesSaveManager.getInstance();

        // 【第二步】初始化其他内容
        this.loadLevelProgress();
        this.initUI();
        this.initTitleBar(); // 现在 initTitleBar 可以使用 this.i18n

        // 【新增】初始化加载遮罩
        this.initLoadingMask();
        
        // 如果 titleBar 是 null，检查编辑器中是否连接了
        if (!this.titleBar) {
            console.error('⚠️ TitleBar 未在编辑器中连接到脚本！');
            // 尝试通过路径查找
            const foundTitleBar = this.node.getChildByName('TitleBar');
            if (foundTitleBar) {
                console.log('通过路径找到 TitleBar:', foundTitleBar.name);
                this.titleBar = foundTitleBar;
            }
        }
        
        // 检查 TitleBar 的所有子节点
        if (this.titleBar) {
            this.titleBar.children.forEach((child, index) => {
            });
        }

        // 直接生成卡片，不需要延迟
        setTimeout(() => {
            this.generateLevelCards();
        }, 100); // 给UI一点时间初始化
        
        if (this.backButton) {
            this.backButton.node.on(Button.EventType.CLICK, this.onBackToGame, this);
        }

        // 绑定返回按钮事件
        if (this.homeBackButton) {
            this.homeBackButton.node.on(Button.EventType.CLICK, this.onBackToHome, this);
        }

        // 更新标题
        if (this.titleLabel && this.i18n) {
            this.titleLabel.string = this.i18n.t('selectLevel');
        }
        
        // 监听语言变化
        const i18nNode = find('I18nManager');
        if (i18nNode) {
            i18nNode.on('language-changed', this.onLanguageChanged, this);
        }
    }
    
    //初始化标题栏
    private initTitleBar() {
        console.log('=== initTitleBar 开始 ===');
        
        if (!this.titleBar) {
            console.error('❌ TitleBar节点未分配');
            // 尝试查找
            const foundTitleBar = this.node.getChildByName('TitleBar');
            if (foundTitleBar) {
                console.log('✅ 通过路径找到 TitleBar:', foundTitleBar.name);
                this.titleBar = foundTitleBar;
            } else {
                console.error('❌ 未找到 TitleBar 节点');
                return;
            }
        }
        
        
        // 确保标题栏在最上层显示
        this.titleBar.setSiblingIndex(999);
        
        // 调整 TitleBar 的位置
        // 注意：Canvas 中心是 (0,0)，顶部是 (0, 667)，因为 Canvas 高度是 1334
        const canvasHeight = 1334;
        const titleBarY = canvasHeight / 2 - 60; // 距离顶部 60 像素
        
        this.titleBar.setPosition(0, titleBarY, 0);
        console.log(`✅ 设置 TitleBar 位置: (0, ${titleBarY})`);
        
        // 【修正】使用国际化设置标题文字
        if (this.titleLabel && this.i18n) {
            this.titleLabel.string = this.i18n.t('selectLevel'); // 使用国际化
            console.log(`✅ 设置标题文字: "${this.titleLabel.string}"`);
        } else if (this.titleLabel) {
            this.titleLabel.string = "选择关卡"; // 回退
            console.log('⚠️ 使用回退标题文字: "选择关卡"');
        } else {
            console.error('❌ TitleLabel 未连接');
            // 尝试在 TitleBar 中查找
            const foundTitleLabel = this.titleBar.getChildByName('TitleLabel');
            if (foundTitleLabel) {
                this.titleLabel = foundTitleLabel.getComponent(Label);
                console.log('✅ 找到 TitleLabel 组件');
            }
        }
        
        // 【修正】绑定返回按钮事件（使用国际化）
        if (this.homeBackButton) {
            // 更新返回按钮文本
            const backLabel = this.homeBackButton.node.getComponentInChildren(Label);
            if (backLabel && this.i18n) {
                backLabel.string = this.i18n.t('homeBack');
            }
            
            this.homeBackButton.node.on(Button.EventType.CLICK, this.onBackToHome, this);
            console.log('✅ 绑定返回按钮事件');
        } else {
            console.error('❌ HomeBackButton 未连接');
            // 尝试在 TitleBar 中查找
            const foundBackButton = this.titleBar.getChildByName('HomeBackButton');
            if (foundBackButton) {
                this.homeBackButton = foundBackButton.getComponent(Button);
                console.log('✅ 找到 HomeBackButton 组件');
            }
        }
        
        console.log('=== initTitleBar 完成 ===');
    }

    private onLanguageChanged() {
        this.updateUIText();
        this.refreshLevelCards();
    }
    
    private updateUIText() {
        if (!this.i18n) return;
        
        // 更新所有文本
        if (this.titleLabel) {
            this.titleLabel.string = this.i18n.t('selectLevel');
        }
        
        // 更新返回按钮文本
        if (this.homeBackButton) {
            const backLabel = this.homeBackButton.node.getComponentInChildren(Label);
            if (backLabel) {
                backLabel.string = this.i18n.t('homeBack');
            }
        }
        
        // 更新卡片上的文本
        this.refreshLevelCards();
    }

    private initLoadingMask(): void {
        if (this.loadingMask) {
            this.loadingMask.active = false;
            
            // 设置加载动画旋转
            if (this.loadingAnimation) {
                // 使用Tween或schedule实现旋转动画
                this.setupLoadingAnimation();
            }
        }
    }

    // 设置旋转动画
    private setupLoadingAnimation(): void {
        // 方法1：使用Tween（推荐）
        tween(this.loadingAnimation)
            .repeatForever(
                tween()
                    .by(0.5, { angle: 180 })
                    .by(0.5, { angle: 180 })
            )
            .start();
        
        // 方法2：使用schedule
        // this.schedule(() => {
        //     this.loadingAnimation.angle += 10;
        // }, 0.05);
    }

    // 显示加载遮罩
    private showLoadingMask(text: string = '加载中...'): void {
        if (this.loadingMask) {
            this.isLoading = true;

            // 【重要】确保遮罩在最上层显示
            this.loadingMask.setSiblingIndex(99999);
        
            this.loadingMask.active = true;         
            
            // 可以在这里添加加载文字
            console.log(text);
        }
    }

    // 隐藏加载遮罩
    private hideLoadingMask(): void {
        if (this.loadingMask) {
            this.isLoading = false;
            this.loadingMask.active = false;
        }
    }

    // 加载关卡进度（从本地存储）
    private async loadLevelProgress() {
        console.log('【loadLevelProgress】加载关卡进度 - 使用平台API优先');
        
        try {
            // 尝试从平台API加载
            const saveManager = CrazyGamesSaveManager.getInstance();
            
            if (saveManager) {
                const platformProgress = await saveManager.loadLevelProgress();
                
                if (platformProgress) {
                    // 成功从平台加载
                    this.currentMaxUnlockedLevel = platformProgress.maxUnlockedLevel || 0;
                    this.levelDataList = platformProgress.levelDataList || [];
                    
                    console.log(`✅ 从平台API加载进度成功`);
                    console.log(`   最大解锁关卡: ${this.currentMaxUnlockedLevel + 1}`);
                    
                    // 修复数据一致性
                    this.fixLevelDataConsistency();
                    return;
                }
            }
            
            // 平台无数据，回退到localStorage
            console.log('⚠️ 平台API无数据，回退到localStorage');
            this.loadFromLocalStorage();
            
        } catch (error) {
            console.error('❌ 平台API加载失败，回退到localStorage:', error);
            this.loadFromLocalStorage();
        }
    }
 
    // 修复数据一致性的方法
    private fixLevelDataConsistency() {
        console.log('【fixLevelDataConsistency】修复数据一致性');
        
        // 确保关卡数量正确
        const expectedLevelCount = LEVELS_DATA.length;
        
        // 【重要修改】不要直接重置数据，而是扩展或截断
        if (this.levelDataList.length !== expectedLevelCount) {
            console.log(`关卡数量变化: 存储的=${this.levelDataList.length}, 预期的=${expectedLevelCount}`);
            this.adjustLevelDataCount(expectedLevelCount);
        }
        
        // 确保已完成的关卡是解锁的
        for (let i = 0; i < this.levelDataList.length; i++) {
            const levelData = this.levelDataList[i];
            
            // 如果关卡已完成但未标记为解锁，修复它
            if (levelData.isCompleted && !levelData.isUnlocked) {
                console.log(`修复关卡 ${i + 1}: 已完成但未解锁`);
                levelData.isUnlocked = true;
            }
            
            // 确保最大解锁关卡正确
            if (levelData.isUnlocked) {
                this.currentMaxUnlockedLevel = Math.max(this.currentMaxUnlockedLevel, i);
            }
        }
        
        console.log(`修复后最大解锁关卡: ${this.currentMaxUnlockedLevel + 1}`);
    }

    // 【新增】调整关卡数据数量（保留已有进度）
    private adjustLevelDataCount(expectedLevelCount: number) {
        console.log(`调整关卡数据: 从 ${this.levelDataList.length} 到 ${expectedLevelCount}`);
        
        // 【修复】先保存旧的 maxUnlockedLevel
        const oldMaxUnlockedLevel = this.currentMaxUnlockedLevel;
        
        const oldDataList = [...this.levelDataList]; // 备份旧数据
        this.levelDataList = [];
        
        // 【修复】重置为旧的 maxUnlockedLevel，而不是 0
        this.currentMaxUnlockedLevel = oldMaxUnlockedLevel;
        
        for (let i = 0; i < expectedLevelCount; i++) {
            // 尝试从旧数据中获取
            const oldData = oldDataList[i];
            
            if (oldData) {
                // 保留旧数据
                this.levelDataList.push({
                    levelIndex: i,
                    isUnlocked: oldData.isUnlocked,
                    bestScore: oldData.bestScore,
                    stepCount: oldData.stepCount,
                    isCompleted: oldData.isCompleted
                });
                console.log(`保留关卡 ${i + 1} 的进度: 解锁=${oldData.isUnlocked}, 完成=${oldData.isCompleted}`);
            } else {
                // 新关卡：使用正确的 maxUnlockedLevel
                const isUnlocked = i === 0 || (i <= oldMaxUnlockedLevel);
                this.levelDataList.push({
                    levelIndex: i,
                    isUnlocked: isUnlocked,
                    bestScore: "",
                    stepCount: 0,
                    isCompleted: false
                });
                console.log(`创建新关卡 ${i + 1}: 解锁=${isUnlocked} (oldMaxUnlockedLevel=${oldMaxUnlockedLevel})`);
            }
        }
        
        // 重新计算最大解锁关卡
        this.currentMaxUnlockedLevel = 0;
        for (let i = 0; i < this.levelDataList.length; i++) {
            if (this.levelDataList[i].isUnlocked) {
                this.currentMaxUnlockedLevel = i;
            }
        }
    }

    // 初始化关卡数据
    private initDefaultLevelData() {
        console.log('初始化默认关卡数据');
        this.levelDataList = [];
        for (let i = 0; i < LEVELS_DATA.length; i++) {
            this.levelDataList.push({
                levelIndex: i,
                isUnlocked: i === 0, // 只有第一关默认解锁
                bestScore: "", // 空表示未完成
                stepCount: 0,
                isCompleted: false
            });
        }
        this.currentMaxUnlockedLevel = 0;
    }
    
    // 保存关卡进度到本地存储
    private async saveLevelProgress() {
        console.log('【saveLevelProgress】保存关卡进度 - 优先使用平台API');
        
        // 准备进度数据
        const progress = {
            maxUnlockedLevel: this.currentMaxUnlockedLevel,
            levelDataList: this.levelDataList,
            lastSaveTime: Date.now(),
            version: '1.0.0'
        };
        
        try {
            // 1. 优先使用平台API
            const saveManager = CrazyGamesSaveManager.getInstance();
            let platformSuccess = false;
            
            if (saveManager) {
                try {
                    platformSuccess = await saveManager.saveLevelProgress(progress);
                    if (platformSuccess) {
                        console.log('✅ 进度已保存到平台API');
                    }
                } catch (error) {
                    console.warn('⚠️ 平台API保存异常:', error);
                }
            }
            
            // 2. 无论平台是否成功，都保存到本地存储作为备份
            this.saveToLocalStorage();
            
            // 3. 同时保存每个关卡的独立记录
            this.saveIndividualLevels();
            
            console.log(`✅ 进度保存完成。最大解锁关卡: ${this.currentMaxUnlockedLevel + 1}`);
            
        } catch (error) {
            console.error('❌ 保存进度失败:', error);
            // 紧急保存
            this.emergencySave();
        }
    }

    // 紧急保存方法
    private emergencySave() {
        try {
            // 极简保存：只保存关键数据
            const emergencyData = {
                maxUnlockedLevel: this.currentMaxUnlockedLevel,
                timestamp: Date.now(),
                emergency: true
            };
            
            // 保存到多个位置
            localStorage.setItem('diamond_chess_emergency', JSON.stringify(emergencyData));
            console.log('✅ 紧急保存完成');
        } catch (error) {
            console.error('❌ 紧急保存也失败了:', error);
        }
    }

    // 新增辅助方法1：从localStorage加载
    private loadFromLocalStorage() {
        console.log('【loadFromLocalStorage】从本地存储加载关卡进度');
        
        const savedProgress = localStorage.getItem('diamond_chess_level_progress');
        
        if (savedProgress) {
            try {
                const progress = JSON.parse(savedProgress);
                this.currentMaxUnlockedLevel = progress.maxUnlockedLevel || 0;
                this.levelDataList = progress.levelDataList || [];
                
                console.log(`✅ 从本地存储加载进度成功`);
                this.fixLevelDataConsistency();
                
            } catch (e) {
                console.error('❌ 解析本地存储数据失败:', e);
                this.initDefaultLevelData();
            }
        } else {
            console.log('⚠️ 本地存储中也没有找到进度，初始化默认数据');
            this.initDefaultLevelData();
        }
    }

    // 新增辅助方法2：保存到localStorage
    private saveToLocalStorage() {
        try {
            const progress = {
                maxUnlockedLevel: this.currentMaxUnlockedLevel,
                levelDataList: this.levelDataList,
                lastSaveTime: Date.now()
            };
            
            localStorage.setItem('diamond_chess_level_progress', JSON.stringify(progress));
            console.log('✅ 数据已保存到本地存储');
        } catch (error) {
            console.error('❌ 本地存储保存失败:', error);
        }
    }

    // 新增辅助方法3：保存独立关卡记录
    private saveIndividualLevels() {
        try {
            for (let i = 0; i < this.levelDataList.length; i++) {
                const levelData = this.levelDataList[i];
                if (levelData.isCompleted) {
                    const levelProgress = {
                        levelIndex: i,
                        score: levelData.bestScore,
                        stepCount: levelData.stepCount,
                        completed: true,
                        timestamp: Date.now()
                    };
                    localStorage.setItem(`diamond_chess_level_${i}`, JSON.stringify(levelProgress));
                }
            }
        } catch (error) {
            console.warn('⚠️ 保存独立关卡记录时出错:', error);
        }
    }

    // 更新关卡进度（在游戏完成后调用）
    public async updateLevelProgress(levelIndex: number, score: string, stepCount: number, isVictory: boolean = false) {
        console.log('===================');
        console.log('【LevelSelection.updateLevelProgress】');
        console.log(`接收到的参数: levelIndex=${levelIndex}, score="${score}", stepCount=${stepCount}, isVictory=${isVictory}`);
        console.log(`score字符串长度: ${score.length}, 包含★数量: ${(score.match(/★/g) || []).length}`);
        console.log(`当前levelDataList长度: ${this.levelDataList.length}`);
        
        // 打印传入的score内容
        console.log(`score内容:`, {
            原始值: score,
            字符: score.split('').map(c => `${c}(${c.charCodeAt(0)})`),
            是否包含星星: score.includes('★')
        });
        
        if (levelIndex >= this.levelDataList.length) {
            console.error(`错误: levelIndex(${levelIndex}) >= levelDataList长度(${this.levelDataList.length})`);
            return;
        }
        
        const levelData = this.levelDataList[levelIndex];
        const currentBestScore = levelData.bestScore || "";
        
        // 【修复】只保存更好的成绩
        if (isVictory) {
            // 胜利时：只有首次通关或获得更好评价时才更新
            levelData.isCompleted = true;
            
            // 比较成绩：获得更多星星的评价更好
            const newStarCount = (score.match(/★/g) || []).length;
            const currentStarCount = (currentBestScore.match(/★/g) || []).length;
            
            if (newStarCount > currentStarCount) {
                // 获得更多星星，更新成绩
                levelData.bestScore = score;
                levelData.stepCount = stepCount;
                console.log(`✅ 更新为更好成绩: ${score} (${newStarCount}星) > 之前的 ${currentBestScore} (${currentStarCount}星)`);
            } else if (newStarCount === currentStarCount && stepCount < levelData.stepCount) {
                // 星星数相同但步数更少，更新步数
                levelData.stepCount = stepCount;
                console.log(`✅ 更新为更少步数: ${stepCount}步 < 之前的 ${levelData.stepCount}步`);
            } else {
                console.log(`⏭️ 保持原成绩: ${currentBestScore} (${currentStarCount}星)`);
            }
            
            // 【修复】只有胜利时才解锁下一关
            const nextLevelIndex = levelIndex + 1;
            console.log(`下一关索引: ${nextLevelIndex}`);
            
            if (nextLevelIndex < this.levelDataList.length) {
                console.log(`解锁关卡 ${nextLevelIndex + 1}`);
                this.levelDataList[nextLevelIndex].isUnlocked = true;
                this.currentMaxUnlockedLevel = Math.max(this.currentMaxUnlockedLevel, nextLevelIndex);
            } else {
                console.log(`下一关索引 ${nextLevelIndex} 超出范围，无法解锁`);
            }
            
        } else {
            // 失败时：不更新已完成状态和最佳成绩
            // 但可以记录失败的数据用于分析（可选）
            console.log(`❌ 未通关，不更新最佳成绩。当前最佳: ${currentBestScore}, 本次: ${score}`);
            
            // 【可选】如果从未完成过，可以记录失败次数或本次成绩
            if (!levelData.isCompleted) {
                // 这是首次尝试，即使失败也记录一下（可选）
                levelData.bestScore = score; // 这行可选，如果你希望显示最新成绩
                levelData.stepCount = stepCount;
                console.log(`📝 首次尝试失败，记录成绩: ${score}`);
            }
        }
        
        console.log(`当前最大解锁关卡索引: ${this.currentMaxUnlockedLevel}`);
        console.log(`当前最大解锁关卡: ${this.currentMaxUnlockedLevel + 1}`);
        
        // 保存关卡进度
        await this.saveLevelProgress();
        
        // 【关键】立即刷新UI
        console.log('立即刷新关卡卡片UI...');
        this.refreshLevelCards();
        
        console.log('===================');
    }
    
    private initUI() {
        console.log('初始化关卡选择UI - 使用编辑器布局');
        
        // 确保ScrollView的content正确连接
        if (this.scrollView && this.levelContainer) {
            // 只有在未连接时才设置
            if (this.scrollView.content !== this.levelContainer) {
                this.scrollView.content = this.levelContainer;
                console.log('已设置ScrollView content');
            }
        }
        
        // 清理可能存在的Layout组件（如果你在代码中布局）
        if (this.levelContainer) {
            const layoutComponents = this.levelContainer.getComponents(Layout);
            for (let i = layoutComponents.length - 1; i >= 0; i--) {
                layoutComponents[i].destroy();
            }
            console.log('已清理Layout组件，使用编辑器布局');
        }
    }

    private setupLevelContainerLayout() {
        console.log('开始设置LevelContainer布局');
        
        if (!this.levelContainer) return;
        
        // 再次确保位置正确
        this.levelContainer.setPosition(0, 0, 0);
        
        // 添加Layout组件
        const layout = this.levelContainer.addComponent(Layout);
        
        // 【关键设置】配置网格布局
        layout.type = Layout.Type.GRID;
        layout.resizeMode = Layout.ResizeMode.CONTAINER;
        
        // 每行5个卡片
        const cardsPerRow = 5;
        const cardWidth = 90;
        const cardHeight = 90;
        
        // 计算合适的间距 - 需要考虑到view节点的实际显示区域
        const effectiveWidth = 700; // ScrollView的有效宽度（考虑滚动条）
        const totalCardWidth = cardWidth * cardsPerRow;
        const availableSpace = effectiveWidth - totalCardWidth;
        const spacingX = Math.max(10, availableSpace / (cardsPerRow + 1));
        
        console.log('布局计算:', {
            有效宽度: effectiveWidth,
            总卡片宽度: totalCardWidth,
            可用空间: availableSpace,
            计算出的间距: spacingX
        });
        
        // 设置内边距和间距
        layout.paddingLeft = Math.floor(spacingX);
        layout.paddingRight = Math.floor(spacingX);
        layout.paddingTop = 30;
        layout.paddingBottom = 30;
        layout.spacingX = Math.floor(spacingX);
        layout.spacingY = 20;
        
        // 必须设置正确的cellSize
        layout.cellSize = new Size(cardWidth, cardHeight);
        
        // 【关键】确保起始轴是水平
        layout.startAxis = Layout.AxisDirection.HORIZONTAL;
        
        // 【关键】设置约束
        layout.constraint = Layout.Constraint.FIXED_ROW;
        layout.constraintNum = cardsPerRow;
        
        // 【关键】设置方向
        layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
        layout.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
        
        layout.affectedByScale = true;
                
        // 立即更新布局
        layout.updateLayout();
        
        // 检查布局状态
        setTimeout(() => {
            console.log('布局设置后检查...');
            this.debugLayoutState();
        }, 50);
    }

    private debugLayoutState() {
        if (!this.levelContainer) return;
        
        const layout = this.levelContainer.getComponent(Layout);
        if (!layout) {
            console.error('没有Layout组件');
            return;
        }
        
        console.log('布局组件状态:', {
            type: Layout.Type[layout.type],
            startAxis: layout.startAxis,
            constraint: Layout.Constraint[layout.constraint],
            constraintNum: layout.constraintNum,
            cellSize: `宽${layout.cellSize.width}×高${layout.cellSize.height}`,
            spacingX: layout.spacingX,
            spacingY: layout.spacingY,
            padding: `左${layout.paddingLeft}/右${layout.paddingRight}/上${layout.paddingTop}/下${layout.paddingBottom}`
        });
        
        // 检查子节点
        const children = this.levelContainer.children;
        console.log(`LevelContainer有 ${children.length} 个子节点`);
        
        if (children.length > 0) {
            // 检查前几个节点的位置
            for (let i = 0; i < Math.min(3, children.length); i++) {
                const child = children[i];
            }
            
            // 检查是否是纵向排列
            if (children.length >= 2) {
                const x1 = children[0].position.x;
                const x2 = children[1].position.x;
                console.log(`前两个节点的X坐标: ${x1}, ${x2}, 差值: ${Math.abs(x1 - x2)}`);
                
                if (Math.abs(x1 - x2) < 1) {
                    console.warn('⚠️ 前两个节点X坐标几乎相同，可能是纵向排列');
                    
                    // 尝试紧急修复
                    this.emergencyFixLayout();
                }
            }
        }
    }

    private emergencyFixLayout() {
        console.log('执行紧急布局修复...');
        
        if (!this.levelContainer) return;
        
        const children = this.levelContainer.children;
        const cardsPerRow = 5;
        const cardWidth = 90;
        const cardHeight = 90;
        const spacingX = 20;
        const spacingY = 20;
        const paddingLeft = 50;
        const paddingRight = 50;
        const paddingTop = 40;
        
        // 计算每行起始位置
        const totalRowWidth = (cardWidth * cardsPerRow) + (spacingX * (cardsPerRow - 1));
        const startX = -(totalRowWidth / 2) + paddingLeft + (cardWidth / 2);
        const startY = -paddingTop;
        
        console.log('紧急修复参数:', {
            总行宽度: totalRowWidth,
            起始X: startX,
            起始Y: startY
        });
        
        for (let i = 0; i < children.length; i++) {
            const card = children[i];
            const row = Math.floor(i / cardsPerRow);
            const col = i % cardsPerRow;
            
            const x = startX + col * (cardWidth + spacingX);
            const y = startY - row * (cardHeight + spacingY);
            
            card.setPosition(x, y, 0);
            
            if (i < 2) {
                console.log(`紧急修复卡片 ${i}: 行${row}, 列${col}, 位置(${x.toFixed(1)}, ${y.toFixed(1)})`);
            }
        }
        
        console.log('紧急修复完成');
    }

    private testSimpleLayout() {
        console.log('=== 测试简单布局 ===');
        
        if (!this.levelContainer) return;
        
        const children = this.levelContainer.children;
        if (children.length === 0) return;
        
        // 1. 先详细检查第一个卡片的尺寸和缩放
        console.log('=== 卡片详细检查 ===');
        if (children.length > 0) {
            const firstCard = children[0];
            const transform = firstCard.getComponent(UITransform);
            console.log('第一个卡片信息:', {
                位置: firstCard.position,
                世界位置: firstCard.worldPosition,
                局部尺寸: transform?.contentSize,
                世界尺寸: transform ? `${transform.width * firstCard.scale.x}×${transform.height * firstCard.scale.y}` : '无',
                缩放: firstCard.scale,
                旋转: firstCard.rotation,
                锚点: transform ? `(${transform.anchorX}, ${transform.anchorY})` : '无'
            });
            
            // 检查所有子节点
            firstCard.children.forEach((child, index) => {
                const childTransform = child.getComponent(UITransform);
            });
        }
        
        // 2. 使用更大的间距测试
        console.log('=== 使用大间距测试 ===');
        const positions = [
            { x: -300, y: 0 },  // 第1个 - 间距200
            { x: -100, y: 0 },  // 第2个  
            { x: 100, y: 0 },   // 第3个
            { x: 300, y: 0 },   // 第4个
            { x: 500, y: 0 }    // 第5个
        ];
        
        for (let i = 0; i < children.length; i++) {
            const card = children[i];
            if (i < positions.length) {
                card.setPosition(positions[i].x, positions[i].y, 0);
                
                // 强制重置缩放
                card.setScale(1, 1, 1);
                
                // 强制设置卡片尺寸
                const transform = card.getComponent(UITransform);
                if (transform) {
                    transform.setContentSize(80, 80);
                    transform.setAnchorPoint(0.5, 0.5);
                }
                
                console.log(`测试大间距卡片 ${i}: 位置(${positions[i].x}, ${positions[i].y})`);
            }
        }
        
        console.log('大间距测试完成');
        
        // 3. 检查卡片实际渲染范围
        setTimeout(() => {
            console.log('=== 渲染后检查 ===');
            for (let i = 0; i < Math.min(3, children.length); i++) {
                const card = children[i];
                const worldPos = card.worldPosition;
                console.log(`卡片 ${i}: 世界位置(${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)})`);
                
                // 计算卡片四个角的坐标
                const transform = card.getComponent(UITransform);
                if (transform) {
                    const halfWidth = transform.width * card.scale.x / 2;
                    const halfHeight = transform.height * card.scale.y / 2;
                    console.log(`  渲染范围: X[${worldPos.x - halfWidth} ~ ${worldPos.x + halfWidth}], Y[${worldPos.y - halfHeight} ~ ${worldPos.y + halfHeight}]`);
                }
            }
        }, 100);
    }

    private generateLevelCards() {
        console.log('=== 开始生成关卡卡片 ===');
        
        // 【修正】使用国际化文本
        const loadingText = this.i18n ? this.i18n.t('generatingLevels') : '正在生成关卡卡片...';
        this.showLoadingMask(loadingText);

        if (!this.levelCardPrefab || !this.levelContainer) {
            console.error("缺少必要的组件");
            this.hideLoadingMask();// 【新增】出错时也要隐藏遮罩
            return;
        }
        
        // 清空现有卡片
        this.levelContainer.destroyAllChildren();
        console.log('已清空所有卡片');
        
        console.log('=== 开始生成关卡卡片（共' + LEVELS_DATA.length + '个）===');
        
        // 生成所有卡片
        for (let i = 0; i < LEVELS_DATA.length; i++) {
            const levelData = this.levelDataList[i] || {
                levelIndex: i,
                isUnlocked: i === 0,
                bestScore: "",
                stepCount: 0,
                isCompleted: false
            };
            
            const cardNode = instantiate(this.levelCardPrefab);
            cardNode.parent = this.levelContainer;
            cardNode.name = `LevelCard_${i}`;
            
            // 只确保缩放正确
            cardNode.setScale(1, 1, 1);
            
            // 确保卡片有正确的 UITransform
            let cardTransform = cardNode.getComponent(UITransform);
            if (!cardTransform) {
                cardTransform = cardNode.addComponent(UITransform);
            }
            cardTransform.setContentSize(90, 90);
            cardTransform.setAnchorPoint(0.5, 0.5);
                        
            this.setupLevelCard(cardNode, levelData);
        }
        
        
        // 应用手动布局
        setTimeout(() => {
            this.manualGridLayout();
            // this.testSimpleLayout(); // 注释掉测试布局
            setTimeout(() => {
                this.hideLoadingMask();
                }, 200);
        }, 100);
    }

    private manualGridLayout() {
        console.log('执行手动网格布局...');
        
        if (!this.levelContainer || !this.scrollView) return;
        
        const children = this.levelContainer.children;
        if (children.length === 0) return;
        
        // 布局参数
        const cardsPerRow = 5;
        const cardWidth = 90;
        const cardHeight = 90;
        const spacingX = 20;
        const spacingY = 40; // 增加行间距
        const paddingTop = 60; // 顶部留白
        const paddingBottom = 40;
        
        // 获取容器和ScrollView尺寸
        const containerTransform = this.levelContainer.getComponent(UITransform);
        const scrollViewTransform = this.scrollView.node.getComponent(UITransform);
        if (!containerTransform || !scrollViewTransform) return;
        
        // 【关键】获取ScrollView的可见区域高度（view的高度）
        const viewNode = this.scrollView.node.getChildByName('view');
        const viewTransform = viewNode ? viewNode.getComponent(UITransform) : null;
        const viewHeight = viewTransform ? viewTransform.height : 900;
        
        console.log('尺寸信息:', {
            ScrollView高度: scrollViewTransform.height,
            View高度: viewHeight,
            LevelContainer高度: containerTransform.height,
            LevelContainer锚点: `(${containerTransform.anchorX}, ${containerTransform.anchorY})`
        });
        
        // 计算每行的总宽度
        const totalRowWidth = (cardWidth * cardsPerRow) + (spacingX * (cardsPerRow - 1));
        
        // 计算起始X：居中显示
        const startX = -totalRowWidth / 2 + cardWidth / 2;
        
        const scrollViewTop = scrollViewTransform.height / 2; // 锚点中心到顶部的距离
        const startY = containerTransform.height / 2 - paddingTop - (cardHeight / 2);
        
        console.log('手动布局参数:', {
            每行总宽度: totalRowWidth,
            起始X: startX.toFixed(1),
            起始Y: startY.toFixed(1),
            ScrollView顶部Y: scrollViewTop,
            卡片尺寸: `${cardWidth}×${cardHeight}`,
            行间距: spacingY
        });
        
        // 布局所有卡片
        for (let i = 0; i < children.length; i++) {
            const card = children[i];
            if (!card.name.startsWith('LevelCard_')) continue;
            
            const row = Math.floor(i / cardsPerRow);
            const col = i % cardsPerRow;
            
            // 计算位置
            const x = startX + col * (cardWidth + spacingX);
            const y = startY - row * (cardHeight + spacingY);
            
            card.setPosition(x, y, 0);
            
            if (i < 5) {
                console.log(`布局卡片 ${i}: 行${row}, 列${col}, 位置(${x.toFixed(1)}, ${y.toFixed(1)})`);
            }
        }
        
        // 计算需要的容器高度
        const totalRows = Math.ceil(children.length / cardsPerRow);
        const neededHeight = paddingTop + paddingBottom + 
                            (totalRows * cardHeight) + 
                            ((totalRows - 1) * spacingY);
        
        // 确保容器高度足够
        if (containerTransform.height < neededHeight) {
            containerTransform.height = neededHeight;
            console.log(`更新容器高度: ${containerTransform.height}`);
        }
        
        // 更新ScrollView的content
        this.scrollView.content = this.levelContainer;
        
        // 滚动到顶部
        this.scrollView.scrollToTop();
        
        // 调整评分标签位置
        this.adjustScoreLabelPositions();
        
        // 最终验证
        setTimeout(() => {
            console.log('=== 最终布局验证 ===');
            
            if (children.length > 0) {
                const firstCard = children[0];
                console.log('第一张卡片信息:', {
                    本地位置: firstCard.position,
                    世界位置: firstCard.worldPosition,
                    在ScrollView内: this.isPositionInScrollView(firstCard.worldPosition)
                });
            }
        }, 100);
    }

    // 检查位置是否在ScrollView内
    private isPositionInScrollView(worldPos: Vec3): boolean {
        if (!this.scrollView) return false;
        
        const scrollViewPos = this.scrollView.node.worldPosition;
        const scrollViewTransform = this.scrollView.node.getComponent(UITransform);
        
        if (!scrollViewTransform) return false;
        
        const halfWidth = scrollViewTransform.width / 2;
        const halfHeight = scrollViewTransform.height / 2;
        
        const inX = worldPos.x >= scrollViewPos.x - halfWidth && 
                    worldPos.x <= scrollViewPos.x + halfWidth;
        const inY = worldPos.y >= scrollViewPos.y - halfHeight && 
                    worldPos.y <= scrollViewPos.y + halfHeight;
        
        return inX && inY;
    }

    // 调整评分标签位置的方法
    private adjustScoreLabelPositions() {
        const children = this.levelContainer.children;
        
        for (let i = 0; i < children.length; i++) {
            const card = children[i];
            const scoreNode = card.getChildByName('Score');
            
            if (scoreNode) {
                // 将评分标签移动到卡片下方
                scoreNode.setPosition(0, -60, 0);
                
                // 检查并设置 Score 节点的 UITransform
                let scoreTransform = scoreNode.getComponent(UITransform);
                if (!scoreTransform) {
                    scoreTransform = scoreNode.addComponent(UITransform);
                }
                scoreTransform.setContentSize(100, 20); // 设置合适的尺寸来容纳5颗星星
                scoreTransform.setAnchorPoint(0.5, 0.5);
                
                // 如果卡片有锁定图标，调整位置
                const lockIcon = card.getChildByName('LockIcon');
                if (lockIcon) {
                    // 确保锁图标显示在卡片右上角
                    lockIcon.setPosition(25, 25, 10);
                    
                    // 调整锁图标的 UITransform
                    const lockTransform = lockIcon.getComponent(UITransform);
                    if (lockTransform) {
                        lockTransform.setContentSize(20, 20);
                        lockTransform.setAnchorPoint(0.5, 0.5);
                    }
                }
            }
        }
    }
    
    private setupLevelCard(cardNode: Node, levelData: LevelData) {
        // 获取卡片组件
        const levelIndexLabel = cardNode.getChildByPath('LevelIndex')?.getComponent(Label);
        const scoreNode = cardNode.getChildByName('Score');
        const scoreLabel = scoreNode?.getComponent(Label);
        const lockIcon = cardNode.getChildByPath('LockIcon');
        const completedIcon = cardNode.getChildByPath('CompletedIcon');
        const cardBg = cardNode.getComponent(Sprite) || 
                    cardNode.getChildByPath('Background')?.getComponent(Sprite);
        
        const levelIndex = levelData.levelIndex;
        
        // 【修正】设置关卡序号（如果需要国际化）
        if (levelIndexLabel && this.i18n) {
            // 如果关卡序号需要格式化为 "关卡 1" 而不是 "1"
            levelIndexLabel.string = `${levelIndex + 1}`; // 或者使用国际化
            // levelIndexLabel.string = this.i18n.t('level', levelIndex + 1);
        } else if (levelIndexLabel) {
            levelIndexLabel.string = `${levelIndex + 1}`;
        }
    
        if (completedIcon) {
            completedIcon.active = false;
        }

        // 2. 调整小锁位置到右上角
        if (lockIcon) {
            lockIcon.active = !levelData.isUnlocked;
            
            if (!levelData.isUnlocked) {
                // 调整锁图标位置到右上角
                lockIcon.setPosition(35, 35, 10); // 右上角
            } else {
                // 已解锁的关卡隐藏锁图标
                lockIcon.active = false;
            }
        }
        
        // 显示星星评价系统
        if (scoreNode) {
            scoreNode.active = true;
            
            // 清空之前的星星子节点
            this.clearStarIcons(scoreNode);
            
            // 总是显示5颗星星
            const totalStars = 3;
            let activeStarCount = 0;
            
            if (levelData.isCompleted) {
                // 已完成的关卡：根据评价显示点亮星星数量
                // 从评价文字中提取星星数量（例如："★★★★☆" 有4颗亮星）
                activeStarCount = (levelData.bestScore.match(/★/g) || []).length;
            } else {
                // 未完成/未解锁的关卡：0颗点亮星星
                activeStarCount = 0;
            }
            
            // 创建星星图标
            this.showStarIcons(scoreNode, totalStars, activeStarCount);
            
            // 清空文字显示
            if (scoreLabel) {
                scoreLabel.string = "";
            }
            
            scoreNode.setSiblingIndex(99);
        }       
        
        
        // 设置卡片背景颜色
        if (cardBg) {
            if (!levelData.isUnlocked) {
                cardBg.color = Color.fromHEX(new Color(), "#666666");
            } else if (levelData.isCompleted) {
                cardBg.color = Color.fromHEX(new Color(), "#4CAF50");
            } else {
                cardBg.color = Color.fromHEX(new Color(), "#2196F3");
            }
        }
        
        // 添加点击事件
        const button = cardNode.getComponent(Button) || cardNode.addComponent(Button);
        button.interactable = levelData.isUnlocked;
        
        if (levelData.isUnlocked) {
            button.node.off(Button.EventType.CLICK);
            button.node.on(Button.EventType.CLICK, () => {
                console.log(`点击关卡卡片: ${levelData.levelIndex + 1}`);
                this.onLevelSelected(levelData.levelIndex);
            }, this);
        } else {
            button.interactable = false;
        }
    }

    // 清空星星图标的方法
    private clearStarIcons(scoreNode: Node) {
        const starNodes: Node[] = [];
        scoreNode.children.forEach((child) => {
            if (child.name.startsWith('Star_')) {
                starNodes.push(child);
            }
        });
        
        starNodes.forEach((starNode) => {
            if (starNode && starNode.isValid) {
                starNode.destroy();
            }
        });
        
        // 如果存在Label组件，清空文字
        const scoreLabel = scoreNode.getComponent(Label);
        if (scoreLabel) {
            scoreLabel.string = "";
        }
        
        // 如果存在Sprite组件，清空图标
        const scoreSprite = scoreNode.getComponent(Sprite);
        if (scoreSprite) {
            scoreSprite.spriteFrame = null;
        }
    }

    // 显示星星图标的方法
    private showStarIcons(scoreNode: Node, originalTotalStars: number, activeStarCount: number) {
        if (!this.starActive || !this.starInactive) {
            console.warn('星星图标未设置，使用文字替代');
            this.showStarText(scoreNode, originalTotalStars, activeStarCount);
            return;
        }
        
        // 清空之前的星星
        this.clearStarIcons(scoreNode);
        
        // 设置Score节点本身的Sprite为空
        const scoreSprite = scoreNode.getComponent(Sprite);
        if (scoreSprite) {
            scoreSprite.spriteFrame = null;
        }
        
        // 【修复】将5颗星改为3颗星
        const displaySize = 14;
        const starSpacing = 4;
        const totalStars = 3;   // 固定为3颗星
        const totalWidth = (displaySize * totalStars) + (starSpacing * (totalStars - 1));
        const startX = -totalWidth / 2 + displaySize / 2;
        
        
        // 【重要修复】正确计算应该点亮的星星数量
        // activeStarCount 实际上是从评价文字中提取的星星数量，比如 "★★★★☆" 是 4
        // 但我们现在需要转换为3星系统
        let starsToLight = 0;
        
        // 如果 activeStarCount 是 0，表示关卡未完成或未解锁
        if (activeStarCount > 0) {
            // 根据原始5星评价转换为3星评价
            // 5星 → 3星
            if (activeStarCount === 5) {
                starsToLight = 3;      // ★★★★★ → ★★★
            } else if (activeStarCount === 4) {
                starsToLight = 2;      // ★★★★☆ → ★★☆
            } else if (activeStarCount >= 2 && activeStarCount <= 3) {
                starsToLight = 1;      // ★★★☆☆ 或 ★★☆☆☆ → ★☆☆
            } else if (activeStarCount === 1) {
                starsToLight = 0;      // ★☆☆☆☆ → ☆☆☆
            }
        } else {
            // 未完成或失败
            starsToLight = 0;
        }
                
        for (let i = 0; i < totalStars; i++) {
            const starNode = new Node(`Star_${i}`);
            starNode.parent = scoreNode;
            starNode.setPosition(startX + i * (displaySize + starSpacing), 0, 0);
            
            // UITransform
            const uiTransform = starNode.addComponent(UITransform);
            uiTransform.setContentSize(displaySize, displaySize);
            uiTransform.setAnchorPoint(0.5, 0.5);
            
            // Sprite组件
            const starSprite = starNode.addComponent(Sprite);
            
            // 根据计算的点亮数量设置星星
            if (i < starsToLight) {
                starSprite.spriteFrame = this.starActive; // 点亮星星
            } else {
                starSprite.spriteFrame = this.starInactive; // 未点亮星星
            }
            
            starSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            starSprite.type = Sprite.Type.SIMPLE;
            starSprite.trim = false;
            
            // 调整缩放
            const targetScale = 0.25;
            starNode.setScale(targetScale, targetScale, 1);
            
        }
    }

    // 备选方案：用文字显示星星
    private showStarText(scoreNode: Node, totalStars: number, activeStarCount: number) {
        // 清空星星图标
        this.clearStarIcons(scoreNode);
        
        // 临时添加Label组件来显示文字
        let scoreLabel = scoreNode.getComponent(Label);
        if (!scoreLabel) {
            scoreLabel = scoreNode.addComponent(Label);
        }
        
        // 【修改】改为3颗星的文字显示
        const threeStarActiveCount = Math.min(3, Math.ceil(activeStarCount * 3 / 5)); // 5星转3星
        
        let starText = "";
        for (let i = 0; i < 3; i++) { // 固定3颗星
            if (i < threeStarActiveCount) {
                starText += "★"; // 点亮
            } else {
                starText += "☆"; // 未点亮
            }
        }
        scoreLabel.string = starText;
        scoreLabel.fontSize = 16;
        scoreLabel.color = threeStarActiveCount > 0 ? Color.YELLOW : Color.GRAY;
        scoreLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        scoreLabel.verticalAlign = Label.VerticalAlign.CENTER;
    }

    private updateContainerSize() {
        if (!this.levelContainer) {
            console.error('LevelContainer为空，无法更新尺寸');
            return;
        }
        
        const layout = this.levelContainer.getComponent(Layout);
        if (!layout) {
            console.warn('LevelContainer没有Layout组件');
            return;
        }
        
        console.log('=== 更新容器尺寸（开始）===');
        console.log('更新前Layout信息:', {
            cellSize: layout.cellSize,
            constraintNum: layout.constraintNum,
            spacingX: layout.spacingX,
            spacingY: layout.spacingY
        });
        
        // 再次强制更新布局
        layout.updateLayout();
        console.log('Layout已强制更新');
        
        // 重新获取布局后的信息
        console.log('更新后Layout信息:', {
            cellSize: layout.cellSize,
            constraintNum: layout.constraintNum,
            spacingX: layout.spacingX,
            spacingY: layout.spacingY
        });        
        
        // 计算容器高度
        const totalCards = LEVELS_DATA.length;
        const cardsPerRow = layout.constraintNum || 5;
        const rows = Math.ceil(totalCards / cardsPerRow);
        const cellHeight = layout.cellSize.height;
        const spacingY = layout.spacingY;
        const paddingTop = layout.paddingTop;
        const paddingBottom = layout.paddingBottom;
        
        const totalHeight = paddingTop + paddingBottom + (rows * cellHeight) + ((rows - 1) * spacingY);
        
        const uiTransform = this.levelContainer.getComponent(UITransform);
        if (uiTransform) {
            const oldHeight = uiTransform.height;
            uiTransform.height = totalHeight;
            
            console.log(`容器信息:`, {
                总卡片数: totalCards,
                每行卡片数: cardsPerRow,
                总行数: rows,
                卡片高度: cellHeight,
                垂直间距: spacingY,
                上内边距: paddingTop,
                下内边距: paddingBottom,
                旧高度: oldHeight,
                新高度: totalHeight,
                容器尺寸: `${uiTransform.width}×${uiTransform.height}`,
                锚点: `(${uiTransform.anchorX}, ${uiTransform.anchorY})`
            });
            
            // 检查是否需要调整水平尺寸
            const containerWidth = uiTransform.width;
            const totalCardWidth = layout.cellSize.width * cardsPerRow;
            const totalSpacing = layout.spacingX * (cardsPerRow - 1);
            const totalPadding = layout.paddingLeft + layout.paddingRight;
            const neededWidth = totalPadding + totalCardWidth + totalSpacing;
            
            console.log(`宽度检查:`, {
                容器宽度: containerWidth,
                需要的宽度: neededWidth,
                差值: containerWidth - neededWidth,
                建议: containerWidth >= neededWidth ? '宽度足够' : '宽度不足，建议调整'
            });
        } else {
            console.error('LevelContainer没有UITransform组件');
        }
        
        // 滚动到顶部
        if (this.scrollView) {
            this.scrollView.scrollToTop();
            console.log('已滚动到顶部');
        }
        
        // 打印最终布局信息
        setTimeout(() => {
            console.log('=== 最终布局检查 ===');
            const children = this.levelContainer.children;
            console.log('子节点总数:', children.length);
            
            // 按行分组显示
            for (let row = 0; row < rows; row++) {
                const startIdx = row * cardsPerRow;
                const endIdx = Math.min(startIdx + cardsPerRow, children.length);
                const rowCards = [];
                
                for (let i = startIdx; i < endIdx; i++) {
                    const card = children[i];
                    const pos = card.position;
                    rowCards.push({
                        名称: card.name,
                        位置: `(${pos.x.toFixed(0)}, ${pos.y.toFixed(0)})`
                    });
                }
                
                if (rowCards.length > 0) {
                    console.log(`第 ${row + 1} 行 (${rowCards.length}个卡片):`, rowCards);
                }
            }
            
            console.log('=== 布局检查完成 ===');
        }, 200);
    }
    
    private refreshLevelCards() {
        const children = this.levelContainer.children;
        for (let i = 0; i < children.length; i++) {
            const cardNode = children[i];
            const levelIndex = parseInt(cardNode.name.split('_')[1]);
            const levelData = this.levelDataList[levelIndex];
            
            if (levelData) {
                this.setupLevelCard(cardNode, levelData);
            }
        }
    }
    
    // 关卡被点击
    private onLevelSelected(levelIndex: number) {
        console.log(`Level selected: ${levelIndex}`);
        
        localStorage.setItem('diamond_chess_selected_level', levelIndex.toString());
        
        // 隐藏关卡选择页
        this.node.active = false;
        
        // 【重要】直接调用BoardController加载关卡
        const gameManager = find('Canvas/GameManager');
        if (gameManager) {
            const boardController = gameManager.getComponent('BoardController') as any;
            if (boardController && boardController.loadLevel) {
                boardController.loadLevel(levelIndex);
            }
        }
    }
    
    // 加载游戏场景（假设你的游戏场景叫 GameScene）
    private loadGameScene(levelIndex: number) {
        // 这里需要根据你的场景加载方式来实现
        // 例如：director.loadScene('GameScene');
        console.log(`Should load game scene with level ${levelIndex}`);
        
        // 临时方案：隐藏关卡选择页，显示游戏页
        this.node.active = false;
        
        // 查找游戏控制器并加载关卡
        const boardController = find('Canvas/GameManager')?.getComponent('BoardController') as any;
        if (boardController) {
            // 调用游戏控制器的加载关卡方法
            boardController.loadLevel(levelIndex);
            
            // 激活游戏UI
            const gameUI = find('Canvas/UIRoot');
            if (gameUI) {
                gameUI.active = true;
            }
        }
    }
    
    // 如果从游戏场景进入,点击也是回首页
    private onBackToGame() {
        this.onBackToHome();
    }
    
    // 显示关卡选择页（从游戏场景调用）
    public show() {
        this.node.active = true;
        this.loadLevelProgress();
        this.refreshLevelCards();
        
        // 【修正】使用国际化文本
        const loadingText = this.i18n ? this.i18n.t('loadingLevels') : '加载关卡列表...';
        this.showLoadingMask(loadingText);

        // 确保标题栏显示
        if (this.titleBar) {
            this.titleBar.active = true;
            this.titleBar.setSiblingIndex(999); // 置顶显示
        }

        // 隐藏游戏UI
        const gameUI = find('Canvas/GameUI');
        if (gameUI) {
            gameUI.active = false;
        }

        // 【新增】确保首页隐藏
        const homePage = find('Canvas/HomePage');
        if (homePage) {
            homePage.active = false;
        }

        // 【修正】确保刷新后更新标题
        if (this.titleLabel && this.i18n) {
            this.titleLabel.string = this.i18n.t('selectLevel');
        }

        // 【修正】确保返回按钮文本更新
        if (this.homeBackButton && this.i18n) {
            const backLabel = this.homeBackButton.node.getComponentInChildren(Label);
            if (backLabel) {
                backLabel.string = this.i18n.t('homeBack');
            }
        }

        // 【修改】延迟一点时间刷新卡片，确保遮罩先显示出来
        setTimeout(() => {
            this.refreshLevelCards();
            
            // 确保遮罩在刷新完成后隐藏
            setTimeout(() => {
                this.hideLoadingMask();
            }, 400);
        }, 50);       
    }

    // 新增：返回首页方法
    private onBackToHome() {
        console.log("返回首页");
        
        // 隐藏关卡选择页
        this.node.active = false;
        
        // 显示首页
        if (this.homePageNode) {
            const homeController = this.homePageNode.getComponent(HomePageController);
            if (homeController && homeController.show) {
                homeController.show();
            } else {
                this.homePageNode.active = true;
            }
        } else {
            console.error("HomePageNode not assigned!");
        }
    }
}