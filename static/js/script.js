const puzzleBoard = document.getElementById('puzzleBoard');
const piecesZone = document.getElementById('piecesZone');
//const imageUpload = document.getElementById('imageUpload');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
//const difficultySelect = document.getElementById('difficultySelect');
const timerElement = document.getElementById('timer');
const movesElement = document.getElementById('moves');
const gameComplete = document.getElementById('gameComplete');
const completeInfo = document.getElementById('completeInfo');
// 添加撤销按钮事件监听（在现有事件监听区域）
undoBtn.addEventListener('click', undo);
restartBtn.addEventListener('click', resetGame);
const playAgainBtn = document.getElementById('playAgainBtn');
const puzzleBg = document.getElementById('puzzleBg');
const toggleBgBtn = document.getElementById('toggleBgBtn');
//SVG 定义容器
const svgDefs = document.getElementById('puzzle-defs');
// 在现有变量声明中添加命令栈相关变量
let commandStack = [];       // 命令栈，存储所有操作
let currentCommandIndex = -1; // 当前命令索引
let pieces = [];
let difficulty = 4;
let timerInterval;
let seconds = 0;
let moves = 0;
let gameStarted = false;
let originalImageUrl = '../puzzle-image.jpg'; // Imagen por defecto
let draggedPiece = null;
let bgVisible = true;
let shape = 'square'; // 默认为方形
let coveredWidth, coveredHeight, offsetX, offsetY;
let boardRect;
let customFollower = null;
//连接头的大小比例
const JIGSAW_TAB_RATIO = 0.3;
// 定义命令基类
class Command {
    execute() {}
    undo() {}
}

// 事件监听器
//imageUpload.addEventListener('change', handleImageUpload);
//startBtn.addEventListener('click', startGame);
//resetBtn.addEventListener('click', resetGame);
//difficultySelect.addEventListener('change', () => {
//    difficulty = parseInt(difficultySelect.value);
//});
playAgainBtn.addEventListener('click', () => {
    gameComplete.style.display = 'none';
    resetGame();
});
toggleBgBtn.addEventListener('click', toggleBg);
// 移动拼图块命令
class MoveCommand extends Command {
    constructor(piece, fromParent, fromRect, toParent, toRect, fromX, fromY, toX, toY) {
        super();
        this.piece = piece;
        this.fromParent = fromParent;
        this.fromRect = fromRect; // 包含left, top, position, margin等样式
        this.toParent = toParent;
        this.toRect = toRect;
        this.fromX = fromX; // 之前的网格坐标
        this.fromY = fromY;
        this.toX = toX;     // 新的网格坐标
        this.toY = toY;
    }

    execute() {
        // 执行移动（已经在原函数中处理）
    }

    undo() {
        // 将拼图块移回原来的位置和父容器
        this.piece.style.position = this.fromRect.position;
        this.piece.style.left = this.fromRect.left;
        this.piece.style.top = this.fromRect.top;
        this.piece.style.margin = this.fromRect.margin || '';

        if (this.fromX !== undefined) {
            this.piece.dataset.currentX = this.fromX;
            this.piece.dataset.currentY = this.fromY;
        } else {
            delete this.piece.dataset.currentX;
            delete this.piece.dataset.currentY;
        }

        this.fromParent.appendChild(this.piece);
    }
}

// 旋转拼图块命令
class RotateCommand extends Command {
    constructor(piece, previousRotation, previousVisualRotation, previousRect) {
        super();
        this.piece = piece;
        this.previousRotation = previousRotation;
        this.previousVisualRotation = previousVisualRotation;
        this.previousRect = previousRect; // 记录之前的位置信息
    }

    undo() {
        // 恢复逻辑和视觉角度
        this.piece.dataset.rotation = this.previousRotation;
        this.piece.dataset.visualRotation = this.previousVisualRotation;

        // 恢复transform
        const isFlipped = this.piece.dataset.flipped === 'true';
        this.piece.style.transform = `rotate(${this.previousVisualRotation}deg) scaleX(${isFlipped ? -1 : 1})`;

        // 【关键】如果之前有位置信息，则一并恢复
        if (this.previousRect) {
            this.piece.style.left = this.previousRect.left;
            this.piece.style.top = this.previousRect.top;
        }
    }
}

// 翻转拼图块命令
class FlipCommand extends Command {
    constructor(piece, previousFlipped, visualRotation, previousRect) {
        super();
        this.piece = piece;
        this.previousFlipped = previousFlipped;
        this.visualRotation = visualRotation;
        this.previousRect = previousRect; // 记录之前的位置信息
    }

    undo() {
        this.piece.dataset.flipped = this.previousFlipped;

        // 恢复transform
        this.piece.style.transform = `rotate(${this.visualRotation}deg) scaleX(${this.previousFlipped ? -1 : 1})`;

        if (this.previousRect) {
            this.piece.style.left = this.previousRect.left;
            this.piece.style.top = this.previousRect.top;
        }
    }
}

// 添加命令到命令栈
function pushCommand(command) {
    // 如果有未执行的命令，清除它们
    if (currentCommandIndex < commandStack.length - 1) {
        commandStack = commandStack.slice(0, currentCommandIndex + 1);
    }

    commandStack.push(command);
    currentCommandIndex = commandStack.length - 1;
}

// 撤销操作
function undo() {
    if (currentCommandIndex >= 0) {
        const command = commandStack[currentCommandIndex];
        command.undo();
        currentCommandIndex--;

        // 更新移动次数（撤销操作减少移动次数）
        moves--;
        movesElement.textContent = `移动次数: ${moves}`;

        // 检查拼图状态
       // setTimeout(checkPuzzleCompletion, 50);
    }
}

// 修改旋转函数，添加命令记录
function rotatePiece(piece) {
    console.log('rotatePiece 函数被调用:', piece);
    const currentRotation = parseInt(piece.dataset.rotation) || 0;
    let currentVisualRotation = parseInt(piece.dataset.visualRotation);
    if (isNaN(currentVisualRotation)) {
        currentVisualRotation = currentRotation;
    }

    console.log('当前旋转角度:', currentRotation, '视觉旋转角度:', currentVisualRotation);

    const previousRect = { left: piece.style.left, top: piece.style.top };
    const command = new RotateCommand(piece, currentRotation, currentVisualRotation, previousRect);

    const newRotation = (currentRotation + 90) % 360;
    const newVisualRotation = currentVisualRotation + 90;
    piece.dataset.rotation = newRotation;
    piece.dataset.visualRotation = newVisualRotation;

    console.log('新旋转角度:', newRotation, '新视觉旋转角度:', newVisualRotation);

    const isFlipped = piece.dataset.flipped === 'true';
    piece.style.transform = `rotate(${newVisualRotation}deg) scaleX(${isFlipped ? -1 : 1})`;

    console.log('应用变换:', piece.style.transform);

    if (piece.dataset.currentX !== undefined && piece.dataset.currentY !== undefined) {
        const gridX = parseInt(piece.dataset.currentX);
        const gridY = parseInt(piece.dataset.currentY);
        const newPos = calculatePieceFinalPosition(piece, gridX, gridY);
        if (newPos) {
            piece.style.left = newPos.finalLeft;
            piece.style.top = newPos.finalTop;
        }
    }

    pushCommand(command);
    moves++;
    movesElement.textContent = `移动次数: ${moves}`;

    // 【关键修复】操作结束后，延迟一小段时间再检查是否完成
    setTimeout(checkPuzzleCompletion, 50);
}

