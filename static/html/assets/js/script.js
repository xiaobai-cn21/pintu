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
function setPuzzleBg() {
    puzzleBg.style.backgroundImage = `url(${originalImageUrl})`;
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
    setPuzzleBg();
    puzzleBg.style.opacity = bgVisible ? '0.25' : '0';
    toggleBgBtn.textContent = bgVisible ? '隐藏背景' : '显示背景';
    createPuzzlePieces();
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
        // 方形拼图逻辑
        for (let y = 0; y < difficulty; y++) {
            for (let x = 0; x < difficulty; x++) {
                createSquarePiece(x, y, pieceWidth, pieceHeight);
            }
        }
    }else if (shape === 'triangle') {
        // 三角形拼图逻辑
        for (let y = 0; y < difficulty; y++) {
            for (let x = 0; x < difficulty; x++) {
                const bgX = x * width;
                const bgY = y * height;
                // 交错切割：奇数行奇数列创建主对角线三角形，其他创建副对角线三角形
                if ((y % 2 === 0 && x % 2 === 0) || (y % 2 === 1 && x % 2 === 1)) {
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'top-left');
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'bottom-right');
                } else {
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'top-right');
                    createTrianglePiece(x, y, pieceWidth, pieceHeight, 'bottom-left');
                }
            }
        }
    }

    shufflePieces();
    pieces.forEach(piece => {
        piece.style.position = 'static';
        piecesZone.appendChild(piece);
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
    setTimeout(() => {
        this.classList.add('dragging');
    }, 0);
    e.dataTransfer.setData('text/plain', '');
}

function dragEnd() {
    this.classList.remove('dragging');
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

    // 检查该格是否已被占用
    if (shape === 'square') {
        if (findPieceOnBoard(gridX, gridY)) return;
    } else if (currentShape === 'triangle') {
        // 三角形需要检查特定位置
        draggedPiece.dataset.position = position;
        const relX = (x - gridX * pieceWidth) / pieceWidth;
        const relY = (y - gridY * pieceHeight) / pieceHeight;
        const position = getTrianglePosition(relX, relY);

        if (findTrianglePieceOnBoard(gridX, gridY, position)) {
            returnToZone(draggedPiece);
            return;
        }
    }

    // 设置绝对定位
    draggedPiece.style.position = "absolute";
    draggedPiece.style.left = `${gridX * pieceWidth}px`;
    draggedPiece.style.top = `${gridY * pieceHeight}px`;
    draggedPiece.dataset.currentX = gridX;
    draggedPiece.dataset.currentY = gridY;
    puzzleBoard.appendChild(draggedPiece);

    moves++;
    movesElement.textContent = `移动次数: ${moves}`;
    draggedPiece = null;
    //后加的
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
    const allPieces = puzzleBoard.querySelectorAll('.puzzle-piece');
    //总快熟
    const expectedPieces = difficulty * difficulty * 2;

    if (allPieces.length !== difficulty * difficulty) return;

    let completed = true;

    allPieces.forEach(piece => {
        const currentX = parseInt(piece.dataset.currentX);
        const currentY = parseInt(piece.dataset.currentY);
        const correctX = parseInt(piece.dataset.correctX);
        const correctY = parseInt(piece.dataset.correctY);

        // 对于三角形，还需要检查位置类型
        if (shape === 'triangle') {
        const position = piece.dataset.position;
        const correctPosition = piece.dataset.type;

        if (position !== correctPosition) {
            completed = false;
        }
    }
        if (currentX !== correctX || currentY !== correctY) {
            completed = false;
        }
    });

    if (completed && gameStarted) {
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
        setPuzzleBg();
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
    piece.style.backgroundSize = `${puzzleBoard.offsetWidth}px ${puzzleBoard.offsetHeight}px`;
    piece.style.backgroundPosition = `-${x * width}px -${y * height}px`;
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
    piece.style.backgroundSize = `${puzzleBoard.offsetWidth}px ${puzzleBoard.offsetHeight}px`;
    piece.style.backgroundPosition = `-${x * width}px -${y * height}px`;

    // 设置三角形裁剪路径
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
