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
    const ARTICLE_DOCK_SECTOR_PREFIX = 'sector-04/';
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

    function createArticleDock() {
        const root = document.createElement('div');
        root.className = 'article-dock';
        root.setAttribute('aria-hidden', 'true');
        root.innerHTML = `
            <button type="button" class="article-dock-scrim" aria-label="关闭阅读舱"></button>
            <aside class="article-dock-panel" role="dialog" aria-modal="true" aria-labelledby="article-dock-title">
                <div class="article-dock-toolbar">
                    <p class="article-dock-kicker">Sector-04 / 建筑垃圾</p>
                    <div class="article-dock-actions">
                        <a class="article-dock-source" href="#" title="打开独立页" aria-label="打开独立页">OPEN</a>
                        <button type="button" class="article-dock-close" aria-label="关闭阅读舱">×</button>
                    </div>
                </div>
                <div class="article-dock-scroll">
                    <header class="article-dock-header">
                        <h1 id="article-dock-title" class="article-dock-title">Sector-04</h1>
                        <p class="article-dock-meta"></p>
                    </header>
                    <main class="article-dock-content"></main>
                </div>
            </aside>
        `;
        document.body.appendChild(root);

        return {
            root,
            scrim: root.querySelector('.article-dock-scrim'),
            panel: root.querySelector('.article-dock-panel'),
            closeButton: root.querySelector('.article-dock-close'),
            sourceLink: root.querySelector('.article-dock-source'),
            title: root.querySelector('.article-dock-title'),
            meta: root.querySelector('.article-dock-meta'),
            content: root.querySelector('.article-dock-content'),
            scroll: root.querySelector('.article-dock-scroll'),
        };
    }

    function isSector04ArticlePath(articlePath) {
        return (
            typeof articlePath === 'string'
            && articlePath.startsWith(ARTICLE_DOCK_SECTOR_PREFIX)
            && articlePath.endsWith('.html')
            && !articlePath.includes('..')
        );
    }

    function getArticlePathFromUrl() {
        const url = new URL(window.location.href);
        return url.searchParams.get(ARTICLE_DOCK_PARAM) || '';
    }

    function getArticlePathFromLink(link) {
        const rawHref = link.getAttribute('href') || '';
        if (isSector04ArticlePath(rawHref)) {
            return rawHref;
        }

        try {
            const articleUrl = new URL(rawHref, window.location.href);
            const baseUrl = new URL('.', window.location.href);
            if (!articleUrl.href.startsWith(baseUrl.href)) {
                return '';
            }

            const relativePath = decodeURIComponent(articleUrl.href.slice(baseUrl.href.length));
            return isSector04ArticlePath(relativePath) ? relativePath : '';
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

        articleDock.title.textContent = template.dataset.title || '无标题';
        articleDock.meta.textContent = template.dataset.meta || '';
        articleDock.content.innerHTML = template.innerHTML;
        resolveArticleContentUrls(articleDock.content, articlePath);
        articleDock.root.classList.remove('is-loading', 'has-error');
        articleDock.sourceLink.href = articlePath;
        articleDock.closeButton.focus({ preventScroll: true });
        return true;
    }

    function setArticleDockLoading(articlePath) {
        articleDock.title.textContent = 'LOADING SECTOR-04';
        articleDock.meta.textContent = articlePath;
        articleDock.content.innerHTML = '<p class="article-dock-status">READING DISK...</p>';
        articleDock.sourceLink.href = articlePath;
        articleDock.scroll.scrollTop = 0;
        articleDock.root.classList.add('is-open', 'is-loading');
        articleDock.root.classList.remove('has-error');
        articleDock.root.setAttribute('aria-hidden', 'false');
        document.body.classList.add('article-dock-open');
    }

    function setArticleDockError(articlePath) {
        articleDock.title.textContent = 'READ ERROR';
        articleDock.meta.textContent = articlePath;
        articleDock.content.innerHTML = '<p class="article-dock-status">文章舱载入失败。可以从右上角打开独立页。</p>';
        articleDock.root.classList.remove('is-loading');
        articleDock.root.classList.add('has-error');
    }

    async function openArticleDock(articlePath, options = {}) {
        if (!isSector04ArticlePath(articlePath)) {
            return false;
        }

        const shouldWriteHistory = options.writeHistory !== false;
        const historyMode = options.historyMode || 'push';
        const requestId = articleDockRequestId + 1;
        articleDockRequestId = requestId;
        activeArticlePath = articlePath;

        setArticleDockLoading(articlePath);

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

            articleDock.title.textContent = title;
            articleDock.meta.textContent = meta;
            articleDock.content.innerHTML = contentElement ? contentElement.innerHTML : '';
            resolveArticleContentUrls(articleDock.content, articlePath);
            articleDock.root.classList.remove('is-loading', 'has-error');
            articleDock.sourceLink.href = articlePath;
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
        document.body.classList.remove('article-dock-open');

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
        openArticleDock(articlePath);
    });

    articleDock.scrim.addEventListener('click', () => closeArticleDock());
    articleDock.closeButton.addEventListener('click', () => closeArticleDock());

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && articleDock.root.classList.contains('is-open')) {
            closeArticleDock();
        }
    });

    window.addEventListener('popstate', () => {
        const articlePath = getArticlePathFromUrl();
        if (isSector04ArticlePath(articlePath)) {
            openArticleDock(articlePath, { writeHistory: false });
        } else {
            closeArticleDock({ writeHistory: false });
        }
    });

    const initialArticlePath = getArticlePathFromUrl();
    if (isSector04ArticlePath(initialArticlePath)) {
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

    scheduleLayout();
});