// 修改翻转函数，添加命令记录
function flipPiece(piece) {
    console.log('flipPiece 函数被调用:', piece);
    const isFlipped = piece.dataset.flipped === 'true';
    let visualRotation = parseInt(piece.dataset.visualRotation);
    if (isNaN(visualRotation)) {
        visualRotation = parseInt(piece.dataset.rotation) || 0;
    }

    console.log('当前翻转状态:', isFlipped, '视觉旋转角度:', visualRotation);

    const previousRect = { left: piece.style.left, top: piece.style.top };
    const command = new FlipCommand(piece, isFlipped, visualRotation, previousRect);

    const newFlipped = !isFlipped;
    piece.dataset.flipped = newFlipped;

    console.log('新翻转状态:', newFlipped);

    piece.style.transform = `rotate(${visualRotation}deg) scaleX(${newFlipped ? -1 : 1})`;

    console.log('应用变换:', piece.style.transform);

    if (piece.dataset.currentX !== undefined && piece.dataset.currentY !== undefined) {
        const gridX = parseInt(piece.dataset.currentX);
        const gridY = parseInt(piece.dataset.currentY);
        const newPos = calculatePieceFinalPosition(piece, gridX, gridY);
        if (newPos) {
            piece.style.left = newPos.finalLeft;
            piece.style.top = newPos.finalTop;
        }
    }

    pushCommand(command);
    moves++;
    movesElement.textContent = `移动次数: ${moves}`;

    // 【关键修复】操作结束后，延迟一小段时间再检查是否完成
    setTimeout(checkPuzzleCompletion, 50);
}

// 修复鼠标按下事件处理
function handleDragStart(e) {
    draggedPiece = this;
    e.dataTransfer.effectAllowed = 'move';

    // 记录初始位置
    const rect = this.getBoundingClientRect();
    initialX = e.clientX - rect.left;
    initialY = e.clientY - rect.top;

    // 添加拖拽样式
    setTimeout(() => {
        this.classList.add('dragging');
    }, 0);
}

// 处理图片上传
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            originalImageUrl = event.target.result;
            setPuzzleBg();
        };
        reader.readAsDataURL(file);
    }
}

// 设置背景
function setPuzzleBg(onReadyCallback) {
    console.log('开始设置拼图背景');
    console.log('originalImageUrl:', originalImageUrl);
    
    const img = new Image();
    img.onload = function() {
        console.log('图片加载成功');
        console.log('图片尺寸:', this.naturalWidth, 'x', this.naturalHeight);
        
        const boardWidth = puzzleBoard.offsetWidth;
        const boardHeight = puzzleBoard.offsetHeight;
        
        console.log('拼图板尺寸:', boardWidth, 'x', boardHeight);

        const imageAspectRatio = this.naturalWidth / this.naturalHeight;
        const boardAspectRatio = boardWidth / boardHeight;

        console.log('图片宽高比:', imageAspectRatio);
        console.log('拼图板宽高比:', boardAspectRatio);

        // 新的 'cover' 计算逻辑
        if (imageAspectRatio > boardAspectRatio) {
            // 图片比棋盘更"宽"，因此让图片高度适应棋盘高度，宽度会超出
            coveredHeight = boardHeight;
            coveredWidth = boardHeight * imageAspectRatio;
            offsetY = 0;
            offsetX = (boardWidth - coveredWidth) / 2; // X方向偏移量会是负数，使图片居中
        } else {
            // 图片比棋盘更"高"，因此让图片宽度适应棋盘宽度，高度会超出
            coveredWidth = boardWidth;
            coveredHeight = boardWidth / imageAspectRatio;
            offsetX = 0;
            offsetY = (boardHeight - coveredHeight) / 2; // Y方向偏移量会是负数，使图片居中
        }

        // 将计算结果应用到背景提示图
        puzzleBg.style.backgroundImage = `url(${originalImageUrl})`;
        puzzleBg.style.backgroundSize = `${coveredWidth}px ${coveredHeight}px`;
        puzzleBg.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
        puzzleBg.style.backgroundRepeat = 'no-repeat';

        if (onReadyCallback) {
            onReadyCallback();
        }
    };
    img.src = originalImageUrl;
}

// 切换背景显示/隐藏
function toggleBg() {
    bgVisible = !bgVisible;
    puzzleBg.style.opacity = bgVisible ? '0.25' : '0';
    toggleBgBtn.textContent = bgVisible ? '隐藏背景' : '显示背景';
}

// 开始游戏
function startGame() {
    console.log('开始游戏函数被调用');
    console.log('originalImageUrl:', originalImageUrl);
    console.log('difficulty:', difficulty);
    console.log('shape:', shape);
    
    gameStarted = true;
    moves = 0;
    seconds = 0;
    movesElement.textContent = `移动次数: ${moves}`;
    timerElement.textContent = `时间: 00:00`;
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    function checkAndLaunch() {
        console.log('检查puzzleBoard尺寸:', puzzleBoard.offsetWidth, 'x', puzzleBoard.offsetHeight);
        if (puzzleBoard.offsetWidth === 0) {
            console.log('puzzleBoard尺寸为0，等待下一帧');
            requestAnimationFrame(checkAndLaunch);
        } else {
            console.log('puzzleBoard尺寸正常，开始设置背景和创建拼图块');
            setPuzzleBg(() => {
                puzzleBg.style.opacity = bgVisible ? '0.25' : '0';
                toggleBgBtn.textContent = bgVisible ? '隐藏背景' : '显示背景';
                createPuzzlePieces();
            });
        }
    }
    checkAndLaunch();
}

// 重置游戏
function resetGame() {
      gameStarted = false;
    clearInterval(timerInterval);

    puzzleBoard.innerHTML = '';
    piecesZone.innerHTML = '';
    if (svgDefs) {
        svgDefs.innerHTML = '';
    }
    pieces = [];

    // 清空命令栈
    commandStack = [];
    currentCommandIndex = -1;

    startGame();
}

