// 页面加载时获取热门分享
document.addEventListener('DOMContentLoaded', () => {
    loadFeeds('hot');
    loadMyShares();

    // 标签切换功能
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有活跃状态
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
                t.style.borderBottom = 'none';
            });
            document.querySelectorAll('.tab-content').forEach(c => {
                c.style.display = 'none';
            });

            // 激活当前标签
            tab.classList.add('active');
            tab.style.borderBottom = '2px solid #FAAD14';
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).style.display = 'block';
        });
    });
});

// 加载热门/最新分享
function loadFeeds(type) {
    // 更新按钮状态
    document.querySelectorAll('.feed-type-btn').forEach(btn => {
        if (btn.textContent.trim().toLowerCase() === type) {
            btn.classList.add('active');
            btn.style.backgroundColor = '#FAAD14';
            btn.style.color = 'white';
            btn.style.border = 'none';
        } else {
            btn.classList.remove('active');
            btn.style.backgroundColor = '#20223A';
            btn.style.color = '#B8BCC8';
            btn.style.border = '1px solid #333';
        }
    });

    // 显示加载状态
    const shareList = document.querySelector('.share-list');
    shareList.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px;">加载中...</div>';

    // 调用API获取数据
    fetch(`/api/share/feeds?type=${type}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            return response.json();
        })
        .then(data => {
            // 清空列表
            shareList.innerHTML = '';

            if (data.length === 0) {
                shareList.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #B8BCC8;">暂无分享内容</div>';
                return;
            }

            // 渲染分享内容
            data.forEach(item => {
                shareList.appendChild(createShareCard(item, false));
            });
        })
        .catch(error => {
            console.error('获取分享内容失败:', error);
            shareList.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ff4d4f;">加载失败，请重试</div>';
        });
}

// 加载我的分享
function loadMyShares() {
    const mySharesList = document.getElementById('mySharesList');
    mySharesList.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px;">加载中...</div>';

    fetch('/api/share/mine')
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            return response.json();
        })
        .then(data => {
            // 清空列表
            mySharesList.innerHTML = '';
            document.getElementById('noMyShares').style.display = 'none';

            if (data.length === 0) {
                document.getElementById('noMyShares').style.display = 'block';
                return;
            }

            // 渲染我的分享内容
            data.forEach(item => {
                mySharesList.appendChild(createShareCard(item, true));
            });
        })
        .catch(error => {
            console.error('获取我的分享失败:', error);
            mySharesList.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ff4d4f;">加载失败，请重试</div>';
        });
}

// 创建分享卡片
function createShareCard(item, isMine) {
    <div style="position: relative; margin-bottom: 12px;">

            <span style="position: absolute; top: 8px; left: 8px;
                         background-color: ${difficultyColor};
                         color: #FFF; font-size: 12px; padding: 2px 8px; border-radius: 4px;">
                ${item.difficulty || '中等'}
            </span>
            ${isMine ? `
            <span style="position: absolute; top: 8px; right: 8px;
                         background-color: rgba(0,0,0,0.7);
                         color: #FFF; font-size: 12px; padding: 2px 8px; border-radius: 4px;">
                分享码: #${item.shareCode}
            </span>` : ''}
        </div>
        <h3 style="font-size: 16px; margin-bottom: 8px; color: #F9E078; padding: 0 8px;">
            ${item.title || '未命名关卡'}
        </h3>
        <div style="display: flex; justify-content: space-between; padding: 0 8px 8px;">
            <span style="font-size: 12px; color: #B8BCC8;">创作者: ${item.creator || '未知用户'}</span>
            <span style="font-size: 12px; color: #B8BCC8;">${item.size || '4×4'}</span>
        </div>
    `;

    // 如果是我的分享，添加取消分享按钮
    if (isMine) {
        cardContent += `
           <div style="position: absolute; bottom: 0; left: 0; right: 0;
                        background-color: rgba(0,0,0,0.7); padding: 8px; display: none;">
                <button onclick="cancelShare(${item.puzzleId}, event)"
                        style="width: 100%; padding: 6px;
                               background-color: #ff4d4f;
                               color: white; border: none;
                               border-radius: 4px; cursor: pointer;">
                    取消分享
                </button>
            </div>
        `;

        // 鼠标悬停显示取消分享按钮
        card.addEventListener('mouseenter', () => {
            const btnContainer = card.querySelector('div[style*="position: absolute"][style*="bottom: 0"]');
            if (btnContainer) btnContainer.style.display = 'block';
        });

        card.addEventListener('mouseleave', () => {
            const btnContainer = card.querySelector('div[style*="position: absolute"][style*="bottom: 0"]');
            if (btnContainer) btnContainer.style.display = 'none';
        });
    }

    card.innerHTML = cardContent;

    // 点击卡片加载对应的拼图
    card.addEventListener('click', (e) => {
        // 如果点击的是取消分享按钮，则不加载拼图
        if (!e.target.closest('button[onclick^="cancelShare"]')) {
            loadSharedPuzzle(item.id, item.imageUrl, parseInt(item.size) || 4);
        }
    });

    return card;
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

    // 由于没有专门的搜索接口，这里采用从热门和最新列表中查找匹配的分享码
    // 实际项目中如果有专门的搜索接口，应替换为：
    // fetch(`/api/share/search?code=${code}`)
    Promise.all([
        fetch('/api/share/feeds?type=hot').then(res => res.json()),
        fetch('/api/share/feeds?type=new').then(res => res.json())
    ])
    .then(([hotData, newData]) => {
        // 合并数据并查找匹配的分享码
        const allData = [...hotData, ...newData];
        const matches = allData.filter(item => item.shareCode === code);

        resultContent.innerHTML = '';

        if (matches.length > 0) {
            matches.forEach(item => {
                resultContent.appendChild(createShareCard(item, item.isMine || false));
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

// 取消分享功能
function cancelShare(puzzleId, event) {
    // 阻止事件冒泡，避免触发卡片点击事件
    event.stopPropagation();

    if (confirm('确定要取消分享这个关卡吗？')) {
        fetch(`/api/puzzles/${puzzleId}/share`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                // 这里可以添加认证信息，如token
                // 'Authorization': 'Bearer ' + getToken()
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('取消分享失败');
            }
            // 刷新我的分享列表
            loadMyShares();
            // 提示用户操作成功
            alert('已成功取消分享');
        })
        .catch(error => {
            console.error('取消分享失败:', error);
            alert('取消分享失败，请重试');
        });
    }
}

// 加载分享的拼图（假设的函数，实际实现可能不同）
function loadSharedPuzzle(id, imageUrl, size) {
    console.log(`加载拼图: ${id}, 图片: ${imageUrl}, 尺寸: ${size}×${size}`);
    // 实际项目中这里会跳转到拼图页面或加载拼图
    // window.location.href = `/puzzle/share/${id}?size=${size}`;
    alert(`将加载分享码为 ${id} 的拼图`);
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