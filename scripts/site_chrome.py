"""The single definition of the site header and footer.

Every page's chrome comes from here — gen_blog.py renders it into the blog,
sync_chrome.py writes it into the hand-written pages. Before this existed the
nav was copy-pasted into 45 files and had already drifted: the landing page
carried six items while every other page carried four, so clicking "How it
works" silently dropped Pricing and ROI from the bar.

Every nav entry must be a real page. In-page anchors do not belong in the top
nav — they change meaning depending on which page you are already on.

Paths are absolute (/features, /app/, /assets/...) so the same markup is valid
at any URL depth. Vercel serves this repo from the root with cleanUrls on.
"""

# (key, label, href) — key is what a page passes as `current`.
NAV = [
    ("features",     "Features",     "/features"),
    ("how-it-works", "How it works", "/how-it-works"),
    ("modules",      "Modules",      "/modules"),
    ("pricing",      "Pricing",      "/pricing"),
    ("roi",          "ROI",          "/roi"),
    ("blog",         "Blog",         "/blog/"),
]

# Pages that sync_chrome.py owns, and the nav key each one highlights.
STATIC_PAGES = {
    "index.html": "home",
    "features.html": "features",
    "how-it-works.html": "how-it-works",
    "modules.html": "modules",
    "pricing.html": "pricing",
    "roi.html": "roi",
    "glossary.html": "",
    "404.html": "",     # noindex, but its nav must still match
    "search.html": "",  # noindex; exists so SearchAction is honest
}


def header(current=""):
    """The site header. `current` is a NAV key, or "home", or "" for none."""
    links = "\n".join(
        '      <a class="link" href="{href}"{cur}>{label}</a>'.format(
            href=href, label=label,
            cur=' aria-current="page"' if key == current else "")
        for key, label, href in NAV
    )
    return f"""<header>
  <div class="wrap nav">
    <a href="/" class="brand"{' aria-current="page"' if current == "home" else ''}><img src="/assets/images/logo-96.png" alt="Merik logo" width="30" height="30"><span>Merik</span></a>
    <nav class="nav-links" id="navLinks" aria-label="Main">
{links}
      <div class="nav-cta">
        <a class="btn btn-outline" href="/app/">Sign In</a>
        <a class="btn btn-primary" href="/app/">Get Started</a>
      </div>
    </nav>
    <button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false" aria-controls="navLinks">☰</button>
  </div>
</header>"""


def footer():
    return """<footer>
  <div class="wrap">
    <div class="foot">
      <div>
        <div class="brand"><img src="/assets/images/logo-96.png" alt="Merik logo" width="30" height="30"><span>Merik</span></div>
        <p class="desc">Merik is the all-in-one platform for employee management, attendance, leave, payroll, daily task tracking — and monitoring the websites and APIs you run.</p>
      </div>
      <div><h5>Product</h5><a href="/features">Features</a><a href="/modules">Modules</a><a href="/how-it-works">How it works</a><a href="/pricing">Pricing</a><a href="/roi">ROI calculator</a><a href="/glossary">Glossary</a><a href="/blog/">Blog</a><a href="/search">Search</a></div>
      <div><h5>Modules</h5><a href="/modules">Employees</a><a href="/modules">Attendance</a><a href="/modules">Leave &amp; Payroll</a><a href="/modules">Daily Tasks</a><a href="/modules">Clients &amp; Invoices</a><a href="/modules">Assets</a><a href="/modules">Digital Operations</a></div>
      <div><h5>Popular guides</h5><a href="/blog/employee-attendance-tracking-small-business">Attendance tracking</a><a href="/blog/attendance-to-payroll-automation">Attendance → payroll</a><a href="/blog/ctc-vs-in-hand-salary-payslip">CTC vs in-hand</a><a href="/blog/leave-management-small-business">Leave management</a><a href="/blog/choosing-hr-software-small-business-checklist">Choosing HR software</a><a href="/blog/proactive-application-monitoring">Proactive monitoring</a></div>
      <div><h5>Get started</h5><a href="/app/">Create workspace</a><a href="/#talk-to-us">Talk to us</a><a href="/app/">Employee sign up</a><a href="mailto:maresolik@gmail.com">Contact us</a></div>
    </div>
    <div class="foot-social">
      <a href="https://www.linkedin.com/company/merik-msk/" rel="me noopener" target="_blank">LinkedIn</a>
      <a href="https://www.instagram.com/merik_msk/" rel="me noopener" target="_blank">Instagram</a>
    </div>
    <div class="foot-bottom">
      <span>© <span id="yr"></span> Merik — Workforce Suite. All rights reserved.</span>
      <span>Built for growing teams.</span>
    </div>
  </div>
</footer>"""


# Shared behaviour for the chrome: year, mobile menu, scroll progress, reveals.
CHROME_JS = """<script>
  document.getElementById('yr').textContent=new Date().getFullYear();
  var mb=document.getElementById('menuBtn'),nl=document.getElementById('navLinks');
  mb.addEventListener('click',function(){var o=nl.classList.toggle('open');mb.setAttribute('aria-expanded',o?'true':'false');});
  nl.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){nl.classList.remove('open');mb.setAttribute('aria-expanded','false');});});
  var bar=document.getElementById('progress');
  if(bar){addEventListener('scroll',function(){
    var h=document.documentElement,max=h.scrollHeight-h.clientHeight,y=h.scrollTop||document.body.scrollTop;
    bar.style.width=(max>0?(y/max)*100:0)+'%';
  },{passive:true});}
  var reveals=document.querySelectorAll('.reveal');
  function revealAll(){reveals.forEach(function(el){el.classList.add('in');});}
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -60px 0px',threshold:.08});
    reveals.forEach(function(el){io.observe(el);});
    setTimeout(revealAll,3000);
  }else{revealAll();}
</script>
<script>
  document.querySelectorAll('a[href*="app/"]').forEach(function(a){a.addEventListener("click",function(){if(typeof gtag==="function")gtag("event","click_signup_cta",{link_text:a.textContent.trim()});});});
</script>"""
