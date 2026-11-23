"""Trích 32 feature từ URL (đã gia cố chống tấn công đối kháng - Adversarial Defense).

URL được chuẩn hoá bằng normalize_url() TRƯỚC khi tính feature:
1. Bóc tách Open Redirect nếu tham số query chứa URL chuyển hướng (vd: ?q=http://evil.tk).
2. Tách bỏ phần userinfo@ trong authority (chống kỹ thuật http://facebook.com:80@evil.tk).
3. Nhận diện và giải mã tên miền IDN Punycode (xn--) & ký tự đồng dạng Cyrillic / Greek (Homograph).
4. Bỏ scheme + 'www.', hạ chữ thường phần host, dùng urlparse().hostname để loại bỏ ':port'.
5. Giải mã Percent-Encoding (unquote) và gộp dấu '//' thừa trên đường dẫn.
6. Quét từ khoá nhạy cảm kết hợp giải mã Leetspeak + Cyrillic Homoglyphs.
"""
import re
import math
from urllib.parse import urlparse, parse_qs, unquote

# ── Chuẩn hoá URL & Phòng thủ Cú pháp (Input Canonicalization) ──
_SCHEME_RE = re.compile(r'^(?:https?|ftp)://', re.IGNORECASE)
_WWW_RE    = re.compile(r'^www\d*\.', re.IGNORECASE)

# Bảng ánh xạ Leetspeak + Ký tự đồng dạng Cyrillic/Greek (Homoglyphs) sang chữ Latin chuẩn
_HOMOGLYPH_LEET_MAP = str.maketrans({
    # Leetspeak digits & symbols
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '$': 's', '@': 'a',
    # Cyrillic small & capital homoglyphs (U+0400 - U+04FF)
    'а': 'a', 'А': 'a', 'в': 'b', 'В': 'b', 'е': 'e', 'Е': 'e', 'є': 'e',
    'і': 'i', 'І': 'i', 'ї': 'i', 'Ї': 'i', 'ј': 'j', 'Ј': 'j', 'к': 'k',
    'К': 'k', 'м': 'm', 'М': 'm', 'н': 'h', 'Н': 'h', 'о': 'o', 'О': 'o',
    'р': 'p', 'Р': 'p', 'с': 'c', 'С': 'c', 'т': 't', 'Т': 't', 'у': 'y',
    'У': 'y', 'х': 'x', 'Х': 'x', 'ѕ': 's', 'Ѕ': 's', 'ԁ': 'd', 'ԛ': 'q',
    'ԝ': 'w', 'ѵ': 'v', 'ґ': 'r',
    # Greek homoglyphs
    'α': 'a', 'β': 'b', 'ε': 'e', 'ι': 'i', 'κ': 'k', 'ν': 'n', 'ο': 'o',
    'ρ': 'p', 'τ': 't', 'υ': 'y', 'χ': 'x',
})

_CYRILLIC_OR_NON_ASCII_RE = re.compile(r'[^\x00-\x7f]')
_PUNYCODE_LABEL_RE        = re.compile(r'(?:^|\.)xn--[a-z0-9-]+', re.IGNORECASE)

_EMBED_URL_RE = re.compile(
    r'^(?:(?:https?|ftp)://|//[a-z0-9.-]+\.[a-z]{2,}|[a-z0-9.-]+\.(?:tk|ml|ga|cf|gq|xyz|top|club|work|click|link|online|site|live)(?:/|$))',
    re.IGNORECASE
)


def _parse(url):
    try:    return urlparse(str(url))
    except: return urlparse('')


def decode_idn_hostname(host: str) -> str:
    """Giải mã từng nhãn tên miền dạng Punycode (xn--...) về Unicode để kiểm tra ký tự Cyrillic/Homograph."""
    if not host:
        return ''
    out = []
    for label in host.split('.'):
        if label.lower().startswith('xn--'):
            try:
                out.append(label.encode('ascii').decode('idna'))
            except Exception:
                out.append(label)
        else:
            out.append(label)
    return '.'.join(out)


def has_adversarial_userinfo(raw_url: str) -> bool:
    """Kiểm tra xem URL gốc có chứa thành phần userinfo@ trong authority hay không (vd: http://facebook.com:80@evil.tk)."""
    u = _SCHEME_RE.sub('', str(raw_url).strip())
    m = re.match(r'^([^/?#]*)', u)
    authority = m.group(1) if m else ''
    return '@' in authority