// 更新计时器
function updateTimer() {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerElement.textContent = `时间: ${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 暂停游戏（供外部调用：帮助弹窗）
function pauseGame() {
    if (gameStarted && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// 继续游戏（供外部调用：帮助弹窗）
function resumeGame() {
    if (gameStarted && !timerInterval) {
        timerInterval = setInterval(updateTimer, 1000);
    }
}

// 创建拼图块
function createPuzzlePieces() {
    console.log('开始创建拼图块');
    console.log('puzzleBoard尺寸:', puzzleBoard.offsetWidth, 'x', puzzleBoard.offsetHeight);
    console.log('difficulty:', difficulty);
    console.log('shape:', shape);
    
    puzzleBoard.innerHTML = '';
    piecesZone.innerHTML = '';
    if (svgDefs) svgDefs.innerHTML = '';
    pieces = [];

    const pieceWidth = puzzleBoard.offsetWidth / difficulty;
    const pieceHeight = puzzleBoard.offsetHeight / difficulty;
    
    console.log('拼图块尺寸:', pieceWidth, 'x', pieceHeight);
    
    // 从 localStorage 获取随机选项
    const randomRotation = localStorage.getItem('randomRotation') === 'true';
    const randomFlip = localStorage.getItem('randomFlip') === 'true';
    
    console.log('随机选项 - rotation:', randomRotation, 'flip:', randomFlip);

    if (shape === 'square') {
        console.log('创建方形拼图块');
        for (let y = 0; y < difficulty; y++) {
            for (let x = 0; x < difficulty; x++) {
                createSquarePiece(x, y, pieceWidth, pieceHeight);
            }
        }
    } else if (shape === 'triangle') {
        console.log('创建三角形拼图块');
        for (let y = 0; y < difficulty; y++) {
            for (let x = 0; x < difficulty; x++) {
                if ((x + y) % 2 === 0) {
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'top-right');
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'bottom-left');
                } else {
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'top-left');
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'bottom-right');
                }
            }
        }
    } else if (shape === 'jigsaw') {
        const layout = generateJigsawLayout();
        for (let y = 0; y < difficulty; y++) {
            for (let x = 0; x < difficulty; x++) {
                createJigsawPiece(x, y, pieceWidth, pieceHeight, layout[y][x]);
            }
        }
    }

    shufflePieces();
    pieces.forEach(piece => {
        // 随机旋转 (0, 90, 180, 270度)
        if (randomRotation) {
            const rotations = [0, 90, 180, 270];
            const randomRotationValue = rotations[Math.floor(Math.random() * rotations.length)];
            piece.dataset.rotation = randomRotationValue;
        }

        // 随机翻转
        if (randomFlip) {
            const shouldFlip = Math.random() < 0.5; // 50% 概率翻转
            piece.dataset.flipped = shouldFlip;
        }

        // 应用变换
        const rotation = parseInt(piece.dataset.rotation) || 0;
        const isFlipped = piece.dataset.flipped === 'true';
        piece.style.transform = `rotate(${rotation}deg) scaleX(${isFlipped ? -1 : 1})`;
    });

    pieces.forEach(piece => {
        if (shape === 'jigsaw') {
            piece.style.margin = `${(pieceHeight * JIGSAW_TAB_RATIO) / 2}px`;
        }
        piecesZone.appendChild(piece);
    });

    // --- 关键修复：确保每次创建时都重新绑定事件监听器 ---
    puzzleBoard.addEventListener('dragover', dragOver);
    puzzleBoard.addEventListener('drop', dropOnBoard);
    piecesZone.addEventListener('dragover', dragOver);
    piecesZone.addEventListener('drop', dropOnZone);
}

// 打乱拼图块
function shufflePieces() {
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
}

// 拖拽相关函数
function dragStart(e, clientX, clientY, piece) {
    // 支持移动端参数
    if (piece) {
        draggedPiece = piece;
    } else {
        draggedPiece = this;
    }
    
    // 支持移动端坐标
    const x = clientX || e.clientX;
    const y = clientY || e.clientY;

    const piecesOnBoard = puzzleBoard.querySelectorAll('.puzzle-piece');
    // 遍历它们
    piecesOnBoard.forEach(p => {
        if (p !== draggedPiece) {
            p.style.pointerEvents = 'none';
        }
    });

    customFollower = draggedPiece.cloneNode(true);
    customFollower.id = 'custom-follower';
    customFollower.style.position = 'fixed';
    customFollower.style.pointerEvents = 'none';
    customFollower.style.zIndex = '9999';

    const rect = draggedPiece.getBoundingClientRect();
    customFollower.offsetX = x - rect.left;
    customFollower.offsetY = y - rect.top;

    document.body.appendChild(customFollower);
    pieceDrag(e);

    // 添加鼠标移动事件监听（火狐浏览器兼容）
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drag', pieceDrag);

    const transparentPixel = new Image();
    transparentPixel.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(transparentPixel, 0, 0);

    setTimeout(() => {
        this.style.visibility = 'hidden';
    }, 0);

    e.dataTransfer.setData('text/plain', '');
}

function dragEnd(e, clientX, clientY, piece) {
    // 支持移动端参数
    const x = clientX || (e && e.clientX);
    const y = clientY || (e && e.clientY);

    const hint = document.getElementById('drop-hint');
    if (hint) {
        hint.style.display = 'none';
    }

    const allPieces = document.querySelectorAll('.puzzle-piece');
    allPieces.forEach(p => {
        p.style.pointerEvents = 'auto';
    });

    // 移除事件监听器（火狐浏览器兼容）
    document.removeEventListener('dragover', handleDragOver);
    document.removeEventListener('drag', pieceDrag);

    if (draggedPiece) {
        draggedPiece.classList.remove('dragging');
        draggedPiece.style.visibility = 'visible';
        
        // 移动端拖拽结束处理
        if (x !== undefined && y !== undefined) {
            // 检查是否拖拽到拼图板上
            const boardRect = puzzleBoard.getBoundingClientRect();
            if (x >= boardRect.left && x <= boardRect.right && 
                y >= boardRect.top && y <= boardRect.bottom) {
                // 计算网格位置
                const pieceWidth = boardRect.width / difficulty;
                const pieceHeight = boardRect.height / difficulty;
                const gridX = Math.floor((x - boardRect.left) / pieceWidth);
                const gridY = Math.floor((y - boardRect.top) / pieceHeight);
                
                // 检查位置是否有效
                if (gridX >= 0 && gridX < difficulty && gridY >= 0 && gridY < difficulty) {
                    dropOnBoard(draggedPiece, gridX, gridY);
                } else {
                    // 拖拽到无效位置，返回原位置
                    draggedPiece.style.position = '';
                    draggedPiece.style.left = '';
                    draggedPiece.style.top = '';
                }
            } else {
                // 拖拽到拼图板外，返回原位置
                draggedPiece.style.position = '';
                draggedPiece.style.left = '';
                draggedPiece.style.top = '';
            }
        }
    }
    if (customFollower) {
        document.body.removeChild(customFollower);
        customFollower = null;
    }

    // 确保在每次拖拽结束后检查是否完成
    setTimeout(checkPuzzleCompletion, 500); // 增加延迟，确保动画完成后再检测
}

// 添加拖拽过程中的吸附提示
function dragOver(e) {
    e.preventDefault();
}

// 火狐浏览器专用的拖拽处理函数
function handleDragOver(e) {
    e.preventDefault();
    if (customFollower && draggedPiece) {
        pieceDrag(e);
    }
}
// 拖拽到棋盘
function dropOnBoard(piece, gridX, gridY) {
    // 支持移动端参数
    if (typeof piece === 'object' && piece.preventDefault) {
        // 桌面端调用
        piece.preventDefault();
        if (!draggedPiece) return;
        
        const fromParent = draggedPiece.parentNode;
        const fromRect = { position: draggedPiece.style.position, left: draggedPiece.style.left, top: draggedPiece.style.top, margin: draggedPiece.style.margin };
        const fromX = draggedPiece.dataset.currentX;
        const fromY = draggedPiece.dataset.currentY;

        const pieceWidth = puzzleBoard.offsetWidth / difficulty;
        const pieceHeight = puzzleBoard.offsetHeight / difficulty;
        const boardRect = puzzleBoard.getBoundingClientRect();

        let x = piece.clientX - boardRect.left;
        let y = piece.clientY - boardRect.top;
        let gridX = Math.floor(x / pieceWidth);
        let gridY = Math.floor(y / pieceHeight);
        
        piece = draggedPiece;
    } else {
        // 移动端调用
        if (!piece) return;
        draggedPiece = piece;
    }
    gridX = Math.max(0, Math.min(gridX, difficulty - 1));
    gridY = Math.max(0, Math.min(gridY, difficulty - 1));

    console.log(`[1. 目标位置] 尝试放置到棋盘网格: (${gridX}, ${gridY})`);

    let canPlace = false;

    // --- 诊断正在拖拽的块 ---
    console.log(`[2. 拖拽块信息]`, {
        '原始形状': draggedPiece.dataset.type,
        '当前旋转角度': parseInt(draggedPiece.dataset.rotation) || 0,
        '是否翻转': draggedPiece.dataset.flipped === 'true',
        '计算后的有效形状': getEffectivePieceType(draggedPiece)
    });

    const piecesInTargetCell = Array.from(
        puzzleBoard.querySelectorAll(`[data-current-x='${gridX}'][data-current-y='${gridY}']`)
    ).filter(p => p !== draggedPiece);

    console.log(`[3. 目标格检查] 目标格中发现 ${piecesInTargetCell.length} 个【其他】拼图块。`);

    if (shape === 'triangle') {
        // --- 三角形逻辑 (保持不变) ---
        if (piecesInTargetCell.length === 0) {
            console.log('[4. 判断] 目标格为空。判定：【可以放置】');
            canPlace = true;
        } else if (piecesInTargetCell.length === 1) {
            console.log('[4. 判断] 目标格已有1个块，开始进行兼容性检查...');
            const existingPiece = piecesInTargetCell[0];

            console.log(`   - [4a. 已有块信息]`, {
                '原始形状': existingPiece.dataset.type,
                '当前旋转角度': parseInt(existingPiece.dataset.rotation) || 0,
                '是否翻转': existingPiece.dataset.flipped === 'true',
                '计算后的有效形状': getEffectivePieceType(existingPiece)
            });

            const draggedPieceEffectiveType = getEffectivePieceType(draggedPiece);
            const existingPieceEffectiveType = getEffectivePieceType(existingPiece);

            const isCompatible =
                (draggedPieceEffectiveType === 'top-left' && existingPieceEffectiveType === 'bottom-right') ||
                (draggedPieceEffectiveType === 'bottom-right' && existingPieceEffectiveType === 'top-left') ||
                (draggedPieceEffectiveType === 'top-right' && existingPieceEffectiveType === 'bottom-left') ||
                (draggedPieceEffectiveType === 'bottom-left' && existingPieceEffectiveType === 'top-right');

            console.log(`   - [4b. 兼容性结果] 拖拽块(${draggedPieceEffectiveType}) + 已有块(${existingPieceEffectiveType}) => 是否兼容: ${isCompatible}`);

            if (isCompatible) {
                console.log('   - [4c. 结论] 两个块兼容。判定：【可以放置】');
                canPlace = true;
            } else {
                console.log('   - [4c. 结论] 两个块不兼容。判定：【不可放置】');
            }
        } else {
             console.log('[4. 判断] 目标格已满。判定：【不可放置】');
        }
    } else {
        // --- 【关键修复】方形和 Jigsaw 块的逻辑 ---
        // 只有当目标格子为空时，才允许放置
        if (piecesInTargetCell.length === 0) {
            console.log('[4. 判断] 目标格为空。判定：【可以放置】');
            canPlace = true;
        } else {
            console.log(`[4. 判断] 目标格已有 ${piecesInTargetCell.length} 个块。判定：【不可放置】`);
            // canPlace 默认为 false，无需显式设置
        }
    }

    console.log(`[5. 最终决定] 是否可以放置: ${canPlace}`);
    console.groupEnd();

    // --- 以下是原有的执行逻辑，保持不变 ---
    if (canPlace) {
        const pos = calculatePieceFinalPosition(draggedPiece, gridX, gridY);
        if (pos) {
            draggedPiece.style.margin = '0';
            const toRect = { position: "absolute", left: pos.finalLeft, top: pos.finalTop, margin: '0' };
            const command = new MoveCommand(draggedPiece, fromParent, fromRect, puzzleBoard, toRect, fromX, fromY, gridX, gridY);
            pushCommand(command);
            draggedPiece.style.position = "absolute";
            draggedPiece.style.left = pos.finalLeft;
            draggedPiece.style.top = pos.finalTop;
            draggedPiece.dataset.currentX = gridX;
            draggedPiece.dataset.currentY = gridY;
            puzzleBoard.appendChild(draggedPiece);
            moves++;
            movesElement.textContent = `移动次数: ${moves}`;
        }
    } else {
        returnToZone(draggedPiece, fromParent === piecesZone);
    }
}


// 拖拽回piecesZone
function dropOnZone(e) {
    e.preventDefault();
    if (!draggedPiece) return;
    draggedPiece.style.position = 'static';
    // 保存移动前的状态
    const fromParent = draggedPiece.parentNode;
    const fromRect = {
        position: draggedPiece.style.position,
        left: draggedPiece.style.left,
        top: draggedPiece.style.top,
        margin: draggedPiece.style.margin
    };
    const fromX = draggedPiece.dataset.currentX;
    const fromY = draggedPiece.dataset.currentY;


    draggedPiece.style.left = '';
    draggedPiece.style.top = '';

    if (shape === 'jigsaw') { // 放回去时恢复 margin
        const pieceHeight = puzzleBoard.offsetHeight / difficulty;
        draggedPiece.style.margin = `${(pieceHeight * JIGSAW_TAB_RATIO) / 2}px`;
    }
 const toRect = {
        position: 'static',
        left: '',
        top: '',
        margin: draggedPiece.style.margin
    };

    // 创建移动命令并推入栈
    const command = new MoveCommand(
        draggedPiece,
        fromParent,
        fromRect,
        piecesZone,
        toRect,
        fromX,
        fromY,
        undefined,
        undefined
    );
    pushCommand(command);
    delete draggedPiece.dataset.currentX;
    delete draggedPiece.dataset.currentY;
    delete draggedPiece.dataset.position;
    piecesZone.appendChild(draggedPiece);
    moves++;
    movesElement.textContent = `移动次数: ${moves}`;
    //draggedPiece = null;
}

// 查找棋盘上指定格子的拼图块
function findPieceOnBoard(x, y) {
    return puzzleBoard.querySelector(`.puzzle-piece[data-current-x='${x}'][data-current-y='${y}']`);
}

// 修复拼图完成检测及提示功能
function checkPuzzleCompletion() {
    const piecesOnBoard = puzzleBoard.querySelectorAll('.puzzle-piece');

    const totalPieces = shape === 'triangle'
        ? difficulty * difficulty * 2
        : difficulty * difficulty;

    if (piecesOnBoard.length !== totalPieces) {
        return false;
    }

    let allCorrect = true;

    piecesOnBoard.forEach(piece => {
        const pieceX = parseInt(piece.dataset.currentX);
        const pieceY = parseInt(piece.dataset.currentY);
        const correctX = parseInt(piece.dataset.correctX);
        const correctY = parseInt(piece.dataset.correctY);

        // 1. 检查位置是否正确
        if (pieceX !== correctX || pieceY !== correctY) {
            allCorrect = false;
        }

        // 2. 【关键修复】对所有类型的拼图块都检查旋转和翻转
        //    (移除了外层的 if (shape === ...) 判断)
        const rotation = parseInt(piece.dataset.rotation) || 0;
        const isFlipped = piece.dataset.flipped === 'true';

        if (rotation !== 0 || isFlipped) {
            allCorrect = false;
        }
    });

    // 如果全部正确且尚未显示完成提示
    if (allCorrect && !document.getElementById('completion-message')) {
        clearInterval(timerInterval); // 停止计时器
        // 提交关卡成绩（需要登录）
        submitLevelRecord().finally(() => {
            // 提交排行榜（游客也可尝试）
            submitToRanking();
            showCompletionMessage();
        });
        return true;
    }

    return allCorrect;
}

// 显示完成提示信息
function showCompletionMessage() {
    // 创建提示容器
    const messageContainer = document.createElement('div');
    messageContainer.id = 'completion-message';
    messageContainer.style.position = 'fixed';
    messageContainer.style.top = '50%';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translate(-50%, -50%)';
    messageContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    messageContainer.style.color = 'white';
    messageContainer.style.padding = '2rem';
    messageContainer.style.borderRadius = '10px';
    messageContainer.style.textAlign = 'center';
    messageContainer.style.zIndex = '1000';
    messageContainer.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    messageContainer.style.animation = 'fadeIn 0.5s ease-out';

    // 添加标题
    const title = document.createElement('h2');
    title.textContent = '恭喜你完成拼图！';
    title.style.marginTop = '0';
    title.style.fontSize = '2rem';

    // 添加移动次数信息
    const movesInfo = document.createElement('p');
    movesInfo.textContent = `你用了 ${moves} 步完成挑战！`;
    movesInfo.style.fontSize = '1.2rem';
    // 计算并显示用时
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    // 添加时间信息
    const timeInfo = document.createElement('p');
    timeInfo.textContent = `用时: ${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    timeInfo.style.fontSize = '1.2rem';

    // 添加重新开始按钮
    const restartBtn = document.createElement('button');
    restartBtn.textContent = '再玩一次';
    restartBtn.style.marginTop = '1rem';
    restartBtn.style.padding = '0.8rem 1.5rem';
    restartBtn.style.fontSize = '1rem';
    restartBtn.style.backgroundColor = '#4CAF50';
    restartBtn.style.color = 'white';
    restartBtn.style.border = 'none';
    restartBtn.style.borderRadius = '5px';
    restartBtn.style.cursor = 'pointer';
    restartBtn.addEventListener('click', () => {
        document.body.removeChild(messageContainer);
        resetGame(); // 假设存在重置拼图的函数
    });

    // 组装提示信息
    messageContainer.appendChild(title);
    messageContainer.appendChild(timeInfo);  // 添加时间显示
    messageContainer.appendChild(movesInfo);
    messageContainer.appendChild(restartBtn);

    // 添加到页面
    document.body.appendChild(messageContainer);

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
    `;
    messageContainer.appendChild(style);

    // 播放完成音效（如果有）
    if (typeof playCompletionSound === 'function') {
        playCompletionSound();
    }
}

// 触摸设备支持
function touchStart(e) {
    e.preventDefault();
    draggedPiece = this;
    this.classList.add('dragging');
    const touch = e.touches[0];
    this.touchOffsetX = touch.clientX;
    this.touchOffsetY = touch.clientY;
}

function touchMove(e) {
    e.preventDefault();
    if (!draggedPiece) return;
}

function touchEnd(e) {
    if (!draggedPiece) return;
    draggedPiece.classList.remove('dragging');
    draggedPiece = null;
}


// 移动端检测
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
}

// 移动端触摸事件处理
function initMobileSupport() {
    if (!isMobile()) return;
    
    console.log('移动端触摸支持已启用');
    
    // 为所有拼图块添加移动端事件监听器
    document.addEventListener('mobileDragStart', function(e) {
        const piece = e.detail.element;
        dragStart(e.detail.clientX, e.detail.clientY, piece);
    });
    
    document.addEventListener('mobileDragMove', function(e) {
        const piece = e.detail.element;
        pieceDrag(e.detail.clientX, e.detail.clientY, piece);
    });
    
    document.addEventListener('mobileDragEnd', function(e) {
        const piece = e.detail.element;
        dragEnd(e.detail.clientX, e.detail.clientY, piece);
    });
    
    // 移动端旋转事件
    document.addEventListener('mobileRotate', function(e) {
        console.log('script.js 收到旋转事件:', e);
        const piece = e.detail.element;
        console.log('旋转拼图块:', piece);
        rotatePiece(piece);
    });
    
    // 移动端翻转事件
    document.addEventListener('mobileFlip', function(e) {
        console.log('script.js 收到翻转事件:', e);
        const piece = e.detail.element;
        console.log('翻转拼图块:', piece);
        flipPiece(piece);
    });
    
    // 移动端放置事件
    document.addEventListener('mobileDropOnBoard', function(e) {
        const piece = e.detail.element;
        const gridX = e.detail.gridX;
        const gridY = e.detail.gridY;
        dropOnBoard(piece, gridX, gridY);
    });
}

window.addEventListener('DOMContentLoaded', function() {
    // 初始化移动端支持
    initMobileSupport();
    
    console.log('游戏页面加载完成');
    console.log('puzzleBoard元素:', puzzleBoard);
    console.log('piecesZone元素:', piecesZone);
    
    const customImage = localStorage.getItem('customImage');
    const customSize = localStorage.getItem('customSize');
    //获取形状
    const customShape = localStorage.getItem('customShape');
    
    console.log('localStorage数据:');
    console.log('- customImage:', customImage);
    console.log('- customSize:', customSize);
    console.log('- customShape:', customShape);

    if (customImage && customSize) {
        console.log('使用自定义图片和尺寸开始游戏');
        originalImageUrl = customImage;
        difficulty = parseInt(customSize);
        if (customShape) shape = customShape;
        //setPuzzleBg();
        startGame();
        localStorage.removeItem('customImage');
        localStorage.removeItem('customSize');
        localStorage.removeItem('customShape'); // 清除
    } else if (customImage && !customSize) {
        console.log('使用自定义图片，默认4x4开始游戏');
        // 仅有图片（来自 AI 页），默认 4x4 方形
        originalImageUrl = customImage;
        difficulty = 4;
        startGame();
        localStorage.removeItem('customImage');
    } else {
        console.log("没有找到拼图数据，请从预览页面开始游戏。");
        puzzleBoard.innerHTML = '<p style="text-align:center; color:#666; margin-top: 40px;">请先选择一张图片来创建拼图</p>';

        // 禁用不需要的按钮
        if(resetBtn) resetBtn.disabled = true;
        if(toggleBgBtn) toggleBgBtn.disabled = true;
        
        // 添加测试按钮
        const testBtn = document.createElement('button');
        testBtn.textContent = '测试拼图（使用默认图片）';
        testBtn.className = 'btn';
        testBtn.style.marginTop = '20px';
        testBtn.onclick = function() {
            console.log('开始测试拼图');
            originalImageUrl = '../static/images/background1.png';
            difficulty = 4;
            shape = 'square';
            startGame();
            testBtn.remove();
        };
        puzzleBoard.appendChild(testBtn);
    }
});

// 创建方形拼图块
function createSquarePiece(x, y, width, height) {
    console.log(`创建方形拼图块 (${x}, ${y})`);
    
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece square';
    
    // 移动端特殊处理：确保拼图块尺寸正确
    if (isMobile()) {
        console.log('移动端拼图块创建，尺寸:', width, 'x', height);
        // 移动端使用固定像素值，避免CSS calc()冲突
        piece.style.width = `${width}px`;
        piece.style.height = `${height}px`;
    } else {
        piece.style.width = `${width}px`;
        piece.style.height = `${height}px`;
    }
    
    piece.style.backgroundImage = `url(${originalImageUrl})`;

    // 使用新的全局变量来设置背景，确保比例正确
    piece.style.backgroundSize = `${coveredWidth}px ${coveredHeight}px`;
    const bgPosX = -(x * width) + offsetX;
    const bgPosY = -(y * height) + offsetY;
    piece.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;

    piece.dataset.correctX = x;
    piece.dataset.correctY = y;

    piece.dataset.rotation = '0'; // 增加默认值
    piece.dataset.flipped = 'false'; // 增加默认值

    piece.draggable = true;
    setupPieceEvents(piece);
    pieces.push(piece);
}

// 创建三角形拼图块
function createTrianglePiece(x, y, width, height, type) {
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece triangle';
    piece.style.width = `${width}px`;
    piece.style.height = `${height}px`;
    piece.style.backgroundImage = `url(${originalImageUrl})`;

    // 注意：这里移除了多余的、不正确的 backgroundSize 和 backgroundPosition 设置

    // 使用全局变量来设置背景，确保比例正确
    piece.style.backgroundSize = `${coveredWidth}px ${coveredHeight}px`;
    const bgPosX = -(x * width) + offsetX;
    const bgPosY = -(y * height) + offsetY;
    piece.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;

    // 设置三角形裁剪路径 (这部分逻辑不变)
    switch(type) {
        case 'top-left':
            piece.style.clipPath = 'polygon(0 0, 0 100%, 100% 0)';
            break;
        case 'top-right':
            piece.style.clipPath = 'polygon(100% 0, 100% 100%, 0 0)';
            break;
        case 'bottom-left':
            piece.style.clipPath = 'polygon(0 100%, 100% 100%, 0 0)';
            break;
        case 'bottom-right':
            piece.style.clipPath = 'polygon(100% 100%, 0 100%, 100% 0)';
            break;
    }
    piece.dataset.correctX = x;
    piece.dataset.correctY = y;
    piece.dataset.type = type;
    piece.dataset.rotation = '0';
    piece.dataset.flipped = 'false';
    piece.draggable = true;
    setupPieceEvents(piece);
    pieces.push(piece);
}

function createJigsawPiece(x, y, width, height, edges) {
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece jigsaw';

    const tabSize = width * JIGSAW_TAB_RATIO;

    const divWidth = width + (edges.left === 'tab' ? tabSize : 0) + (edges.right === 'tab' ? tabSize : 0);
    const divHeight = height + (edges.top === 'tab' ? tabSize : 0) + (edges.bottom === 'tab' ? tabSize : 0);

    piece.style.width = `${divWidth}px`;
    piece.style.height = `${divHeight}px`;

    piece.dataset.edgeTop = edges.top;
    piece.dataset.edgeRight = edges.right;
    piece.dataset.edgeBottom = edges.bottom;
    piece.dataset.edgeLeft = edges.left;

    const clipPathId = `clip-piece-${x}-${y}`;
    const svgClipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    svgClipPath.id = clipPathId;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', generateJigsawPath(width, height, tabSize, edges));
    svgClipPath.appendChild(path);
    svgDefs.appendChild(svgClipPath);
    piece.style.clipPath = `url(#${clipPathId})`;

    piece.style.backgroundImage = `url(${originalImageUrl})`;
    piece.style.backgroundSize = `${coveredWidth}px ${coveredHeight}px`;

    const offsetXForBg = (edges.left === 'tab' ? tabSize : 0);
    const offsetYForBg = (edges.top === 'tab' ? tabSize : 0);
    const bgPosX = -(x * width) + offsetX + offsetXForBg;
    const bgPosY = -(y * height) + offsetY + offsetYForBg;
    piece.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;

    // 【核心修正】: 计算并设置正确的旋转中心点（核心正方形的中心）
    const coreCenterX = offsetXForBg + width / 2;
    const coreCenterY = offsetYForBg + height / 2;
    piece.style.transformOrigin = `${coreCenterX}px ${coreCenterY}px`;

    piece.dataset.correctX = x;
    piece.dataset.correctY = y;
    piece.dataset.rotation = '0';
    piece.dataset.flipped = 'false';
    piece.draggable = true;
    setupPieceEvents(piece);
    pieces.push(piece);
}

function generateJigsawLayout() {
    const layout = Array.from({ length: difficulty }, () =>
        Array.from({ length: difficulty }, () => ({}))
    );

    for (let y = 0; y < difficulty; y++) {
        for (let x = 0; x < difficulty; x++) {
            // 上边缘和左边缘根据邻居决定，确保匹配
            const top = y === 0 ? 'flat' : (layout[y - 1][x].bottom === 'tab' ? 'blank' : 'tab');
            const left = x === 0 ? 'flat' : (layout[y][x - 1].right === 'tab' ? 'blank' : 'tab');
            // 下边缘和右边缘随机生成
            const bottom = y === difficulty - 1 ? 'flat' : (Math.random() < 0.5 ? 'tab' : 'blank');
            const right = x === difficulty - 1 ? 'flat' : (Math.random() < 0.5 ? 'tab' : 'blank');
            layout[y][x] = { top, right, bottom, left };
        }
    }
    return layout;
}

function generateJigsawPath(w, h, tabSize, edges) {
    const { top, right, bottom, left } = edges;

    // 曲线参数，用于定义圆润的形状
    const neckRatio = 0.2;
    const headWidthRatio = 0.6;
    const headHeightRatio = 1.0;
    const shoulderRatio = 0.25;

    const neckW = w * neckRatio;
    const neckH = h * neckRatio; // 新增：垂直方向的脖子高度
    const headW = w * headWidthRatio;
    const headH = h * headWidthRatio; // 新增：垂直方向的头部宽度
    const pt = tabSize * headHeightRatio;

    // 1. --- 顶部边缘的路径 (从左到右) ---
    const pathTabTop = `h ${neckW} c ${shoulderRatio * headW} 0, ${shoulderRatio * headW} ${-pt}, ${0.5 * headW} ${-pt} c ${(0.5-shoulderRatio) * headW} 0, ${(0.5-shoulderRatio) * headW} ${pt}, ${0.5 * headW} ${pt} h ${neckW}`;
    const pathBlankTop = `h ${neckW} c ${shoulderRatio * headW} 0, ${shoulderRatio * headW} ${pt}, ${0.5 * headW} ${pt} c ${(0.5-shoulderRatio) * headW} 0, ${(0.5-shoulderRatio) * headW} ${-pt}, ${0.5 * headW} ${-pt} h ${neckW}`;
    const pTop = (top === 'flat') ? `h ${w}` : (top === 'tab' ? pathTabTop : pathBlankTop);

    // 2. --- 右侧边缘的路径 (从上到下) ---
    const pathTabRight = `v ${neckH} c 0 ${shoulderRatio * headH}, ${pt} ${shoulderRatio * headH}, ${pt} ${0.5 * headH} c 0 ${(0.5-shoulderRatio) * headH}, ${-pt} ${(0.5-shoulderRatio) * headH}, ${-pt} ${0.5 * headH} v ${neckH}`;
    const pathBlankRight = `v ${neckH} c 0 ${shoulderRatio * headH}, ${-pt} ${shoulderRatio * headH}, ${-pt} ${0.5 * headH} c 0 ${(0.5-shoulderRatio) * headH}, ${pt} ${(0.5-shoulderRatio) * headH}, ${pt} ${0.5 * headH} v ${neckH}`;
    const pRight = (right === 'flat') ? `v ${h}` : (right === 'tab' ? pathTabRight : pathBlankRight);

    // 3. --- 底部边缘的路径 (从右到左) ---
    const pathTabBottom = `h ${-neckW} c ${-shoulderRatio * headW} 0, ${-shoulderRatio * headW} ${pt}, ${-0.5 * headW} ${pt} c ${-(0.5-shoulderRatio) * headW} 0, ${-(0.5-shoulderRatio) * headW} ${-pt}, ${-0.5 * headW} ${-pt} h ${-neckW}`;
    const pathBlankBottom = `h ${-neckW} c ${-shoulderRatio * headW} 0, ${-shoulderRatio * headW} ${-pt}, ${-0.5 * headW} ${-pt} c ${-(0.5-shoulderRatio) * headW} 0, ${-(0.5-shoulderRatio) * headW} ${pt}, ${-0.5 * headW} ${pt} h ${-neckW}`;
    const pBottom = (bottom === 'flat') ? `h ${-w}` : (bottom === 'tab' ? pathTabBottom : pathBlankBottom);

    // 4. --- 关键修复：左侧边缘的路径 (从下到上) ---
    const pathTabLeft = `v ${-neckH} c 0 ${-shoulderRatio * headH}, ${-pt} ${-shoulderRatio * headH}, ${-pt} ${-0.5 * headH} c 0 ${-(0.5-shoulderRatio) * headH}, ${pt} ${-(0.5-shoulderRatio) * headH}, ${pt} ${-0.5 * headH} v ${-neckH}`;
    const pathBlankLeft = `v ${-neckH} c 0 ${-shoulderRatio * headH}, ${pt} ${-shoulderRatio * headH}, ${pt} ${-0.5 * headH} c 0 ${-(0.5-shoulderRatio) * headH}, ${-pt} ${-(0.5-shoulderRatio) * headH}, ${-pt} ${-0.5 * headH} v ${-neckH}`;
    const pLeft = (left === 'flat') ? `v ${-h}` : (left === 'tab' ? pathTabLeft : pathBlankLeft);

    // 5. --- 拼接最终路径 ---
    // 计算 div 内部的起始点 (只在边缘是 'tab' 时才需要偏移)
    const startX = left === 'tab' ? tabSize : 0;
    const startY = top === 'tab' ? tabSize : 0;

    const finalPath = `M ${startX} ${startY} ${pTop} ${pRight} ${pBottom} ${pLeft} Z`;
    return finalPath;
}

// 设置拼图块事件
function setupPieceEvents(piece) {
    piece.addEventListener('dragstart', dragStart);
    piece.addEventListener('dragend', dragEnd);
    // 触摸设备支持
    piece.addEventListener('touchstart', touchStart, { passive: false });
    piece.addEventListener('touchmove', touchMove, { passive: false });
    piece.addEventListener('touchend', touchEnd);

    // 添加右键旋转功能
    piece.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        rotatePiece(this);
    });

    // 添加双击翻转功能
    piece.addEventListener('dblclick', function(e) {
        e.preventDefault();
        flipPiece(this);
    });
    piece.addEventListener('drag', pieceDrag);
}

