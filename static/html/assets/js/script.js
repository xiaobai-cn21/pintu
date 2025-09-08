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
//SVG 定义容器
const svgDefs = document.getElementById('puzzle-defs');

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

    // 同样，这里的清理现在是安全的
    puzzleBoard.innerHTML = '';
    piecesZone.innerHTML = '';
    if (svgDefs) {
        svgDefs.innerHTML = '';
    }
    pieces = [];

    // 直接调用 startGame 来处理所有重置和启动逻辑
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
    setTimeout(checkPuzzleCompletion, 50);
    //checkPuzzleCompletion();
}

function dragOver(e) {
    e.preventDefault();
}

// 拖拽到棋盘
function dropOnBoard(e) {
    e.preventDefault();
    if (!draggedPiece) return;

    draggedPiece.style.margin = '0'; // 放置到棋盘时清除 margin

    const pieceWidth = puzzleBoard.offsetWidth / difficulty;
    const pieceHeight = puzzleBoard.offsetHeight / difficulty;
    const boardRect = puzzleBoard.getBoundingClientRect();

    let x = e.clientX - boardRect.left;
    let y = e.clientY - boardRect.top;

    let gridX = Math.floor(x / pieceWidth);
    let gridY = Math.floor(y / pieceHeight);

    // 边界检查
    gridX = Math.max(0, Math.min(gridX, difficulty - 1));
    gridY = Math.max(0, Math.min(gridY, difficulty - 1));

    let finalLeft, finalTop;

    if (shape === 'jigsaw' || shape === 'square') {
        // --- 方形和异形块的逻辑保持不变 ---
        if (findPieceOnBoard(gridX, gridY)) {
            returnToZone(draggedPiece);
            return;
        }

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

    } else if (shape === 'triangle') {
        // --- ✨ 全新自由逻辑：移除 (x+y)%2 的限制，允许任何兼容的三角形组合 ✨ ---

        const draggedPieceType = draggedPiece.dataset.type; // 获取正在拖动的块的类型，例如 'top-left'

        // 1. 查找目标格子里所有已经存在的三角块
        const piecesInCell = Array.from(
            puzzleBoard.querySelectorAll(`.puzzle-piece.triangle[data-current-x='${gridX}'][data-current-y='${gridY}']`)
        );

        // 2. 检查格子是否已满 (最多只能有2个)
        if (piecesInCell.length >= 2) {
            returnToZone(draggedPiece); // 如果格子满了，直接送回
            return;
        }

        // 3. 检查是否要放置的“类型”已经存在于格子中
        const typeAlreadyExists = piecesInCell.some(p => p.dataset.type === draggedPieceType);
        if (typeAlreadyExists) {
            returnToZone(draggedPiece); // 如果这个类型的槽位被占了，送回
            return;
        }

        // 4. 如果格子里已经有1个块，检查即将放入的块是否与它“兼容”（能拼成正方形）
        if (piecesInCell.length === 1) {
            const existingPieceType = piecesInCell[0].dataset.type;

            // 定义所有兼容的配对关系
            const isCompatible =
                (draggedPieceType === 'top-left' && existingPieceType === 'bottom-right') ||
                (draggedPieceType === 'bottom-right' && existingPieceType === 'top-left') ||
                (draggedPieceType === 'top-right' && existingPieceType === 'bottom-left') ||
                (draggedPieceType === 'bottom-left' && existingPieceType === 'top-right');

            if (!isCompatible) {
                returnToZone(draggedPiece); // 如果是不兼容的组合（例如 top-left 和 top-right），送回
                return;
            }
        }

        // 5. 所有检查都通过了，说明可以安全放置
        draggedPiece.dataset.position = draggedPieceType; // 对于三角块，它的“放置位置”就是它自身的“类型”
        finalLeft = `${gridX * pieceWidth}px`;
        finalTop = `${gridY * pieceHeight}px`;
        // --- 新逻辑结束 ---
    }

    // 统一设置最终位置和数据
    draggedPiece.style.position = "absolute";
    draggedPiece.style.left = finalLeft;
    draggedPiece.style.top = finalTop;
    draggedPiece.dataset.currentX = gridX;
    draggedPiece.dataset.currentY = gridY;

    puzzleBoard.appendChild(draggedPiece);

    moves++;
    movesElement.textContent = `移动次数: ${moves}`;
}

// 拖拽回piecesZone
function dropOnZone(e) {
    e.preventDefault();
    if (!draggedPiece) return;
    draggedPiece.style.position = 'static';

    draggedPiece.style.left = '';
    draggedPiece.style.top = '';

    if (shape === 'jigsaw') { // 放回去时恢复 margin
        const pieceHeight = puzzleBoard.offsetHeight / difficulty;
        draggedPiece.style.margin = `${(pieceHeight * JIGSAW_TAB_RATIO) / 2}px`;
    }

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
    const newRotation = (currentRotation + 90) % 360;
    piece.dataset.rotation = newRotation;
    const isFlipped = piece.dataset.flipped === 'true';
    piece.style.transform = `rotate(${newRotation}deg) scaleX(${isFlipped ? -1 : 1})`;
}

// 翻转拼图块
function flipPiece(piece) {
    const isFlipped = piece.dataset.flipped === 'true';
    const newFlipped = !isFlipped;
    piece.dataset.flipped = newFlipped;
    const currentRotation = parseInt(piece.dataset.rotation) || 0;
    piece.style.transform = `rotate(${currentRotation}deg) scaleX(${newFlipped ? -1 : 1})`;
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
