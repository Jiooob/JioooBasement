import os
import shutil
from pathlib import Path
from . import config
from .page_parser import Page
from . import index_updater

def build():
    print("演算开始：开始构建站点...")

    # 1. 清理和准备目录
    if config.OUTPUT_DIR.exists():
        shutil.rmtree(config.OUTPUT_DIR)
    os.makedirs(config.OUTPUT_DIR)
    shutil.copytree(config.STATIC_DIR, config.OUTPUT_DIR / "static")
    if (config.BASE_DIR / "pages").exists():
        shutil.copytree(config.BASE_DIR / "pages", config.OUTPUT_DIR / "pages")
    if (config.BASE_DIR / "CNAME").exists():
        shutil.copy(config.BASE_DIR / "CNAME", config.OUTPUT_DIR / "CNAME")
    print("静态文件和目录已复制。")

    # 2. 加载模板
    try:
        with open(config.TEMPLATES_DIR / "article.template", 'r', encoding='utf-8') as f:
            article_template = f.read()
        with open(config.BASE_DIR / "index.html", 'r', encoding='utf-8') as f:
            index_template = f.read()
        print("模板已加载。")
    except FileNotFoundError as e:
        print(f"错误: 模板文件未找到: {e}。构建中止。")
        return

    all_pages = []
    
    # --- V V V V  核心逻辑重构开始  V V V V ---
    
    print("开始处理所有扇区的内容...")
    # 3. 遍历所有 content/ 下的目录
    for content_dir in config.CONTENT_DIR.iterdir():
        if not content_dir.is_dir():
            continue

        # 我们只处理以 "sector-" 开头的目录
        if content_dir.name.startswith("sector-"):
            sector_name = content_dir.name
            print(f"  - 正在处理 {sector_name}...")

            output_sector_dir = config.OUTPUT_DIR / sector_name
            if not output_sector_dir.exists():
                os.makedirs(output_sector_dir)
            
            sector_cards_html = []
            
            # 4. 处理扇区内的每一篇文章
            for file_path in content_dir.glob("*.html"):
                print(f"      - 发现文件: {file_path.name}")
                if file_path.name == "index.html":
                    continue
                
                page = Page(file_path)
                all_pages.append(page)
                
                # 渲染并保存完整的文章页面
                rendered_html = page.render(article_template)
                output_file_path = output_sector_dir / file_path.name
                with open(output_file_path, 'w', encoding='utf-8') as f:
                    f.write(rendered_html)
                
                # 计算文件大小 (可选)
                try:
                    size_in_bytes = os.path.getsize(output_file_path)
                    page.size_in_bits = size_in_bytes * 8
                except FileNotFoundError:
                    pass

                # 5. 为这篇文章生成卡片 HTML
                # 注意相对路径现在需要包含扇区目录
                relative_path = f"{sector_name}/{file_path.name}"
                card_html = f"""
                <a href="{relative_path}" class="article-card-item">
                    <div class="card-content">
                        <h2>{page.title}</h2>
                        <p class="date">记录于：{page.date}</p>
                        <p class="summary">{page.summary}</p>
                        <p class="size">Size: {page.size_in_bits:,} bits</p>
                    </div>
                </a>
                """
                sector_cards_html.append((page.date, card_html))
            
            # 按日期对卡片排序
            sector_cards_html.sort(key=lambda item: item[0], reverse=True)
            
            # 6. 将生成的卡片注入主页模板
            final_cards_html = "".join([item[1] for item in sector_cards_html])
            if final_cards_html:
                 # 将所有卡片包裹在一个容器中
                final_cards_html = f'<div class="article-cards-container">{final_cards_html}</div>'

            placeholder = f"<!-- {sector_name.upper().replace('-', '_')}_CARDS_HERE -->"
            if sector_name == "sector-01":
                print(f"DEBUG: 为 sector-01 生成的占位符是 ->>>{placeholder}<<<-")
            index_template = index_template.replace(placeholder, final_cards_html)
            
    # 移除旧的占位符以防万一
    index_template = index_template.replace("<!-- ARTICLE_CARDS_HERE -->", "")
    
    # --- ^ ^ ^ ^  核心逻辑重构结束  ^ ^ ^ ^ ---

    # 7. 保存最终生成的主页
    with open(config.OUTPUT_DIR / "index.html", 'w', encoding='utf-8') as f:
        f.write(index_template)
    print("主索引页已根据所有扇区内容生成。")
    
    # 8. 更新其他索引（这部分逻辑现在可能需要调整或移除，取决于您是否还使用它们）
    # index_updater.update_indexes(all_pages) # 暂时可以注释掉，因为主逻辑已包含
    
    print("构建流程完毕。系统功能完整。")

if __name__ == '__main__':
    build()