// 游戏状态管理
class PuzzleGame {
    constructor() {
        this.pieces = [];
        this.difficulty = 4;
        this.timerInterval = null;
        this.seconds = 0;
        this.moves = 0;
        this.gameStarted = false;
        this.originalImageUrl = './puzzle-image.jpg';
        this.draggedPiece = null;
        this.bgVisible = true;
        this.commandStack = []; // 命令栈
        this.commandIndex = -1; // 当前命令索引
        this.maxCommandStack = 50; // 最大命令栈大小
        
        this.initializeElements();
        this.bindEvents();
        this.setPuzzleBg();
    }

    initializeElements() {
        this.puzzleBoard = document.getElementById('puzzleBoard');
        this.piecesZone = document.getElementById('piecesZone');
        this.undoBtn = document.getElementById('undoBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.timerElement = document.getElementById('timer');
        this.movesElement = document.getElementById('moves');
        this.gameComplete = document.getElementById('gameComplete');
        this.completeInfo = document.getElementById('completeInfo');
        this.bestScoreInfo = document.getElementById('bestScoreInfo');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        this.backToMenuBtn = document.getElementById('backToMenuBtn');
        this.puzzleBg = document.getElementById('puzzleBg');
        this.toggleBgBtn = document.getElementById('toggleBgBtn');
    }

    bindEvents() {
        this.undoBtn.addEventListener('click', () => this.undo());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.playAgainBtn.addEventListener('click', () => {
            this.gameComplete.style.display = 'none';
            this.resetGame();
        });
        this.backToMenuBtn.addEventListener('click', () => {
            this.gameComplete.style.display = 'none';
            window.location.href = '/';
        });
        this.toggleBgBtn.addEventListener('click', () => this.toggleBg());
    }

    // 设置背景
    setPuzzleBg() {
        this.puzzleBg.style.backgroundImage = `url(${this.originalImageUrl})`;
    }

    // 切换背景显示/隐藏
    toggleBg() {
        this.bgVisible = !this.bgVisible;
        this.puzzleBg.style.opacity = this.bgVisible ? '0.25' : '0';
        this.toggleBgBtn.textContent = this.bgVisible ? '隐藏背景' : '显示背景';
    }

    // 开始游戏
    startGame() {
        if (this.gameStarted) {
            this.resetGame();
        }
        this.gameStarted = true;
        this.moves = 0;
        this.seconds = 0;
        this.commandStack = [];
        this.commandIndex = -1;
        this.updateUI();
        this.clearTimer();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        this.setPuzzleBg();
        this.puzzleBg.style.opacity = this.bgVisible ? '0.25' : '0';
        this.toggleBgBtn.textContent = this.bgVisible ? '隐藏背景' : '显示背景';
        this.createPuzzlePieces();
    }

    // 重置游戏
    resetGame() {
        this.gameStarted = false;
        this.clearTimer();
        this.seconds = 0;
        this.moves = 0;
        this.commandStack = [];
        this.commandIndex = -1;
        this.updateUI();
        this.puzzleBoard.querySelectorAll('.puzzle-piece').forEach(piece => piece.remove());
        this.piecesZone.innerHTML = '';
        this.pieces = [];
        this.setPuzzleBg();
        this.puzzleBg.style.opacity = this.bgVisible ? '0.25' : '0';
        this.toggleBgBtn.textContent = this.bgVisible ? '隐藏背景' : '显示背景';
    }

    // 更新UI
    updateUI() {
        this.movesElement.textContent = `移动次数: ${this.moves}`;
        const minutes = Math.floor(this.seconds / 60);
        const remainingSeconds = this.seconds % 60;
        this.timerElement.textContent = `时间: ${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        // 更新撤销按钮状态
        this.undoBtn.disabled = this.commandIndex < 0;
    }

    // 清除计时器
    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // 暂停游戏
    pauseGame() {
        if (this.gameStarted && this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // 继续游戏
    resumeGame() {
        if (this.gameStarted && !this.timerInterval) {
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        }
    }

    // 更新计时器
    updateTimer() {
        this.seconds++;
        this.updateUI();
    }

    // 创建拼图块
    createPuzzlePieces() {
        this.puzzleBoard.querySelectorAll('.puzzle-piece').forEach(piece => piece.remove());
        this.piecesZone.innerHTML = '';
        this.pieces = [];
        
        const pieceWidth = this.puzzleBoard.offsetWidth / this.difficulty;
        const pieceHeight = this.puzzleBoard.offsetHeight / this.difficulty;
        
        for (let y = 0; y < this.difficulty; y++) {
            for (let x = 0; x < this.difficulty; x++) {
                const piece = document.createElement('div');
                piece.className = 'puzzle-piece';
                piece.style.width = `${pieceWidth}px`;
                piece.style.height = `${pieceHeight}px`;
                piece.style.backgroundImage = `url(${this.originalImageUrl})`;
                piece.style.backgroundSize = `${this.puzzleBoard.offsetWidth}px ${this.puzzleBoard.offsetHeight}px`;
                piece.style.backgroundPosition = `-${x * pieceWidth}px -${y * pieceHeight}px`;
                piece.dataset.correctX = x;
                piece.dataset.correctY = y;
                piece.dataset.rotation = 0; // 添加旋转角度
                piece.draggable = true;
                
                // 绑定事件
                this.bindPieceEvents(piece);
                this.pieces.push(piece);
            }
        }
        
        this.shufflePieces();
        this.pieces.forEach(piece => {
            piece.style.position = 'static';
            this.piecesZone.appendChild(piece);
        });
        
        this.bindBoardEvents();
    }

    // 绑定拼图块事件
    bindPieceEvents(piece) {
        // 拖拽事件
        piece.addEventListener('dragstart', (e) => this.dragStart(e, piece));
        piece.addEventListener('dragend', (e) => this.dragEnd(e, piece));
        
        // 点击旋转事件
        piece.addEventListener('click', (e) => this.rotatePiece(e, piece));
        
        // 触摸事件
        piece.addEventListener('touchstart', (e) => this.touchStart(e, piece), { passive: false });
        piece.addEventListener('touchmove', (e) => this.touchMove(e, piece), { passive: false });
        piece.addEventListener('touchend', (e) => this.touchEnd(e, piece));
    }

    // 绑定棋盘事件
    bindBoardEvents() {
        this.puzzleBoard.addEventListener('dragover', (e) => this.dragOver(e));
        this.puzzleBoard.addEventListener('drop', (e) => this.dropOnBoard(e));
        this.piecesZone.addEventListener('dragover', (e) => this.dragOver(e));
        this.piecesZone.addEventListener('drop', (e) => this.dropOnZone(e));
    }

    // 打乱拼图块
    shufflePieces() {
        for (let i = this.pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.pieces[i], this.pieces[j]] = [this.pieces[j], this.pieces[i]];
        }
    }

    // 拖拽开始
    dragStart(e, piece) {
        this.draggedPiece = piece;
        setTimeout(() => {
            piece.classList.add('dragging');
        }, 0);
        e.dataTransfer.setData('text/plain', '');
    }

    // 拖拽结束
    dragEnd(e, piece) {
        piece.classList.remove('dragging');
        this.checkPuzzleCompletion();
    }

    // 拖拽悬停
    dragOver(e) {
        e.preventDefault();
    }

    // 拖拽到棋盘
    dropOnBoard(e) {
        e.preventDefault();
        if (!this.draggedPiece) return;
        
        const pieceWidth = this.puzzleBoard.offsetWidth / this.difficulty;
        const pieceHeight = this.puzzleBoard.offsetHeight / this.difficulty;
        const boardRect = this.puzzleBoard.getBoundingClientRect();
        
        let x = e.clientX - boardRect.left;
        let y = e.clientY - boardRect.top;
        let gridX = Math.floor(x / pieceWidth);
        let gridY = Math.floor(y / pieceHeight);
        
        // 边界检查
        if (gridX < 0 || gridX >= this.difficulty || gridY < 0 || gridY >= this.difficulty) {
            this.draggedPiece = null;
            return;
        }
        
        // 检查该格是否已被占用
        if (this.findPieceOnBoard(gridX, gridY)) {
            this.draggedPiece = null;
            return;
        }
        
        // 记录移动前的状态
        const oldState = this.getPieceState(this.draggedPiece);
        
        // 执行移动
        this.applyMove(this.draggedPiece, gridX, gridY);
        
        // 记录移动后的状态
        const newState = this.getPieceState(this.draggedPiece);
        
        // 添加到命令栈
        this.addCommand({
            type: 'move',
            piece: this.draggedPiece,
            oldState: oldState,
            newState: newState
        });
        
        this.draggedPiece = null;
    }

    // 拖拽回piecesZone
    dropOnZone(e) {
        e.preventDefault();
        if (!this.draggedPiece) return;
        
        // 记录移动前的状态
        const oldState = this.getPieceState(this.draggedPiece);
        
        // 执行移动
        this.draggedPiece.style.position = 'static';
        delete this.draggedPiece.dataset.currentX;
        delete this.draggedPiece.dataset.currentY;
        this.piecesZone.appendChild(this.draggedPiece);
        
        // 记录移动后的状态
        const newState = this.getPieceState(this.draggedPiece);
        
        // 添加到命令栈
        this.addCommand({
            type: 'move',
            piece: this.draggedPiece,
            oldState: oldState,
            newState: newState
        });
        
        this.draggedPiece = null;
    }

    // 旋转拼图块
    rotatePiece(e, piece) {
        e.preventDefault();
        e.stopPropagation();
        
        // 记录旋转前的状态
        const oldState = this.getPieceState(piece);
        
        // 执行旋转
        this.applyRotate(piece);
        
        // 记录旋转后的状态
        const newState = this.getPieceState(piece);
        
        // 添加到命令栈
        this.addCommand({
            type: 'rotate',
            piece: piece,
            oldState: oldState,
            newState: newState
        });
    }

    // 触摸开始
    touchStart(e, piece) {
        e.preventDefault();
        this.draggedPiece = piece;
        piece.classList.add('dragging');
        const touch = e.touches[0];
        piece.touchOffsetX = touch.clientX;
        piece.touchOffsetY = touch.clientY;
        piece.touchStartTime = Date.now();
    }

    // 触摸移动
    touchMove(e, piece) {
        e.preventDefault();
        if (!this.draggedPiece) return;
        
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - piece.touchOffsetX);
        const deltaY = Math.abs(touch.clientY - piece.touchOffsetY);
        
        // 如果移动距离很小，可能是点击
        if (deltaX < 10 && deltaY < 10) {
            return;
        }
        
        // 执行拖拽逻辑
        const pieceWidth = this.puzzleBoard.offsetWidth / this.difficulty;
        const pieceHeight = this.puzzleBoard.offsetHeight / this.difficulty;
        const boardRect = this.puzzleBoard.getBoundingClientRect();
        
        let x = touch.clientX - boardRect.left;
        let y = touch.clientY - boardRect.top;
        let gridX = Math.floor(x / pieceWidth);
        let gridY = Math.floor(y / pieceHeight);
        
        // 边界检查
        if (gridX >= 0 && gridX < this.difficulty && gridY >= 0 && gridY < this.difficulty) {
            // 高亮目标位置
            this.highlightDropZone(gridX, gridY);
        }
    }

    // 触摸结束
    touchEnd(e, piece) {
        if (!this.draggedPiece) return;
        
        const touchDuration = Date.now() - piece.touchStartTime;
        const touch = e.changedTouches[0];
        const deltaX = Math.abs(touch.clientX - piece.touchOffsetX);
        const deltaY = Math.abs(touch.clientY - piece.touchOffsetY);
        
        // 判断是点击还是拖拽
        if (touchDuration < 300 && deltaX < 10 && deltaY < 10) {
            // 点击旋转
            this.rotatePiece(e, piece);
        } else {
            // 拖拽结束
            const pieceWidth = this.puzzleBoard.offsetWidth / this.difficulty;
            const pieceHeight = this.puzzleBoard.offsetHeight / this.difficulty;
            const boardRect = this.puzzleBoard.getBoundingClientRect();
            
            let x = touch.clientX - boardRect.left;
            let y = touch.clientY - boardRect.top;
            let gridX = Math.floor(x / pieceWidth);
            let gridY = Math.floor(y / pieceHeight);
            
            // 边界检查
            if (gridX >= 0 && gridX < this.difficulty && gridY >= 0 && gridY < this.difficulty) {
                // 检查该格是否已被占用
                if (!this.findPieceOnBoard(gridX, gridY)) {
                    // 记录移动前的状态
                    const oldState = this.getPieceState(this.draggedPiece);
                    
                    // 执行移动
                    this.applyMove(this.draggedPiece, gridX, gridY);
                    
                    // 记录移动后的状态
                    const newState = this.getPieceState(this.draggedPiece);
                    
                    // 添加到命令栈
                    this.addCommand({
                        type: 'move',
                        piece: this.draggedPiece,
                        oldState: oldState,
                        newState: newState
                    });
                }
            }
        }
        
        piece.classList.remove('dragging');
        this.clearHighlight();
        this.draggedPiece = null;
    }

    // 高亮放置区域
    highlightDropZone(x, y) {
        this.clearHighlight();
        const pieceWidth = this.puzzleBoard.offsetWidth / this.difficulty;
        const pieceHeight = this.puzzleBoard.offsetHeight / this.difficulty;
        
        const highlight = document.createElement('div');
        highlight.className = 'drop-zone-highlight';
        highlight.style.position = 'absolute';
        highlight.style.left = `${x * pieceWidth}px`;
        highlight.style.top = `${y * pieceHeight}px`;
        highlight.style.width = `${pieceWidth}px`;
        highlight.style.height = `${pieceHeight}px`;
        highlight.style.border = '2px dashed #3498db';
        highlight.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '5';
        
        this.puzzleBoard.appendChild(highlight);
    }

    // 清除高亮
    clearHighlight() {
        const highlight = this.puzzleBoard.querySelector('.drop-zone-highlight');
        if (highlight) {
            highlight.remove();
        }
    }

    // 查找棋盘上指定格子的拼图块
    findPieceOnBoard(x, y) {
        const allPieces = this.puzzleBoard.querySelectorAll('.puzzle-piece');
        for (const piece of allPieces) {
            if (parseInt(piece.dataset.currentX) === x && parseInt(piece.dataset.currentY) === y) {
                return piece;
            }
        }
        return null;
    }

    // 获取拼图块状态
    getPieceState(piece) {
        return {
            element: piece,
            currentX: piece.dataset.currentX ? parseInt(piece.dataset.currentX) : null,
            currentY: piece.dataset.currentY ? parseInt(piece.dataset.currentY) : null,
            rotation: parseInt(piece.dataset.rotation) || 0,
            parent: piece.parentElement
        };
    }

    // 设置拼图块状态
    setPieceState(piece, state) {
        if (state.currentX !== null && state.currentY !== null) {
            piece.dataset.currentX = state.currentX;
            piece.dataset.currentY = state.currentY;
            piece.style.position = 'absolute';
            const pieceWidth = this.puzzleBoard.offsetWidth / this.difficulty;
            const pieceHeight = this.puzzleBoard.offsetHeight / this.difficulty;
            piece.style.left = `${state.currentX * pieceWidth}px`;
            piece.style.top = `${state.currentY * pieceHeight}px`;
            this.puzzleBoard.appendChild(piece);
        } else {
            delete piece.dataset.currentX;
            delete piece.dataset.currentY;
            piece.style.position = 'static';
            this.piecesZone.appendChild(piece);
        }
        
        piece.dataset.rotation = state.rotation;
        piece.style.transform = `rotate(${state.rotation}deg)`;
    }

    // 添加命令到栈
    addCommand(command) {
        // 如果当前不在栈顶，删除后面的命令
        if (this.commandIndex < this.commandStack.length - 1) {
            this.commandStack = this.commandStack.slice(0, this.commandIndex + 1);
        }
        
        this.commandStack.push(command);
        this.commandIndex++;
        
        // 限制栈大小
        if (this.commandStack.length > this.maxCommandStack) {
            this.commandStack.shift();
            this.commandIndex--;
        }
        
        this.moves++;
        this.updateUI();
        this.checkPuzzleCompletion();
    }

    // 撤销
    undo() {
        if (this.commandIndex < 0) return;
        
        const command = this.commandStack[this.commandIndex];
        this.setPieceState(command.piece, command.oldState);
        this.commandIndex--;
        this.updateUI();
        this.checkPuzzleCompletion();
    }

    // 重新开始游戏
    restartGame() {
        if (!this.gameStarted) return;
        
        // 将所有拼图块移回待选列表
        const allPieces = this.puzzleBoard.querySelectorAll('.puzzle-piece');
        allPieces.forEach(piece => {
            piece.style.position = 'static';
            delete piece.dataset.currentX;
            delete piece.dataset.currentY;
            piece.dataset.rotation = 0;
            piece.style.transform = 'rotate(0deg)';
            this.piecesZone.appendChild(piece);
        });
        
        // 清空命令栈（保持时间和移动次数不变）
        this.commandStack = [];
        this.commandIndex = -1;
        
        // 重新打乱拼图块
        this.shufflePieces();
        
        // 更新UI
        this.updateUI();
    }

    // 应用移动
    applyMove(piece, x, y) {
        piece.style.position = 'absolute';
        const pieceWidth = this.puzzleBoard.offsetWidth / this.difficulty;
        const pieceHeight = this.puzzleBoard.offsetHeight / this.difficulty;
        piece.style.left = `${x * pieceWidth}px`;
        piece.style.top = `${y * pieceHeight}px`;
        piece.dataset.currentX = x;
        piece.dataset.currentY = y;
        this.puzzleBoard.appendChild(piece);
    }

    // 应用旋转
    applyRotate(piece) {
        const currentRotation = parseInt(piece.dataset.rotation) || 0;
        const newRotation = (currentRotation + 90) % 360;
        piece.dataset.rotation = newRotation;
        piece.style.transform = `rotate(${newRotation}deg)`;
    }

    // 检查拼图是否完成
    checkPuzzleCompletion() {
        const allPieces = this.puzzleBoard.querySelectorAll('.puzzle-piece');
        if (allPieces.length !== this.difficulty * this.difficulty) return false;
        
        let completed = true;
        allPieces.forEach(piece => {
            const currentX = parseInt(piece.dataset.currentX);
            const currentY = parseInt(piece.dataset.currentY);
            const correctX = parseInt(piece.dataset.correctX);
            const correctY = parseInt(piece.dataset.correctY);
            const rotation = parseInt(piece.dataset.rotation) || 0;
            
            // 检查位置和角度
            if (currentX !== correctX || currentY !== correctY || rotation !== 0) {
                completed = false;
            }
        });
        
        if (completed && this.gameStarted) {
            this.gameStarted = false;
            this.clearTimer();
            const minutes = Math.floor(this.seconds / 60);
            const remainingSeconds = this.seconds % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            this.completeInfo.textContent = `你用了 ${timeString} 和 ${this.moves} 次移动完成了拼图！`;
            
            // 比较并保存最好成绩
            this.compareAndSaveBestScore();
            
            // 提交成绩到排行榜
            this.submitToRanking();
            setTimeout(() => {
                this.gameComplete.style.display = 'flex';
            }, 500);
        }
        
        return completed;
    }

    // 提交成绩到排行榜
    submitToRanking() {
        try {
            const userId = localStorage.getItem('userId');
            if (userId) {
                fetch('/ranking/record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        user_id: Number(userId), 
                        step_count: this.moves, 
                        time_used: this.seconds 
                    })
                }).catch(error => {
                    console.error('提交排行榜成绩失败:', error);
                });
            }
        } catch (e) {
            console.error('提交成绩失败:', e);
        }
    }

    // 获取游戏统计信息
    getStats() {
        return {
            moves: this.moves,
            time: this.seconds,
            difficulty: this.difficulty,
            completed: this.checkPuzzleCompletion()
        };
    }
}

// 创建游戏实例
const game = new PuzzleGame();

// 初始化背景
game.setPuzzleBg();

    // 比较并保存最好成绩
    compareAndSaveBestScore() {
        try {
            // 获取当前游戏的唯一标识（图片URL+难度）
            const gameKey = `${this.originalImageUrl}_${this.difficulty}`;
            
            // 从localStorage获取最好成绩
            const bestScores = JSON.parse(localStorage.getItem('puzzleBestScores') || '{}');
            const currentScore = {
                time: this.seconds,
                moves: this.moves,
                date: new Date().toISOString()
            };
            
            let isNewBest = false;
            let bestScoreInfo = '';
            
            // 如果没有历史成绩，或者当前成绩更好
            if (!bestScores[gameKey] || 
                this.seconds < bestScores[gameKey].time || 
                (this.seconds === bestScores[gameKey].time && this.moves < bestScores[gameKey].moves)) {
                
                bestScores[gameKey] = currentScore;
                localStorage.setItem('puzzleBestScores', JSON.stringify(bestScores));
                isNewBest = true;
                bestScoreInfo = '🎉 新的最好成绩！';
            } else {
                // 显示历史最好成绩
                const best = bestScores[gameKey];
                const bestMinutes = Math.floor(best.time / 60);
                const bestSeconds = best.time % 60;
                const bestTimeString = `${bestMinutes.toString().padStart(2, '0')}:${bestSeconds.toString().padStart(2, '0')}`;
                bestScoreInfo = `最好成绩: ${bestTimeString} 和 ${best.moves} 次移动`;
            }
            
            this.bestScoreInfo.textContent = bestScoreInfo;
        } catch (e) {
            console.error('保存最好成绩失败:', e);
        }
    }

    // 导出游戏实例供外部使用
}

// 创建游戏实例
const game = new PuzzleGame();

// 导出游戏实例供外部使用
window.puzzleGame = game;

// 页面加载完成后的初始化
window.addEventListener('DOMContentLoaded', function() {
    const customImage = localStorage.getItem('customImage');
    const customSize = localStorage.getItem('customSize');
    if (customImage && customSize) {
        game.originalImageUrl = customImage;
        game.difficulty = parseInt(customSize);
        game.setPuzzleBg();
        game.startGame();
        localStorage.removeItem('customImage');
        localStorage.removeItem('customSize');
    } else {
        game.setPuzzleBg();
    }
});