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
                div.style.border = '1px solid #eee';
                div.style.padding = '16px';
                div.style.borderRadius = '8px';
                div.style.background = '#222';
                div.innerHTML = `
                    <div style="font-weight:bold;color:#F9E078;">${item.title || '未命名关卡'}</div>
                    <div style="margin:8px 0;">
                        <img src="${item.imageUrl}" alt="" style="width:100%;max-width:180px;border-radius:4px;">
                    </div>
                    <div style="font-size:12px;color:#B8BCC8;">分享码: ${item.share_code}</div>
                    <div style="font-size:12px;color:#B8BCC8;">作者: ${item.creator}</div>
                    <div style="font-size:12px;color:#B8BCC8;">难度: ${item.difficulty}</div>
                    <div style="font-size:12px;color:#B8BCC8;">尺寸: ${item.size}</div>
                `;
                container.appendChild(div);
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
                div.style.border = '1px solid #eee';
                div.style.padding = '16px';
                div.style.borderRadius = '8px';
                div.style.background = '#222';
                div.innerHTML = `
                    <div style="font-weight:bold;color:#F9E078;">${item.title || '未命名关卡'}</div>
                    <div style="margin:8px 0;">
                        <img src="${item.imageUrl}" alt="" style="width:100%;max-width:180px;border-radius:4px;">
                    </div>
                    <div style="font-size:12px;color:#B8BCC8;">分享码: ${item.share_code}</div>
                    <div style="font-size:12px;color:#B8BCC8;">作者: ${item.creator}</div>
                    <div style="font-size:12px;color:#B8BCC8;">难度: ${item.difficulty}</div>
                    <div style="font-size:12px;color:#B8BCC8;">尺寸: ${item.size}</div>
                `;
                container.appendChild(div);
            });
        })
        .catch(() => {
            const container = document.getElementById('mySharesList');
            if (container) container.innerHTML = '<div style="text-align:center;color:#ff4d4f;">加载失败</div>';
        });
}