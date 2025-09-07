// 所有页面通用：判断登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('puzzleToken');
    const isLogin = !!token;
    // 示例：隐藏需要登录的按钮
    if (!isLogin) {
        document.querySelectorAll('.need-login').forEach(el => {
            el.style.display = 'none';
        });
        // 未登录点击“我的拼图”，提示登录
        document.getElementById('myPuzzleBtn')?.addEventListener('click', () => {
            alert('请先登录后查看存档！');
            document.getElementById('loginModal').style.display = 'flex';
        });
    }
    return isLogin;
}

// 页面加载时调用
window.onload = function() {
    checkLoginStatus();
};
// loading.html 中获取关卡ID
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('levelId'); // 系统关卡ID
    const archiveId = urlParams.get('archiveId'); // 存档ID
    const customLevelId = urlParams.get('customLevelId'); // 自定义关卡ID

    // 模拟资源加载（加载图片、图块数据、音乐）
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 10;
        document.getElementById('progressText').textContent = `加载中... ${progress}%`;
        if (progress >= 100) {
            clearInterval(progressInterval);
            // 加载完成，跳转至游戏页
            if (levelId) {
                window.location.href = `game.html?levelId=${levelId}`;
            } else if (archiveId) {
                window.location.href = `game.html?archiveId=${archiveId}`;
            } else if (customLevelId) {
                window.location.href = `game.html?customLevelId=${customLevelId}`;
            }
        }
    }, 300);
};