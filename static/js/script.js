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
const playAgainBtn = document.getElementById('playAgainBtn');
const puzzleBg = document.getElementById('puzzleBg');
const toggleBgBtn = document.getElementById('toggleBgBtn');

let pieces = [];
let difficulty = 4;
let timerInterval;
let seconds = 0;
let moves = 0;
let gameStarted = false;
let originalImageUrl = './puzzle-image.jpg'; // Imagen por defecto
let draggedPiece = null;
let bgVisible = true;
let shape = 'square'; // 默认为方形
let coveredWidth, coveredHeight, offsetX, offsetY;
let boardRect;
let customFollower = null;

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
    if (gameStarted) {
        resetGame();
    }
    gameStarted = true;
    moves = 0;
    seconds = 0;
    movesElement.textContent = `移动次数: ${moves}`;
    timerElement.textContent = `时间: 00:00`;
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    // 调用重构后的 setPuzzleBg，并把创建拼图的逻辑作为回调传入
    setPuzzleBg(() => {
        puzzleBg.style.opacity = bgVisible ? '0.25' : '0';
        toggleBgBtn.textContent = bgVisible ? '隐藏背景' : '显示背景';
        createPuzzlePieces();
    });
}

// 重置游戏
function resetGame() {
    gameStarted = false;
    clearInterval(timerInterval);
    seconds = 0;
    moves = 0;
    timerElement.textContent = `时间: 00:00`;
    movesElement.textContent = `移动次数: ${moves}`;
    puzzleBoard.querySelectorAll('.puzzle-piece').forEach(piece => piece.remove());
    piecesZone.innerHTML = '';
    pieces = [];
    setPuzzleBg();
    puzzleBg.style.opacity = bgVisible ? '0.25' : '0';
    toggleBgBtn.textContent = bgVisible ? '隐藏背景' : '显示背景';
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
    puzzleBoard.querySelectorAll('.puzzle-piece').forEach(piece => piece.remove());
    piecesZone.innerHTML = '';
    pieces = [];

    const pieceWidth = puzzleBoard.offsetWidth / difficulty;
    const pieceHeight = puzzleBoard.offsetHeight / difficulty;

    if (shape === 'square') {
        for (let y = 0; y < difficulty; y++) {
            for (let x = 0; x < difficulty; x++) {
                createSquarePiece(x, y, pieceWidth, pieceHeight);
            }
        }
    } else if (shape === 'triangle') {
        for (let y = 0; y < difficulty; y++) {
            for (let x = 0; x < difficulty; x++) {
                // (行 + 列) 为偶数的格子，进行主对角线切割
                if ((x + y) % 2 === 0) {
                    // 根据我们对 clip-path 的正确分析，主对角线切割的块被命名为 'top-right' 和 'bottom-left'
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'top-right');
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'bottom-left');
                }
                // (行 + 列) 为奇数的格子，进行副对角线切割
                else {
                    // 副对角线切割的块被命名为 'top-left' 和 'bottom-right'
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'top-left');
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'bottom-right');
                }
            }
        }
    }

    shufflePieces();
    pieces.forEach(piece => {
        piece.style.position = 'static';
        piecesZone.appendChild(piece);
        setupPieceEvents(piece);
    });

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

    const allPieces = document.querySelectorAll('.puzzle-piece');
    allPieces.forEach(piece => {
        // 'auto' 会将 pointer-events 恢复到其默认行为
        piece.style.pointerEvents = 'auto';
    });

    if (draggedPiece) {
        draggedPiece.classList.remove('dragging');
        draggedPiece.style.visibility = 'visible';
    }
    // 移除我们的自定义跟随器
    if (customFollower) {
        document.body.removeChild(customFollower);
        customFollower = null;
    }
    checkPuzzleCompletion();
}

function dragOver(e) {
    e.preventDefault();
}

