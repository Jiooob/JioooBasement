function updateDepthIndicator() {
    const heroElement = document.querySelector('.hero');
    const depthTextLeft = document.querySelector('.depth-text-left');
    const depthLineLeft = document.querySelector('.depth-line-left');

    if (!heroElement || !depthTextLeft || !depthLineLeft) {
        return;
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const heroHeight = heroElement.offsetHeight;
    const viewCenter = scrollTop + (window.innerHeight / 2);
    const zeroPoint = heroHeight - 5;
    const depthInPixels = zeroPoint - viewCenter;
    const depthInMeters = Math.round(depthInPixels / 10);

    depthTextLeft.textContent = depthInMeters + 'm';

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

const supportsHover = window.matchMedia('(hover: hover)').matches;
const cursorDot = document.querySelector('.cursor-dot');

if (supportsHover && cursorDot) {
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

const SCROLL_KEY = 'jio_base_scroll_position';
const savedScrollPosition = Number(sessionStorage.getItem(SCROLL_KEY) || 0);

window.addEventListener('beforeunload', () => {
    sessionStorage.setItem(SCROLL_KEY, window.scrollY);
});

let depthIndicatorScheduled = false;
window.addEventListener('scroll', () => {
    if (!depthIndicatorScheduled) {
        depthIndicatorScheduled = true;
        window.requestAnimationFrame(() => {
            updateDepthIndicator();
            depthIndicatorScheduled = false;
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const DEPTH_SCALE = 10;
    const LINE_TO_CONTENT_GAP = 60;
    const CONTENT_TO_NEXT_LINE_GAP = 120;
    const MAIN_GRID_BOTTOM_PADDING = 80;

    const scrollTriggers = document.querySelectorAll('[data-target-id]');
    const snowCanvas = document.getElementById('snow-canvas');
    const snowToggleBtn = document.getElementById('snow-toggle');
    const mainGrid = document.querySelector('.main-content-grid');
    const lastLine = document.getElementById('sector-8-line');

    const layoutState = {
        lastBottom: 0,
    };

    function getSectorLabel(targetId, index) {
        const match = targetId.match(/sector-(\d+)-line/);
        const sectorNumber = match ? Number(match[1]) : (index + 1);
        return `Sector-${String(sectorNumber).padStart(2, '0')}`;
    }

    function alignArticleContainers() {
        const sourceContainer = document.querySelector('.left-column');
        const articleAnchors = document.querySelectorAll('[id$="-content-anchor"]');

        if (!sourceContainer || articleAnchors.length === 0) {
            return;
        }

        const rect = sourceContainer.getBoundingClientRect();
        const absoluteLeft = window.scrollX + rect.left;
        const width = rect.width;

        articleAnchors.forEach((anchor) => {
            anchor.style.left = `${absoluteLeft}px`;
            anchor.style.width = `${width}px`;
        });
    }

    function layoutSectorDepths() {
        const sectorCards = [...document.querySelectorAll('.page-card')]
            .sort((leftCard, rightCard) => Number(leftCard.dataset.depthMeters || 0) - Number(rightCard.dataset.depthMeters || 0));
        const baseTop = window.innerHeight;
        let previousContentBottom = 0;
        let lastBottom = baseTop;

        sectorCards.forEach((card, index) => {
            const targetId = card.dataset.targetId;
            const preferredDepthMeters = Number(card.dataset.depthMeters || 0);
            const lineElement = document.getElementById(targetId);

            if (!targetId || !lineElement) {
                return;
            }

            const contentAnchorId = targetId.replace('-line', '-content-anchor');
            const contentAnchor = document.getElementById(contentAnchorId);
            const preferredLineTop = baseTop + (preferredDepthMeters * DEPTH_SCALE);
            const minAllowedLineTop = index === 0
                ? preferredLineTop
                : previousContentBottom + CONTENT_TO_NEXT_LINE_GAP;
            const actualLineTop = Math.max(preferredLineTop, minAllowedLineTop);

            lineElement.style.top = `${actualLineTop}px`;

            const actualDepthMeters = Math.round((actualLineTop - baseTop) / DEPTH_SCALE);
            const lineTextElement = lineElement.querySelector('.border-text');
            if (lineTextElement) {
                lineTextElement.textContent = `${getSectorLabel(targetId, index)} Depth: ${actualDepthMeters}m`;
            }

            let contentBottom = actualLineTop + lineElement.offsetHeight;
            if (contentAnchor) {
                const actualContentTop = actualLineTop + LINE_TO_CONTENT_GAP;
                contentAnchor.style.top = `${actualContentTop}px`;
                contentBottom = actualContentTop + contentAnchor.offsetHeight;
            }

            previousContentBottom = contentBottom;
            lastBottom = Math.max(lastBottom, contentBottom, actualLineTop + lineElement.offsetHeight);
        });

        layoutState.lastBottom = lastBottom;
    }

    function updateMainGridHeight() {
        if (!mainGrid) {
            return;
        }

        const gridTop = mainGrid.offsetTop;
        const lastLineBottom = lastLine
            ? lastLine.offsetTop + lastLine.offsetHeight
            : 0;
        const requiredBottom = Math.max(layoutState.lastBottom, lastLineBottom);
        const requiredHeight = Math.max(window.innerHeight, requiredBottom - gridTop + MAIN_GRID_BOTTOM_PADDING);

        mainGrid.style.minHeight = `${requiredHeight}px`;
    }

    function performUpdates() {
        updateMainGridHeight();
    }

    function restoreSavedScrollPosition() {
        if (savedScrollPosition > 0) {
            if ('scrollRestoration' in history) {
                history.scrollRestoration = 'manual';
            }

            window.scrollTo(0, savedScrollPosition);
        }
    }

    let layoutScheduled = false;
    function scheduleLayout() {
        if (layoutScheduled) {
            return;
        }

        layoutScheduled = true;
        window.requestAnimationFrame(() => {
            layoutScheduled = false;
            alignArticleContainers();
            layoutSectorDepths();
            performUpdates();
            restoreSavedScrollPosition();
            updateDepthIndicator();
        });
    }

    scrollTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.dataset.targetId;
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                document.body.classList.add('elevator-active');

                setTimeout(() => {
                    const topPosition = targetId === 'hero-section' ? 0 : targetElement.offsetTop - 20;

                    window.scrollTo({
                        top: topPosition,
                        behavior: 'auto'
                    });

                    updateDepthIndicator();
                    performUpdates();

                    setTimeout(() => {
                        document.body.classList.remove('elevator-active');
                    }, 600);
                }, 900);
            }
        });
    });

    if (snowCanvas && snowToggleBtn) {
        const ctx = snowCanvas.getContext('2d');

        let width;
        let height;
        let particles = [];
        let animationId;
        let isSnowing = false;

        const particleCount = 150;
        const mouse = { x: 0, y: 0 };

        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            snowCanvas.width = width;
            snowCanvas.height = height;
            scheduleLayout();
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

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
                this.y = initial ? Math.random() * height : -10;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = Math.random() * 1.5 + 0.5;
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.5 + 0.1;
                this.meltSpeed = Math.random() * 0.01 + 0.005;
            }

            update() {
                this.y += this.vy;
                this.x += this.vx;

                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    const forceDirectionX = dx / dist;
                    const force = (150 - dist) / 150;
                    this.vx += forceDirectionX * force * 0.05;
                }

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
            if (!isSnowing) {
                return;
            }

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
                snowToggleBtn.textContent = 'Toggle Snow: ON';
                initParticles();
                animateSnow();
                localStorage.setItem('jio_snow_enabled', 'true');
            }
        }

        function stopSnow() {
            if (isSnowing) {
                isSnowing = false;
                document.body.classList.remove('snow-active');
                snowToggleBtn.textContent = 'Toggle Snow: OFF';
                cancelAnimationFrame(animationId);
                ctx.clearRect(0, 0, width, height);
                localStorage.setItem('jio_snow_enabled', 'false');
            }
        }

        snowToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isSnowing) {
                stopSnow();
            } else {
                startSnow();
            }
        });

        if (localStorage.getItem('jio_snow_enabled') === 'true') {
            startSnow();
        }
    }

    if (typeof ResizeObserver !== 'undefined') {
        const anchorObserver = new ResizeObserver(() => {
            scheduleLayout();
        });

        document.querySelectorAll('[id$="-content-anchor"]').forEach((anchor) => {
            anchorObserver.observe(anchor);
        });
    }

    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
        document.fonts.ready.then(() => {
            scheduleLayout();
        });
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

    window.addEventListener('load', scheduleLayout);
    window.addEventListener('resize', scheduleLayout);

    scheduleLayout();
});