// 确定三角形位置
function getTrianglePosition(relX, relY) {
    // 根据相对坐标确定三角形位置
    if (relX < 0.5 && relY < 0.5 && relX > relY) return 'top-left';
    if (relX > 0.5 && relY > 0.5 && relX < relY) return 'bottom-right';
    if (relX > 0.5 && relY < 0.5 && (1-relX) > relY) return 'top-right';
    return 'bottom-left';
}

// 查找特定位置的三角形
function findTrianglePieceOnBoard(x, y, position) {
    const allPieces = puzzleBoard.querySelectorAll('.puzzle-piece.triangle');
    for (const piece of allPieces) {
        if (parseInt(piece.dataset.currentX) === x &&
            parseInt(piece.dataset.currentY) === y &&
            piece.dataset.position === position) {
            return piece;
        }
    }
    return false;
}
 // 提交成绩到排行榜
function submitToRanking() {
        try {
            const userId = localStorage.getItem('userId');
            if (userId) {
                fetch('/ranking/record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: Number(userId),
                        step_count: moves,
                        time_used: seconds
                    })
                }).catch(error => {
                    console.error('提交排行榜成绩失败:', error);
                });
            }
        } catch (e) {
            console.error('提交成绩失败:', e);
        }
    }
// 放回备选区
function returnToZone(piece, incrementMoves = true) {
    piece.style.position = 'static';
    piece.style.left = '';
    piece.style.top = '';
    delete piece.dataset.currentX;
    delete piece.dataset.currentY;
    delete piece.dataset.position;

    if (shape === 'jigsaw') {
        const pieceHeight = puzzleBoard.offsetHeight / difficulty;
        draggedPiece.style.margin = `${(pieceHeight * JIGSAW_TAB_RATIO) / 2}px`;
    }

    piecesZone.appendChild(piece);

    if (incrementMoves) {
        moves++;
        movesElement.textContent = `移动次数: ${moves}`;
    }
}

