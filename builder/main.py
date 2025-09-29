import os
import shutil
from pathlib import Path
from . import config
from .page_parser import Page
from . import index_updater # 导入索引更新器

def build():
    print("演算开始：开始构建站点...")

    # 1. 清空输出目录
    if config.OUTPUT_DIR.exists():
        shutil.rmtree(config.OUTPUT_DIR)
    os.makedirs(config.OUTPUT_DIR)
    
    # 2. 复制静态文件
    shutil.copytree(config.STATIC_DIR, config.OUTPUT_DIR / "static")
    print("静态文件已复制。")

    # 复制 pages 目录
    pages_dir = config.BASE_DIR / "pages"
    if pages_dir.exists():
        shutil.copytree(pages_dir, config.OUTPUT_DIR / "pages")
        print("Pages 目录已复制。")

    # 3. 读取模板
    try:
        with open(config.TEMPLATES_DIR / "article.template", 'r', encoding='utf-8') as f:
            article_template = f.read()
        print("文章模板已加载。")
    except FileNotFoundError:
        print("错误：未找到文章模板。构建中止。")
        return

    # 4. 解析所有页面
    all_pages = []
    print("开始处理内容文件...")
    for category in config.CATEGORIES:
        category_path = config.CONTENT_DIR / category
        output_cat_dir = config.OUTPUT_DIR / category
        if not output_cat_dir.exists():
            os.makedirs(output_cat_dir)
            
        for file_path in category_path.glob("*.html"):
            if file_path.name == "index.html":
                continue
            
            page = Page(file_path)
            all_pages.append(page)
            
            rendered_html = page.render(article_template)
            
            output_file_path = output_cat_dir / file_path.name
            with open(output_file_path, 'w', encoding='utf-8') as f:
                f.write(rendered_html)
    print("所有页面已处理并生成。")

    # 5. 更新所有索引页
    index_updater.update_indexes(all_pages)
    # 6. 更新子页面索引 (新增：处理 page1.html 的文章列表)
    page1_path = config.BASE_DIR / "pages" / "page1.html"
    output_page1_path = config.OUTPUT_DIR / "pages" / "page1.html"

    if page1_path.exists():
        # 生成文章列表HTML (复用主索引逻辑)
        post_list_html = ""
        for page in all_pages:
            relative_path = f"../content/{page.path.parent.name}/{page.path.name}"  # 相对 page1.html 的路径
            post_list_html += f"""
            <article>
                <h2><a href="{relative_path}">{page.title}</a></h2>
                <p class="date">{page.date}</p>
                <p class="summary">{page.summary}</p>
            </article>
            """
        
        # 读取源模板并替换
        with open(page1_path, 'r', encoding='utf-8') as f:
            template = f.read()
        
        final_html = template.replace("{{POST_LIST}}", post_list_html)
        
        # 写入输出
        with open(output_page1_path, 'w', encoding='utf-8') as f:
            f.write(final_html)
        
        print("  - 子页面 [pages/page1.html] 已更新文章列表。")

    print("构建流程完毕。系统功能完整。")

if __name__ == '__main__':
    build()