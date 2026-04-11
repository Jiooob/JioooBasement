import html
import json
import os
import re
import shutil
from pathlib import Path

from bs4 import BeautifulSoup


BASE_DIR = Path(__file__).parent
CONTENT_DIR = BASE_DIR / "content"
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
PARTIALS_DIR = TEMPLATES_DIR / "partials"
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"
PAGES_DIR = BASE_DIR / "pages"
CNAME_FILE = BASE_DIR / "CNAME"
INDEX_TEMPLATE_FILE = TEMPLATES_DIR / "index.template"
ARTICLE_TEMPLATE_FILE = TEMPLATES_DIR / "article.template"
HOMEPAGE_DATA_FILE = DATA_DIR / "homepage.json"
DEPTH_PATTERN = re.compile(r'\[-?(\d+)m\]')


def normalize_sector_depth(sector):
    if 'depth_meters' in sector:
        return int(sector.get('depth_meters') or 0)

    title_primary = sector.get('title_primary', '')
    match = DEPTH_PATTERN.search(title_primary)
    if match:
        return int(match.group(1))

    return 0


def build_sector_primary_title(sector):
    base_title = sector.get('title_primary', '')
    depth_meters = normalize_sector_depth(sector)
    title_without_depth = DEPTH_PATTERN.sub('', base_title).strip()

    if title_without_depth and depth_meters:
        return f'{title_without_depth} [-{depth_meters}m]'

    return title_without_depth or base_title


class Page:
    def __init__(self, file_path):
        self.path = file_path
        self.title = ""
        self.date = ""
        self.summary = ""
        self.body = ""
        self.metadata = {}
        self.size_in_bits = 0
        self.parse()

    def parse(self):
        with open(self.path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')

        for tag in soup.find_all('meta'):
            if tag.get('name', '').startswith('blog-'):
                key = tag['name'].replace('blog-', '')
                self.metadata[key] = tag['content']

        self.title = self.metadata.get('title', '无标题')
        self.date = self.metadata.get('date', '')
        self.summary = self.metadata.get('summary', '')

        if soup.body:
            self.body = ''.join(str(child) for child in soup.body.children)
        else:
            self.body = str(soup)

    def render(self, template_content):
        content = template_content.replace('$title$', self.title)
        content = content.replace('$date$', self.date)
        content = content.replace('$body$', self.body)
        return content


def prepare_output_dir():
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)

    os.makedirs(OUTPUT_DIR)
    shutil.copytree(STATIC_DIR, OUTPUT_DIR / 'static')

    if PAGES_DIR.exists():
        shutil.copytree(PAGES_DIR, OUTPUT_DIR / 'pages')

    if CNAME_FILE.exists():
        shutil.copy(CNAME_FILE, OUTPUT_DIR / 'CNAME')

    print('静态文件和目录已复制。')


def read_text_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()


def replace_placeholder(template_content, placeholder, replacement):
    return template_content.replace(placeholder, replacement)


def make_sector_placeholder(sector_name, suffix):
    return f"<!-- {sector_name.upper().replace('-', '_')}_{suffix} -->"


def assemble_index_template():
    index_template = read_text_file(INDEX_TEMPLATE_FILE)
    partial_map = {
        '<!-- HOMEPAGE_HEAD_HERE -->': PARTIALS_DIR / 'homepage_head.partial.html',
        '<!-- HOMEPAGE_HERO_HERE -->': PARTIALS_DIR / 'homepage_hero.partial.html',
        '<!-- HOMEPAGE_SECTOR_LINES_HERE -->': PARTIALS_DIR / 'homepage_sector_lines.partial.html',
        '<!-- HOMEPAGE_MAIN_GRID_HERE -->': PARTIALS_DIR / 'homepage_main_grid.partial.html',
        '<!-- HOMEPAGE_FOOTER_HERE -->': PARTIALS_DIR / 'homepage_footer.partial.html',
        '<!-- HOMEPAGE_SECTOR_ANCHORS_HERE -->': PARTIALS_DIR / 'homepage_sector_anchors.partial.html',
    }

    for placeholder, partial_path in partial_map.items():
        index_template = replace_placeholder(index_template, placeholder, read_text_file(partial_path))

    return index_template


