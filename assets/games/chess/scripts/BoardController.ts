// assets/games/chess/scripts/BoardController.ts

import { _decorator, Component, Node, Prefab, instantiate, UITransform, Vec3, v3, EventTouch, Label, tween, UIOpacity, Sprite, Color } from 'cc';
import { Peg } from './Peg';
import { BOARD_SIZE, TILE_STATE, LEVELS_DATA, evaluateResult, CENTER_POS } from './GameConfig'; 

const { ccclass, property } = _decorator;

const TILE_SIZE = 90; 

@ccclass('BoardController')
export class BoardController extends Component {

    @property(Prefab)
    public PegPrefab: Prefab = null; 
    
    @property(Node)
    public boardRoot: Node = null; 

    @property(Node)
    public feedbackNode: Node = null; // 反馈节点（可选）

    @property(Label)
    public resultLabel: Label = null; 
    
    @property(Label)
    public stepCounterLabel: Label = null; // 新增：计步器标签

    @property(Label)
    public tipsLabel: Label = null; // 新增：提示标签
    
    private currentLevelIndex: number = 0;
    private boardState: number[][] = []; 
    private activeNode: Node | null = null; 
    private activePegRow: number = -1;
    private activePegCol: number = -1;
    private dragOffset: Vec3 = v3(0, 0, 0);
    private touchStartPos: Vec3 = v3(0, 0, 0);
    private pegNodes: Map<string, Node> = new Map(); // 使用Map存储棋子节点
    
    // 新增：历史记录和游戏状态
    private moveHistory: Array<{
        boardState: number[][];
        pegsInfo: Array<{row: number, col: number}>;
        stepCount: number;
    }> = [];
    private stepCount: number = 0; // 步数计数器
    private undoCount: number = 0; // 悔棋次数计数器
    private maxUndoCount: number = 5; // 最大悔棋次数（根据关卡动态调整）

    protected onLoad() {
        console.log("BoardController: onLoad start");
        
        if (!this.PegPrefab) {
            console.error("BoardController: PegPrefab is not assigned in the editor!");
            return;
        }

        if (!this.boardRoot) {
            console.error("BoardController: boardRoot is not assigned in the editor!");
            return;
        }
        
        if (!this.resultLabel) {
            console.error("BoardController: resultLabel is not assigned in the editor!");
            return;
        }

        this.loadLevel(this.currentLevelIndex); 
    }
    
    public loadLevel(levelIndex: number) {
        console.log(`Loading level ${levelIndex}`);
        
        if (!this.boardRoot || !this.resultLabel) {
            console.error("Critical nodes missing, cannot load level");
            return;
        }
        
        this.boardRoot.destroyAllChildren();
        
        this.activeNode = null;
        this.activePegRow = -1;
        this.activePegCol = -1;
        this.pegNodes.clear();
        
        // 重置游戏状态
        this.stepCount = 0;
        this.undoCount = 0;
        this.moveHistory = [];
        
        // 根据关卡设置最大悔棋次数
        this.setMaxUndoCount(levelIndex);
        
        this.boardState = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            this.boardState[i] = [];
            for (let j = 0; j < BOARD_SIZE; j++) {
                this.boardState[i][j] = TILE_STATE.INVALID;
            }
        }

        if (levelIndex >= LEVELS_DATA.length) {
            this.resultLabel.string = "所有关卡完成! 恭喜您！";
            if (this.stepCounterLabel) {
                this.stepCounterLabel.string = "";
            }
            return;
        }

        const level = LEVELS_DATA[levelIndex];
        this.resultLabel.string = `关卡 ${levelIndex + 1}: ${level.name}`;
        
        // 更新计步器显示
        this.updateStepCounter();
        
