// static/js/odometer.js
function createOdometer(elementId, targetNumber) {
    const container = document.getElementById(elementId);
    if (!container) {
        console.error("演算错误: 未找到指定的容器元素。");
        return;
    }

    const finalValueStr = String(Math.abs(targetNumber));
    const numDigits = finalValueStr.length;
    const digitHeight = 60; // 必须与 CSS 中的 height 保持一致
    const extraRotations = 3; // 定义滚动的圈数

    // 清空容器并构建结构
    container.innerHTML = '';
    
    // 添加负号
    const minusSign = document.createElement('span');
    minusSign.className = 'odometer-symbol';
    minusSign.textContent = '-';
    container.appendChild(minusSign);

    const reels = [];
    for (let i = 0; i < numDigits; i++) {
        const digitContainer = document.createElement('div');
        digitContainer.className = 'odometer-digit';
        
        const reel = document.createElement('div');
        reel.className = 'digit-reel';

        // --- 核心修正 ---
        // 构建一个包含多组重复数字的长滚轮
        // 以确保动画过程中始终有数字可见
        const repetitions = extraRotations + 2; // 确保有足够的数字填充
        for (let k = 0; k < repetitions; k++) {
            for (let j = 0; j < 10; j++) {
                const numDiv = document.createElement('div');
                // 为了让动画看起来是从一个随机位置滚下来，将第一组数字倒序排列
                numDiv.textContent = (k === 0) ? (9 - j) : j;
                reel.appendChild(numDiv);
            }
        }
        
        digitContainer.appendChild(reel);
        container.appendChild(digitContainer);
        reels.push(reel);
    }
    
    // 添加单位
    const unit = document.createElement('span');
    unit.className = 'odometer-symbol';
    unit.textContent = 'm';
    container.appendChild(unit);

    // 触发动画
    // 使用 setTimeout 确保浏览器有时间渲染初始位置
    setTimeout(() => {
        for (let i = 0; i < numDigits; i++) {
            const finalDigit = parseInt(finalValueStr[i], 10);
            const reel = reels[i];
            
            // 计算滚轮滚动的最终位置
            // 我们定位到最后一组数字中的目标数字上
            const totalOffset = ((extraRotations + 1) * 10 + finalDigit) * -digitHeight;
            
            reel.style.transform = `translateY(${totalOffset}px)`;
        }
    }, 100); // 延迟100毫秒后启动
}