// 提交关卡成绩到后端 levels（需登录 token）
function submitLevelRecord() {
    try {
        const token = localStorage.getItem('puzzleToken');
        if (!token) return Promise.resolve();

        const info = extractLevelInfo();
        if (!info) return Promise.resolve();

        return fetch('/levels/record', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                level_id: info.levelId,
                level_name: info.levelName,
                image_url: info.imageUrl,
                difficulty: info.difficulty,
                time_used: seconds,
                step_count: moves
            })
        }).then(r => r.json()).catch(() => {});
    } catch (e) { return Promise.resolve(); }
}

// 从当前 customImage/customSize 推导关卡信息
function extractLevelInfo() {
    try {
        const imageUrl = originalImageUrl;
        const diff = difficulty;
        if (!imageUrl || !diff) return null;
        // 关卡命名策略：图片文件名 + 难度
        const urlObj = new URL(imageUrl, window.location.origin);
        const pathname = urlObj.pathname || '';
        const fileName = pathname.split('/').pop() || 'custom';
        const levelId = `${fileName}-${diff}`;
        const levelName = fileName.replace(/\.[a-zA-Z0-9]+$/, '');
        return { levelId, levelName, imageUrl, difficulty: diff };
    } catch (e) {
        return null;
    }
}

function pieceDrag(e, clientX, clientY, piece) {
    if (customFollower) {
        // 支持移动端坐标
        const x = clientX || e.clientX;
        const y = clientY || e.clientY;
        
        // e.clientX 和 e.clientY 在拖拽的最后一刻可能会变成0，需要过滤掉
        if (x === 0 && y === 0) return;

        // 更新自定义跟随器的位置
        // 这里的 offsetX 和 offsetY 是在 dragStart 中设置的
        customFollower.style.left = `${x - customFollower.offsetX}px`;
        customFollower.style.top = `${y - customFollower.offsetY}px`;
    }
}


