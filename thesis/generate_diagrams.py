"""Generate simple architecture diagrams as PNG for thesis."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent / "diagrams"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1200, 700
BG = (15, 23, 42)
BOX = (30, 58, 95)
ACCENT = (34, 211, 238)
TEXT = (226, 232, 240)
BORDER = (51, 65, 85)


def font(size=18):
    for name in ("arial.ttf", "segoeui.ttf", "calibri.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_box(d, xy, wh, label, fill=BOX):
    x, y = xy
    w, h = wh
    d.rounded_rectangle([x, y, x + w, y + h], radius=12, fill=fill, outline=ACCENT, width=2)
    f = font(16)
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((x + (w - tw) / 2, y + (h - th) / 2), label, fill=TEXT, font=f)


def arrow(d, a, b):
    d.line([a, b], fill=ACCENT, width=3)
    # simple arrow head
    import math
    angle = math.atan2(b[1] - a[1], b[0] - a[0])
    size = 12
    p1 = (b[0] - size * math.cos(angle - 0.4), b[1] - size * math.sin(angle - 0.4))
    p2 = (b[0] - size * math.cos(angle + 0.4), b[1] - size * math.sin(angle + 0.4))
    d.polygon([b, p1, p2], fill=ACCENT)


def arch_diagram():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 30), "System Architecture", fill=ACCENT, font=font(28))
    boxes = [
        (80, 280, 180, 70, "Browser"),
        (320, 280, 200, 70, "Next.js Frontend"),
        (580, 280, 160, 70, "BFF Proxy"),
        (780, 280, 200, 70, "REST API Backend"),
        (500, 480, 200, 70, "VPS Workers"),
    ]
    for x, y, w, h, lbl in boxes:
        draw_box(d, (x, y), (w, h), lbl)
    arrow(d, (260, 315), (320, 315))
    arrow(d, (520, 315), (580, 315))
    arrow(d, (740, 315), (780, 315))
    arrow(d, (880, 350), (600, 480))
    arrow(d, (600, 480), (880, 350))
    d.text((500, 560), "Webhook", fill=TEXT, font=font(14))
    img.save(OUT / "01-architecture.png")


def auth_flow():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 30), "Authentication Flow (OTP + JWT)", fill=ACCENT, font=font(28))
    steps = ["Login/Register", "OTP Challenge", "Verify OTP", "JWT Tokens", "API Access", "Refresh"]
    x = 60
    for i, s in enumerate(steps):
        draw_box(d, (x, 300), (150, 60), s)
        if i < len(steps) - 1:
            arrow(d, (x + 150, 330), (x + 190, 330))
        x += 190
    img.save(OUT / "02-auth-flow.png")


def scan_lifecycle():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 30), "Scan Lifecycle", fill=ACCENT, font=font(28))
    steps = ["Select Plan", "Configure Scan", "Queue Job", "VPS Execute", "Results", "Report/Jira"]
    x = 40
    for i, s in enumerate(steps):
        draw_box(d, (x, 300), (160, 60), s)
        if i < len(steps) - 1:
            arrow(d, (x + 160, 330), (x + 200, 330))
        x += 200
    img.save(OUT / "03-scan-lifecycle.png")


def erd_diagram():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 30), "Entity Relationship (Core)", fill=ACCENT, font=font(28))
    entities = [
        (80, 120, "User"),
        (350, 120, "WebsiteTarget"),
        (620, 120, "Scan"),
        (880, 120, "Vulnerability"),
        (200, 400, "UserPlan"),
        (500, 400, "ScanTool"),
        (750, 400, "JiraTicket"),
    ]
    for x, y, name in entities:
        draw_box(d, (x, y), (180, 55), name)
    # relations
    arrow(d, (260, 147), (350, 147))
    arrow(d, (530, 147), (620, 147))
    arrow(d, (800, 147), (880, 147))
    arrow(d, (170, 175), (280, 400))
    arrow(d, (710, 175), (590, 400))
    arrow(d, (970, 175), (840, 400))
    img.save(OUT / "04-erd.png")


def use_case():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 30), "Stakeholders", fill=ACCENT, font=font(28))
    for i, (lbl, x, y) in enumerate([
        ("End User", 120, 250),
        ("Admin", 480, 250),
        ("VPS Worker", 840, 250),
        ("Platform", 450, 450),
    ]):
        draw_box(d, (x, y), (200, 60), lbl, fill=(40, 70, 100) if lbl == "Platform" else BOX)
    for x in (220, 580, 940):
        arrow(d, (x, 310), (550, 450))
    img.save(OUT / "05-use-case.png")


def bff_layer():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 30), "BFF Proxy Layer", fill=ACCENT, font=font(28))
    draw_box(d, (100, 250), (280, 80), "Client (endpoints.ts)")
    draw_box(d, (460, 250), (280, 80), "Next.js /api/v1/*")
    draw_box(d, (820, 250), (280, 80), "backend.blackbrains.tech")
    arrow(d, (380, 290), (460, 290))
    arrow(d, (740, 290), (820, 290))
    d.text((100, 400), "Forwards: Authorization, Content-Type, X-Forwarded-*", fill=TEXT, font=font(16))
    img.save(OUT / "06-bff-proxy.png")


def tools_diagram():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 30), "Supported Scan Tools (7)", fill=ACCENT, font=font(28))
    tools = ["ZAP", "nmap", "ffuf", "wpscan", "sqlmap", "xss", "ssl"]
    x, y = 80, 200
    for i, t in enumerate(tools):
        draw_box(d, (x, y), (130, 50), t)
        x += 150
        if i == 3:
            x = 80
            y = 320
    img.save(OUT / "07-tools.png")


def sequence_scan():
    img = Image.new("RGB", (W, 900), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 20), "Sequence: Create Scan", fill=ACCENT, font=font(24))
    actors = ["User", "Frontend", "API", "Queue", "VPS"]
    xs = [80, 260, 440, 620, 800]
    for i, (a, x) in enumerate(zip(actors, xs)):
        d.line([(x, 80), (x, 820)], fill=BORDER, width=2)
        draw_box(d, (x - 50, 40), (100, 35), a)
    messages = [
        (0, 1, 120, "Submit form"),
        (1, 2, 180, "POST /scans"),
        (2, 3, 240, "Enqueue"),
        (3, 4, 300, "Run tool"),
        (4, 2, 400, "Webhook"),
        (2, 1, 480, "Status update"),
        (1, 0, 540, "Show results"),
    ]
    f = font(14)
    for fr, to, y, msg in messages:
        x1, x2 = xs[fr], xs[to]
        arrow(d, (x1, y), (x2, y - 10))
        d.text(((x1 + x2) / 2 - 40, y - 25), msg, fill=TEXT, font=f)
    img.save(OUT / "08-sequence-scan.png")


def jira_oauth():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 30), "Jira OAuth Integration", fill=ACCENT, font=font(28))
    steps = ["Initiate OAuth", "Atlassian Login", "Callback", "Store Token", "Create Tickets"]
    x = 60
    for i, s in enumerate(steps):
        draw_box(d, (x, 300), (190, 60), s)
        if i < len(steps) - 1:
            arrow(d, (x + 190, 330), (x + 230, 330))
        x += 230
    img.save(OUT / "09-jira-oauth.png")


def plans_diagram():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 30), "Plan Governance", fill=ACCENT, font=font(28))
    items = ["Credits", "Max Runtime", "Allowed Tools", "Auth Scan", "Bruteforce", "Depth Limits"]
    x, y = 80, 200
    for i, it in enumerate(items):
        draw_box(d, (x, y), (170, 55), it)
        x += 185
        if i == 2:
            x = 80
            y = 340
    img.save(OUT / "10-plans.png")


def main():
    arch_diagram()
    auth_flow()
    scan_lifecycle()
    erd_diagram()
    use_case()
    bff_layer()
    tools_diagram()
    sequence_scan()
    jira_oauth()
    plans_diagram()
    print(f"Generated 10 diagrams in {OUT}")


if __name__ == "__main__":
    main()
