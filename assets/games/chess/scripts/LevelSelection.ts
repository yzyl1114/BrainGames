import { _decorator, Component, Node, Prefab, instantiate, Label, Button, Sprite, Color, ScrollView, UITransform, Layout, SpriteFrame, find, Size, Vec3 } from 'cc';
import { LEVELS_DATA, evaluateResult } from './GameConfig';
import { HomePageController } from './HomePageController';

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

    @property(Button)
    public homeBackButton: Button = null; // 新增：返回首页按钮
    
    @property(Node)
    public homePageNode: Node = null; // 新增：首页节点引用
    
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
        
        console.log('卡片布局设置完成:', {
            卡片尺寸: `${cardWidth}×${cardHeight}`,
            每行数量: cardsPerRow,
            水平间距: layout.spacingX,
            垂直间距: layout.spacingY,
            起始轴: layout.startAxis === 0 ? 'HORIZONTAL' : 'VERTICAL',
            约束: layout.constraint === 1 ? 'FIXED_ROW' : 'OTHER'
        });
        
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
                console.log(`节点 ${i} (${child.name}):`, {
                    位置: child.position,
                    世界位置: child.worldPosition,
                    父节点: child.parent?.name
                });
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
            console.log('卡片子节点:');
            firstCard.children.forEach((child, index) => {
                const childTransform = child.getComponent(UITransform);
                console.log(`  子节点[${index}] ${child.name}:`, {
                    尺寸: childTransform?.contentSize,
                    位置: child.position,
                    缩放: child.scale
                });
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
        
        if (!this.levelCardPrefab || !this.levelContainer) {
            console.error("缺少必要的组件");
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
            
            console.log(`卡片 ${i} 生成完成`);
            
            this.setupLevelCard(cardNode, levelData);
        }
        
        console.log(`已生成 ${LEVELS_DATA.length} 个关卡卡片`);
        
        // 改回正式布局方法
        setTimeout(() => {
            this.manualGridLayout();
            // this.testSimpleLayout(); // 注释掉测试布局
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
        const paddingHorizontal = 50;
        
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
        
        // 【关键修复】正确的Y坐标计算
        // 由于容器锚点在中心(0.5, 0.5)，且我们希望第一行在ScrollView顶部可见
        // 需要从ScrollView的顶部开始计算
        const scrollViewTop = scrollViewTransform.height / 2; // 锚点中心到顶部的距离
        const startY = scrollViewTop - paddingTop - (cardHeight / 2);
        
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

    // 新增：调整评分标签位置的方法
    private adjustScoreLabelPositions() {
        const children = this.levelContainer.children;
        
        for (let i = 0; i < children.length; i++) {
            const card = children[i];
            const scoreNode = card.getChildByName('Score');
            
            if (scoreNode) {
                // 将评分标签移动到卡片更下方，确保不会重叠
                scoreNode.setPosition(0, -50, 0); // 从 -70 调整到 -50
                
                // 如果卡片有锁定或完成图标，也需要调整
                const lockIcon = card.getChildByName('LockIcon');
                const completedIcon = card.getChildByName('CompletedIcon');
                
                if (lockIcon) {
                    lockIcon.setPosition(0, 0, 1);
                }
                if (completedIcon) {
                    completedIcon.setPosition(0, 0, 1);
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
        
        // 只设置关卡序号
        if (levelIndexLabel) {
            levelIndexLabel.string = `${levelIndex + 1}`;
        }
        
        // 立即设置评价文字
        if (scoreLabel && scoreNode) {
            scoreNode.active = true;
            
            if (levelData.isCompleted) {
                const scoreText = levelData.bestScore;
                const starCount = (scoreText.match(/★/g) || []).length;
                scoreLabel.string = `${starCount}星`;
                
                //scoreLabel.string = `${levelData.bestScore}`;
                scoreLabel.color = Color.BLACK;
                scoreLabel.fontSize = 24;
                scoreLabel.enableOutline = false;//无描边
                scoreLabel.outlineColor = Color.BLACK;
                scoreLabel.outlineWidth = 1;
            } else {
                scoreLabel.string = levelData.isUnlocked ? "未完成" : "未解锁";
                scoreLabel.color = levelData.isUnlocked ? Color.BLACK : Color.GRAY;
                scoreLabel.fontSize = 24;
            }
            
            // 确保位置
            scoreNode.setPosition(0, -70, 0);
            scoreNode.setSiblingIndex(99);
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
                this.onLevelSelected(levelData.levelIndex);
            }, this);
        }
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