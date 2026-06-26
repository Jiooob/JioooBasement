function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function mixChannel(start, end, amount) {
    return Math.round(start + ((end - start) * amount));
}

function updateDepthIndicator() {
    const heroElement = document.querySelector('.hero');
    const depthIndicator = document.querySelector('.depth-indicator-left');
    const depthTextLeft = document.querySelector('.depth-text-left');
    const depthStateText = document.querySelector('.depth-state-text');
    const rightPanelContent = document.querySelector('.right-panel .panel-content');

    if (!heroElement || !depthIndicator || !depthTextLeft || !depthStateText) {
        return;
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    let railGradientProgress = null;

    if (!rightPanelContent || window.innerWidth <= 900) {
        depthIndicator.style.left = '';
        depthIndicator.style.top = '';
    } else {
        const panelRect = rightPanelContent.getBoundingClientRect();
        const dividerX = panelRect.left;
        const halfIndicatorHeight = depthIndicator.offsetHeight / 2;
        const minCenterY = panelRect.top + halfIndicatorHeight;
        const maxCenterY = panelRect.bottom - halfIndicatorHeight;
        const viewportCenterY = window.innerHeight / 2;

        let clampedCenterY;
        if (maxCenterY < minCenterY) {
            clampedCenterY = panelRect.top + (panelRect.height / 2);
            railGradientProgress = 0.5;
        } else {
            clampedCenterY = Math.min(Math.max(viewportCenterY, minCenterY), maxCenterY);
            railGradientProgress = clamp((clampedCenterY - minCenterY) / (maxCenterY - minCenterY), 0, 1);
        }

        depthIndicator.style.left = `${dividerX}px`;
        depthIndicator.style.top = `${clampedCenterY}px`;
    }

    const indicatorRect = depthIndicator.getBoundingClientRect();
    const indicatorCenter = scrollTop + indicatorRect.top + (indicatorRect.height / 2);
    const heroHeight = heroElement.offsetHeight;
    const zeroPoint = heroHeight - 5;
    const depthInPixels = zeroPoint - indicatorCenter;
    const depthInMeters = Math.round(depthInPixels / 10);

    depthTextLeft.textContent = depthInMeters + 'm';

    const safeColor = [93, 212, 193];
    const warningColor = [247, 178, 103];
    const dangerColor = [239, 68, 68];
    const normalizedDepth = railGradientProgress === null
        ? clamp((-depthInMeters) / 24, 0, 1)
        : railGradientProgress;

    let interpolatedColor;
    if (normalizedDepth <= 0.5) {
        const segmentProgress = normalizedDepth / 0.5;
        interpolatedColor = safeColor.map((channel, index) => mixChannel(channel, warningColor[index], segmentProgress));
    } else {
        const segmentProgress = (normalizedDepth - 0.5) / 0.5;
        interpolatedColor = warningColor.map((channel, index) => mixChannel(channel, dangerColor[index], segmentProgress));
    }

    depthIndicator.style.setProperty('--indicator-accent-rgb', interpolatedColor.join(', '));

    if (depthInMeters < -10) {
        depthStateText.textContent = 'D';
    } else if (depthInMeters < -5) {
        depthStateText.textContent = 'W';
    } else {
        depthStateText.textContent = 'S';
    }
}

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

const DRAG_SCROLL_CONFIG = {
    deadZone: 10,
    maxOffset: 200,
    maxSpeed: 600,
    easingExponent: 2,
};

document.addEventListener('DOMContentLoaded', function() {
    const DEPTH_SCALE = 10;
    const LINE_TO_CONTENT_GAP = 60;
    const CONTENT_TO_NEXT_LINE_GAP = 120;
    const MAIN_GRID_BOTTOM_PADDING = 80;

    const scrollTriggers = document.querySelectorAll('[data-target-id]');
    const snowCanvas = document.getElementById('snow-canvas');
    const snowToggleBtn = document.getElementById('snow-toggle');
    const mainGrid = document.querySelector('.main-content-grid');
    const rightPanelContent = document.querySelector('.right-panel .panel-content');
    const depthIndicator = document.querySelector('.depth-indicator-left');
    const depthIndicatorCore = document.querySelector('.depth-indicator-core');
    const sectorSideLabels = [...document.querySelectorAll('.sector-side-label')];
    const ARTICLE_DOCK_PARAM = 'article';
    const ARTICLE_DOCK_SECTORS = [
        { name: 'sector-01', label: 'Sector-01', title: '日。' },
        { name: 'sector-02', label: 'Sector-02', title: '学也没学好玩也没玩好练也没练好' },
        { name: 'sector-03', label: 'Sector-03', title: '胡思乱想' },
        { name: 'sector-04', label: 'Sector-04', title: '建筑垃圾' },
    ];
    const ARTICLE_DOCK_WIDTH_KEY = 'jio_article_dock_width';
    const ARTICLE_DOCK_MIN_WIDTH = 420;
    const ARTICLE_DOCK_MAX_WIDTH_RATIO = 0.88;
    const ARTICLE_ENTRY_ALIGN_COLLAPSE_DURATION = 200;
    const ARTICLE_ENTRY_INSERT_DURATION = 100;
    const ARTICLE_DOCK_DEPTH_REVEAL_DURATION = 720;
    const ARTICLE_ENTRY_CONDENSED_HEIGHT_RATIO = 0.72;
    const ARTICLE_ENTRY_AXIS_GUTTER = 24;
    const ARTICLE_ENTRY_LEFT_EXPAND_DELAY_RATIO = 0.34;
    const ARTICLE_ENTRY_RIGHT_PROGRESS_AT_LEFT_EXPAND = 0.42;
    const ARTICLE_ENTRY_INSERT_EASING = 'cubic-bezier(0.18, 0.86, 0.2, 1)';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const articleDock = createArticleDock();

    const layoutState = {
        lastBottom: 0,
    };

    const dragScrollState = {
        active: false,
        pointerId: null,
        pressClientY: 0,
        currentClientY: 0,
        rafId: 0,
    };

    let activeArticlePath = '';
    let articleDockRequestId = 0;
    let articleDockCurrentWidth = 0;
    const articleDockResizeState = {
        active: false,
        pointerId: null,
    };
    let articleEntryTransitionActive = false;
    let activeArticleSourceCard = null;
    let activeArticleEntryClone = null;

    function createArticleDock() {
        const root = document.createElement('div');
        root.className = 'article-dock';
        root.setAttribute('aria-hidden', 'true');
        root.innerHTML = `
            <button type="button" class="article-dock-scrim" aria-label="关闭阅读舱"></button>
            <aside class="article-dock-panel" role="dialog" aria-modal="true" aria-labelledby="article-dock-title">
                <div class="article-dock-toolbar">
                    <p class="article-dock-kicker">Article Archive</p>
                    <div class="article-dock-actions">
                        <button type="button" class="article-dock-close" aria-label="关闭阅读舱">×</button>
                    </div>
                </div>
                <div class="article-dock-scroll">
                    <header class="article-dock-header">
                        <h1 id="article-dock-title" class="article-dock-title">Article Dock</h1>
                        <p class="article-dock-meta"></p>
                    </header>
                    <main class="article-dock-content"></main>
                </div>
                <button type="button" class="article-dock-resize-handle" aria-label="拖动调整阅读舱宽度" title="拖动调整宽度"></button>
            </aside>
        `;
        document.body.appendChild(root);

        return {
            root,
            scrim: root.querySelector('.article-dock-scrim'),
            panel: root.querySelector('.article-dock-panel'),
            kicker: root.querySelector('.article-dock-kicker'),
            closeButton: root.querySelector('.article-dock-close'),
            title: root.querySelector('.article-dock-title'),
            meta: root.querySelector('.article-dock-meta'),
            content: root.querySelector('.article-dock-content'),
            scroll: root.querySelector('.article-dock-scroll'),
            resizeHandle: root.querySelector('.article-dock-resize-handle'),
        };
    }

    function isArticleDockResizable() {
        return supportsHover && window.innerWidth > 900;
    }

    function getArticleDockWidthBounds() {
        const maxWidth = Math.round(window.innerWidth * ARTICLE_DOCK_MAX_WIDTH_RATIO);
        const minWidth = Math.min(ARTICLE_DOCK_MIN_WIDTH, maxWidth);
        return { minWidth, maxWidth };
    }

    function clampArticleDockWidth(width) {
        const { minWidth, maxWidth } = getArticleDockWidthBounds();
        return Math.round(clamp(width, minWidth, maxWidth));
    }

    function applyArticleDockWidth(width, shouldPersist = false) {
        if (!isArticleDockResizable()) {
            articleDockCurrentWidth = 0;
            articleDock.panel.style.removeProperty('--article-dock-width');
            return;
        }

        const nextWidth = clampArticleDockWidth(width);
        articleDockCurrentWidth = nextWidth;
        articleDock.panel.style.setProperty('--article-dock-width', `${nextWidth}px`);

        if (shouldPersist) {
            localStorage.setItem(ARTICLE_DOCK_WIDTH_KEY, String(nextWidth));
        }
    }

    function getArticleDockWidthFromPointer(clientX) {
        const viewportCenterX = window.innerWidth / 2;
        return Math.max(0, (clientX - viewportCenterX) * 2);
    }

    function restoreArticleDockWidth() {
        const storedWidth = Number(localStorage.getItem(ARTICLE_DOCK_WIDTH_KEY) || 0);
        if (Number.isFinite(storedWidth) && storedWidth > 0) {
            applyArticleDockWidth(storedWidth);
        }
    }

    function startArticleDockResize(event) {
        if (!isArticleDockResizable() || event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        articleDockResizeState.active = true;
        articleDockResizeState.pointerId = event.pointerId;
        articleDock.resizeHandle.setPointerCapture(event.pointerId);
        document.body.classList.add('article-dock-resizing');
        applyArticleDockWidth(getArticleDockWidthFromPointer(event.clientX));
    }

    function updateArticleDockResize(event) {
        if (!articleDockResizeState.active || event.pointerId !== articleDockResizeState.pointerId) {
            return;
        }

        event.preventDefault();
        applyArticleDockWidth(getArticleDockWidthFromPointer(event.clientX));
    }

    function stopArticleDockResize(event) {
        if (!articleDockResizeState.active || event.pointerId !== articleDockResizeState.pointerId) {
            return;
        }

        if (articleDock.resizeHandle.hasPointerCapture(event.pointerId)) {
            articleDock.resizeHandle.releasePointerCapture(event.pointerId);
        }

        articleDockResizeState.active = false;
        articleDockResizeState.pointerId = null;
        document.body.classList.remove('article-dock-resizing');

        const measuredWidth = articleDock.panel.getBoundingClientRect().width;
        applyArticleDockWidth(measuredWidth, true);
    }

    function nextAnimationFrame() {
        return new Promise((resolve) => {
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(resolve);
            });
        });
    }

    function runElementAnimation(element, keyframes, options) {
        if (!element.animate) {
            return Promise.resolve();
        }

        const animation = element.animate(keyframes, options);
        return animation.finished.catch(() => undefined);
    }

    function createCubicBezierEaser(x1, y1, x2, y2) {
        const calcBezier = (time, point1, point2) => {
            const coefficientA = 1 - (3 * point2) + (3 * point1);
            const coefficientB = (3 * point2) - (6 * point1);
            const coefficientC = 3 * point1;

            return (((coefficientA * time) + coefficientB) * time + coefficientC) * time;
        };

        const getSlope = (time, point1, point2) => {
            const coefficientA = 1 - (3 * point2) + (3 * point1);
            const coefficientB = (3 * point2) - (6 * point1);
            const coefficientC = 3 * point1;

            return (3 * coefficientA * time * time) + (2 * coefficientB * time) + coefficientC;
        };

        return (progress) => {
            if (progress <= 0) {
                return 0;
            }

            if (progress >= 1) {
                return 1;
            }

            let time = progress;
            for (let index = 0; index < 5; index += 1) {
                const slope = getSlope(time, x1, x2);
                if (Math.abs(slope) < 0.001) {
                    break;
                }

                time -= (calcBezier(time, x1, x2) - progress) / slope;
            }

            time = clamp(time, 0, 1);
            return calcBezier(time, y1, y2);
        };
    }

    const easeArticleEntryProgress = createCubicBezierEaser(0.22, 1, 0.36, 1);

    function getMaxScrollY() {
        return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    function getRectData(rect) {
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            right: rect.left + rect.width,
            bottom: rect.top + rect.height,
        };
    }

    function applyFixedRect(element, rect) {
        element.style.left = `${rect.left}px`;
        element.style.top = `${rect.top}px`;
        element.style.width = `${rect.width}px`;
        element.style.height = `${rect.height}px`;
    }

    function mixValue(start, end, progress) {
        return start + ((end - start) * progress);
    }

    function mixRect(fromRect, toRect, progress) {
        const left = mixValue(fromRect.left, toRect.left, progress);
        const top = mixValue(fromRect.top, toRect.top, progress);
        const width = mixValue(fromRect.width, toRect.width, progress);
        const height = mixValue(fromRect.height, toRect.height, progress);

        return {
            left,
            top,
            width,
            height,
            right: left + width,
            bottom: top + height,
        };
    }

    function forceImmediateWindowScroll() {
        const previousDocumentBehavior = document.documentElement.style.scrollBehavior;
        const previousBodyBehavior = document.body.style.scrollBehavior;

        document.documentElement.style.scrollBehavior = 'auto';
        document.body.style.scrollBehavior = 'auto';

        return () => {
            document.documentElement.style.scrollBehavior = previousDocumentBehavior;
            document.body.style.scrollBehavior = previousBodyBehavior;
        };
    }

    async function animateArticleEntryInsert(element, fromRect, toRect) {
        const delayedRight = fromRect.right
            + ((toRect.right - fromRect.right) * ARTICLE_ENTRY_RIGHT_PROGRESS_AT_LEFT_EXPAND);
        const delayedRect = {
            left: fromRect.left,
            top: fromRect.top,
            width: Math.max(1, delayedRight - fromRect.left),
            height: fromRect.height,
        };

        applyFixedRect(element, fromRect);
        await nextAnimationFrame();
        await runElementAnimation(
            element,
            [
                {
                    left: `${fromRect.left}px`,
                    top: `${fromRect.top}px`,
                    width: `${fromRect.width}px`,
                    height: `${fromRect.height}px`,
                    offset: 0,
                },
                {
                    left: `${delayedRect.left}px`,
                    top: `${delayedRect.top}px`,
                    width: `${delayedRect.width}px`,
                    height: `${delayedRect.height}px`,
                    offset: ARTICLE_ENTRY_LEFT_EXPAND_DELAY_RATIO,
                },
                {
                    left: `${toRect.left}px`,
                    top: `${toRect.top}px`,
                    width: `${toRect.width}px`,
                    height: `${toRect.height}px`,
                    offset: 1,
                },
            ],
            {
                duration: ARTICLE_ENTRY_INSERT_DURATION,
                easing: ARTICLE_ENTRY_INSERT_EASING,
                fill: 'forwards',
            },
        );
        applyFixedRect(element, toRect);
    }

    function isArticleEntryTransitionEnabled() {
        return (
            supportsHover
            && window.innerWidth > 900
            && !prefersReducedMotion.matches
            && depthIndicator
            && depthIndicatorCore
        );
    }

    function getPreferredArticleDockWidth() {
        const storedWidth = Number(localStorage.getItem(ARTICLE_DOCK_WIDTH_KEY) || 0);
        const fallbackWidth = Math.round(Math.min(760, window.innerWidth * 0.62));
        return clampArticleDockWidth(storedWidth > 0 ? storedWidth : fallbackWidth);
    }

    function getArticleEntryInsertGeometry(cardRect, indicatorRect) {
        const axisX = window.innerWidth / 2;
        const halfWidth = Math.max(
            180,
            Math.min(
                axisX - ARTICLE_ENTRY_AXIS_GUTTER,
                window.innerWidth - axisX - ARTICLE_ENTRY_AXIS_GUTTER,
            ),
        );
        const left = axisX - halfWidth;
        const right = axisX + halfWidth;

        return {
            axisX,
            left,
            right,
            width: right - left,
        };
    }

    function getArticleEntryCondensedRect(baseRect, indicatorRect, nextLeft = baseRect.left, nextWidth = baseRect.width) {
        const condensedHeight = Math.max(36, Math.round(indicatorRect.height * ARTICLE_ENTRY_CONDENSED_HEIGHT_RATIO));
        const indicatorCenterY = indicatorRect.top + (indicatorRect.height / 2);
        const nextTop = indicatorCenterY - (condensedHeight / 2);

        return {
            left: nextLeft,
            top: nextTop,
            width: nextWidth,
            height: condensedHeight,
            right: nextLeft + nextWidth,
            bottom: nextTop + condensedHeight,
        };
    }

    function createArticleEntryClone(articleLink, rect) {
        const clone = articleLink.cloneNode(true);
        clone.classList.add('article-entry-clone');
        clone.setAttribute('aria-hidden', 'true');
        clone.removeAttribute('href');
        applyFixedRect(clone, rect);
        document.body.appendChild(clone);
        return clone;
    }

    function hideArticleSourceCard(articleLink) {
        if (activeArticleSourceCard && activeArticleSourceCard !== articleLink) {
            activeArticleSourceCard.classList.remove('is-entry-source-hidden');
        }

        activeArticleSourceCard = articleLink;
        activeArticleSourceCard.classList.add('is-entry-source-hidden');
    }

    function revealActiveArticleSourceCard() {
        if (!activeArticleSourceCard) {
            return;
        }

        activeArticleSourceCard.classList.remove('is-entry-source-hidden');
        activeArticleSourceCard = null;
    }

    function keepArticleEntryClone(clone) {
        if (activeArticleEntryClone && activeArticleEntryClone !== clone) {
            activeArticleEntryClone.remove();
        }

        activeArticleEntryClone = clone;
        activeArticleEntryClone.classList.add('is-entry-held');
    }

    function removeActiveArticleEntryClone() {
        if (!activeArticleEntryClone) {
            return;
        }

        activeArticleEntryClone.remove();
        activeArticleEntryClone = null;
    }

    function prepareArticleDockDepthReveal(originRect) {
        const originBottom = originRect.bottom ?? (originRect.top + originRect.height);
        const topInset = clamp(originRect.top, 0, window.innerHeight);
        const bottomInset = clamp(window.innerHeight - originBottom, 0, window.innerHeight);

        articleDock.panel.style.setProperty('--article-dock-origin-top', `${topInset}px`);
        articleDock.panel.style.setProperty('--article-dock-origin-bottom', `${bottomInset}px`);
        articleDock.root.classList.add('is-depth-opening');

        window.setTimeout(() => {
            articleDock.root.classList.remove('is-depth-opening');
        }, ARTICLE_DOCK_DEPTH_REVEAL_DURATION + 120);
    }

    function clearArticleDockDepthReveal() {
        articleDock.root.classList.remove('is-depth-opening');
        articleDock.panel.style.removeProperty('--article-dock-origin-top');
        articleDock.panel.style.removeProperty('--article-dock-origin-bottom');
    }

    async function animateArticleEntryAlignAndCollapse(clone, startCardRect) {
        performUpdates();
        updateDepthIndicator();

        const startScrollY = window.scrollY;
        const startIndicatorRect = getRectData(depthIndicator.getBoundingClientRect());
        const cardCenterY = startCardRect.top + (startCardRect.height / 2);
        const indicatorCenterY = startIndicatorRect.top + (startIndicatorRect.height / 2);
        const targetScrollY = clamp(startScrollY + cardCenterY - indicatorCenterY, 0, getMaxScrollY());
        const scrollDistance = targetScrollY - startScrollY;
        const duration = Math.abs(scrollDistance) > 2
            ? ARTICLE_ENTRY_ALIGN_COLLAPSE_DURATION
            : Math.round(ARTICLE_ENTRY_ALIGN_COLLAPSE_DURATION * 0.64);

        applyFixedRect(clone, startCardRect);
        const restoreScrollBehavior = forceImmediateWindowScroll();

        return new Promise((resolve) => {
            const startTime = performance.now();

            function tick(now) {
                const rawProgress = clamp((now - startTime) / duration, 0, 1);
                const easedProgress = easeArticleEntryProgress(rawProgress);
                const nextScrollY = startScrollY + (scrollDistance * easedProgress);

                window.scrollTo(0, nextScrollY);
                updateDepthIndicator();

                const liveIndicatorRect = getRectData(depthIndicator.getBoundingClientRect());
                const liveCollapsedRect = getArticleEntryCondensedRect(startCardRect, liveIndicatorRect);
                const nextRect = mixRect(startCardRect, liveCollapsedRect, easedProgress);

                applyFixedRect(clone, nextRect);

                if (rawProgress < 1) {
                    window.requestAnimationFrame(tick);
                    return;
                }

                window.scrollTo(0, targetScrollY);
                performUpdates();
                updateDepthIndicator();

                const finalIndicatorRect = getRectData(depthIndicator.getBoundingClientRect());
                const finalCollapsedRect = getArticleEntryCondensedRect(startCardRect, finalIndicatorRect);
                applyFixedRect(clone, finalCollapsedRect);
                restoreScrollBehavior();

                resolve({
                    indicatorRect: finalIndicatorRect,
                    collapsedRect: finalCollapsedRect,
                });
            }

            window.requestAnimationFrame(tick);
        });
    }

    async function openArticleDockFromCard(articleLink, articlePath) {
        if (!isArticleEntryTransitionEnabled()) {
            return openArticleDock(articlePath);
        }

        if (articleEntryTransitionActive) {
            return true;
        }

        articleEntryTransitionActive = true;
        document.body.classList.add('article-entry-transition-active');

        let clone = null;

        try {
            performUpdates();
            updateDepthIndicator();
            await nextAnimationFrame();

            const cardRect = getRectData(articleLink.getBoundingClientRect());
            const indicatorRect = getRectData(depthIndicator.getBoundingClientRect());
            if (cardRect.height <= 0 || indicatorRect.height <= 0) {
                return openArticleDock(articlePath);
            }

            clone = createArticleEntryClone(articleLink, cardRect);
            hideArticleSourceCard(articleLink);
            depthIndicator.classList.add('is-entry-receiving');
            await nextAnimationFrame();
            clone.classList.add('is-entry-condensed');

            const alignmentResult = await animateArticleEntryAlignAndCollapse(
                clone,
                cardRect,
            );
            const { collapsedRect, indicatorRect: alignedIndicatorRect } = alignmentResult;

            const insertGeometry = getArticleEntryInsertGeometry(cardRect, alignedIndicatorRect);
            const insertedRect = getArticleEntryCondensedRect(
                cardRect,
                alignedIndicatorRect,
                insertGeometry.left,
                insertGeometry.width,
            );

            await animateArticleEntryInsert(
                clone,
                collapsedRect,
                insertedRect,
            );

            keepArticleEntryClone(clone);
            clone = null;
            await openArticleDock(articlePath, { depthOriginRect: insertedRect });

            return true;
        } catch (error) {
            if (clone) {
                clone.remove();
                clone = null;
            }

            return openArticleDock(articlePath);
        } finally {
            articleEntryTransitionActive = false;
            document.body.classList.remove('article-entry-transition-active');
            depthIndicator?.classList.remove('is-entry-receiving');

            if (clone) {
                clone.remove();
            }
        }
    }

    function getArticleDockSector(articlePath) {
        if (typeof articlePath !== 'string') {
            return null;
        }

        return ARTICLE_DOCK_SECTORS.find((sector) => articlePath.startsWith(`${sector.name}/`)) || null;
    }

    function isArticleDockPath(articlePath) {
        return (
            typeof articlePath === 'string'
            && !!getArticleDockSector(articlePath)
            && articlePath.endsWith('.html')
            && !articlePath.includes('..')
        );
    }

    function getArticleDockKicker(articlePath) {
        const sector = getArticleDockSector(articlePath);
        return sector ? `${sector.label} / ${sector.title}` : 'Article Archive';
    }

    function getArticleDockLoadingTitle(articlePath) {
        const sector = getArticleDockSector(articlePath);
        return sector ? `LOADING ${sector.label}` : 'LOADING ARTICLE';
    }

    function getArticlePathFromUrl() {
        const url = new URL(window.location.href);
        return url.searchParams.get(ARTICLE_DOCK_PARAM) || '';
    }

    function getArticlePathFromLink(link) {
        const rawHref = link.getAttribute('href') || '';
        if (isArticleDockPath(rawHref)) {
            return rawHref;
        }

        try {
            const articleUrl = new URL(rawHref, window.location.href);
            const baseUrl = new URL('.', window.location.href);
            if (!articleUrl.href.startsWith(baseUrl.href)) {
                return '';
            }

            const relativePath = decodeURIComponent(articleUrl.href.slice(baseUrl.href.length));
            return isArticleDockPath(relativePath) ? relativePath : '';
        } catch (error) {
            return '';
        }
    }

    function writeArticleState(articlePath, mode = 'push') {
        const url = new URL(window.location.href);
        if (articlePath) {
            url.searchParams.set(ARTICLE_DOCK_PARAM, articlePath);
        } else {
            url.searchParams.delete(ARTICLE_DOCK_PARAM);
        }

        const method = mode === 'replace' ? 'replaceState' : 'pushState';
        history[method]({ articlePath: articlePath || '' }, '', url.toString());
    }

    function resolveArticleContentUrls(container, articlePath) {
        const articleUrl = new URL(articlePath, new URL('.', window.location.href));
        const urlAttributes = ['href', 'src'];

        urlAttributes.forEach((attribute) => {
            container.querySelectorAll(`[${attribute}]`).forEach((element) => {
                const value = element.getAttribute(attribute);
                if (!value || value.startsWith('#') || value.startsWith('data:')) {
                    return;
                }

                try {
                    element.setAttribute(attribute, new URL(value, articleUrl).href);
                } catch (error) {
                    // Keep the original author-provided URL if it cannot be resolved.
                }
            });
        });
    }

    function findEmbeddedArticleTemplate(articlePath) {
        return [...document.querySelectorAll('.article-dock-template')]
            .find((template) => template.dataset.articlePath === articlePath);
    }

    function renderEmbeddedArticle(articlePath) {
        const template = findEmbeddedArticleTemplate(articlePath);
        if (!template) {
            return false;
        }

        articleDock.kicker.textContent = getArticleDockKicker(articlePath);
        articleDock.title.textContent = template.dataset.title || '无标题';
        articleDock.meta.textContent = template.dataset.meta || '';
        articleDock.content.innerHTML = template.innerHTML;
        resolveArticleContentUrls(articleDock.content, articlePath);
        articleDock.root.classList.remove('is-loading', 'has-error');
        articleDock.closeButton.focus({ preventScroll: true });
        return true;
    }

    function setArticleDockLoading(articlePath, options = {}) {
        if (options.depthOriginRect) {
            prepareArticleDockDepthReveal(options.depthOriginRect);
        } else {
            clearArticleDockDepthReveal();
        }

        articleDock.kicker.textContent = getArticleDockKicker(articlePath);
        articleDock.title.textContent = getArticleDockLoadingTitle(articlePath);
        articleDock.meta.textContent = articlePath;
        articleDock.content.innerHTML = '<p class="article-dock-status">READING DISK...</p>';
        articleDock.scroll.scrollTop = 0;
        articleDock.root.classList.add('is-open', 'is-loading');
        articleDock.root.classList.remove('has-error');
        articleDock.root.setAttribute('aria-hidden', 'false');
        document.body.classList.add('article-dock-open');
    }

    function setArticleDockError(articlePath) {
        articleDock.title.textContent = 'READ ERROR';
        articleDock.meta.textContent = articlePath;
        articleDock.content.innerHTML = '<p class="article-dock-status">文章舱载入失败，请稍后重试。</p>';
        articleDock.root.classList.remove('is-loading');
        articleDock.root.classList.add('has-error');
    }

    async function openArticleDock(articlePath, options = {}) {
        if (!isArticleDockPath(articlePath)) {
            return false;
        }

        const shouldWriteHistory = options.writeHistory !== false;
        const historyMode = options.historyMode || 'push';
        const requestId = articleDockRequestId + 1;
        articleDockRequestId = requestId;
        activeArticlePath = articlePath;

        setArticleDockLoading(articlePath, {
            depthOriginRect: options.depthOriginRect,
        });

        if (shouldWriteHistory) {
            writeArticleState(articlePath, historyMode);
        }

        if (renderEmbeddedArticle(articlePath)) {
            return true;
        }

        try {
            const response = await fetch(articlePath, { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const articleHtml = await response.text();
            if (requestId !== articleDockRequestId) {
                return true;
            }

            const articleDocument = new DOMParser().parseFromString(articleHtml, 'text/html');
            const title = articleDocument.querySelector('.article-title')?.textContent?.trim()
                || articleDocument.title
                || '无标题';
            const meta = articleDocument.querySelector('.article-meta')?.textContent?.trim() || '';
            const contentElement = articleDocument.querySelector('.article-content');

            articleDock.kicker.textContent = getArticleDockKicker(articlePath);
            articleDock.title.textContent = title;
            articleDock.meta.textContent = meta;
            articleDock.content.innerHTML = contentElement ? contentElement.innerHTML : '';
            resolveArticleContentUrls(articleDock.content, articlePath);
            articleDock.root.classList.remove('is-loading', 'has-error');
            articleDock.closeButton.focus({ preventScroll: true });
        } catch (error) {
            if (requestId === articleDockRequestId) {
                setArticleDockError(articlePath);
            }
        }

        return true;
    }

    function closeArticleDock(options = {}) {
        if (!activeArticlePath && !articleDock.root.classList.contains('is-open')) {
            return;
        }

        articleDockRequestId += 1;
        activeArticlePath = '';
        articleDock.root.classList.remove('is-open', 'is-loading', 'has-error');
        articleDock.root.setAttribute('aria-hidden', 'true');
        clearArticleDockDepthReveal();
        document.body.classList.remove('article-dock-open');
        removeActiveArticleEntryClone();
        revealActiveArticleSourceCard();

        if (options.writeHistory !== false) {
            writeArticleState('', options.historyMode || 'replace');
        }
    }

    function isDesktopDragScrollEnabled() {
        return supportsHover && window.innerWidth > 900 && !!depthIndicatorCore;
    }

    function getDragScrollVelocity() {
        const deltaY = dragScrollState.currentClientY - dragScrollState.pressClientY;
        const absOffset = Math.abs(deltaY);
        const { deadZone, maxOffset, maxSpeed, easingExponent } = DRAG_SCROLL_CONFIG;

        if (absOffset <= deadZone) {
            return 0;
        }

        const normalizedOffset = clamp(
            (absOffset - deadZone) / (maxOffset - deadZone),
            0,
            1,
        );
        const easedVelocity = Math.pow(normalizedOffset, easingExponent);
        return Math.sign(deltaY) * easedVelocity * maxSpeed;
    }

    function stopDepthIndicatorDragScroll() {
        if (dragScrollState.rafId) {
            cancelAnimationFrame(dragScrollState.rafId);
            dragScrollState.rafId = 0;
        }

        dragScrollState.active = false;
        dragScrollState.pointerId = null;

        if (depthIndicatorCore) {
            depthIndicatorCore.classList.remove('is-drag-scrolling');
        }
    }

    function runDepthIndicatorDragScroll() {
        if (!dragScrollState.active) {
            dragScrollState.rafId = 0;
            return;
        }

        const velocity = getDragScrollVelocity();
        if (velocity !== 0) {
            const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            const nextScrollY = clamp(window.scrollY + velocity, 0, maxScrollY);

            if (nextScrollY !== window.scrollY) {
                window.scrollTo(0, nextScrollY);
            }
        }

        dragScrollState.rafId = requestAnimationFrame(runDepthIndicatorDragScroll);
    }

    function startDepthIndicatorDragScroll(event) {
        if (!isDesktopDragScrollEnabled() || event.button !== 0 || !depthIndicatorCore) {
            return;
        }

        event.preventDefault();
        dragScrollState.active = true;
        dragScrollState.pointerId = event.pointerId;
        dragScrollState.pressClientY = event.clientY;
        dragScrollState.currentClientY = event.clientY;
        depthIndicatorCore.classList.add('is-drag-scrolling');
        depthIndicatorCore.setPointerCapture(event.pointerId);

        if (!dragScrollState.rafId) {
            dragScrollState.rafId = requestAnimationFrame(runDepthIndicatorDragScroll);
        }
    }

    function updateDepthIndicatorDragScroll(event) {
        if (!dragScrollState.active || event.pointerId !== dragScrollState.pointerId) {
            return;
        }

        dragScrollState.currentClientY = event.clientY;
    }

    function handleDepthIndicatorPointerRelease(event) {
        if (!dragScrollState.active || event.pointerId !== dragScrollState.pointerId || !depthIndicatorCore) {
            return;
        }

        if (depthIndicatorCore.hasPointerCapture(event.pointerId)) {
            depthIndicatorCore.releasePointerCapture(event.pointerId);
        }

        stopDepthIndicatorDragScroll();
    }

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
        const sectorLineBottoms = [...document.querySelectorAll('.sector-depth-line')]
            .map((line) => line.offsetTop + line.offsetHeight);
        const lastLineBottom = Math.max(0, ...sectorLineBottoms);
        const requiredBottom = Math.max(layoutState.lastBottom, lastLineBottom);
        const requiredHeight = Math.max(window.innerHeight, requiredBottom - gridTop + MAIN_GRID_BOTTOM_PADDING);

        mainGrid.style.minHeight = `${requiredHeight}px`;
    }

    function updateSectorSideLabels() {
        if (!rightPanelContent || sectorSideLabels.length === 0) {
            return;
        }

        const sourceContainer = document.querySelector('.left-column');
        if (!sourceContainer) {
            return;
        }

        const cardsRect = sourceContainer.getBoundingClientRect();
        const panelRect = rightPanelContent.getBoundingClientRect();
        const dividerX = panelRect.left;
        const targetLeft = dividerX + (dividerX - cardsRect.right);
        const targetRight = window.innerWidth - cardsRect.left;
        const availableWidth = Math.max(0, targetRight - targetLeft);
        const relativeLeft = targetLeft - panelRect.left;
        const baseFontSize = Math.max(42, Math.min(availableWidth * 0.72, 112));
        const repeatGap = Math.max(12, Math.round(baseFontSize * 0.18));

        sectorSideLabels.forEach((label, index) => {
            const displayText = (label.dataset.displayText || '').trim();
            const currentLine = document.getElementById(label.dataset.currentTargetId || '');
            const nextLine = document.getElementById(label.dataset.nextTargetId || '');

            if (!currentLine || !nextLine || !displayText) {
                label.style.display = 'none';
                label.innerHTML = '';
                return;
            }

            const currentMidpoint = currentLine.offsetTop + (currentLine.offsetHeight / 2);
            const nextMidpoint = nextLine.offsetTop + (nextLine.offsetHeight / 2);
            const topBoundary = currentMidpoint;
            const bottomBoundary = nextMidpoint;
            const intervalHeight = Math.max(0, bottomBoundary - topBoundary);
            const relativeTop = topBoundary - rightPanelContent.offsetTop;
            const characters = [...displayText];
            const unitHeight = Math.max(1, Math.round(characters.length * baseFontSize * 0.88));
            const unitSpan = unitHeight + repeatGap;
            const repeatCount = Math.max(1, Math.ceil((intervalHeight + repeatGap) / unitSpan));

            const repeatedUnits = Array.from({ length: repeatCount }, () => {
                const charsHtml = characters
                    .map((character) => `<span class="sector-side-label-char">${character}</span>`)
                    .join('');
                return `<div class="sector-side-label-unit">${charsHtml}</div>`;
            }).join('');

            label.innerHTML = `<div class="sector-side-label-track">${repeatedUnits}</div>`;
            label.style.setProperty('--label-repeat-gap', `${repeatGap}px`);
            label.style.display = 'flex';
            label.style.top = `${relativeTop}px`;
            label.style.left = `${relativeLeft}px`;
            label.style.width = `${availableWidth}px`;
            label.style.height = `${intervalHeight}px`;
            label.style.fontSize = `${baseFontSize}px`;
        });
    }

    function updateDepthIndicatorRailPosition() {
        if (!depthIndicator) {
            return;
        }

        if (!rightPanelContent || window.innerWidth <= 900) {
            depthIndicator.style.left = '';
            depthIndicator.style.top = '';
            return;
        }

        const panelRect = rightPanelContent.getBoundingClientRect();
        const dividerX = panelRect.left;
        const halfIndicatorHeight = depthIndicator.offsetHeight / 2;
        const minCenterY = panelRect.top + halfIndicatorHeight;
        const maxCenterY = panelRect.bottom - halfIndicatorHeight;
        const viewportCenterY = window.innerHeight / 2;

        let clampedCenterY;
        if (maxCenterY < minCenterY) {
            clampedCenterY = panelRect.top + (panelRect.height / 2);
        } else {
            clampedCenterY = Math.min(Math.max(viewportCenterY, minCenterY), maxCenterY);
        }

        depthIndicator.style.left = `${dividerX}px`;
        depthIndicator.style.top = `${clampedCenterY}px`;
    }

    function performUpdates() {
        updateMainGridHeight();
        updateSectorSideLabels();
        updateDepthIndicatorRailPosition();
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

    document.addEventListener('click', (event) => {
        const articleLink = event.target.closest('a.article-card-item');
        if (
            !articleLink
            || event.defaultPrevented
            || event.button !== 0
            || event.metaKey
            || event.ctrlKey
            || event.shiftKey
            || event.altKey
        ) {
            return;
        }

        const articlePath = getArticlePathFromLink(articleLink);
        if (!articlePath) {
            return;
        }

        event.preventDefault();
        openArticleDockFromCard(articleLink, articlePath);
    });

    articleDock.scrim.addEventListener('click', () => closeArticleDock());
    articleDock.closeButton.addEventListener('click', () => closeArticleDock());
    articleDock.resizeHandle.addEventListener('pointerdown', startArticleDockResize);
    articleDock.resizeHandle.addEventListener('pointermove', updateArticleDockResize);
    articleDock.resizeHandle.addEventListener('pointerup', stopArticleDockResize);
    articleDock.resizeHandle.addEventListener('pointercancel', stopArticleDockResize);
    articleDock.resizeHandle.addEventListener('lostpointercapture', stopArticleDockResize);
    restoreArticleDockWidth();

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && articleDock.root.classList.contains('is-open')) {
            closeArticleDock();
        }
    });

    window.addEventListener('popstate', () => {
        const articlePath = getArticlePathFromUrl();
        if (isArticleDockPath(articlePath)) {
            openArticleDock(articlePath, { writeHistory: false });
        } else {
            closeArticleDock({ writeHistory: false });
        }
    });

    const initialArticlePath = getArticlePathFromUrl();
    if (isArticleDockPath(initialArticlePath)) {
        history.replaceState({ articlePath: initialArticlePath }, '', window.location.href);
        openArticleDock(initialArticlePath, { writeHistory: false });
    } else {
        history.replaceState({ articlePath: '' }, '', window.location.href);
    }

    if (depthIndicatorCore) {
        depthIndicatorCore.addEventListener('pointerdown', startDepthIndicatorDragScroll);
        depthIndicatorCore.addEventListener('pointermove', updateDepthIndicatorDragScroll);
        depthIndicatorCore.addEventListener('pointerup', handleDepthIndicatorPointerRelease);
        depthIndicatorCore.addEventListener('pointercancel', handleDepthIndicatorPointerRelease);
        depthIndicatorCore.addEventListener('lostpointercapture', stopDepthIndicatorDragScroll);
        window.addEventListener('blur', stopDepthIndicatorDragScroll);
    }

    if (snowCanvas && snowToggleBtn) {
        const ctx = snowCanvas.getContext('2d');

        updateDepthIndicatorRailPosition();

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
    window.addEventListener('resize', restoreArticleDockWidth);

    scheduleLayout();
});
