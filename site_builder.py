import html
import json
import os
import re
import shutil
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from email.utils import format_datetime
from pathlib import Path
from urllib.parse import quote, urljoin, urlsplit, urlunsplit

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
RSS_CONFIG_FILE = DATA_DIR / "rss.json"
DEPTH_PATTERN = re.compile(r'\[-?(\d+)m\]')
SECTOR_TARGET_PATTERN = re.compile(r'^sector-(\d+)-line$')
ARTICLE_DOCK_SECTOR_NAMES = {'sector-01', 'sector-02', 'sector-03', 'sector-04', 'sector-05'}
RSS_ATOM_NAMESPACE = 'http://www.w3.org/2005/Atom'
RSS_CONTENT_NAMESPACE = 'http://purl.org/rss/1.0/modules/content/'


@dataclass(frozen=True)
class FeedEntry:
    title: str
    url: str
    guid: str
    published: datetime
    summary: str
    content_html: str
    category: str
    guid_is_permalink: bool = True


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
        content = content.replace('$summary$', html.escape(self.summary))
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


def load_rss_config():
    with open(RSS_CONFIG_FILE, 'r', encoding='utf-8') as f:
        config = json.load(f)

    if not isinstance(config, dict):
        raise ValueError('data/rss.json 的根节点必须是对象。')

    if not is_feed_enabled(config.get('enabled'), default=True):
        return config

    required_text_fields = ('site_url', 'file_name', 'title', 'description', 'language')
    for field in required_text_fields:
        if not str(config.get(field, '')).strip():
            raise ValueError(f'data/rss.json 缺少有效字段: {field}')

    file_name = str(config['file_name']).strip()
    if Path(file_name).name != file_name or not file_name.lower().endswith('.xml'):
        raise ValueError('data/rss.json 的 file_name 必须是单个 .xml 文件名。')

    try:
        max_items = int(config.get('max_items', 30))
    except (TypeError, ValueError):
        raise ValueError('data/rss.json 的 max_items 必须是正整数。') from None
    if max_items <= 0:
        raise ValueError('data/rss.json 的 max_items 必须是正整数。')

    parse_timezone_offset(config.get('timezone', '+08:00'))

    articles = config.get('articles', {})
    external_cards = config.get('external_cards', {})
    if not isinstance(articles, dict) or not isinstance(articles.get('overrides', {}), dict):
        raise ValueError('data/rss.json 的 articles 和 articles.overrides 必须是对象。')
    if not isinstance(external_cards, dict):
        raise ValueError('data/rss.json 的 external_cards 必须是对象。')

    for article_path, overrides in articles.get('overrides', {}).items():
        if not isinstance(article_path, str) or not isinstance(overrides, dict):
            raise ValueError('data/rss.json 的每项文章覆盖必须使用“文章路径: 配置对象”。')

    for card_id, card_config in external_cards.items():
        if not isinstance(card_id, str) or not card_id.strip() or not isinstance(card_config, dict):
            raise ValueError('data/rss.json 的每项外链卡必须使用“唯一 ID: 配置对象”。')
        sector_name = str(card_config.get('sector', '')).strip()
        if is_feed_enabled(card_config.get('enabled'), default=True) and not re.fullmatch(r'sector-\d+', sector_name):
            raise ValueError(f'data/rss.json 的外链卡 {card_id} 缺少有效 sector。')

    return config


def get_site_url(rss_config):
    site_url = str(rss_config.get('site_url', '')).strip()
    if not site_url:
        raise ValueError('data/rss.json 的 site_url 不能为空。')

    if not re.match(r'^https?://', site_url, flags=re.IGNORECASE):
        site_url = f'https://{site_url}'

    parsed_url = urlsplit(site_url)
    if parsed_url.scheme not in {'http', 'https'} or not parsed_url.netloc:
        raise ValueError('data/rss.json 的 site_url 必须是有效的 HTTP(S) 地址。')

    return site_url.rstrip('/')


def encode_url_path(url):
    parts = urlsplit(url)
    encoded_path = quote(parts.path, safe='/%:@')
    return urlunsplit((parts.scheme, parts.netloc, encoded_path, parts.query, parts.fragment))


