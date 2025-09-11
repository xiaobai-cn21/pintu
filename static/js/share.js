document.addEventListener('DOMContentLoaded', () => {
    // 默认加载全部分享到发现页
    loadAllShares();

    // 标签切换
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).style.display = 'block';
            if (tabId === 'myShares') {
                loadMyShares();
            } else {
                loadAllShares();
            }
        });
    });
});

// 加载全部分享
function loadAllShares() {
    fetch('/share/shares')
        .then(res => res.json())
        .then(data => {
            const container = document.querySelector('#discoverContent .share-list');
            container.innerHTML = '';
            if (!data.length) {
                container.innerHTML = '<div style="text-align:center;color:#888;">暂无分享</div>';
                return;
            }
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'share-card';
                div.style.border = '4px solid #F9E078'; // 金色边框，匹配目标样式
                div.style.padding = '16px';
                div.style.borderRadius = '0px';
                div.style.background = '#282846';
                div.style.width = '220px';
                div.innerHTML = `
                     <div style="position: relative; margin-bottom: 12px;">
                <img src="${item.imageUrl}" alt="" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px;margin-bottom: 10px;">
                 <div style="font-size:18px;font-weight:bold;color:#F9E078;margin-bottom: 10px;white-space: nowrap; overflow: hidden;">${item.title || '未命名关卡'}</div>
                <div style="font-size:12px;color:#F9E078;margin-bottom: 8px;">分享码: ${item.share_code}</div>
                <div style="font-size:12px;color:#F9E078;white-space: nowrap; overflow: hidden;">作者: ${item.creator}</div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button class="btn-edit" style="flex: 1; padding: 6px; background: #282846; color: #F9E078; border: 3px solid #F9E078; border-radius: 0px; cursor: pointer;box-shadow: 3px 3px 0px #1A1A2E;">
                             开始游戏
                        </button>
                    </div>
                       </div>
                `;
                container.appendChild(div);
                 // 为开始游戏按钮添加事件监听
                const gameBtn = div.querySelector('.btn-edit');
                gameBtn.addEventListener('click', () => gameStart(item.puzzleId));
            });
        })
        .catch(() => {
            const container = document.querySelector('#discoverContent .share-list');
            container.innerHTML = '<div style="text-align:center;color:#ff4d4f;">加载失败</div>';
        });
}