function calculatePieceFinalPosition(piece, gridX, gridY) {
    const pieceWidth = puzzleBoard.offsetWidth / difficulty;
    const pieceHeight = puzzleBoard.offsetHeight / difficulty;
    const tabSize = pieceWidth * JIGSAW_TAB_RATIO;

    let finalLeft;
    let finalTop;

    if (shape === 'jigsaw') {
        // 1. 目标：将拼图块的旋转中心，对齐到网格的中心。

        // 2. 计算网格中心的绝对坐标
        const gridCenterX = gridX * pieceWidth + pieceWidth / 2;
        const gridCenterY = gridY * pieceHeight + pieceHeight / 2;

        // 3. 计算旋转中心在拼图块div内部的坐标
        //    (这必须与 createJigsawPiece 中设置的 transformOrigin 完全一致)
        const dx = (piece.dataset.edgeLeft === 'tab' ? tabSize : 0);
        const dy = (piece.dataset.edgeTop === 'tab' ? tabSize : 0);
        const pivotInDivX = dx + pieceWidth / 2;
        const pivotInDivY = dy + pieceHeight / 2;

        // 4. 计算div的left和top，使得两个中心点重合
        finalLeft = gridCenterX - pivotInDivX;
        finalTop = gridCenterY - pivotInDivY;

    } else { // 对于 'square' 和 'triangle'，它们的旋转中心就是几何中心
        finalLeft = gridX * pieceWidth;
        finalTop = gridY * pieceHeight;
    }

    if (finalLeft !== undefined && finalTop !== undefined) {
        return {
            finalLeft: `${finalLeft}px`,
            finalTop: `${finalTop}px`
        };
    }

    return null;
}

