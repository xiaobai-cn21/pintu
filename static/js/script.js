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
    constructor(piece, previousRotation) {
        super();
        this.piece = piece;
        this.previousRotation = previousRotation;
        this.newRotation = parseInt(piece.dataset.rotation) || 0;
    }

    undo() {
        this.piece.dataset.rotation = this.previousRotation;
        const isFlipped = this.piece.dataset.flipped === 'true';
        this.piece.style.transform = `rotate(${this.previousRotation}deg) scaleX(${isFlipped ? -1 : 1})`;
    }
}

// 翻转拼图块命令
class FlipCommand extends Command {
    constructor(piece, previousFlipped) {
        super();
        this.piece = piece;
        this.previousFlipped = previousFlipped;
        this.newFlipped = piece.dataset.flipped === 'true';
    }

    undo() {
        this.piece.dataset.flipped = this.previousFlipped;
        const currentRotation = parseInt(this.piece.dataset.rotation) || 0;
        this.piece.style.transform = `rotate(${currentRotation}deg) scaleX(${this.previousFlipped ? -1 : 1})`;
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
    const currentRotation = parseInt(piece.dataset.rotation) || 0;
    // 记录当前旋转状态作为撤销依据
    const command = new RotateCommand(piece, currentRotation);

    const newRotation = (currentRotation + 90) % 360;
    piece.dataset.rotation = newRotation;
    const isFlipped = piece.dataset.flipped === 'true';
    piece.style.transform = `rotate(${newRotation}deg) scaleX(${isFlipped ? -1 : 1})`;

    // 推入命令栈
    pushCommand(command);

    // 更新移动次数
    moves++;
    movesElement.textContent = `移动次数: ${moves}`;
}

// 修改翻转函数，添加命令记录
function flipPiece(piece) {
    const isFlipped = piece.dataset.flipped === 'true';
    // 记录当前翻转状态作为撤销依据
    const command = new FlipCommand(piece, isFlipped);

    const newFlipped = !isFlipped;
    piece.dataset.flipped = newFlipped;
    const currentRotation = parseInt(piece.dataset.rotation) || 0;
    piece.style.transform = `rotate(${currentRotation}deg) scaleX(${newFlipped ? -1 : 1})`;

    // 推入命令栈
    pushCommand(command);

    // 更新移动次数
    moves++;
    movesElement.textContent = `移动次数: ${moves}`;
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
    const img = new Image();
    img.onload = function() {
        const boardWidth = puzzleBoard.offsetWidth;
        const boardHeight = puzzleBoard.offsetHeight;

        const imageAspectRatio = this.naturalWidth / this.naturalHeight;
        const boardAspectRatio = boardWidth / boardHeight;

        // 新的 'cover' 计算逻辑
        if (imageAspectRatio > boardAspectRatio) {
            // 图片比棋盘更“宽”，因此让图片高度适应棋盘高度，宽度会超出
            coveredHeight = boardHeight;
            coveredWidth = boardHeight * imageAspectRatio;
            offsetY = 0;
            offsetX = (boardWidth - coveredWidth) / 2; // X方向偏移量会是负数，使图片居中
        } else {
            // 图片比棋盘更“高”，因此让图片宽度适应棋盘宽度，高度会超出
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
    gameStarted = true;
    moves = 0;
    seconds = 0;
    movesElement.textContent = `移动次数: ${moves}`;
    timerElement.textContent = `时间: 00:00`;
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    function checkAndLaunch() {
        if (puzzleBoard.offsetWidth === 0) {
            requestAnimationFrame(checkAndLaunch);
        } else {
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

// 创建拼图块
function createPuzzlePieces() {
    puzzleBoard.innerHTML = '';
    piecesZone.innerHTML = '';
    if (svgDefs) svgDefs.innerHTML = '';
    pieces = [];

    const pieceWidth = puzzleBoard.offsetWidth / difficulty;
    const pieceHeight = puzzleBoard.offsetHeight / difficulty;
    // 从 localStorage 获取随机选项
    const randomRotation = localStorage.getItem('randomRotation') === 'true';
    const randomFlip = localStorage.getItem('randomFlip') === 'true';

    if (shape === 'square') {
        for (let y = 0; y < difficulty; y++) {
            for (let x = 0; x < difficulty; x++) {
                createSquarePiece(x, y, pieceWidth, pieceHeight);
            }
        }
    } else if (shape === 'triangle') {
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
function dragStart(e) {
    draggedPiece = this;

    // --- 修正后的逻辑 ---
    // 获取棋盘上所有已放置的拼图块
    const piecesOnBoard = puzzleBoard.querySelectorAll('.puzzle-piece');
    // 遍历它们
    piecesOnBoard.forEach(piece => {
        // 关键的判断：如果这个块不是我们正在拖动的块，才让它忽略鼠标
        if (piece !== draggedPiece) {
            piece.style.pointerEvents = 'none';
        }
    });
    // --- 修正结束 ---

    // --- 自定义拖拽图像方案 (这部分保持不变) ---
    customFollower = this.cloneNode(true);
    customFollower.id = 'custom-follower';
    customFollower.style.position = 'fixed';
    customFollower.style.pointerEvents = 'none';
    customFollower.style.zIndex = '9999';

    const rect = this.getBoundingClientRect();
    customFollower.offsetX = e.clientX - rect.left;
    customFollower.offsetY = e.clientY - rect.top;

    document.body.appendChild(customFollower);
    pieceDrag(e);

    const transparentPixel = new Image();
    transparentPixel.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(transparentPixel, 0, 0);

    setTimeout(() => {
        this.style.visibility = 'hidden';
    }, 0);

    e.dataTransfer.setData('text/plain', '');
}

function dragEnd() {
    // 移除吸附提示
    const hint = document.getElementById('drop-hint');
    if (hint) {
        hint.style.display = 'none';
    }

    const allPieces = document.querySelectorAll('.puzzle-piece');
    allPieces.forEach(piece => {
        piece.style.pointerEvents = 'auto';
    });

    if (draggedPiece) {
        draggedPiece.classList.remove('dragging');
        draggedPiece.style.visibility = 'visible';
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
// 拖拽到棋盘
// 修改dropOnBoard函数，修复拖拽问题并增强吸附功能
function dropOnBoard(e) {
    e.preventDefault();
    if (!draggedPiece) return;

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

    draggedPiece.style.margin = '0'; // 放置到棋盘时清除 margin

    const pieceWidth = puzzleBoard.offsetWidth / difficulty;
    const pieceHeight = puzzleBoard.offsetHeight / difficulty;
    const boardRect = puzzleBoard.getBoundingClientRect();

    // 计算鼠标在棋盘内的相对位置
    let x = e.clientX - boardRect.left;
    let y = e.clientY - boardRect.top;

    // 计算初始网格位置
    let gridX = Math.floor(x / pieceWidth);
    let gridY = Math.floor(y / pieceHeight);

    // 边界检查
    gridX = Math.max(0, Math.min(gridX, difficulty - 1));
    gridY = Math.max(0, Math.min(gridY, difficulty - 1));

    let finalLeft, finalTop;
    let canPlace = true; // 新增：标记是否可以放置

    if (shape === 'jigsaw' || shape === 'square') {
        // 检查目标位置是否已有拼图块
        if (findPieceOnBoard(gridX, gridY)) {
            // 尝试找到附近的空位置，增强容错性
            const nearbyPositions = [
                {x: gridX - 1, y: gridY},
                {x: gridX + 1, y: gridY},
                {x: gridX, y: gridY - 1},
                {x: gridX, y: gridY + 1}
            ];

            let found = false;
            for (const pos of nearbyPositions) {
                if (pos.x >= 0 && pos.x < difficulty && pos.y >= 0 && pos.y < difficulty) {
                    if (!findPieceOnBoard(pos.x, pos.y)) {
                        gridX = pos.x;
                        gridY = pos.y;
                        found = true;
                        break;
                    }
                }
            }

            if (!found) {
                canPlace = false; // 找不到可放置位置
            }
        }

        if (canPlace) {
            if (shape === 'jigsaw') {
                const rotation = parseInt(draggedPiece.dataset.rotation) || 0;
                const isFlipped = draggedPiece.dataset.flipped === 'true';
                const tabSize = pieceWidth * JIGSAW_TAB_RATIO;

                let edges = {
                    top: draggedPiece.dataset.edgeTop, right: draggedPiece.dataset.edgeRight,
                    bottom: draggedPiece.dataset.edgeBottom, left: draggedPiece.dataset.edgeLeft
                };
                if (isFlipped) { [edges.left, edges.right] = [edges.right, edges.left]; }
                const rotationSteps = rotation / 90;
                for (let i = 0; i < rotationSteps; i++) {
                    const tempTop = edges.top; edges.top = edges.left; edges.left = edges.bottom;
                    edges.bottom = edges.right; edges.right = tempTop;
                }

                const offsetXForDiv = (edges.left === 'tab' ? tabSize : 0);
                const offsetYForDiv = (edges.top === 'tab' ? tabSize : 0);

                let calculatedLeft = gridX * pieceWidth - offsetXForDiv;
                let calculatedTop = gridY * pieceHeight - offsetYForDiv;

                if (rotation === 90 || rotation === 270) {
                    const divWidth = parseFloat(draggedPiece.style.width);
                    const divHeight = parseFloat(draggedPiece.style.height);
                    calculatedLeft += (divWidth - divHeight) / 2;
                    calculatedTop += (divHeight - divWidth) / 2;
                }
                finalLeft = `${calculatedLeft}px`;
                finalTop = `${calculatedTop}px`;
            } else { // 'square'
                finalLeft = `${gridX * pieceWidth}px`;
                finalTop = `${gridY * pieceHeight}px`;
            }
        }

    } else if (shape === 'triangle') {
        // 三角形拼图逻辑
        const draggedPieceType = draggedPiece.dataset.type;

        // 查找目标格子里所有已经存在的三角块
        const piecesInCell = Array.from(
            puzzleBoard.querySelectorAll(`.puzzle-piece.triangle[data-current-x='${gridX}'][data-current-y='${gridY}']`)
        );

        // 检查格子是否已满 (最多只能有2个)
        if (piecesInCell.length >= 2) {
            // 尝试附近的格子
            const nearbyPositions = [
                {x: gridX - 1, y: gridY},
                {x: gridX + 1, y: gridY},
                {x: gridX, y: gridY - 1},
                {x: gridX, y: gridY + 1}
            ];

            let found = false;
            for (const pos of nearbyPositions) {
                if (pos.x >= 0 && pos.x < difficulty && pos.y >= 0 && pos.y < difficulty) {
                    const nearbyPieces = puzzleBoard.querySelectorAll(`.puzzle-piece.triangle[data-current-x='${pos.x}'][data-current-y='${pos.y}']`);
                    if (nearbyPieces.length < 2) {
                        gridX = pos.x;
                        gridY = pos.y;
                        found = true;
                        break;
                    }
                }
            }

            if (!found) {
                canPlace = false;
            }
        }

        if (canPlace) {
            // 检查是否要放置的“类型”已经存在于格子中
            const typeAlreadyExists = piecesInCell.some(p => p.dataset.type === draggedPieceType);
            if (typeAlreadyExists) {
                canPlace = false;
            }
        }

        if (canPlace && piecesInCell.length === 1) {
            const existingPieceType = piecesInCell[0].dataset.type;

            // 定义所有兼容的配对关系
            const isCompatible =
                (draggedPieceType === 'top-left' && existingPieceType === 'bottom-right') ||
                (draggedPieceType === 'bottom-right' && existingPieceType === 'top-left') ||
                (draggedPieceType === 'top-right' && existingPieceType === 'bottom-left') ||
                (draggedPieceType === 'bottom-left' && existingPieceType === 'top-right');

            if (!isCompatible) {
                canPlace = false;
            }
        }

        if (canPlace) {
            draggedPiece.dataset.position = draggedPieceType;
            finalLeft = `${gridX * pieceWidth}px`;
            finalTop = `${gridY * pieceHeight}px`;
        }
    }

    // 如果可以放置，则执行放置操作
    if (canPlace && finalLeft && finalTop) {
        // 创建移动命令并推入栈
        const toRect = {
            position: "absolute",
            left: finalLeft,
            top: finalTop,
            margin: '0'
        };

        const command = new MoveCommand(
            draggedPiece,
            fromParent,
            fromRect,
            puzzleBoard,
            toRect,
            fromX,
            fromY,
            gridX,
            gridY
        );
        pushCommand(command);
        // 添加吸附动画效果
        //draggedPiece.style.transition = 'transform 0.2s ease-out';
        //draggedPiece.style.transform = `${draggedPiece.style.transform || ''} translate(${finalLeft}px, ${finalTop}px)`;

        // 动画结束后应用最终位置
            draggedPiece.style.transition = '';
            draggedPiece.style.position = "absolute";
            draggedPiece.style.left = finalLeft;
            draggedPiece.style.top = finalTop;
            draggedPiece.style.transform = draggedPiece.style.transform.replace(/ translate\([^)]*\)/, '') || '';
            draggedPiece.dataset.currentX = gridX;
            draggedPiece.dataset.currentY = gridY;

            puzzleBoard.appendChild(draggedPiece);

            moves++;
            movesElement.textContent = `移动次数: ${moves}`;
    } else {
        // 无法放置时，添加返回动画
        draggedPiece.style.transition = 'transform 0.3s ease-out';
        setTimeout(() => {
            draggedPiece.style.transition = '';
            returnToZone(draggedPiece);
        }, 300);
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
    const totalPieces = difficulty * difficulty;

    // 检查是否所有拼图都已放置到棋盘上
    if (piecesOnBoard.length !== totalPieces) {
        return false;
    }

    let allCorrect = true;

    piecesOnBoard.forEach(piece => {
        const pieceX = parseInt(piece.dataset.currentX);
        const pieceY = parseInt(piece.dataset.currentY);
        const correctX = parseInt(piece.dataset.correctX);
        const correctY = parseInt(piece.dataset.correctY);

        // 检查位置是否正确
        if (pieceX !== correctX || pieceY !== correctY) {
            allCorrect = false;
        }

        // 对于拼图形状，还要检查旋转和翻转是否正确
        if (shape === 'jigsaw') {
            const rotation = parseInt(piece.dataset.rotation) || 0;
            const correctRotation = parseInt(piece.dataset.correctRotation) || 0;
            const isFlipped = piece.dataset.flipped === 'true';
            const shouldBeFlipped = piece.dataset.shouldBeFlipped === 'true';

            if (rotation !== correctRotation || isFlipped !== shouldBeFlipped) {
                allCorrect = false;
            }
        }
    });

    // 如果全部正确且尚未显示完成提示
    if (allCorrect && !document.getElementById('completion-message')) {
        clearInterval(timerInterval); // 停止计时器
        showCompletionMessage();
         // 提交成绩到排行榜
        submitToRanking();
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


window.addEventListener('DOMContentLoaded', function() {
    const customImage = localStorage.getItem('customImage');
    const customSize = localStorage.getItem('customSize');
    //获取形状
    const customShape = localStorage.getItem('customShape');

    if (customImage && customSize) {
        originalImageUrl = customImage;
        difficulty = parseInt(customSize);
        if (customShape) shape = customShape;
        //setPuzzleBg();
        startGame();
        localStorage.removeItem('customImage');
        localStorage.removeItem('customSize');
        localStorage.removeItem('customShape'); // 清除
    } else {
        console.log("没有找到拼图数据，请从预览页面开始游戏。");
        puzzleBoard.innerHTML = '<p style="text-align:center; color:#666; margin-top: 40px;">请先选择一张图片来创建拼图</p>';

        // 禁用不需要的按钮
        if(resetBtn) resetBtn.disabled = true;
        if(toggleBgBtn) toggleBgBtn.disabled = true;
    }
});

// 创建方形拼图块
function createSquarePiece(x, y, width, height) {
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece square';
    piece.style.width = `${width}px`;
    piece.style.height = `${height}px`;
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

    // div 的尺寸需要比基础尺寸大，以容纳凸出的部分
    const hasLeftTab = edges.left !== 'flat';
    const hasRightTab = edges.right !== 'flat';
    const hasTopTab = edges.top !== 'flat';
    const hasBottomTab = edges.bottom !== 'flat';

    const divWidth = width + (edges.left === 'tab' ? tabSize : 0) + (edges.right === 'tab' ? tabSize : 0);
    const divHeight = height + (edges.top === 'tab' ? tabSize : 0) + (edges.bottom === 'tab' ? tabSize : 0);
    const offsetXForDiv = (edges.left === 'tab' ? tabSize : 0);
    const offsetYForDiv = (edges.top === 'tab' ? tabSize : 0);


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

    const bgPosX = -(x * width) + offsetX + offsetXForDiv; // <--- 减号改加号
    const bgPosY = -(y * height) + offsetY + offsetYForDiv; // <--- 减号改加号
    piece.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;


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

// 旋转拼图块
function rotatePiece(piece) {
    const currentRotation = parseInt(piece.dataset.rotation) || 0;
    // 记录当前旋转状态作为撤销依据
    const command = new RotateCommand(piece, currentRotation);

    const newRotation = (currentRotation + 90) % 360;
    piece.dataset.rotation = newRotation;
    const isFlipped = piece.dataset.flipped === 'true';
    piece.style.transform = `rotate(${newRotation}deg) scaleX(${isFlipped ? -1 : 1})`;

    // 推入命令栈
    pushCommand(command);

    // 更新移动次数
    moves++;
    movesElement.textContent = `移动次数: ${moves}`;
}

// 翻转拼图块
function flipPiece(piece) {
    const isFlipped = piece.dataset.flipped === 'true';
    // 记录当前翻转状态作为撤销依据
    const command = new FlipCommand(piece, isFlipped);

    const newFlipped = !isFlipped;
    piece.dataset.flipped = newFlipped;
    const currentRotation = parseInt(piece.dataset.rotation) || 0;
    piece.style.transform = `rotate(${currentRotation}deg) scaleX(${newFlipped ? -1 : 1})`;

    // 推入命令栈
    pushCommand(command);

    // 更新移动次数
    moves++;
    movesElement.textContent = `移动次数: ${moves}`;
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
// 放回备选区
function returnToZone(piece) {
    piece.style.position = 'static';
    delete piece.dataset.currentX;
    delete piece.dataset.currentY;
    piecesZone.appendChild(piece);
    moves++;
    movesElement.textContent = `移动次数: ${moves}`;
}

function pieceDrag(e) {
    if (customFollower) {
        // e.clientX 和 e.clientY 在拖拽的最后一刻可能会变成0，需要过滤掉
        if (e.clientX === 0 && e.clientY === 0) return;

        // 更新自定义跟随器的位置
        // 这里的 offsetX 和 offsetY 是在 dragStart 中设置的
        customFollower.style.left = `${e.clientX - customFollower.offsetX}px`;
        customFollower.style.top = `${e.clientY - customFollower.offsetY}px`;
    }
}
