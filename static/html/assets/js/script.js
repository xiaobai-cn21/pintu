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
    for (let y = 0; y < difficulty; y++) {
        for (let x = 0; x < difficulty; x++) {
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece';
            piece.style.width = `${pieceWidth}px`;
            piece.style.height = `${pieceHeight}px`;
            piece.style.backgroundImage = `url(${originalImageUrl})`;
            piece.style.backgroundSize = `${puzzleBoard.offsetWidth}px ${puzzleBoard.offsetHeight}px`;
            piece.style.backgroundPosition = `-${x * pieceWidth}px -${y * pieceHeight}px`;
            piece.dataset.correctX = x;
            piece.dataset.correctY = y;
            piece.draggable = true;
            piece.addEventListener('dragstart', dragStart);
            piece.addEventListener('dragend', dragEnd);
            // 触摸设备支持
            piece.addEventListener('touchstart', touchStart, { passive: false });
            piece.addEventListener('touchmove', touchMove, { passive: false });
            piece.addEventListener('touchend', touchEnd);
            pieces.push(piece);
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
    if (findPieceOnBoard(gridX, gridY)) return;
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
    if (allPieces.length !== difficulty * difficulty) return;
    let completed = true;
    allPieces.forEach(piece => {
        if (
            parseInt(piece.dataset.currentX) !== parseInt(piece.dataset.correctX) ||
            parseInt(piece.dataset.currentY) !== parseInt(piece.dataset.correctY)
        ) {
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
    if (customImage && customSize) {
        originalImageUrl = customImage;
        difficulty = parseInt(customSize);
        setPuzzleBg();
        startGame();
        localStorage.removeItem('customImage');
        localStorage.removeItem('customSize');
    } else {
        setPuzzleBg();
    }
});