// 兼容 game.html 对 window.puzzleGame 的依赖（用于帮助弹窗暂停/恢复）
try {
    window.puzzleGame = {
        pauseGame,
        resumeGame,
        get gameStarted() { return typeof gameStarted !== 'undefined' ? gameStarted : false; }
    };
} catch (e) {}

function getEffectivePieceType(piece) {
    const originalType = piece.dataset.type;
    const rotation = parseInt(piece.dataset.rotation) || 0;
    const isFlipped = piece.dataset.flipped === 'true';

    // 定义旋转顺序 (顺时针)
    const types = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
    let effectiveType = originalType;

    // --- 核心修复：严格按照 CSS 的 transform 顺序（从右到左）进行计算 ---

    // 第1步：先处理翻转 (scaleX)
    if (isFlipped) {
        if (effectiveType === 'top-left') {
            effectiveType = 'top-right';
        } else if (effectiveType === 'top-right') {
            effectiveType = 'top-left';
        } else if (effectiveType === 'bottom-left') {
            effectiveType = 'bottom-right';
        } else if (effectiveType === 'bottom-right') {
            effectiveType = 'bottom-left';
        }
    }

    // 第2步：再处理旋转 (rotate)，作用于【可能已经被翻转过】的形状上
    const currentIndex = types.indexOf(effectiveType);
    const rotationSteps = rotation / 90;
    effectiveType = types[(currentIndex + rotationSteps) % 4];

    return effectiveType;
}

