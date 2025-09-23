import os
import frontmatter
import markdown
import argparse
from pathlib import Path

def convert_md_to_html(md_file_path, output_dir):
    """
    读取单个 Markdown 文件，解析其元数据和内容，
    将其转换为符合博客系统格式的 HTML 文件，并在成功后删除源文件。
    """
    try:
        # 读取并解析 Markdown 文件
        with open(md_file_path, 'r', encoding='utf-8') as f:
            post = frontmatter.load(f)

        # 将 Markdown 内容部分转换为 HTML
        html_content = markdown.markdown(post.content)

        # 构建符合系统要求的 HTML 结构
        meta_tags = ""
        for key, value in post.metadata.items():
            meta_tags += f'    <meta name="blog-{key}" content="{value}">\n'

        final_html = f"""<!DOCTYPE html>
<html>
<head>
{meta_tags}</head>
<body>
{html_content}
</body>
</html>"""

        # 确定输出文件名
        base_filename = Path(md_file_path).stem
        output_filename = base_filename + ".html"
        output_path = Path(output_dir) / output_filename

        # 写入最终的 HTML 文件
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_html)
        
        # 在成功写入后，删除源文件
        os.remove(md_file_path)
        
        # 在日志中注明源文件已被删除
        print(f"成功: {md_file_path} -> {output_path} (源文件已删除)")

    except Exception as e:
        print(f"错误: 处理文件 {md_file_path} 时发生错误: {e} (源文件未删除)")

def main():
    """
    主函数，处理命令行参数并根据输入是文件还是目录来执行转换。
    """
    parser = argparse.ArgumentParser(description="将 Markdown 文件转换为博客专用的 HTML 格式，并删除源文件。")
    parser.add_argument("input_path", type=str, help="源 Markdown 文件或目录的路径。")
    parser.add_argument("output_dir", type=str, help="存放转换后的 HTML 文件的目录。")
    args = parser.parse_args()

    input_path = Path(args.input_path)
    output_path = Path(args.output_dir)

    # 确保输出目录存在
    if not output_path.exists():
        print(f"信息: 输出目录 '{output_path}' 不存在，将自动创建。")
        os.makedirs(output_path)

    # --- 核心变更：判断输入路径是文件还是目录 ---
    if input_path.is_file():
        if input_path.suffix == '.md':
            print(f"开始单文件处理: '{input_path}'...")
            convert_md_to_html(input_path, output_path)
        else:
            print(f"错误: 输入文件 '{input_path}' 不是一个 Markdown (.md) 文件。")
            return
    elif input_path.is_dir():
        print(f"开始从目录 '{input_path}' 进行批量处理...")
        md_files = list(input_path.glob("*.md"))
        if not md_files:
            print("警告: 在目录中未找到任何 .md 文件。")
        else:
            for md_file in md_files:
                convert_md_to_html(md_file, output_path)
    else:
        print(f"错误: 输入路径 '{input_path}' 无效或不存在。")
        return
    
    print("转换完成。")

if __name__ == "__main__":
    main()