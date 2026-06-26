import html
import json
import os
import re
import shutil
from datetime import date
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
SECTOR_TARGET_PATTERN = re.compile(r'^sector-(\d+)-line$')
ARTICLE_DOCK_SECTOR_NAMES = {'sector-01', 'sector-02', 'sector-03', 'sector-04'}


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


def get_sector_number(sector):
    target_id = sector.get('target_id', '')
    match = SECTOR_TARGET_PATTERN.match(target_id)
    if not match:
        raise ValueError(f'Invalid sector target_id: {target_id}')

    return int(match.group(1))


def get_sector_label(sector):
    return f'Sector-{get_sector_number(sector):02d}'


def get_sector_name(sector):
    return f'sector-{get_sector_number(sector):02d}'


def get_sector_content_anchor_id(sector):
    return sector['target_id'].replace('-line', '-content-anchor')


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


def clear_directory(directory):
    directory.mkdir(exist_ok=True)

    for child in directory.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


def prepare_output_dir():
    clear_directory(OUTPUT_DIR)

    shutil.copytree(STATIC_DIR, OUTPUT_DIR / 'static', dirs_exist_ok=True)

    if PAGES_DIR.exists():
        shutil.copytree(PAGES_DIR, OUTPUT_DIR / 'pages', dirs_exist_ok=True)

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


def render_sector_depth_lines(homepage_data):
    lines = []
    for sector in homepage_data.get('sector_navigation', []):
        target_id = html.escape(sector['target_id'], quote=True)
        depth_meters = normalize_sector_depth(sector)
        sector_label = get_sector_label(sector)
        lines.append(
            (
                f'<div id="{target_id}" class="border-line sector-depth-line">'
                f'<div class="border-text">{sector_label} Depth: {depth_meters}m</div>'
                f'</div>'
            )
        )
    return '\n    '.join(lines)


def render_sector_content_anchors(homepage_data):
    anchors = []
    for sector in homepage_data.get('sector_navigation', []):
        anchor_id = html.escape(get_sector_content_anchor_id(sector), quote=True)
        sector_name = get_sector_name(sector)
        cards_placeholder = make_sector_placeholder(sector_name, 'CARDS_HERE')
        custom_placeholder = make_sector_placeholder(sector_name, 'CUSTOM_HERE')
        anchors.append(
            (
                f'<div id="{anchor_id}" class="sector-content-anchor">\n'
                f'        {cards_placeholder}\n'
                f'        {custom_placeholder}\n'
                f'    </div>'
            )
        )
    return '\n\n    '.join(anchors)


def render_announcements(homepage_data):
    announcements = homepage_data.get('announcements', [])
    uses_explicit_highlight = any('highlight' in item for item in announcements)
    latest_date = None
    latest_index = None

    for index, item in enumerate(announcements):
        try:
            item_date = date.fromisoformat(item.get('date', ''))
        except ValueError:
            continue

        if latest_date is None or item_date > latest_date:
            latest_date = item_date
            latest_index = index

    announcement_items = []
    for index, item in enumerate(announcements):
        is_highlighted = bool(item.get('highlight')) if uses_explicit_highlight else index == latest_index
        item_class = 'announcement-item is-highlighted' if is_highlighted else 'announcement-item'
        style_attr = ''

        if is_highlighted:
            try:
                highlight_opacity = float(item.get('highlight_opacity', 1))
            except (TypeError, ValueError):
                highlight_opacity = 1

            highlight_opacity = min(max(highlight_opacity, 0), 1)
            style_attr = f' style="--announcement-highlight-opacity: {highlight_opacity:g};"'

        announcement_items.append(
            (
                f'<article class="{item_class}"{style_attr}>'
                f'<p class="announcement-date">{html.escape(item["date"])}</p>'
                f'<p class="announcement-text">{html.escape(item["text"])}</p>'
                '</article>'
            )
        )
    return ''.join(announcement_items)


def render_right_panel_labels(homepage_data):
    labels = []
    sector_navigation = homepage_data.get('sector_navigation', [])
    for index, sector in enumerate(sector_navigation):
        right_panel = sector.get('right_panel', {}) or {}
        display_text = html.escape(right_panel.get('display_text', ''), quote=True)
        current_target_id = html.escape(sector['target_id'], quote=True)
        next_sector = sector_navigation[index + 1] if index + 1 < len(sector_navigation) else {}
        next_target_id = html.escape(next_sector.get('target_id', ''), quote=True)
        labels.append(
            (
                '<div class="sector-side-label" '
                f'data-current-target-id="{current_target_id}" '
                f'data-next-target-id="{next_target_id}" '
                f'data-display-text="{display_text}" '
                'aria-hidden="true"></div>'
            )
        )
    return ''.join(labels)


def inject_homepage_data(index_template, homepage_data):
    homepage_replacements = {
        '<!-- SECTOR_DEPTH_LINES_HERE -->': render_sector_depth_lines(homepage_data),
        '<!-- SECTOR_NAV_CARDS_HERE -->': render_sector_navigation(homepage_data),
        '<!-- ANNOUNCEMENTS_HERE -->': render_announcements(homepage_data),
        '<!-- RIGHT_PANEL_LABELS_HERE -->': render_right_panel_labels(homepage_data),
        '<!-- SECTOR_CONTENT_ANCHORS_HERE -->': render_sector_content_anchors(homepage_data),
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


def render_article_dock_template(page, sector_name, file_name):
    relative_path = html.escape(f'{sector_name}/{file_name}', quote=True)
    title = html.escape(page.title, quote=True)
    meta = html.escape(f'记录于：{page.date}', quote=True)
    return f"""
        <template class="article-dock-template" data-article-path="{relative_path}" data-title="{title}" data-meta="{meta}">
            {page.body}
        </template>
        """


def inject_sector_cards(index_template, sector_name, cards_html):
    return replace_placeholder(index_template, make_sector_placeholder(sector_name, 'CARDS_HERE'), cards_html)


def inject_sector_custom_content(index_template, sector_name, custom_html):
    return replace_placeholder(index_template, make_sector_placeholder(sector_name, 'CUSTOM_HERE'), custom_html)


def inject_article_dock_templates(index_template, template_items):
    if not template_items:
        return index_template

    templates_html = '<div class="article-dock-templates" hidden>\n'
    templates_html += ''.join(template_items)
    templates_html += '\n</div>'

    return index_template.replace('</body>', f'{templates_html}\n</body>')


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
    article_dock_templates = []

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
            if sector_name in ARTICLE_DOCK_SECTOR_NAMES:
                article_dock_templates.append(render_article_dock_template(page, sector_name, file_path.name))

        sector_cards_html.sort(key=lambda item: item[0], reverse=True)
        final_cards_html = ''.join(item[1] for item in sector_cards_html)
        if final_cards_html:
            final_cards_html = f'<div class="article-cards-container">{final_cards_html}</div>'

        custom_content_html = load_sector_custom_content(content_dir)

        index_template = inject_sector_cards(index_template, sector_name, final_cards_html)
        index_template = inject_sector_custom_content(index_template, sector_name, custom_content_html)

    index_template = inject_article_dock_templates(index_template, article_dock_templates)
    finalize_index(index_template)
    print('构建流程完毕。系统功能完整。')


if __name__ == '__main__':
    build()