        this.boardState = [];
        for (let i = 0; i < level.layout.length; i++) {
            this.boardState[i] = [...level.layout[i]];
        }
        
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.boardState[r][c] === TILE_STATE.PEG) {
                    this.spawnPeg(r, c);
                }
            }
        }
        
        // 保存初始状态
        this.saveCurrentState();
        
        console.log(`Level ${levelIndex} loaded: ${level.name}, pegs count: ${this.countPegs()}, max undo: ${this.maxUndoCount}`);
    }
    
    // 新增：根据关卡设置最大悔棋次数
    private setMaxUndoCount(levelIndex: number) {
        if (levelIndex < 30) {
            this.maxUndoCount = 5; // 1-30关：5次
        } else if (levelIndex < 60) {
            this.maxUndoCount = 7; // 31-60关：7次
        } else {
            this.maxUndoCount = 9; // 61+关：9次
        }
    }
    
    // 新增：更新计步器显示
    private updateStepCounter() {
        if (!this.stepCounterLabel) {
            console.warn("Step counter label not assigned");
            return;
        }
        
        const remainingUndo = this.maxUndoCount - this.undoCount;
        this.stepCounterLabel.string = `步数: ${this.stepCount} | 剩余悔棋: ${remainingUndo}次`;
    }
    
    // 新增：显示临时提示
    private showTips(message: string, duration: number = 2.0) {
        if (!this.tipsLabel || !this.tipsLabel.isValid) {
            console.log("Tips:", message);
            return;
        }
        
        // 显示提示
        this.tipsLabel.string = message;
        this.tipsLabel.node.active = true;
        
        // 淡入效果
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

    // 新增：保存当前状态到历史记录
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
    
    // 悔棋功能,修改undoMove方法，使用提示代替resultLabel
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
        this.showTips(`悔棋成功！剩余棋子: ${remainingPegs}，剩余悔棋: ${remainingUndo}次`);
        
        console.log(`Undo successful. Steps: ${this.stepCount}, Undo used: ${this.undoCount}/${this.maxUndoCount}, History: ${this.moveHistory.length}`);
    }
    
    // 新增：清空历史记录
    private clearHistory() {
        this.moveHistory = [];
        this.stepCount = 0;
        this.undoCount = 0;
        console.log("Move history cleared");
    }
    
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
    
    // =================== 保持原有的拖拽逻辑 ===================
    
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
            
            tween(eatenNode)  // 这里加上eatenNode
                .parallel(
                    tween().to(0.15, { scale: v3(0.1, 0.1, 0.1) }),  // 这里去掉eatenNode
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
    
    private checkGameState() {
        let remainingPegs = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.boardState[r][c] === TILE_STATE.PEG) {
                    remainingPegs++;
                }
            }
        }
        
        console.log(`Game state check: ${remainingPegs} pegs remaining`);
        
        if (remainingPegs === 1) {
            const isCenter = this.boardState[CENTER_POS.row][CENTER_POS.col] === TILE_STATE.PEG;
            const result = evaluateResult(remainingPegs, isCenter);
            this.resultLabel.string = `恭喜! 剩余 ${remainingPegs} 颗. 评价: ${result}. 步数: ${this.stepCount}`;
            
            console.log(`Victory! Remaining pegs: ${remainingPegs}, center: ${isCenter}, result: ${result}, steps: ${this.stepCount}`);
            
            setTimeout(() => {
                this.currentLevelIndex++;
                this.loadLevel(this.currentLevelIndex); 
            }, 3000);
            return;
        }

        if (remainingPegs > 1 && !this.hasValidMove()) {
            console.log("No valid moves remaining");
            
            let foundCenterPeg = false;
            if (this.boardState[CENTER_POS.row][CENTER_POS.col] === TILE_STATE.PEG) {
                foundCenterPeg = true;
            }

            const result = evaluateResult(remainingPegs, foundCenterPeg);
            this.resultLabel.string = `游戏结束! 剩余 ${remainingPegs} 颗. 评价: ${result}. 步数: ${this.stepCount}`;
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
                        
                        if (this.checkJumpValidity(r1, c1, r2, c2)) {
                            console.log(`Found valid move from (${r1}, ${c1}) to (${r2}, ${c2})`);
                            return true; 
                        }
                    }
                }
            }
        }
        return false; 
    }
    
    public nextLevel() {
        console.log("Loading next level");
        this.currentLevelIndex++;
        this.loadLevel(this.currentLevelIndex);
    }
    
    // 修改：重玩功能
    public retryLevel() {
        console.log("Retrying current level");
        this.clearHistory();  // 清空历史记录
        this.loadLevel(this.currentLevelIndex);
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
}