function saveBoardPieces() {
    const piecesOnBoard = Array.from(document.querySelectorAll('#puzzleBoard .puzzle-piece'))
        .map(piece => ({
            correctX: piece.dataset.correctX,
            correctY: piece.dataset.correctY,
            currentX: piece.dataset.currentX,
            currentY: piece.dataset.currentY,
            rotation: piece.dataset.rotation,
            flipped: piece.dataset.flipped,
            type: piece.dataset.type || null
        }));
    localStorage.setItem('boardPieces', JSON.stringify(piecesOnBoard));
}

async function restoreProgressFromDB() {
    // For demo, use user_id=1, puzzle_id=1. Replace with real values if needed.
    const token = localStorage.getItem('puzzleToken');
    const puzzle_id = localStorage.getItem('puzzleId') || 1;
    const res = await fetch(`/pic/get_progress?puzzle_id=${puzzle_id}`, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });
    
    if (!res.ok) {
        alert('Failed to fetch progress from server');
        return;
    }
    const data = await res.json();
    if (!data.progress_json) {
        alert('No progress found in database');
        return;
    }
    const piecesOnBoard = JSON.parse(data.progress_json);
    console.log(piecesOnBoard)
    // Remove all pieces from board and zone
    puzzleBoard.innerHTML = '';
    piecesZone.innerHTML = '';
    pieces.forEach(piece => {
        piece.style.position = 'static';
        delete piece.dataset.currentX;
        delete piece.dataset.currentY;
        piecesZone.appendChild(piece);
    });

    // Place pieces on board according to saved state
    piecesOnBoard.forEach(saved => {
        const piece = pieces.find(p =>
            p.dataset.correctX == saved.correctX &&
            p.dataset.correctY == saved.correctY &&
            (p.dataset.type || null) == (saved.type || null)
        );
        if (piece) {
            piece.dataset.currentX = saved.currentX;
            piece.dataset.currentY = saved.currentY;
            piece.dataset.rotation = saved.rotation;
            piece.dataset.flipped = saved.flipped;
            piece.style.transform = `rotate(${saved.rotation}deg) scaleX(${saved.flipped === 'true' ? -1 : 1})`;
            piece.style.position = 'absolute';
            const pieceWidth = puzzleBoard.offsetWidth / difficulty;
            const pieceHeight = puzzleBoard.offsetHeight / difficulty;
            piece.style.left = `${saved.currentX * pieceWidth}px`;
            piece.style.top = `${saved.currentY * pieceHeight}px`;
            puzzleBoard.appendChild(piece);
        }
    });
    alert('Progress restored!');
}