def update_indexes(pages):
    # 按日期对所有页面进行降序排序，这是确保逻辑一致性的必要步骤
    pages.sort(key=lambda p: p.date, reverse=True)

    print("开始更新索引页...")

    # 更新主索引页
    update_main_index(pages)

    # 更新分类索引页
    update_category_indexes(pages)
    
    print("索引页更新完毕。")


def update_main_index(pages):
    from . import config

    # 生成文章列表的HTML
    post_list_html = ""
    # 确保这里只有一个 for 循环
    for page in pages:
        # 路径需要相对于输出目录的根，所以要去掉 content/
        relative_path = page.path.relative_to(config.CONTENT_DIR)
        post_list_html += f"""
        <article>
            <h2><a href="{relative_path}">{page.title}</a></h2>
            <p class="date">{page.date}</p>
            <p class="summary">{page.summary}</p>
        </article>
        """
    
    # 读取主页模板并注入列表
    main_index_path = config.BASE_DIR / "index.html"
    with open(main_index_path, 'r', encoding='utf-8') as f:
        template = f.read()
    
    final_html = template.replace("{{POST_LIST}}", post_list_html)

    # 写入最终的主页文件
    output_path = config.OUTPUT_DIR / "index.html"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(final_html)
    print("  - 主索引页 [index.html] 已更新。")


def update_category_indexes(pages):
    from . import config

    for category in config.CATEGORIES:
        # 筛选出属于当前分类的文章
        category_pages = [p for p in pages if p.path.parent.name == category]
        
        if not category_pages:
            continue

        # 生成文章列表的HTML
        post_list_html = ""
        # 确保这里也只有一个 for 循环
        for page in category_pages:
            # 在分类页中，链接是相对的
            post_list_html += f"""
            <article>
                <h2><a href="{page.path.name}">{page.title}</a></h2>
                <p class="date">{page.date}</p>
                <p class="summary">{page.summary}</p>
            </article>
            """

        # 读取分类索引页模板并注入
        category_index_path = config.CONTENT_DIR / category / "index.html"
        if category_index_path.exists():
            with open(category_index_path, 'r', encoding='utf-8') as f:
                template = f.read()
            
            final_html = template.replace("{{POST_LIST}}", post_list_html)

            # 写入最终的分类索引页
            output_path = config.OUTPUT_DIR / category / "index.html"
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_html)
            print(f"  - 分类索引页 [{category}/index.html] 已更新。")