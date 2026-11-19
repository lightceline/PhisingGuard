"""Trích 32 feature từ URL. Sao chép nguyên văn từ feature_engineering.ipynb.

URL được chuẩn hoá bằng normalize_url() TRƯỚC khi tính feature — hàm này PHẢI giống hệt
normalize_url trong src/analysis.ipynb (bước làm sạch dữ liệu train).
"""
import re
import math
from urllib.parse import urlparse, parse_qs

# ── Chuẩn hoá URL (giống hệt analysis.ipynb) ──
# Bỏ scheme + 'www.', hạ chữ thường phần host, gắn lại scheme cố định 'http://'
# -> scheme / 'www.' không còn ảnh hưởng tới feature (tránh shortcut learning).
_SCHEME_RE = re.compile(r'^(?:https?|ftp)://', re.IGNORECASE)
_WWW_RE    = re.compile(r'^www\d*\.', re.IGNORECASE)

def normalize_url(url):
    u = str(url).strip()
    u = _SCHEME_RE.sub('', u)          # bỏ http:// | https:// | ftp://
    u = _WWW_RE.sub('', u)             # bỏ www. | www2. ...
    m = re.match(r'^([^/?#]*)(.*)$', u, flags=re.DOTALL)
    host, rest = m.group(1).lower(), m.group(2)
    # Chuẩn hoá dấu '/' ở gốc domain: 'domain.com' và 'domain.com/' cùng thành 'http://domain.com/'
    # (tránh model học shortcut num_slashes == 2 -> độc hại do khác biệt nguồn crawl)
    if not rest or rest[0] in ('?', '#'):
        rest = '/' + rest
    return 'http://' + host + rest

# ── Constants ──
SUSPICIOUS_WORDS = [
    'login', 'signin', 'verify', 'verification', 'secure', 'security',
    'account', 'update', 'confirm', 'banking', 'payment', 'password',
    'credential', 'authenticate', 'wallet', 'alert', 'suspended', 'unusual'
]
SUSPICIOUS_TLDS = {
    'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'club', 'work',
    'click', 'link', 'online', 'site', 'live', 'download', 'stream'
}
URL_SHORTENERS = {
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'rebrand.ly',
    'buff.ly', 'is.gd', 'short.link', 'cutt.ly', 'tiny.cc'
}
VOWELS     = set('aeiouAEIOU')
CONSONANTS = set('bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ')

# ── Helper ──
def _parse(url):
    try:    return urlparse(str(url))
    except: return urlparse('')

def _domain(url):
    return _parse(url).netloc.split(':')[0].lower()

def _shannon(s):
    if not s: return 0.0
    freq = {}
    for c in s: freq[c] = freq.get(c, 0) + 1
    n = len(s)
    return -sum((f/n) * math.log2(f/n) for f in freq.values())

#   LEXICAL FEATURES (20 features)
# Đã tách num_hyphens thành domain_hyphens và path_hyphens

def f_url_length(u):          return len(u)
def f_domain_length(u):       return len(_domain(u))
def f_path_length(u):         return len(_parse(u).path)
def f_num_dots(u):            return u.count('.')
def f_domain_hyphens(u):      return _domain(u).count('-')
def f_path_hyphens(u):        return _parse(u).path.count('-')
def f_num_underscores(u):     return u.count('_')
def f_num_slashes(u):         return u.count('/')
def f_num_at(u):              return u.count('@')
def f_num_question_marks(u):  return u.count('?')
def f_num_equals(u):          return u.count('=')
def f_num_ampersands(u):      return u.count('&')
def f_num_percent(u):         return u.count('%')
def f_num_digits(u):          return sum(c.isdigit() for c in u)

def f_digit_ratio(u):
    return f_num_digits(u) / len(u) if len(u) > 0 else 0.0

def f_letter_ratio(u):
    return sum(c.isalpha() for c in u) / len(u) if len(u) > 0 else 0.0

def f_url_entropy(u):         return round(_shannon(u), 4)
def f_domain_entropy(u):      return round(_shannon(_domain(u)), 4)

def f_num_subdomains(u):
    parts = _domain(u).split('.')
    return max(0, len(parts) - 2)