def build_site_url(site_url, relative_path):
    normalized_path = relative_path.replace('\\', '/').lstrip('/')
    return encode_url_path(urljoin(f'{site_url}/', normalized_path))


def get_feed_url(rss_config):
    return build_site_url(get_site_url(rss_config), str(rss_config['file_name']).strip())


def parse_timezone_offset(value):
    match = re.fullmatch(r'([+-])(\d{2}):(\d{2})', str(value).strip())
    if not match:
        raise ValueError('data/rss.json 的 timezone 必须使用 +08:00 这样的格式。')

    sign = 1 if match.group(1) == '+' else -1
    hours = int(match.group(2))
    minutes = int(match.group(3))
    if hours > 23 or minutes > 59:
        raise ValueError('data/rss.json 的 timezone 超出有效范围。')

    return timezone(sign * timedelta(hours=hours, minutes=minutes))


def parse_feed_date(value, source_name, rss_config):
    try:
        published_date = date.fromisoformat(str(value).strip())
    except (TypeError, ValueError):
        print(f'      - RSS 警告: {source_name} 缺少有效的 YYYY-MM-DD 日期，已跳过。')
        return None

    feed_timezone = parse_timezone_offset(rss_config.get('timezone', '+08:00'))
    return datetime.combine(published_date, time(hour=12), tzinfo=feed_timezone)


def is_feed_enabled(value, default=True):
    if value is None:
        return default
    return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


def absolutize_html_urls(fragment, base_url):
    soup = BeautifulSoup(fragment, 'html.parser')
    ignored_prefixes = ('#', 'data:', 'mailto:', 'tel:', 'javascript:')

    for tag in soup.find_all(True):
        for attribute in ('href', 'src', 'poster'):
            value = tag.get(attribute)
            if not isinstance(value, str):
                continue

            value = value.strip()
            if not value or value.lower().startswith(ignored_prefixes):
                continue

            tag[attribute] = encode_url_path(urljoin(base_url, value))

    return ''.join(str(child) for child in soup.contents)


def make_article_feed_entry(page, sector_name, file_name, site_url, rss_config):
    relative_path = f'{sector_name}/{file_name}'
    articles_config = rss_config.get('articles', {}) or {}
    article_overrides = articles_config.get('overrides', {}) or {}
    overrides = article_overrides.get(relative_path, {}) or {}
    default_enabled = is_feed_enabled(articles_config.get('default_enabled'), default=True)
    if not is_feed_enabled(overrides.get('enabled'), default=default_enabled):
        return None

    published_value = overrides.get('published', page.date)
    published = parse_feed_date(published_value, str(page.path), rss_config)
    if published is None:
        return None

    title = str(overrides.get('title', page.title) or page.title).strip()
    summary = str(overrides.get('summary', page.summary) if overrides.get('summary') is not None else page.summary).strip()
    category = str(overrides.get('category', sector_name) or sector_name).strip()
    default_full_content = is_feed_enabled(rss_config.get('include_full_content'), default=True)
    include_full_content = is_feed_enabled(
        overrides.get('include_full_content'),
        default=default_full_content,
    )
    article_url = build_site_url(site_url, relative_path)
    return FeedEntry(
        title=title,
        url=article_url,
        guid=article_url,
        published=published,
        summary=summary,
        content_html=absolutize_html_urls(page.body, article_url) if include_full_content else '',
        category=category,
    )