def extract_nested_redirect_url(raw_url: str):
    """Nếu tham số query của URL chứa một URL đích (Open Redirect như ?q=http://..., ?url=..., ?u=...),
    trả về URL đích đã bóc tách; ngược lại trả về None.
    """
    try:
        u = _SCHEME_RE.sub('', str(raw_url).strip())
        p = _parse('http://' + u)
        if not p.query:
            return None
        qs = parse_qs(p.query)
        for _, vals in qs.items():
            for v in vals:
                v_unq = unquote(unquote(v)).strip()
                if _EMBED_URL_RE.match(v_unq):
                    return v_unq.lstrip('/')
        q_unq = unquote(unquote(p.query))
        m = re.search(r'((?:https?|ftp)://[^\s&#]+)', q_unq, re.IGNORECASE)
        if m:
            return m.group(1)
    except Exception:
        pass
    return None


def has_idn_homograph(raw_url: str) -> bool:
    """Phát hiện tấn công giả mạo tên miền bằng ký tự Cyrillic / Non-ASCII hoặc IDN Punycode (xn--).
    Hỗ trợ cả 2 trường hợp:
    1. URL chứa trực tiếp ký tự Cyrillic/Unicode trong host (vd: http://pаypal.com/).
    2. URL đã bị trình duyệt Chrome chuyển sang dạng Punycode (vd: http://xn--pypal-4ve.com/).
    """
    u = str(raw_url).strip()
    nested = extract_nested_redirect_url(u)
    if nested is not None:
        u = nested
    u = _SCHEME_RE.sub('', u)
    m = re.match(r'^([^/?#]*)', u)
    authority = m.group(1) if m else ''
    if '@' in authority:
        authority = authority.rsplit('@', 1)[-1]
    host = authority.split(':')[0].lower().rstrip('.')
    if not host:
        return False
    # Kiểm tra trực tiếp ký tự ngoài ASCII (Cyrillic/Greek/Unicode) hoặc nhãn Punycode xn--
    if _CYRILLIC_OR_NON_ASCII_RE.search(host) or _PUNYCODE_LABEL_RE.search(host):
        return True
    decoded_host = decode_idn_hostname(host)
    return bool(_CYRILLIC_OR_NON_ASCII_RE.search(decoded_host))


def normalize_url(url):
    u = str(url).strip()
    # Bóc tách URL đích nếu phát hiện Open Redirect trong query
    nested = extract_nested_redirect_url(u)
    if nested is not None:
        u = nested

    u = _SCHEME_RE.sub('', u)          # bỏ http:// | https:// | ftp://
    m = re.match(r'^([^/?#]*)(.*)$', u, flags=re.DOTALL)
    authority, rest = m.group(1), m.group(2)

    # Tách bỏ userinfo@ nếu kẻ tấn công chèn user:pass@host
    if '@' in authority:
        authority = authority.rsplit('@', 1)[-1]

    authority = _WWW_RE.sub('', authority).lower()   # bỏ www. | www2. ...

    # Giải mã percent-encoding (%xx) trên phần path & query
    rest_unq = unquote(unquote(rest))
    # Tách riêng path và query/fragment để chỉ gộp dấu '//' thừa trên path
    m_rest = re.match(r'^([^?#]*)(.*)$', rest_unq, flags=re.DOTALL)
    path_part, qf_part = m_rest.group(1), m_rest.group(2)
    path_part = re.sub(r'/+', '/', path_part)
    if not path_part:
        path_part = '/'
    return 'http://' + authority + path_part + qf_part


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
def _domain(url):
    return (_parse(url).hostname or '').lower()


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
    try:
        return int(_parse(u).port is not None)
    except ValueError:
        return int(':' in _parse(u).netloc.rsplit('@', 1)[-1])

def f_path_depth(u):
    parts = [p for p in _parse(u).path.split('/') if p]
    return len(parts)

def f_num_query_params(u):
    q = _parse(u).query
    return len(parse_qs(q)) if q else 0

def f_has_fragment(u):
    return int(bool(_parse(u).fragment))

def f_is_shortened_url(u):
    d = re.sub(r'^www\d*\.', '', _domain(u))
    return int(d in URL_SHORTENERS)

def f_has_suspicious_word(u):
    u_low = str(u).lower()
    # Giải mã cả Punycode xn-- trên domain trước khi dịch Cyrillic/Leetspeak
    d_decoded = decode_idn_hostname(_domain(u))
    combined = (u_low + ' ' + d_decoded).translate(_HOMOGLYPH_LEET_MAP)
    return int(any(w in u_low or w in combined for w in SUSPICIOUS_WORDS))

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