// 拖拽到棋盘
function dropOnBoard(e) {
    e.preventDefault();
    if (!draggedPiece) return;

    const pieceWidth = puzzleBoard.offsetWidth / difficulty;
    const pieceHeight = puzzleBoard.offsetHeight / difficulty;
    const boardRect = puzzleBoard.getBoundingClientRect();

    let x = e.clientX - boardRect.left;
    let y = e.clientY - boardRect.top;

    let gridX = Math.floor(x / pieceWidth);
    let gridY = Math.floor(y / pieceHeight);

    if (shape === 'square') {
        if (findPieceOnBoard(gridX, gridY)) {
            returnToZone(draggedPiece);
            return;
        }
    } else if (shape === 'triangle') {

        const relX = (x % pieceWidth) / pieceWidth;
        const relY = (y % pieceHeight) / pieceHeight;

        let position;

        // (行 + 列) 为偶数的格子，是主对角线切割
        if ((gridX + gridY) % 2 === 0) {
            // 主对角线的几何判断 (y vs x)，返回的命名与上面创建时完全对应
            position = (relY < relX) ? 'top-right' : 'bottom-left';
        }
        // (行 + 列) 为奇数的格子，是副对角线切割
        else {
            // 副对角线的几何判断 (x+y vs 1)，返回的命名与上面创建时完全对应
            position = (relX + relY < 1) ? 'top-left' : 'bottom-right';
        }

        if (findTrianglePieceOnBoard(gridX, gridY, position)) {
            returnToZone(draggedPiece);
            return;
        }

        draggedPiece.dataset.position = position;
    }

    draggedPiece.style.position = "absolute";
    draggedPiece.style.left = `${gridX * pieceWidth}px`;
    draggedPiece.style.top = `${gridY * pieceHeight}px`;
    draggedPiece.dataset.currentX = gridX;
    draggedPiece.dataset.currentY = gridY;

    puzzleBoard.appendChild(draggedPiece);

    moves++;
    movesElement.textContent = `移动次数: ${moves}`;

    checkPuzzleCompletion();
}

// 拖拽回piecesZone
function dropOnZone(e) {
    e.preventDefault();
    if (!draggedPiece) return;
    draggedPiece.style.position = 'static';
    delete draggedPiece.dataset.currentX;
    delete draggedPiece.dataset.currentY;
    piecesZone.appendChild(draggedPiece);
    moves++;
    movesElement.textContent = `移动次数: ${moves}`;
    draggedPiece = null;
}

// 查找棋盘上指定格子的拼图块
function findPieceOnBoard(x, y) {
    const allPieces = puzzleBoard.querySelectorAll('.puzzle-piece');
    for (const piece of allPieces) {
        if (parseInt(piece.dataset.currentX) === x && parseInt(piece.dataset.currentY) === y) {
            return piece;
        }
    }
    return null;
}

