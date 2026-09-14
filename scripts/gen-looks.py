"""Generates src/theme/looks.css: every Tailwind colour ramp the admin uses,
restated for two looks x two modes. Night ramps are inversions of the day ramps
so a class written for day ("bg-red-50 text-red-700") reads correctly at night."""
import math, re, sys

THEME = open("node_modules/tailwindcss/theme.css").read()

def parse_oklch(s):
    m = re.match(r"oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)", s.strip())
    return (float(m.group(1)) / 100, float(m.group(2)), float(m.group(3)))

def hex_to_oklab(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l, m, s = (x ** (1/3) for x in (l, m, s))
    return (0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
            1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
            0.0259040371*l + 0.7827717662*m - 0.8086757660*s)

def oklch_to_oklab(c):
    L, C, H = c
    return (L, C * math.cos(math.radians(H)), C * math.sin(math.radians(H)))

def oklab_to_str(lab):
    L, a, b = lab
    C = math.hypot(a, b)
    H = math.degrees(math.atan2(b, a)) % 360
    return f"oklch({L*100:.1f}% {C:.3f} {H:.1f})"

def mix(lab1, lab2, t):
    return tuple(x + (y - x) * t for x, y in zip(lab1, lab2))

def family(name):
    out = {}
    for step, val in re.findall(rf"--color-{name}-(\d+):\s*(oklch\([^)]*\))", THEME):
        out[int(step)] = oklch_to_oklab(parse_oklch(val))
    return out

def hexfam(pairs):
    return {k: hex_to_oklab(v) for k, v in pairs.items()}

STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

def night(day, surface_hex):
    """Day ramp -> night ramp. Low steps become tints of the dark surface,
    high steps become the day ramp's light end."""
    s = hex_to_oklab(surface_hex)
    return {
        25: mix(s, day[500], 0.10),
        50: mix(s, day[500], 0.15),
        100: mix(s, day[500], 0.24),
        200: mix(s, day[500], 0.36),
        300: mix(s, day[400], 0.62),
        400: day[400],
        500: day[400],
        600: day[300],
        700: day[300],
        800: day[200],
        900: day[100],
        950: day[50],
    }

STATUS = ["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
          "cyan", "purple", "violet", "fuchsia", "pink", "rose"]

# The project's own status ramps (from index.css @theme), which override defaults.
CUSTOM = {
    "success": {50:"#ecfdf3",100:"#d1fadf",200:"#a6f4c5",300:"#6ce9a6",400:"#32d583",500:"#12b76a",600:"#039855",700:"#027a48",800:"#05603a",900:"#054f31",950:"#053321"},
    "error":   {50:"#fef3f2",100:"#fee4e2",200:"#fecdca",300:"#fda29b",400:"#f97066",500:"#f04438",600:"#d92d20",700:"#b42318",800:"#912018",900:"#7a271a",950:"#55160c"},
    "warning": {50:"#fffaeb",100:"#fef0c7",200:"#fedf89",300:"#fec84b",400:"#fdb022",500:"#f79009",600:"#dc6803",700:"#b54708",800:"#93370d",900:"#7a2e0e",950:"#4e1d09"},
    "orange":  {50:"#fff6ed",100:"#ffead5",200:"#fddcab",300:"#feb273",400:"#fd853a",500:"#fb6514",600:"#ec4a0a",700:"#c4320a",800:"#9c2a10",900:"#7e2410",950:"#511c10"},
}

# Zari gold. 500 and up carry white text in day mode, so they sit dark enough.
GOLD = {s: oklch_to_oklab(v) for s, v in {
    25: (0.985, 0.008, 85), 50: (0.970, 0.016, 85), 100: (0.935, 0.036, 84),
    200: (0.870, 0.066, 83), 300: (0.775, 0.096, 81), 400: (0.665, 0.112, 79),
    500: (0.555, 0.108, 77), 600: (0.490, 0.098, 76), 700: (0.420, 0.084, 74),
    800: (0.350, 0.068, 72), 900: (0.290, 0.054, 70), 950: (0.200, 0.038, 70),
}.items()}
ACCENT_NAMES = ["brand", "blue", "indigo", "sky", "blue-light"]
NEUTRAL_NAMES = ["gray", "slate", "zinc", "neutral", "stone"]

LOOKS = {
    "atelier": {
        "light": {
            "white": "#FFFFFF", "black": "#0B0A09",
            "neutral": {25:"#FCFBF8",50:"#FAFAF8",100:"#F5F0E8",200:"#E9E5DC",300:"#D6D0C4",400:"#A29D93",500:"#6E6A64",600:"#55524C",700:"#3B3A37",800:"#24231F",900:"#111111",950:"#0A0A0A"},
        },
        "dark": {
            "white": "#1A1917", "black": "#050505",
            "neutral": {25:"#1D1C1A",50:"#121110",100:"#25231F",200:"#2E2B26",300:"#3E3A34",400:"#6F6A61",500:"#9C978D",600:"#B6B1A7",700:"#D2CDC3",800:"#E6E1D8",900:"#F1EDE5",950:"#F8F5EF"},
        },
    },
    "zari": {
        "light": {
            "white": "#FFFFFF", "black": "#0B0A09",
            "neutral": {25:"#FAF9F6",50:"#F3F1EC",100:"#ECE8E0",200:"#E2DDD3",300:"#CFC9BD",400:"#9D978C",500:"#6E6A62",600:"#54504A",700:"#3A3733",800:"#232120",900:"#141312",950:"#0B0A09"},
        },
        "dark": {
            "white": "#131210", "black": "#000000",
            "neutral": {25:"#161513",50:"#0C0B0A",100:"#1D1B17",200:"#2A2622",300:"#3A3530",400:"#6A645B",500:"#958F84",600:"#B3ADA2",700:"#CFC9BE",800:"#E3DED5",900:"#F2EEE6",950:"#F8F5EF"},
        },
    },
}

def block(selector, look, mode):
    spec = LOOKS[look][mode]
    lines = [f"{selector} {{"]
    lines.append(f"  color-scheme: {mode};")
    lines.append(f"  --color-white: {spec['white']};")
    lines.append(f"  --color-black: {spec['black']};")
    lines.append(f"  --color-gray-dark: {spec['white']};")
    for name in NEUTRAL_NAMES:
        for step, hx in spec["neutral"].items():
            lines.append(f"  --color-{name}-{step}: {hx};")
    accent = GOLD if mode == "light" else night(GOLD, spec["white"])
    if mode == "dark":
        accent[25] = mix(hex_to_oklab(spec["white"]), GOLD[400], 0.08)
    for name in ACCENT_NAMES:
        for step in sorted(accent):
            lines.append(f"  --color-{name}-{step}: {oklab_to_str(accent[step])};")
    if mode == "dark":
        for name in STATUS:
            fam = hexfam(CUSTOM[name]) if name in CUSTOM else family(name)
            for step, lab in sorted(night(fam, spec["white"]).items()):
                if step == 25:
                    continue
                lines.append(f"  --color-{name}-{step}: {oklab_to_str(lab)};")
        for name in ("success", "error", "warning"):
            for step, lab in sorted(night(hexfam(CUSTOM[name]), spec["white"]).items()):
                lines.append(f"  --color-{name}-{step}: {oklab_to_str(lab)};")
    lines.append("}")
    return "\n".join(lines)

HEADER = """/*
 * Maayaa looks — generated by scripts/gen-looks.py; edit that, not this.
 *
 * Two looks (Atelier, Zari Night), each with day and night. Pages keep writing
 * ordinary Tailwind classes for day ("bg-white text-gray-800 bg-red-50"); these
 * blocks restate every ramp for the active look and mode, and night ramps run
 * the other way, so the same class reads correctly in all four.
 *
 * The attributes live on <html> and are set by ThemeContext, and before first
 * paint by the inline script in index.html.
 */
"""

css = [HEADER]
css.append(block(':root', 'atelier', 'light'))
css.append(block(':root[data-mode="dark"]', 'atelier', 'dark'))
css.append(block(':root[data-look="zari"]', 'zari', 'light'))
css.append(block(':root[data-look="zari"][data-mode="dark"]', 'zari', 'dark'))
open(sys.argv[1], "w").write("\n\n".join(css) + "\n")
print("ok")
