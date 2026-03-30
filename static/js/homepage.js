// ... JavaScript 部分无需改动 ...
// --- 深度指示器功能 ---
function updateDepthIndicator() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const heroElement = document.querySelector('.hero');
    const heroHeight = heroElement.offsetHeight;
    const viewCenter = scrollTop + (window.innerHeight / 2);
    const zeroPoint = heroHeight - 5;
    const depthInPixels = zeroPoint - viewCenter;
    const depthInMeters = Math.round(depthInPixels / 10);
    const depthTextLeft = document.querySelector('.depth-text-left');
    depthTextLeft.textContent = depthInMeters + 'm';
    const depthLineLeft = document.querySelector('.depth-line-left');
    if (depthInMeters < -10) {
        const dangerColor = '#ff6b6b';
        depthLineLeft.style.background = `repeating-linear-gradient(to right, ${dangerColor} 0px, ${dangerColor} 8px, transparent 8px, transparent 12px)`;
        depthTextLeft.style.color = dangerColor;
    } else if (depthInMeters < -5) {
        const warningColor = '#ffaa44';
        depthLineLeft.style.background = `repeating-linear-gradient(to right, ${warningColor} 0px, ${warningColor} 8px, transparent 8px, transparent 12px)`;
        depthTextLeft.style.color = warningColor;
    } else {
        const safeColor = '#4ecdc4';
        depthLineLeft.style.background = `repeating-linear-gradient(to right, ${safeColor} 0px, ${safeColor} 8px, transparent 8px, transparent 12px)`;
        depthTextLeft.style.color = safeColor;
    }
}
window.addEventListener('scroll', updateDepthIndicator);
updateDepthIndicator();

// --- 手电筒效果 ---
const supportsHover = window.matchMedia('(hover: hover)').matches;
const cursorDot = document.querySelector('.cursor-dot');
if (supportsHover) {
    window.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        requestAnimationFrame(() => {
            document.documentElement.style.setProperty('--cursor-x', clientX + 'px');
            document.documentElement.style.setProperty('--cursor-y', clientY + 'px');
            cursorDot.style.left = clientX + 'px';
            cursorDot.style.top = clientY + 'px';
        });
    });
}

// ============================================================
// == V V V V      新增：基地滚动位置记忆系统      V V V V ==
// ============================================================

// 1. 定义存储键名
const SCROLL_KEY = 'jio_base_scroll_position';

// 2. 页面加载时：检查是否有保存的位置，如果有，尝试恢复
// 注意：这里不在 DOMContentLoaded 里执行，而是直接执行，能稍微减少闪烁
if (sessionStorage.getItem(SCROLL_KEY)) {
    const savedPosition = parseInt(sessionStorage.getItem(SCROLL_KEY), 10);

    // 只有当位置大于 0 时才恢复
    if (savedPosition > 0) {
        // 告诉浏览器：我要手动恢复，你别插手（防止浏览器自带的恢复机制冲突）
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        // 立即滚动到该位置
        window.scrollTo(0, savedPosition);
    }
}

// 3. 页面离开前：保存当前的滚动位置
window.addEventListener('beforeunload', () => {
    sessionStorage.setItem(SCROLL_KEY, window.scrollY);
});