// 加载我的分享
function loadMyShares() {
    // 假设你登录后把 user_id 存在 localStorage
    const myUserId = 16;
    if (!myUserId) {
        document.getElementById('mySharesList').innerHTML = '<div style="text-align:center;color:#888;">请先登录</div>';
        return;
    }
    fetch(`/share/shares?user_id=${myUserId}`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('mySharesList');
            if (!container) return;
            container.innerHTML = '';
            if (!data.length) {
                document.getElementById('noMyShares').style.display = 'block';
                return;
            }
            document.getElementById('noMyShares').style.display = 'none';
            data.forEach(item => {
              const div = document.createElement('div');
                div.className = 'share-card';
                div.style.border = '4px solid #F9E078'; // 金色边框，匹配目标样式
                div.style.padding = '16px';
                div.style.borderRadius = '0px';
                div.style.background = '#282846';
                div.style.width = '220px';
                div.innerHTML = `
                     <div style="position: relative; margin-bottom: 12px;">
                <img src="${item.imageUrl}" alt="" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px;margin-bottom: 10px;">
                 <div style="font-size:18px;font-weight:bold;color:#F9E078;margin-bottom: 10px;white-space: nowrap; overflow: hidden;">${item.title || '未命名关卡'}</div>
                <div style="font-size:12px;color:#F9E078;">分享码: ${item.share_code}</div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button class="btn-edit" style="flex: 1; padding: 6px; background: #282846; color: #F9E078; border: 3px solid #F9E078; border-radius: 0px; cursor: pointer;box-shadow: 3px 3px 0px #1A1A2E;">
                             开始游戏
                        </button>
                        <button class="btn-delete" style="flex: 1; padding: 6px; background: #282846; color: #F9E078;border: 3px solid #FF5555; border-radius: 0px; cursor: pointer;box-shadow: 3px 3px 0px #1A1A2E;">
                             删除
                        </button>
                    </div>
                       </div>
                `;
                container.appendChild(div);
                // 为删除按钮添加事件监听
                const deleteBtn = div.querySelector('.btn-delete');
                deleteBtn.addEventListener('click', () => handleDeleteShare(item.id));
                 // 为开始游戏按钮添加事件监听
                const gameBtn = div.querySelector('.btn-edit');
                gameBtn.addEventListener('click', () => gameStart(item.puzzleId));
             });
        })
        .catch(() => {
            const container = document.querySelector('#discoverContent .share-list');
            container.innerHTML = '<div style="text-align:center;color:#ff4d4f;">加载失败</div>';
        });
}
function gameStart(puzzleId) {
    // 修正URL的反引号使用，确保puzzleId正确解析
    fetch(`/pic/puzzles/${puzzleId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        // 先解析响应体（接口返回的是JSON格式）
        return res.json().then(data => {
            // 同时处理HTTP状态和业务状态码
            if (!res.ok || data.code !== 200) {
                throw new Error(data.message || '加载拼图信息失败');
            }
            return data;
        });
    })
    .then(responseData => {
        const puzzleData = responseData.data;
        const difficulty = puzzleData.piece_count;
        // 从接口返回数据中提取所需参数
        localStorage.setItem('customImage', puzzleData.image_url);
        localStorage.setItem('customSize',  puzzleData.piece_count );
        localStorage.setItem('customShape', puzzleData.piece_shape);
        localStorage.setItem('randomRotation', puzzleData.is_rotatable);
        localStorage.setItem('randomFlip', puzzleData.is_flipable);
        // 存储拼图ID用于后续进度保存
        localStorage.setItem('currentPuzzleId', puzzleId);
        // 跳转到游戏页面（确保URL正确，根据实际路由调整）
        window.location.href = '/game'; // 替换为实际游戏页面路径
    })
    .catch(err => {
        console.error('游戏启动失败:', err.message);
        // 可以添加用户提示，比如alert(err.message)
    });
}
// 处理删除分享
function handleDeleteShare(shareId) {
    const modal = document.createElement('div');
    modal.id = 'deleteConfirmModal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 1000;
        justify-content: center;
        align-items: center;
    `;

    // 模态框内容，样式参考关卡卡片
    modal.innerHTML = `
        <div style="
            border: 4px solid #F9E078;
            background: #282846;
            padding: 20px;
            width: 300px;
            border-radius: 0px;
        ">
            <h3 style="
                color: #F9E078;
                margin-top: 0;
                text-align: center;
                font-size: 18px;
                font-weight: bold;
            ">确认删除</h3>

            <p style="
                color: #F9E078;
                text-align: center;
                font-size: 14px;
                margin: 15px 0;
            ">确定要删除这个分享吗？<br>删除后将无法恢复。</p>

            <div style="
                display: flex;
                gap: 10px;
                margin-top: 20px;
            ">
                <button id="cancelDeleteBtn" style="
                    flex: 1;
                    padding: 6px;
                    background: #282846;
                    color: #F9E078;
                    border: 3px solid #F9E078;
                    border-radius: 0px;
                    cursor: pointer;
                    box-shadow: 3px 3px 0px #1A1A2E;
                    font-size: 16px;
                ">
                    取消
                </button>

                <button id="confirmDeleteBtn" style="
                    flex: 1;
                    padding: 6px;
                    background: #282846;
                    color: #FF5555;
                    border: 3px solid #FF5555;
                    border-radius: 0px;
                    cursor: pointer;
                    box-shadow: 3px 3px 0px #1A1A2E;
                    font-size: 16px;
                ">
                    确认删除
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    // 关键：添加后设置显示
    modal.style.display = 'flex';  // 新增这一行，让模态框显示

    // 绑定取消按钮事件（补充取消逻辑）
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
        modal.style.display = 'none'; // 隐藏模态框
        document.body.removeChild(modal); // 可选：从DOM中移除
    });
     // 绑定确认按钮事件
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
     fetch(`/share/shares/${shareId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('删除失败');
        }
        // 删除成功后重新加载我的分享列表
        loadMyShares();
       //alert('删除成功');
    })
    .catch(err => {
        console.error('删除失败:', err);
        alert('删除失败，请稍后重试');
    });
     modal.style.display = 'none'; // 处理完后隐藏
        document.body.removeChild(modal); // 可选：从DOM中移除
    });

}
// 创建分享卡片（复用样式，根据是否为我的分享决定是否显示删除按钮）
function createShareCard(item, isMyShare) {
    const div = document.createElement('div');
    div.className = 'share-card';
    // 统一样式，与发现页分享卡片保持一致
    div.style.border = '4px solid #F9E078';
    div.style.padding = '16px';
    div.style.borderRadius = '0px';
    div.style.background = '#282846';
    div.style.width = '220px';

    // 卡片内容（根据是否为我的分享动态调整）
    div.innerHTML = `
        <div style="position: relative; margin-bottom: 12px;">
            <img src="${item.imageUrl}" alt="" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;">
            <div style="font-size:18px; font-weight:bold; color:#F9E078; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${item.title || '未命名关卡'}
            </div>
            <div style="font-size:12px; color:#F9E078; margin-bottom: 8px;">
                分享码: ${item.share_code}
            </div>
            ${!isMyShare ? `
                <div style="font-size:12px; color:#F9E078; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    作者: ${item.creator || '未知'}
                </div>
            ` : ''}
            <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="btn-edit" style="flex: 1; padding: 6px; background: #282846; color: #F9E078; border: 3px solid #F9E078; border-radius: 0px; cursor: pointer; box-shadow: 3px 3px 0px #1A1A2E;">
                    开始游戏
                </button>
                ${isMyShare ? `
                    <button class="btn-delete" style="flex: 1; padding: 6px; background: #282846; color: #F9E078; border: 3px solid #FF5555; border-radius: 0px; cursor: pointer; box-shadow: 3px 3px 0px #1A1A2E;">
                        删除
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    // 绑定开始游戏按钮事件
    const gameBtn = div.querySelector('.btn-edit');
    gameBtn.addEventListener('click', () => gameStart(item.puzzleId));

    // 如果是我的分享，绑定删除按钮事件
    if (isMyShare) {
        const deleteBtn = div.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => handleDeleteShare(item.id));
    }

    return div;
}
// 搜索分享码功能
function searchShareCode() {
    const codeInput = document.getElementById('shareCode');
    const codeError = document.getElementById('codeError');
    const shareList = document.querySelector('.share-list');
    const searchResult = document.getElementById('searchResult');
    const resultContent = document.getElementById('resultContent');
    const noResult = document.getElementById('noResult');
    const searchCodeDisplay = document.getElementById('searchCodeDisplay');
    const code = codeInput.value.trim();

    // 验证输入
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        codeError.style.display = 'block';
        return;
    }
    codeError.style.display = 'none';

    // 显示搜索结果区域，隐藏原有列表
    shareList.style.display = 'none';
    searchResult.style.display = 'block';
    searchCodeDisplay.textContent = code;
    resultContent.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px;">搜索中...</div>';
    noResult.style.display = 'none';

    // 使用新的搜索接口
    fetch(`/share/shares/search?code=${code}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('搜索失败');
            }
            return response.json();
        })
        .then(data => {
            resultContent.innerHTML = '';

            if (data.data && data.data.length > 0) {
                data.data.forEach(item => {
                    // 使用与发现分享相同的卡片样式
                    resultContent.appendChild(createShareCard(item, false));
                });
            } else {
                noResult.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('搜索失败:', error);
            resultContent.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ff4d4f;">搜索失败，请重试</div>';
        });
}
// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 初始化音乐
    if (window.musicManager) {
        window.musicManager.playScene('main');
    } else {
        setTimeout(() => {
            if (window.musicManager) {
                window.musicManager.playScene('main');
            }
        }, 100);
    }
});