// 检查拼图是否完成
function checkPuzzleCompletion() {
    // 报告开始
    console.log("--- 开始执行拼图完成检查 ---");

    const allPiecesOnBoard = puzzleBoard.querySelectorAll('.puzzle-piece');
    const expectedPieceCount = (shape === 'triangle')
        ? (difficulty * difficulty * 2)
        : (difficulty * difficulty);

    // 检查1: 拼图块数量是否正确
    if (allPiecesOnBoard.length !== expectedPieceCount) {
        console.log(`检查停止：棋盘上的拼图块数量 (${allPiecesOnBoard.length}) 与期望数量 (${expectedPieceCount}) 不符。`);
        return;
    }

    console.log("所有拼图块都已在棋盘上，现在逐一检查每个块的状态...");

    let isFullyComplete = true; // 先假设拼图是完整的

    // 检查2: 逐一检查每个拼图块
    for (const piece of allPiecesOnBoard) {
        // --- 获取这个块的所有“正确”属性 ---
        const correctX = parseInt(piece.dataset.correctX);
        const correctY = parseInt(piece.dataset.correctY);
        const correctType = piece.dataset.type;

        // --- 获取这个块的“当前”属性 ---
        const currentX = parseInt(piece.dataset.currentX);
        const currentY = parseInt(piece.dataset.currentY);
        const position = piece.dataset.position;
        const rotation = parseInt(piece.dataset.rotation) || 0;
        const isFlipped = piece.dataset.flipped === 'true';

        // 在控制台打印出这个块的详细信息，方便我们分析
        console.log(`正在检查 (正确类型: ${correctType}, 正确坐标: [${correctX},${correctY}])`, {
            "当前坐标": `[${currentX},${currentY}]`,
            "放置位置": position,
            "旋转角度": rotation,
            "是否翻转": isFlipped
        });

        // --- 开始进行条件判断 ---
        if (currentX !== correctX || currentY !== correctY) {
            console.error(`失败: 坐标错误! 期望 [${correctX},${correctY}], 实际 [${currentX},${currentY}]`);
            isFullyComplete = false;
        }

        if (rotation !== 0 || isFlipped) {
            console.error(`失败: 方向错误! 旋转角度应为0 (实际是${rotation}), 翻转状态应为false (实际是${isFlipped})`);
            isFullyComplete = false;
        }

        if (shape === 'triangle') {
            if (position !== correctType) {
                console.error(`失败: 三角形位置错误! 块的固有类型是'${correctType}', 但它被放在了'${position}'位置`);
                isFullyComplete = false;
            }
        }
    }

    // 检查3: 总结报告
    if (isFullyComplete) {
        console.log("%c成功: 所有检查项都已通过！拼图已完成！", "color: green; font-weight: bold;");

        // --- 触发游戏成功逻辑 ---
        if (gameStarted) {
            gameStarted = false;
            clearInterval(timerInterval);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            completeInfo.textContent = `你用了 ${timeString} 和 ${moves} 次移动完成了拼图！`;
            setTimeout(() => {
                gameComplete.style.display = 'flex';
            }, 500);
        }
    } else {
        console.warn("检查结束: 发现错误，拼图尚未完成。请查看上面的红色错误信息。");
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

// 初始化背景
setPuzzleBg();


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
        setPuzzleBg();
    }
});

// 创建方形拼图块
function createSquarePiece(x, y, width, height) {
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece square';
    piece.style.width = `${width}px`;
    piece.style.height = `${height}px`;
    piece.style.backgroundImage = `url(${originalImageUrl})`;

    // 使用计算后的 cover 尺寸与偏移，确保切片背景对齐
    piece.style.backgroundSize = `${coveredWidth}px ${coveredHeight}px`;
    const bgPosX = -(x * width) + offsetX;
    const bgPosY = -(y * height) + offsetY;
    piece.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;

    piece.dataset.correctX = x;
    piece.dataset.correctY = y;
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
    piece.addEventListener('dblclick', function() {
        flipPiece(this);
    });
    piece.addEventListener('drag', pieceDrag);
}

// 旋转拼图块
function rotatePiece(piece) {
    const currentRotation = parseInt(piece.dataset.rotation) || 0;
    const newRotation = (currentRotation + 90) % 360;
    piece.dataset.rotation = newRotation;
    piece.style.transform = `rotate(${newRotation}deg)`;
}

// 翻转拼图块
function flipPiece(piece) {
    const isFlipped = piece.dataset.flipped === 'true';
    const newFlipped = !isFlipped;
    piece.dataset.flipped = newFlipped;
    piece.style.transform = `${piece.style.transform} scaleX(${newFlipped ? -1 : 1})`;
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

// 兼容 game.html 对 window.puzzleGame 的依赖（用于帮助弹窗暂停/恢复）
// 注意：game.js 中会创建完整的 PuzzleGame 实例并赋值给 window.puzzleGame
// 这里只保留基本的接口以避免冲突