def f_has_ip_address(u):
    d = _domain(u)
    m = re.match(r'^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$', d)
    return int(bool(m) and all(0 <= int(g) <= 255 for g in m.groups())) if m else 0

# STRUCTURAL FEATURES (7 features) — đã bỏ has_https (scheme đã được chuẩn hoá)

def f_is_suspicious_tld(u):
    parts = _domain(u).split('.')
    return int(parts[-1] in SUSPICIOUS_TLDS) if parts else 0

def f_has_port(u):
    return int(':' in _parse(u).netloc)

def f_path_depth(u):
    parts = [p for p in _parse(u).path.split('/') if p]
    return len(parts)

def f_num_query_params(u):
    q = _parse(u).query
    return len(parse_qs(q)) if q else 0

def f_has_fragment(u):
    return int(bool(_parse(u).fragment))

def f_is_shortened_url(u):
    d = re.sub(r'^www\d*\.', '', _domain(u))   # lstrip('www.') cũ xoá nhầm ký tự w/. đầu domain
    return int(d in URL_SHORTENERS)

def f_has_suspicious_word(u):
    return int(any(w in str(u).lower() for w in SUSPICIOUS_WORDS))

# STATISTICAL FEATURES (5 features)

def f_consonant_ratio(u):
    letters = [c for c in u if c.isalpha()]
    return sum(1 for c in letters if c in CONSONANTS) / len(letters) if letters else 0.0

def f_vowel_ratio(u):
    letters = [c for c in u if c.isalpha()]
    return sum(1 for c in letters if c in VOWELS) / len(letters) if letters else 0.0

def f_longest_token_length(u):
    tokens = re.split(r'[/.\-_?=&%@]', u)
    return max((len(t) for t in tokens if t), default=0)

def f_avg_token_length(u):
    tokens = [t for t in re.split(r'[/.\-_?=&%@]', u) if t]
    return round(sum(len(t) for t in tokens) / len(tokens), 4) if tokens else 0.0

def f_special_char_ratio(u):
    special = sum(1 for c in u if not c.isalnum())
    return round(special / len(u), 4) if len(u) > 0 else 0.0

FEATURE_FUNCS = [
    # Lexical
    ('url_length',          f_url_length),
    ('domain_length',       f_domain_length),
    ('path_length',         f_path_length),
    ('num_dots',            f_num_dots),
    ('domain_hyphens',      f_domain_hyphens),
    ('path_hyphens',        f_path_hyphens),
    ('num_underscores',     f_num_underscores),
    ('num_slashes',         f_num_slashes),
    ('num_at',              f_num_at),
    ('num_question_marks',  f_num_question_marks),
    ('num_equals',          f_num_equals),
    ('num_ampersands',      f_num_ampersands),
    ('num_percent',         f_num_percent),
    ('num_digits',          f_num_digits),
    ('digit_ratio',         f_digit_ratio),
    ('letter_ratio',        f_letter_ratio),
    ('url_entropy',         f_url_entropy),
    ('domain_entropy',      f_domain_entropy),
    ('num_subdomains',      f_num_subdomains),
    ('has_ip_address',      f_has_ip_address),
    # Structural
    ('is_suspicious_tld',   f_is_suspicious_tld),
    ('has_port',            f_has_port),
    ('path_depth',          f_path_depth),
    ('num_query_params',    f_num_query_params),
    ('has_fragment',        f_has_fragment),
    ('is_shortened_url',    f_is_shortened_url),
    ('has_suspicious_word', f_has_suspicious_word),
    # Statistical
    ('consonant_ratio',     f_consonant_ratio),
    ('vowel_ratio',         f_vowel_ratio),
    ('longest_token_length',f_longest_token_length),
    ('avg_token_length',    f_avg_token_length),
    ('special_char_ratio',  f_special_char_ratio),
]


FEATURE_NAMES = [name for name, _ in FEATURE_FUNCS]


def extract_features(url):
    """Nhận 1 URL (str), chuẩn hoá rồi trả về dict {tên_feature: giá_trị} đủ 32 feature."""
    u = normalize_url(url)
    return {name: func(u) for name, func in FEATURE_FUNCS}