def load_homepage_data():
    with open(HOMEPAGE_DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def render_sector_navigation(homepage_data):
    cards = []
    for sector in homepage_data.get('sector_navigation', []):
        description_html = ''
        if sector.get('description'):
            description_html = f'<p>{sector["description"]}</p>'

        depth_meters = normalize_sector_depth(sector)
        primary_title = build_sector_primary_title(sector)
        secondary_title = sector.get('title_secondary', '')

        cards.append(
            (
                f'<a href="#" class="page-card" data-target-id="{sector["target_id"]}" data-depth-meters="{depth_meters}">'
                f'<div class="card-content">'
                f'<h2>{primary_title}</h2>         '
                f'<h2>{secondary_title}</h2>'
                f'{description_html}'
                f'</div>'
                f'</a>'
            )
        )
    return ''.join(cards)


def render_announcements(homepage_data):
    announcement_items = []
    for item in homepage_data.get('announcements', []):
        announcement_items.append(
            (
                '<article class="announcement-item">'
                f'<p class="announcement-date">{html.escape(item["date"])}</p>'
                f'<p class="announcement-text">{html.escape(item["text"])}</p>'
                '</article>'
            )
        )
    return ''.join(announcement_items)


def render_right_panel_labels(homepage_data):
    labels = []
    for index, sector in enumerate(homepage_data.get('sector_navigation', []), start=1):
        right_panel = sector.get('right_panel', {}) or {}
        display_text = html.escape(right_panel.get('display_text', ''), quote=True)
        labels.append(
            f'<div class="sector-side-label" data-sector-index="{index}" data-display-text="{display_text}" aria-hidden="true"></div>'
        )
    return ''.join(labels)


def inject_homepage_data(index_template, homepage_data):
    homepage_replacements = {
        '<!-- SECTOR_NAV_CARDS_HERE -->': render_sector_navigation(homepage_data),
        '<!-- ANNOUNCEMENTS_HERE -->': render_announcements(homepage_data),
        '<!-- RIGHT_PANEL_LABELS_HERE -->': render_right_panel_labels(homepage_data),
    }

    for placeholder, replacement in homepage_replacements.items():
        index_template = replace_placeholder(index_template, placeholder, replacement)

    return index_template


def load_templates():
    article_template = read_text_file(ARTICLE_TEMPLATE_FILE)
    index_template = assemble_index_template()
    homepage_data = load_homepage_data()
    index_template = inject_homepage_data(index_template, homepage_data)

    print('模板已加载。')
    return article_template, index_template


def iter_sector_dirs():
    return sorted(
        [path for path in CONTENT_DIR.iterdir() if path.is_dir() and path.name.startswith('sector-')],
        key=lambda path: path.name,
    )


def iter_article_files(sector_dir):
    return sorted(
        [path for path in sector_dir.glob('*.html') if path.name not in {'index.html', 'section.html'}],
        key=lambda path: path.name,
    )


def load_sector_custom_content(sector_dir):
    section_file = sector_dir / 'section.html'
    if section_file.exists():
        return read_text_file(section_file)
    return ''


def build_article_page(file_path, article_template, output_sector_dir):
    page = Page(file_path)
    rendered_html = page.render(article_template)
    output_file_path = output_sector_dir / file_path.name

    with open(output_file_path, 'w', encoding='utf-8') as f:
        f.write(rendered_html)

    try:
        size_in_bytes = os.path.getsize(output_file_path)
        page.size_in_bits = size_in_bytes * 8
    except FileNotFoundError:
        pass

    return page


def render_article_card(page, sector_name, file_name):
    relative_path = f'{sector_name}/{file_name}'
    return f"""
                <a href="{relative_path}" class="article-card-item">
                    <div class="card-content">
                        <h2>{page.title}</h2>
                        <p class="date">记录于：{page.date}</p>
                        <p class="summary">{page.summary}</p>
                        <p class="size">Size: {page.size_in_bits:,} bits</p>
                    </div>
                </a>
                """


def inject_sector_cards(index_template, sector_name, cards_html):
    return replace_placeholder(index_template, make_sector_placeholder(sector_name, 'CARDS_HERE'), cards_html)


def inject_sector_custom_content(index_template, sector_name, custom_html):
    return replace_placeholder(index_template, make_sector_placeholder(sector_name, 'CUSTOM_HERE'), custom_html)


def finalize_index(index_template):
    with open(OUTPUT_DIR / 'index.html', 'w', encoding='utf-8') as f:
        f.write(index_template)

    print('主索引页已根据所有扇区内容生成。')


def build():
    print('演算开始：开始构建站点...')

    prepare_output_dir()

    try:
        article_template, index_template = load_templates()
    except FileNotFoundError as e:
        print(f'错误: 模板文件未找到: {e}。构建中止。')
        return

    print('开始处理所有扇区的内容...')

    for content_dir in iter_sector_dirs():
        sector_name = content_dir.name
        print(f'  - 正在处理 {sector_name}...')

        output_sector_dir = OUTPUT_DIR / sector_name
        os.makedirs(output_sector_dir, exist_ok=True)

        sector_cards_html = []

        for file_path in iter_article_files(content_dir):
            print(f'      - 发现文件: {file_path.name}')
            page = build_article_page(file_path, article_template, output_sector_dir)
            card_html = render_article_card(page, sector_name, file_path.name)
            sector_cards_html.append((page.date, card_html))

        sector_cards_html.sort(key=lambda item: item[0], reverse=True)
        final_cards_html = ''.join(item[1] for item in sector_cards_html)
        if final_cards_html:
            final_cards_html = f'<div class="article-cards-container">{final_cards_html}</div>'

        custom_content_html = load_sector_custom_content(content_dir)

        index_template = inject_sector_cards(index_template, sector_name, final_cards_html)
        index_template = inject_sector_custom_content(index_template, sector_name, custom_content_html)

    finalize_index(index_template)
    print('构建流程完毕。系统功能完整。')


if __name__ == '__main__':
    build()