def load_external_card_feed_entries(rss_config, site_url):
    external_cards = rss_config.get('external_cards', {}) or {}
    entries = []

    for card_id, card_config in external_cards.items():
        if not is_feed_enabled(card_config.get('enabled'), default=True):
            continue

        sector_name = str(card_config.get('sector', '')).strip()
        section_file = CONTENT_DIR / sector_name / 'section.html'
        if not section_file.exists():
            print(f'      - RSS 警告: 外链卡 {card_id} 的 section.html 不存在，已跳过。')
            continue

        soup = BeautifulSoup(read_text_file(section_file), 'html.parser')
        card = next(
            (
                candidate
                for candidate in soup.select('a.article-card-item[data-card-id]')
                if candidate.get('data-card-id') == card_id
            ),
            None,
        )
        if card is None:
            print(f'      - RSS 警告: {section_file} 中找不到 data-card-id="{card_id}"，已跳过。')
            continue

        href = str(card_config.get('url') or card.get('href') or '').strip()
        title_node = card.select_one('h1, h2, h3, .friend-name')
        summary_node = card.select_one('.summary, .friend-description, p')
        fallback_title = title_node.get_text(' ', strip=True) if title_node else ''
        fallback_summary = summary_node.get_text(' ', strip=True) if summary_node else ''
        title = str(card_config.get('title') or fallback_title).strip()
        summary = str(
            card_config.get('summary')
            if card_config.get('summary') is not None
            else fallback_summary
        ).strip()
        source_name = f'{section_file} 中的链接卡 {card_id}'
        published = parse_feed_date(card_config.get('published'), source_name, rss_config)

        if not href or not title or published is None:
            print(f'      - RSS 警告: {source_name} 缺少链接、标题或日期，已跳过。')
            continue

        link_url = encode_url_path(urljoin(f'{site_url}/', href))
        include_full_content = is_feed_enabled(rss_config.get('include_full_content'), default=True)
        content_html = f'<p>{html.escape(summary)}</p>' if summary and include_full_content else ''
        entries.append(
            FeedEntry(
                title=title,
                url=link_url,
                guid=f'urn:jiooobasement:link:{sector_name}:{card_id}',
                published=published,
                summary=summary,
                content_html=content_html,
                category=str(card_config.get('category') or sector_name).strip(),
                guid_is_permalink=False,
            )
        )

    return entries


def write_rss_feed(entries, rss_config):
    ET.register_namespace('atom', RSS_ATOM_NAMESPACE)
    ET.register_namespace('content', RSS_CONTENT_NAMESPACE)

    site_url = get_site_url(rss_config)
    file_name = str(rss_config['file_name']).strip()
    feed_url = get_feed_url(rss_config)
    rss = ET.Element('rss', {'version': '2.0'})
    channel = ET.SubElement(rss, 'channel')
    ET.SubElement(channel, 'title').text = str(rss_config['title']).strip()
    ET.SubElement(channel, 'link').text = f'{site_url}/'
    ET.SubElement(channel, 'description').text = str(rss_config['description']).strip()
    ET.SubElement(channel, 'language').text = str(rss_config['language']).strip()
    ET.SubElement(channel, 'generator').text = 'JioooBasement site_builder.py'
    ET.SubElement(channel, 'lastBuildDate').text = format_datetime(datetime.now(timezone.utc), usegmt=True)
    ET.SubElement(
        channel,
        f'{{{RSS_ATOM_NAMESPACE}}}link',
        {'href': feed_url, 'rel': 'self', 'type': 'application/rss+xml'},
    )

    sorted_entries = sorted(
        entries,
        key=lambda entry: (entry.published, entry.guid),
        reverse=True,
    )[:int(rss_config.get('max_items', 30))]

    for entry in sorted_entries:
        item = ET.SubElement(channel, 'item')
        ET.SubElement(item, 'title').text = entry.title
        ET.SubElement(item, 'link').text = entry.url
        guid = ET.SubElement(item, 'guid', {'isPermaLink': str(entry.guid_is_permalink).lower()})
        guid.text = entry.guid
        ET.SubElement(item, 'pubDate').text = format_datetime(entry.published)
        ET.SubElement(item, 'description').text = entry.summary
        if entry.content_html:
            ET.SubElement(item, f'{{{RSS_CONTENT_NAMESPACE}}}encoded').text = entry.content_html
        ET.SubElement(item, 'category').text = entry.category

    tree = ET.ElementTree(rss)
    ET.indent(tree, space='  ')
    tree.write(OUTPUT_DIR / file_name, encoding='utf-8', xml_declaration=True)
    print(f'RSS 已生成：{file_name}（最近 {len(sorted_entries)} 条）。')