// ============================================================
// == ^ ^ ^ ^          记忆系统结束              ^ ^ ^ ^ ==
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- V V V V  新功能：电梯转场逻辑 (替换了原有的平滑滚动)  V V V V ---
    const scrollTriggers = document.querySelectorAll('[data-target-id]');

    scrollTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.dataset.targetId;
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                // 1. 激活电梯关门动画
                // 给 body 添加类名，触发 CSS 中的 .elevator-door transform 动画
                document.body.classList.add('elevator-active');

                // 2. 等待关门动画完成
                // (设置 900ms 是因为 CSS 动画设置了 0.8s，留 100ms 缓冲确保门已关严)
                setTimeout(() => {

                    // 3. 计算目标位置
                    const topPosition = targetId === 'hero-section' ? 0 : targetElement.offsetTop - 20;

                    // 4. 瞬间跳转 (Instant Jump)
                    // 关键点：behavior 必须是 'auto'，这样是在黑暗中瞬间完成的，用户感觉不到
                    window.scrollTo({
                        top: topPosition,
                        behavior: 'auto'
                    });

                    // 5. 强制更新状态
                    // 跳转后立即更新深度指示器和侧边栏，防止开门瞬间看到旧的数值闪烁
                    if (typeof updateDepthIndicator === 'function') updateDepthIndicator();
                    // 如果有 performUpdates 函数（用于侧边栏定位），最好也调用一次
                    if (typeof performUpdates === 'function') performUpdates();

                    // 6. 稍微停顿后开门 (模拟电梯运行到达的感觉)
                    setTimeout(() => {
                        document.body.classList.remove('elevator-active');
                    }, 600); // 关门状态保持 600ms

                }, 900); // 900ms 后执行跳转逻辑
            }
        });
    });
    // --- ^ ^ ^ ^  电梯逻辑结束  ^ ^ ^ ^ ---

    // --- 实时时钟功能 ---
    const dateElement = document.getElementById('date-display');
    const timeElement = document.getElementById('time-display');
    function updateClock() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        dateElement.textContent = `${year}-${month}-${day}`;
        timeElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ============================================================
    // == V V V V      新增：雪花特效系统 (Snow System)      V V V V ==
    // ============================================================

    const snowCanvas = document.getElementById('snow-canvas');
    const snowToggleBtn = document.getElementById('snow-toggle');
    const ctx = snowCanvas.getContext('2d');

    let width, height;
    let particles = [];
    let animationId;
    let isSnowing = false;

    // 粒子配置
    const particleCount = 150; // 雪花数量
    const mouse = { x: 0, y: 0 };

    // 初始化 Canvas 尺寸
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        snowCanvas.width = width;
        snowCanvas.height = height;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 监听鼠标位置（制造微风效果）
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            this.x = Math.random() * width;
            // 如果是初始化，随机分布在屏幕上；如果是重置，从顶部落下
            this.y = initial ? Math.random() * height : -10;
            this.vx = (Math.random() - 0.5) * 0.5; // 水平飘动速度
            this.vy = Math.random() * 1.5 + 0.5;   // 下落速度
            this.size = Math.random() * 2 + 0.5;   // 雪花大小
            this.opacity = Math.random() * 0.5 + 0.1; // 透明度
            this.meltSpeed = Math.random() * 0.01 + 0.005;
        }

        update() {
            this.y += this.vy;
            this.x += this.vx;

            // 鼠标交互：轻微的风力
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                const forceDirectionX = dx / dist;
                const force = (150 - dist) / 150;
                this.vx += forceDirectionX * force * 0.05;
            }

            // 边界检查
            if (this.y > height || this.x < -50 || this.x > width + 50) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animateSnow() {
        if (!isSnowing) return; // 停止循环

        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        animationId = requestAnimationFrame(animateSnow);
    }

    function startSnow() {
        if (!isSnowing) {
            isSnowing = true;
            document.body.classList.add('snow-active');
            snowToggleBtn.textContent = "Toggle Snow: ON";
            initParticles();
            animateSnow();
            localStorage.setItem('jio_snow_enabled', 'true');
        }
    }

    function stopSnow() {
        if (isSnowing) {
            isSnowing = false;
            document.body.classList.remove('snow-active');
            snowToggleBtn.textContent = "Toggle Snow: OFF";
            cancelAnimationFrame(animationId);
            ctx.clearRect(0, 0, width, height); // 清空画布
            localStorage.setItem('jio_snow_enabled', 'false');
        }
    }

    // 按钮点击事件
    snowToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isSnowing) stopSnow();
        else startSnow();
    });

    // 初始化：检查本地存储
    if (localStorage.getItem('jio_snow_enabled') === 'true') {
        startSnow();
    }

    // ============================================================
    // == ^ ^ ^ ^          雪花特效系统结束          ^ ^ ^ ^ ==
    // ============================================================


    // --- 动态更新扇区深度线位置 ---
    function updateSectorDepths() {
        console.log("开始动态演算扇区深度...");
        const sectorCards = document.querySelectorAll('.page-card');

        sectorCards.forEach(card => {
            const titleElement = card.querySelector('h2');
            if (!titleElement) return;

            const titleText = titleElement.textContent;
            const match = titleText.match(/\[-?(\d+)m\]/);

            if (match && match[1]) {
                const depthInMeters = parseInt(match[1], 10);
                const targetId = card.dataset.targetId;
                const lineElement = document.getElementById(targetId);

                if (lineElement) {
                    const depthInPixels = depthInMeters * 10;
                    const newTopPosition = `calc(100vh + ${depthInPixels}px)`;

                    // 动态应用分界线样式 (这部分不变)
                    lineElement.style.top = newTopPosition;

                    // (可选增强) 更新分界线文本 (这部分不变)
                    const lineTextElement = lineElement.querySelector('.border-text');
                    if (lineTextElement) {
                        const sectorMatch = lineTextElement.textContent.match(/Sector-\d+/);
                        const sectorLabel = sectorMatch ? sectorMatch[0] : 'Sector';
                        lineTextElement.textContent = `${sectorLabel} Depth: ${depthInMeters}m`;
                    }

                    // --- V V V V  升级后的核心逻辑  V V V V ---
                    // 目标：为所有扇区动态定位其内容锚点

                    // 1. 从 targetId (例如 "sector-1-line") 推断出 contentAnchorId (例如 "sector-1-content-anchor")
                    const contentAnchorId = targetId.replace('-line', '-content-anchor');
                    const contentAnchor = document.getElementById(contentAnchorId);

                    // 2. 如果找到了对应的内容锚点容器，就定位它
                    if (contentAnchor) {
                        const contentOffset = 60; // 统一的 60px 间距
                        const contentTopPosition = `calc(100vh + ${depthInPixels}px + ${contentOffset}px)`;

                        // 动态应用样式
                        contentAnchor.style.top = contentTopPosition;

                        // 从控制台日志可以确认所有扇区都被定位了
                        // console.log(`${contentAnchorId} 已动态定位至: ${contentTopPosition}`);
                    }
                    // --- ^ ^ ^ ^  升级后的核心逻辑结束  ^ ^ ^ ^ ---
                }
            }
        });
        console.log("扇区深度演算完毕。");
    }

    // 页面加载时执行一次
    updateSectorDepths();

    // --- V V V V  全新添加的对齐逻辑  V V V V ---

    // 定义一个函数，用于测量源容器并对齐所有文章卡片锚点
    function alignArticleContainers() {
        // 源容器：我们以此为基准进行对齐（即导航卡片所在的左侧栏）
        const sourceContainer = document.querySelector('.left-column');
        // 目标容器：所有需要被对齐的文章卡片容器
        const articleAnchors = document.querySelectorAll('[id$="-content-anchor"]');

        if (sourceContainer && articleAnchors.length > 0) {
            // 使用 getBoundingClientRect() 获取源容器在视口中的精确位置和尺寸
            const rect = sourceContainer.getBoundingClientRect();

            // 遍历所有文章卡片容器
            articleAnchors.forEach(anchor => {
                // 将源容器的 left 和 width 值应用到目标上
                // rect.left 是源容器左边界距离视口左侧的距离
                // rect.width 是源容器的实际渲染宽度
                anchor.style.left = `${rect.left}px`;
                anchor.style.width = `${rect.width}px`;
            });
        }
    }

    // 在页面首次加载时，执行一次对齐
    alignArticleContainers();

    // 在浏览器窗口大小改变时，重新执行对齐，以确保响应式
    window.addEventListener('resize', alignArticleContainers);

    // --- ^ ^ ^ ^  全新添加的对齐逻辑结束  ^ ^ ^ ^ ---

    // --- 智能悬浮面板、动态宽度和竖线延长功能 ---
    const mainGrid = document.querySelector('.main-content-grid');
    const rightPanel = document.querySelector('.right-panel');
    const elevatorPanel = document.getElementById('elevator-panel');
    const lastLine = document.getElementById('sector-8-line');
    const zeroDepthLine = document.querySelector('.hero .border-line');

    function performUpdates() {
        if (mainGrid && lastLine) {
            const gridTop = mainGrid.offsetTop;
            const requiredHeight = (lastLine.offsetTop + lastLine.offsetHeight) - gridTop;
            mainGrid.style.minHeight = requiredHeight + 'px';
        }

        if (rightPanel && elevatorPanel) {
            // 核心修改：选择器从 .right-panel 变为 .right-panel .panel-content
            const rightPanelContent = document.querySelector('.right-panel .panel-content');

            // 确保我们找到了这个更精确的元素
            if (rightPanelContent) {
                const rect = rightPanelContent.getBoundingClientRect();

                // --- V V V V  在这里精调水平位置  V V V V ---

                // 定义一个水平偏移量（单位：像素）
                // 正数向右移动，负数向左移动
                const horizontalOffset = 32;

                // --- ^ ^ ^ ^  在这里精调水平位置  ^ ^ ^ ^ ---

                // 设置宽度
                elevatorPanel.style.width = rect.width + 'px';

                // 设置左侧位置时，加上我们的偏移量
                elevatorPanel.style.left = (rect.left + horizontalOffset) + 'px';
            }
        }

        if (elevatorPanel && zeroDepthLine) {
            const panelHeight = elevatorPanel.offsetHeight;
            const fixedTopPosition = (window.innerHeight - panelHeight) / 2;
            const scrollThreshold = zeroDepthLine.offsetTop - fixedTopPosition;

            if (window.scrollY > scrollThreshold) {
                elevatorPanel.style.position = 'fixed';
                elevatorPanel.style.top = fixedTopPosition + 'px';
            } else {
                elevatorPanel.style.position = 'absolute';
                elevatorPanel.style.top = (zeroDepthLine.offsetTop + 20) + 'px';
            }
        }
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                performUpdates();
                ticking = false;
            });
            ticking = true;
        }
    });

    window.addEventListener('load', performUpdates);
    window.addEventListener('resize', performUpdates);
});
