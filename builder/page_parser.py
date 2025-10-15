from bs4 import BeautifulSoup

class Page:
    def __init__(self, file_path):
        self.path = file_path
        self.title = ""
        self.date = ""
        self.summary = ""
        self.body = ""
        self.metadata = {}
        self.size_in_bits = 0  # 新增属性，用于存储文件大小（比特）
        self.parse()

    def parse(self):
        with open(self.path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')

        # 解析元数据
        meta_tags = soup.find_all('meta')
        for tag in meta_tags:
            if tag.get('name', '').startswith('blog-'):
                key = tag['name'].replace('blog-', '')
                self.metadata[key] = tag['content']
        
        self.title = self.metadata.get('title', '无标题')
        self.date = self.metadata.get('date', '')
        self.summary = self.metadata.get('summary', '')

        # 解析正文
        if soup.body:
            # get_text() 方法可以提取纯文本内容，而 str(soup.body) 会保留HTML标签
            self.body = ''.join(str(child) for child in soup.body.children)
        else:
            self.body = str(soup)

    def render(self, template_content):
        """使用页面数据渲染模板"""
        content = template_content.replace('$title$', self.title)
        content = content.replace('$date$', self.date)
        content = content.replace('$body$', self.body)
        return content