def render_rss_autodiscovery(rss_config):
    if not is_feed_enabled(rss_config.get('enabled'), default=True):
        return ''

    title = html.escape(
        str(rss_config.get('autodiscovery_title') or rss_config.get('title') or 'RSS'),
        quote=True,
    )
    feed_url = html.escape(get_feed_url(rss_config), quote=True)
    return f'<link rel="alternate" type="application/rss+xml" title="{title}" href="{feed_url}">'


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
        display_text = right_panel.get('display_text', '') or ''
        display_columns = right_panel.get('display_columns')

        if isinstance(display_columns, dict):
            left_text = display_columns.get('left', display_text) or ''
            center_text = display_columns.get('center', display_text) or ''
            right_text = display_columns.get('right', display_text) or ''
        elif isinstance(display_columns, list):
            left_text = display_columns[0] if len(display_columns) > 0 else display_text
            center_text = display_columns[1] if len(display_columns) > 1 else display_text
            right_text = display_columns[2] if len(display_columns) > 2 else display_text
        else:
            left_text = display_text
            center_text = display_text
            right_text = display_text

        display_text = html.escape(display_text, quote=True)
        left_text = html.escape(str(left_text), quote=True)
        center_text = html.escape(str(center_text), quote=True)
        right_text = html.escape(str(right_text), quote=True)
        current_target_id = html.escape(sector['target_id'], quote=True)
        next_sector = sector_navigation[index + 1] if index + 1 < len(sector_navigation) else {}
        next_target_id = html.escape(next_sector.get('target_id', ''), quote=True)
        labels.append(
            (
                '<div class="sector-side-label" '
                f'data-current-target-id="{current_target_id}" '
                f'data-next-target-id="{next_target_id}" '
                f'data-display-text="{display_text}" '
                f'data-display-text-left="{left_text}" '
                f'data-display-text-center="{center_text}" '
                f'data-display-text-right="{right_text}" '
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


def load_templates(rss_config):
    article_template = read_text_file(ARTICLE_TEMPLATE_FILE)
    index_template = assemble_index_template()
    homepage_data = load_homepage_data()
    index_template = inject_homepage_data(index_template, homepage_data)
    rss_autodiscovery = render_rss_autodiscovery(rss_config)
    article_template = replace_placeholder(
        article_template,
        '<!-- RSS_AUTODISCOVERY_HERE -->',
        rss_autodiscovery,
    )
    index_template = replace_placeholder(
        index_template,
        '<!-- RSS_AUTODISCOVERY_HERE -->',
        rss_autodiscovery,
    )

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
    summary = html.escape(page.summary, quote=True)
    meta = html.escape(f'记录于：{page.date}', quote=True)
    return f"""
        <template class="article-dock-template" data-article-path="{relative_path}" data-title="{title}" data-summary="{summary}" data-meta="{meta}">
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

    try:
        rss_config = load_rss_config()
    except (FileNotFoundError, ValueError) as e:
        print(f'错误: RSS 配置无效: {e}。构建中止。')
        return

    prepare_output_dir()

    try:
        article_template, index_template = load_templates(rss_config)
    except FileNotFoundError as e:
        print(f'错误: 模板文件未找到: {e}。构建中止。')
        return

    print('开始处理所有扇区的内容...')
    article_dock_templates = []
    feed_entries = []
    rss_enabled = is_feed_enabled(rss_config.get('enabled'), default=True)
    site_url = get_site_url(rss_config) if rss_enabled else ''

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
            if rss_enabled:
                feed_entry = make_article_feed_entry(
                    page,
                    sector_name,
                    file_path.name,
                    site_url,
                    rss_config,
                )
                if feed_entry is not None:
                    feed_entries.append(feed_entry)
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
    if rss_enabled:
        feed_entries.extend(load_external_card_feed_entries(rss_config, site_url))
        write_rss_feed(feed_entries, rss_config)
    finalize_index(index_template)
    print('构建流程完毕。系统功能完整。')


if __name__ == '__main__':
    build()
