from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).parent.parent

# 源文件目录
CONTENT_DIR = BASE_DIR / "content"
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

# 输出目录
OUTPUT_DIR = BASE_DIR / "output"

# 需要处理的内容分类
CATEGORIES = ["articles", "weekly", "notes"]

# 网站基本信息 (用于RSS等)
SITE_URL = "https://your-domain.com"
SITE_TITLE = "我的博客"
SITE_DESCRIPTION = "一个简约的博客"