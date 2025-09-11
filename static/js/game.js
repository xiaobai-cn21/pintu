// 游戏状态管理
class PuzzleGame {
    init({ img, size, shape, randomRotation, randomFlip }) {
        this.originalImageUrl = img;
        this.difficulty = parseInt(size);
        if (shape) this.shape = shape;
        // 支持随机旋转/翻转配置
        if (typeof randomRotation !== 'undefined') {
            localStorage.setItem('randomRotation', randomRotation);
        }
        if (typeof randomFlip !== 'undefined') {
            localStorage.setItem('randomFlip', randomFlip);
        }
        this.setPuzzleBg();
        this.startGame();
    }
    
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
    
    sendWinMessage() {
        const roomId = new URLSearchParams(window.location.search).get('room_id');
        if (window.socket && roomId) {
            window.socket.emit('pvp_win', {
                room_id: roomId,
                username: localStorage.getItem('pvp_username') || '玩家',
                moves: this.moves,
                time: this.seconds
            });
        }
    }

    async saveProgressToDB() {
        const piecesOnBoard = Array.from(this.puzzleBoard.querySelectorAll('.puzzle-piece')).map(piece => ({
            correctX: piece.dataset.correctX,
            correctY: piece.dataset.correctY,
            currentX: piece.dataset.currentX,
            currentY: piece.dataset.currentY,
            rotation: piece.dataset.rotation
        }));
        const userId = localStorage.getItem('userId');
        const puzzleId = localStorage.getItem('puzzleId');
        if (!userId || !puzzleId) return;

        await fetch('/pic/save_progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                puzzle_id: puzzleId,
                progress_json: JSON.stringify(piecesOnBoard)
            })
        });
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
        this.playAgainBtn = document.getElementById('playAgainBtn');
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
        this.toggleBgBtn.addEventListener('click', () => this.toggleBg());
        // 新增保存按钮事件
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProgressToDB());
        }
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
    
    async restoreProgressFromDB() {
        const userId = localStorage.getItem('userId');
        const puzzleId = localStorage.getItem('puzzleId');
        if (!userId || !puzzleId) return;
        
        const res = await fetch(`/pic/get_progress?user_id=${userId}&puzzle_id=${puzzleId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.progress_json) return;
        const piecesOnBoard = JSON.parse(data.progress_json);

        piecesOnBoard.forEach(saved => {
            const piece = this.pieces.find(p =>
                p.dataset.correctX == saved.correctX &&
                p.dataset.correctY == saved.correctY
            );
            if (piece) {
                piece.dataset.currentX = saved.currentX;
                piece.dataset.currentY = saved.currentY;
                piece.dataset.rotation = saved.rotation;
                piece.style.transform = `rotate(${saved.rotation}deg)`;
                piece.style.position = 'absolute';
                const pieceWidth = this.puzzleBoard.offsetWidth / this.difficulty;
                const pieceHeight = this.puzzleBoard.offsetHeight / this.difficulty;
                piece.style.left = `${saved.currentX * pieceWidth}px`;
                piece.style.top = `${saved.currentY * pieceHeight}px`;
                this.puzzleBoard.appendChild(piece);
            }
        });
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
    async createPuzzlePieces() {
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
        await this.restoreProgressFromDB();
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
        this.saveProgressToDB();
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
        emitMyMoves()
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
            this.sendWinMessage(); // 调用上面的方法
            this.clearTimer();
            const minutes = Math.floor(this.seconds / 60);
            const remainingSeconds = this.seconds % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            this.completeInfo.textContent = `你用了 ${timeString} 和 ${this.moves} 次移动完成了拼图！`;
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
            const token = localStorage.getItem('puzzleToken');
            if (!userId || !token) {
                console.warn('未登录或Token缺失，无法提交成绩');
                return;
            }

            fetch('/ranking/record', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer `+localStorage.getItem('puzzleToken') 
                },
                body: JSON.stringify({ 
                    user_id: Number(userId), 
                    level_id: Number(this.levelId),
                    step_count: this.moves, 
                    time_used: this.seconds 
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        // 检测token过期错误
                        if (err.msg && err.msg.includes('Token has expired')) {
                            localStorage.removeItem('puzzleToken');
                            localStorage.removeItem('userId');
                            alert('登录已过期，请重新登录');
                            window.location.href = '/';
                            throw new Error('登录已过期');
                        }
                        throw new Error(`后端错误：${err.msg || '未知错误'}`);
                    });
                }
                return response.json();
            })
            .then(result => {
                console.log('成绩提交成功:', result);
            })
            .catch(error => {
                if (error.message !== '登录已过期') {
                    console.error('提交排行榜成绩失败:', error.message);
                }
            });
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