import { _decorator, Component, Node, Prefab, instantiate, Label, Button, Sprite, Color, ScrollView, UITransform, Layout, SpriteFrame, find, Size } from 'cc';
import { LEVELS_DATA } from './GameConfig';

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
    
    @property(Button)
    public backButton: Button = null; // 返回游戏按钮（如果需要）
    
    @property(Label)
    public titleLabel: Label = null; // 标题
    
    @property(SpriteFrame)
    public lockedSprite: SpriteFrame = null; // 锁图标
    
    @property(SpriteFrame)
    public unlockedSprite: SpriteFrame = null; // 解锁图标
    
    @property(SpriteFrame)
    public completedSprite: SpriteFrame = null; // 已完成图标
    
    private levelDataList: LevelData[] = [];
    private currentMaxUnlockedLevel: number = 0;
    
    protected onLoad() {
        this.loadLevelProgress();
        this.initUI();
        this.generateLevelCards();
        
        if (this.backButton) {
            this.backButton.node.on(Button.EventType.CLICK, this.onBackToGame, this);
        }
    }
    
    // 加载关卡进度（从本地存储）
    private loadLevelProgress() {
        // 从本地存储读取进度，如果没有则初始化
        const savedProgress = localStorage.getItem('diamond_chess_level_progress');
        
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            this.currentMaxUnlockedLevel = progress.maxUnlockedLevel || 0;
            this.levelDataList = progress.levelDataList || [];
        } else {
            // 初始状态：只有第一关解锁
            this.currentMaxUnlockedLevel = 0;
            this.levelDataList = [];
            this.initLevelData();
            this.saveLevelProgress();
        }
    }
    
    // 初始化关卡数据
    private initLevelData() {
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
    }
    
    // 保存关卡进度到本地存储
    private saveLevelProgress() {
        const progress = {
            maxUnlockedLevel: this.currentMaxUnlockedLevel,
            levelDataList: this.levelDataList
        };
        localStorage.setItem('diamond_chess_level_progress', JSON.stringify(progress));
    }
    
    // 更新关卡进度（在游戏完成后调用）
    public updateLevelProgress(levelIndex: number, score: string, stepCount: number) {
        if (levelIndex >= this.levelDataList.length) return;
        
        // 更新当前关卡
        this.levelDataList[levelIndex].isCompleted = true;
        this.levelDataList[levelIndex].bestScore = score;
        this.levelDataList[levelIndex].stepCount = stepCount;
        
        // 解锁下一关（如果存在）
        const nextLevelIndex = levelIndex + 1;
        if (nextLevelIndex < this.levelDataList.length) {
            this.levelDataList[nextLevelIndex].isUnlocked = true;
            this.currentMaxUnlockedLevel = Math.max(this.currentMaxUnlockedLevel, nextLevelIndex);
        }
        
        this.saveLevelProgress();
        
        // 刷新UI
        this.refreshLevelCards();
    }
    
    private initUI() {
        console.log('初始化关卡选择UI');
        
        // 获取屏幕尺寸
        const screenWidth = 750;
        const screenHeight = 1334;
        
        // 1. 设置标题位置
        if (this.titleLabel) {
            this.titleLabel.string = `钻石棋 - 关卡选择`;
            this.titleLabel.node.setPosition(screenWidth/2, -100, 0);
        }
        
        // 2. 设置ScrollView位置和尺寸
        if (this.scrollView && this.scrollView.node) {
            const scrollTransform = this.scrollView.node.getComponent(UITransform);
            if (scrollTransform) {
                this.scrollView.node.setPosition(25, -200, 0);
                scrollTransform.width = 700;
                scrollTransform.height = 1000;
            }
            
            if (this.levelContainer) {
                this.scrollView.content = this.levelContainer;
            }
        }
        
        // 3. 设置LevelContainer布局
        if (this.levelContainer) {
            const layout = this.levelContainer.getComponent(Layout) || this.levelContainer.addComponent(Layout);
            
            layout.type = Layout.Type.GRID;
            layout.resizeMode = Layout.ResizeMode.CONTAINER;
            
            const containerWidth = 700;
            const cardsPerRow = 5;
            
            // 【修正】重新计算：总宽度 = 左边距 + 卡片总宽度 + 卡片间距 + 右边距
            // 设：卡片宽度 = W，水平间距 = S，左右内边距 = P
            // 公式：P + (W×5) + (S×4) + P = 700
            
            // 我们希望：W = 120，S = 15，P = 20
            // 验证：20 + (120×5=600) + (15×4=60) + 20 = 700 ✓
            
            const cardWidth = 120;
            const cardHeight = cardWidth * 1.2; // 144
            
            layout.paddingTop = 20;
            layout.paddingBottom = 20;
            layout.paddingLeft = 20;    // 增加左边距
            layout.paddingRight = 20;   // 增加右边距
            layout.spacingX = 15;       // 保持15
            layout.spacingY = 15;       // 保持15
            
            layout.cellSize = new Size(cardWidth, cardHeight);
            
            layout.startAxis = Layout.AxisDirection.HORIZONTAL;
            layout.constraint = Layout.Constraint.FIXED_ROW;
            layout.constraintNum = cardsPerRow;
            layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
            layout.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
            
            console.log('卡片布局设置:', {
                每行数量: cardsPerRow,
                卡片尺寸: `${cardWidth}×${cardHeight}`,
                间距: '15px',
                内边距: '20px'
            });
        }
    }

    private generateLevelCards() {
        console.log('开始生成关卡卡片');
        console.log('总关卡数:', LEVELS_DATA?.length);
        
        if (!this.levelCardPrefab || !this.levelContainer) {
            console.error("错误：Level card prefab 或 Level container 未赋值");
            return;
        }
        
        this.levelContainer.destroyAllChildren();
        
        // 检查关卡数据
        if (!LEVELS_DATA || LEVELS_DATA.length === 0) {
            console.error('错误：LEVELS_DATA为空或未定义！请检查GameConfig.ts文件');
            return;
        }

        console.log('=== 卡片生成详情 ===');
        
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
            
            console.log(`生成卡片 ${i+1}，名称: LevelCard_${i}`);

            this.setupLevelCard(cardNode, levelData);
        }
        
        console.log(`已生成 ${LEVELS_DATA.length} 个关卡卡片`);
        
        // 延迟更新布局并计算容器高度
        this.scheduleOnce(() => {
            this.updateContainerSize(); 
        }, 0.1);
    }
    
    private setupLevelCard(cardNode: Node, levelData: LevelData) {
        // 获取卡片组件
        const levelIndexLabel = cardNode.getChildByPath('LevelIndex')?.getComponent(Label);
        const scoreLabel = cardNode.getChildByPath('Score')?.getComponent(Label); // 保留用于显示评价
        const lockIcon = cardNode.getChildByPath('LockIcon');
        const completedIcon = cardNode.getChildByPath('CompletedIcon');
        const cardBg = cardNode.getComponent(Sprite) || 
                    cardNode.getChildByPath('Background')?.getComponent(Sprite);
        
        const levelIndex = levelData.levelIndex;
        
        // 【修改】只设置关卡序号，去掉关卡名称
        if (levelIndexLabel) {
            levelIndexLabel.string = `${levelIndex + 1}`; // 只显示数字，如"1"
            levelIndexLabel.fontSize = 36; // 可以调大一些
        }
        
        // 【修改】已完成的评价放在下方
        if (scoreLabel) {
            if (levelData.isCompleted) {
                scoreLabel.string = `${levelData.bestScore}`; // 只显示评价，如"天才"
                scoreLabel.fontSize = 20;
                scoreLabel.color = Color.GREEN;
                scoreLabel.node.active = true; // 确保显示
            } else {
                scoreLabel.string = levelData.isUnlocked ? "未完成" : "未解锁";
                scoreLabel.fontSize = 16;
                scoreLabel.color = levelData.isUnlocked ? Color.WHITE : Color.GRAY;
                scoreLabel.node.active = true;
            }
        }
        
        // 设置图标状态
        if (lockIcon) {
            lockIcon.active = !levelData.isUnlocked;
        }
        
        if (completedIcon) {
            completedIcon.active = levelData.isCompleted;
        }
        
        // 设置卡片背景颜色
        if (cardBg) {
            if (!levelData.isUnlocked) {
                cardBg.color = Color.fromHEX(new Color(), "#666666"); // 未解锁灰色
            } else if (levelData.isCompleted) {
                cardBg.color = Color.fromHEX(new Color(), "#4CAF50"); // 已完成绿色
            } else {
                cardBg.color = Color.fromHEX(new Color(), "#2196F3"); // 已解锁蓝色
            }
        }
        
        // 添加点击事件
        const button = cardNode.getComponent(Button) || cardNode.addComponent(Button);
        button.interactable = levelData.isUnlocked;
        
        if (levelData.isUnlocked) {
            button.node.off(Button.EventType.CLICK);
            button.node.on(Button.EventType.CLICK, () => {
                this.onLevelSelected(levelData.levelIndex);
            }, this);
        }
    }
    
    private updateContainerSize() {
        if (!this.levelContainer) return;
        
        const layout = this.levelContainer.getComponent(Layout);
        if (!layout) return;
        
        layout.updateLayout();
        
        // 计算容器高度
        const totalCards = LEVELS_DATA.length;
        const cardsPerRow = layout.constraintNum || 5; // 改为从布局获取
        const rows = Math.ceil(totalCards / cardsPerRow);
        const cellHeight = layout.cellSize.height;
        const spacingY = layout.spacingY;
        const paddingTop = layout.paddingTop;
        const paddingBottom = layout.paddingBottom;
        
        const totalHeight = paddingTop + paddingBottom + (rows * cellHeight) + ((rows - 1) * spacingY);
        
        const uiTransform = this.levelContainer.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.height = totalHeight;
            console.log(`容器信息:`, {
                总卡片: totalCards,
                每行: cardsPerRow,
                行数: rows,
                卡片高: cellHeight,
                容器高: totalHeight
            });
        }
        
        // 滚动到顶部
        if (this.scrollView) {
            this.scrollView.scrollToTop();
        }
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
        
        // 保存选中的关卡到本地存储，以便游戏场景读取
        localStorage.setItem('diamond_chess_selected_level', levelIndex.toString());
        
        // 切换到游戏场景
        this.loadGameScene(levelIndex);
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
    
    // 返回游戏（如果从游戏场景进入）
    private onBackToGame() {
        this.node.active = false;
        
        // 激活游戏UI
        const gameUI = find('Canvas/UIRoot');
        if (gameUI) {
            gameUI.active = true;
        }
    }
    
    // 显示关卡选择页（从游戏场景调用）
    public show() {
        this.node.active = true;
        this.loadLevelProgress();
        this.refreshLevelCards();
        
        // 隐藏游戏UI
        const gameUI = find('Canvas/UIRoot');
        if (gameUI) {
            gameUI.active = false;
        }
    }
}