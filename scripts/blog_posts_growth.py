"""Article content for the third Merik blog batch — the lead-generation cluster.

Same schema as blog_posts.py; gen_blog.py concatenates the three lists. These
twenty posts target the searches a small-business owner, office manager or
agency founder types when the pain is already acute — a payroll month that
went wrong, a WhatsApp attendance group that nobody can count, a client
calling about a site that "looked fine yesterday". Every post answers the
query in the first paragraph, carries a copyable checklist or worked example,
and ends where Merik picks the problem up.

India-specific facts (labour codes, statutory dates, gratuity arithmetic) are
stated with the date they were checked. When a rule varies by state, the post
says so rather than picking one state silently.
"""

POSTS = [

# ------------------------------------------------------------------ PAYROLL
{
"slug": "new-labour-codes-india-small-business-payroll",
"crumb": "New labour codes &amp; payroll",
"title": "India's New Labour Codes: What Changes for Small Business Payroll (2026 Guide)",
"desc": "The four labour codes came into force on 21 November 2025. What the 50% wages rule, fixed-term gratuity, 180-day leave eligibility and the 7th-of-month pay deadline mean for a small business payroll — with a five-step checklist.",
"keywords": "new labour codes India, labour codes 2025 payroll changes, 50 percent wages rule, Code on Wages small business, labour code salary structure, new wage code basic salary, labour codes gratuity fixed term, labour law changes India small business",
"og_title": "New labour codes: what actually changes in your payroll",
"og_desc": "The 50% wages rule, fixed-term gratuity, 180-day leave eligibility, wages by the 7th — decoded for a 5–200 person business.",
"img_alt": "A salary structure being rebalanced so basic pay reaches half of total remuneration",
"published": "2026-09-02", "published_h": "2 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "India's new labour codes: what changes for <span class=\"accent\">small business payroll</span>",
"lead": "Four codes replaced twenty-nine laws. Most of the text does not touch a 30-person company. Five clauses do — and they all land in the payroll run.",
"lede": "<b>India's four labour codes — the Code on Wages, the Industrial Relations Code, the Code on Social Security and the Occupational Safety, Health and Working Conditions Code — came into force on 21 November 2025.</b> For a small business the practical changes are concentrated in payroll: a single definition of \"wages\" under which basic pay and dearness allowance must make up at least 50% of total remuneration, wages payable by the 7th of the following month, gratuity for fixed-term staff after one year instead of five, annual leave eligibility after 180 days instead of 240, and a mandatory written appointment letter for every employee. The rest of this guide is what to change, in what order, and what to leave alone. Facts checked 11 September 2026; state rules are still being notified, so confirm the position in your state before you act.",
"takeaways": [
  "The single biggest payroll change is the <b>50% wages rule</b>: excluded allowances (HRA, conveyance, overtime, bonus, commission and similar) cannot exceed half of total pay. The excess is treated as wages.",
  "A bigger \"wages\" figure means a <b>bigger PF, gratuity and leave-encashment base</b>. Employer cost goes up; take-home may go down. Model it before you announce it.",
  "<b>Wages are due by the 7th</b> of the following month for establishments under 1,000 employees. If your payroll currently closes on the 10th, the attendance data has to be ready sooner.",
  "Fixed-term employees earn <b>gratuity after one year</b>, pro rata, and everyone qualifies for <b>annual leave after 180 days</b>. Both change what you accrue for.",
  "Nothing in the codes requires new software. All of it requires <b>the attendance and salary records to be correct</b> — which is where most small businesses actually fail.",
],
"sections": [
("what-changed", "What the four codes replaced, in one paragraph", """
    <p>Until November 2025, an Indian employer worked under a patchwork: the Payment of Wages Act, the Minimum Wages Act, the Payment of Bonus Act, the Payment of Gratuity Act, the EPF and ESI Acts, the Factories Act, state Shops &amp; Establishments Acts, and a dozen more. Each had its own definition of \"wages\", its own thresholds and its own returns. The four codes consolidate those into one framework with one definition of wages, one set of registers, and — in principle — one registration and one return. The old Acts are repealed as the corresponding code provisions take effect; where a state has not yet notified its rules, the old position generally continues in the interim, which is why the transition is uneven across the country.</p>
    <p>For a business of 5–200 people, the headline is simpler than the legislation: <b>the amount you call \"wages\" is now defined for you, and several costs are calculated on it.</b></p>
"""),
("fifty-percent", "The 50% wages rule and what it does to your salary structure", """
    <p>The Code on Wages defines wages as basic pay, dearness allowance and retaining allowance, and then lists what is excluded — house rent allowance, conveyance, overtime, commission, bonus, employer PF contribution, gratuity and a few others. The rule that matters: <b>if the excluded components add up to more than 50% of total remuneration, the excess is added back and counted as wages.</b></p>
    <p>Consider a common small-business structure on a ₹40,000 monthly CTC: basic ₹12,000, HRA ₹16,000, special allowance ₹12,000. Exclusions total ₹28,000 — 70% of pay. Under the codes, the ₹8,000 above the 50% line is treated as wages, so \"wages\" becomes ₹20,000, not ₹12,000. Everything calculated on wages — PF (where applicable), gratuity, leave encashment, retrenchment compensation — is now calculated on ₹20,000.</p>
    <p>You have two honest choices. Restructure so basic (plus DA) is at least 50% of gross, which makes the arithmetic transparent, or leave the structure alone and apply the add-back at calculation time, which is legal but invites mistakes every month. Most small businesses will be better served by the first. Whichever you choose, run the numbers on <a href="/blog/ctc-vs-in-hand-salary-payslip">how CTC becomes in-hand pay</a> for every employee before you announce anything — a higher PF deduction lowers take-home, and employees notice their net pay long before they read a circular.</p>
    <blockquote>The rule does not raise anyone's salary. It changes what fraction of the same salary is used as the base for statutory calculations.</blockquote>
"""),
("timing", "Wages by the 7th: the deadline that changes your month-end", """
    <p>The Code on Wages requires monthly wages to be paid before the 7th day of the following month for establishments with fewer than 1,000 employees. If you currently pay on the 10th because attendance takes a week to reconcile, the reconciliation is the problem, not the deadline. The attendance register has to be final within a day or two of month-end.</p>
    <p>That is achievable only when attendance, leave and corrections are recorded as they happen rather than reconstructed afterwards. See <a href="/blog/attendance-to-payroll-automation">how attendance reaches payroll without re-keying</a> and <a href="/blog/attendance-regularisation-corrections">how corrections should work</a> — both are now compliance topics, not just efficiency ones.</p>
"""),
("gratuity-leave", "Gratuity for fixed-term staff, leave after 180 days", """
    <ul>
      <li><b>Gratuity.</b> The five-year qualifying period still applies to regular employees. Fixed-term employees now become eligible after one year of service, pro rata. If you use fixed-term contracts to avoid gratuity liability, that lever is gone; provision for it from month twelve. <a href="/blog/gratuity-calculation-india-explained">The gratuity formula, with worked examples</a>.</li>
      <li><b>Annual leave.</b> Eligibility after 180 days worked in a year, down from 240. Accrual of one day per twenty worked remains the common baseline; carry-forward caps are set by the code and state rules. Update your <a href="/blog/how-many-leaves-small-business-india">leave policy</a> so new joiners' entitlement starts on the right date.</li>
      <li><b>Appointment letters.</b> Mandatory for every employee, with the designation, wages and category stated. Most small businesses already issue them; the change is that not issuing one is now a breach.</li>
      <li><b>Working hours and overtime.</b> The OSH code keeps 48 hours a week, allows states to permit longer daily spreads within it, and keeps overtime at twice the ordinary rate. <a href="/blog/overtime-calculation-india-small-business">How overtime is calculated</a>.</li>
    </ul>
"""),
("checklist", "A five-step checklist for a small business", """
    <ol>
      <li><b>Print every employee's current salary structure</b> and mark the wages / excluded split. Anyone whose exclusions exceed 50% needs a decision.</li>
      <li><b>Model the PF and gratuity impact</b> of the restructure, per employee and in total. Decide whether the company absorbs the employer-side increase or the CTC is renegotiated at the next <a href="/blog/salary-hike-revision-cycle">revision cycle</a>.</li>
      <li><b>Move your payroll close</b> so payslips can be issued by the 7th. That usually means attendance locked by the 2nd.</li>
      <li><b>Check every appointment letter exists</b> and states designation and wages. Issue any that are missing.</li>
      <li><b>Update the leave policy</b> for 180-day eligibility and the fixed-term gratuity accrual, and note the change date in the policy itself.</li>
    </ol>
    <p>Then put the recurring obligations on a calendar — <a href="/blog/hr-compliance-calendar-india-small-business">the compliance calendar</a> lists the monthly, quarterly and annual dates in one place.</p>
"""),
],
"howto": {
  "name": "How to bring a small business payroll in line with India's labour codes",
  "desc": "Five steps to check salary structures, model the cost, move the payroll close and update policies after the four labour codes came into force.",
  "steps": [
    ("Audit every salary structure", "List basic, DA and each allowance per employee and mark where excluded components exceed 50% of total remuneration."),
    ("Model the statutory impact", "Recalculate PF, gratuity and leave-encashment bases on the corrected wages figure and decide who absorbs the increase."),
    ("Move the payroll close", "Lock attendance within two days of month-end so wages can be paid by the 7th."),
    ("Issue missing appointment letters", "Every employee needs a written letter stating designation, wages and category."),
    ("Update the leave and gratuity policy", "Annual leave eligibility after 180 days; pro-rata gratuity for fixed-term employees after one year."),
  ],
},
"facts": [
("In force since", "21 November 2025 (central notification; state rules being notified progressively)"),
("The four codes", "Code on Wages 2019 · Industrial Relations Code 2020 · Code on Social Security 2020 · OSH &amp; Working Conditions Code 2020"),
("Wages rule", "Excluded allowances capped at 50% of total remuneration; excess is treated as wages"),
("Wage payment deadline", "Before the 7th of the following month (establishments under 1,000 employees)"),
("Gratuity, fixed-term", "Payable pro rata after one year of service (five years for regular employees)"),
("Annual leave eligibility", "After 180 days worked in a calendar year (previously 240)"),
("Overtime", "Twice the ordinary rate of wages; 48-hour week retained"),
("Appointment letter", "Mandatory for every employee"),
],
"faqs": [
("What is the 50% rule in the new labour codes?", "Under the Code on Wages, components excluded from wages — such as HRA, conveyance, overtime, bonus and commission — cannot exceed 50% of an employee's total remuneration. Any amount above that limit is added back and treated as wages. Because PF, gratuity and leave encashment are calculated on wages, the rule effectively raises the statutory base for employees whose basic pay was set low."),
("Do the new labour codes apply to a small business with 10 employees?", "Yes. The Code on Wages applies to all employees regardless of establishment size, so the wages definition, the payment deadline and the appointment-letter requirement apply to a 10-person firm. Thresholds still exist for specific schemes — PF generally at 20 or more employees, ESI at 10 or more in notified areas, gratuity at 10 or more — so check each scheme separately."),
("Will employees' take-home pay go down under the new labour codes?", "It can. If a salary is restructured so basic pay rises to 50% of gross, the employee's PF contribution rises with it, which lowers monthly net pay while increasing retirement savings and gratuity. Whether take-home falls depends on the starting structure and on whether the employer adjusts CTC. Model each employee before communicating the change."),
("When do wages have to be paid under the Code on Wages?", "For establishments with fewer than 1,000 employees, monthly wages must be paid before the 7th day of the following month. Larger establishments have until the 10th. Daily, weekly and fortnightly wage periods have their own shorter deadlines."),
("Are fixed-term employees entitled to gratuity now?", "Yes. Under the Code on Social Security, a fixed-term employee is entitled to gratuity on a pro-rata basis after completing one year of continuous service, rather than the five years required of regular employees."),
("Do I need new payroll software to comply with the labour codes?", "No. Compliance is about having correct attendance records, a salary structure that meets the wages definition, and payslips issued on time. Any system — including a careful spreadsheet — can do that. What software removes is the monthly re-keying between attendance and salary that causes most small-business payroll errors, and the deadline of the 7th makes that re-keying harder to afford."),
],
"merik": """
    <p>Merik's default salary structure already sets basic pay at 50% of gross, with HRA and other allowance making up the rest — so a workspace created today starts on the right side of the wages rule rather than needing a restructure. Every salary revision is stored with its effective date, so the CTC history you need for a gratuity or arrears calculation is a record rather than a reconstruction.</p>
    <p>The deadline of the 7th is where the connected model earns its keep: attendance, leave and work-from-home are recorded by employees as they happen, corrections go through an approval trail, and the month's payroll is computed on the server from the days already recorded. Payslips are generated and emailed individually or in bulk, and employees download their own. Merik does not file PF, ESI or TDS returns — those stay with your consultant or portal — but it produces the numbers they are filed from. See the <a href="/modules">payroll module</a> or <a href="/how-it-works">how setup works</a>.</p>
""",
"related": ["hr-compliance-calendar-india-small-business", "payroll-compliance-checklist-india-small-business", "gratuity-calculation-india-explained"],
},

{
"slug": "hr-compliance-calendar-india-small-business",
"crumb": "HR compliance calendar",
"title": "HR &amp; Payroll Compliance Calendar for Indian Small Businesses (Monthly, Quarterly, Annual)",
"desc": "Every recurring statutory date a small Indian employer has to hit — TDS by the 7th, PF and ESI by the 15th, 24Q quarterly, Form 16 by 15 June, bonus by 30 November — with the thresholds that decide whether each one applies to you.",
"keywords": "HR compliance calendar India, payroll compliance due dates, PF due date, ESI due date, TDS on salary due date, Form 16 due date, 24Q due date, statutory compliance small business India, labour law compliance calendar 2026",
"og_title": "The HR compliance calendar for a small Indian business",
"og_desc": "Monthly, quarterly and annual statutory dates in one list — plus the headcount thresholds that decide which ones apply.",
"img_alt": "A calendar with statutory payroll deadlines marked across the month",
"published": "2026-09-02", "published_h": "2 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "The HR &amp; payroll compliance calendar for a <span class=\"accent\">small Indian business</span>",
"lead": "Compliance in a small company fails on dates, not on knowledge. Here is every recurring date, what triggers it, and what has to be true in your records for it to be met.",
"lede": "<b>A small Indian employer has roughly five monthly dates, one quarterly, two half-yearly and six annual statutory obligations tied to payroll.</b> The monthly ones are the ones that hurt: wages paid by the 7th, TDS on salary deposited by the 7th, PF and ESI contributions filed and paid by the 15th, and professional tax on the date your state sets. Whether each applies depends on headcount and wage thresholds, so the calendar below is paired with the trigger for each line. Dates checked 11 September 2026; confirm state-specific items with your consultant.",
"takeaways": [
  "Monthly: <b>wages and TDS by the 7th, PF and ESI by the 15th</b>, professional tax per state. Everything else is downstream of getting these four right.",
  "Each obligation has a <b>threshold</b> — PF at 20+ employees, ESI at 10+ with wages up to ₹21,000, bonus at 20+ with wages up to ₹21,000, gratuity at 10+. Know which side of each line you are on <i>this month</i>.",
  "Quarterly TDS returns (Form 24Q) and the annual Form 16 are produced from the same monthly deductions — if the monthly figures are right, the rest is assembly.",
  "The calendar only works if <b>attendance is final by the 2nd</b>. Every date above is a payroll date in disguise.",
  "Put the dates in a shared calendar with an owner per line. A date nobody owns is a date that gets missed the month the owner is on leave.",
],
"sections": [
("thresholds", "First, which obligations apply to you", """
    <table class="facts">
      <tr><th>Scheme</th><td>Applies when</td></tr>
      <tr><th>Provident Fund (EPF)</th><td>20 or more employees; mandatory for staff with wages up to ₹15,000, optional above with consent</td></tr>
      <tr><th>ESI</th><td>10 or more employees in a notified area (20 in some states); covers staff with gross wages up to ₹21,000</td></tr>
      <tr><th>Professional tax</th><td>State-specific; most states from the first employee, with slab rates set by the state</td></tr>
      <tr><th>TDS on salary</th><td>Any employee whose estimated annual income exceeds the basic exemption limit</td></tr>
      <tr><th>Payment of Bonus</th><td>20 or more employees; eligible staff with wages up to ₹21,000</td></tr>
      <tr><th>Gratuity</th><td>10 or more employees; payable to staff completing five years (one year for fixed-term)</td></tr>
      <tr><th>Maternity Benefit</th><td>10 or more employees</td></tr>
      <tr><th>Shops &amp; Establishments</th><td>Registration and returns per state; applies from the first employee in most states</td></tr>
    </table>
    <p>Headcount is counted across the establishment, and once a threshold is crossed the obligation generally continues even if headcount later dips. The month you hire your tenth or twentieth person is a compliance event; put it in the <a href="/blog/employee-onboarding-checklist-small-business">onboarding checklist</a> so it is noticed.</p>
"""),
("monthly", "Monthly dates", """
    <table class="facts">
      <tr><th>By the 2nd</th><td>Attendance and leave for the previous month final — corrections closed, LOP days confirmed. Not statutory; everything below depends on it.</td></tr>
      <tr><th>By the 7th</th><td><b>Wages paid</b> for the previous month (Code on Wages, establishments under 1,000 employees).</td></tr>
      <tr><th>By the 7th</th><td><b>TDS on salary deposited</b> for the previous month (30 April for March deductions).</td></tr>
      <tr><th>By the 15th</th><td><b>PF ECR filed and contribution paid</b> for the previous month.</td></tr>
      <tr><th>By the 15th</th><td><b>ESI contribution paid</b> for the previous month.</td></tr>
      <tr><th>State date</th><td><b>Professional tax</b> deducted and remitted — e.g. by the end of the month in Maharashtra, the 20th in Karnataka. Check your state.</td></tr>
    </table>
    <p>Notice the compression: the payroll must be computed, paid and its deductions deposited within the first week. That is only possible when the month's attendance is not being argued about in the first week. <a href="/blog/how-to-run-payroll-without-an-accountant">A monthly payroll process</a> that closes on time is the real compliance tool.</p>
"""),
("quarterly", "Quarterly and half-yearly dates", """
    <table class="facts">
      <tr><th>31 July</th><td>Form 24Q (TDS on salary return) for April–June</td></tr>
      <tr><th>31 October</th><td>Form 24Q for July–September</td></tr>
      <tr><th>31 January</th><td>Form 24Q for October–December</td></tr>
      <tr><th>31 May</th><td>Form 24Q for January–March (includes the annual salary detail)</td></tr>
      <tr><th>11 May</th><td>ESI half-yearly return for October–March</td></tr>
      <tr><th>11 November</th><td>ESI half-yearly return for April–September</td></tr>
    </table>
"""),
("annual", "Annual dates", """
    <table class="facts">
      <tr><th>15 June</th><td><b>Form 16</b> issued to every employee for the previous financial year</td></tr>
      <tr><th>30 November</th><td><b>Statutory bonus</b> paid — within eight months of the financial year's close</td></tr>
      <tr><th>Per state</th><td><b>Labour Welfare Fund</b> contributions (e.g. June and December in Maharashtra; annual in some states)</td></tr>
      <tr><th>Per state</th><td><b>Shops &amp; Establishments annual return</b> and registration renewal</td></tr>
      <tr><th>31 January</th><td><b>POSH annual report</b> to the district officer, where an Internal Committee is required (10 or more employees)</td></tr>
      <tr><th>Start of year</th><td><b>Holiday list</b> published — see <a href="/blog/company-holiday-calendar-india">building the company holiday calendar</a></td></tr>
    </table>
"""),
("records", "The records each date depends on", """
    <p>Every line above is computed from three records: <b>who worked which days</b> (attendance and leave), <b>what they are paid and how it is structured</b> (salary master with effective dates), and <b>what was deducted</b> (the payroll register). If those three are accurate and available on the 1st, the calendar is administrative. If they are reconstructed from a register, a WhatsApp group and a spreadsheet, the calendar is a monthly emergency.</p>
    <p>Keep them for the statutory period — wage registers and attendance records are generally required for three years under the codes, longer for PF and income-tax purposes — and keep them somewhere that survives a laptop failure. <a href="/blog/workforce-data-security-checklist">What to ask any system holding them</a>.</p>
"""),
],
"facts": [
("Wages paid", "By the 7th of the following month"),
("TDS on salary", "Deposit by the 7th; 24Q quarterly on 31 Jul, 31 Oct, 31 Jan, 31 May; Form 16 by 15 June"),
("PF", "ECR and payment by the 15th; applies at 20+ employees"),
("ESI", "Payment by the 15th; half-yearly returns by 11 May and 11 Nov; applies at 10+ employees, wages up to ₹21,000"),
("Professional tax", "State-specific date and slabs"),
("Bonus", "By 30 November; applies at 20+ employees, wages up to ₹21,000"),
("Record retention", "Generally three years for wage and attendance registers; longer for PF and tax"),
],
"faqs": [
("What is the due date for PF payment every month?", "The PF ECR must be filed and the contribution paid by the 15th of the month following the wage month. Late payment attracts interest and damages, and the deduction from the employee's salary is not recognised as a deduction for the employer until it is deposited."),
("What is the due date for TDS on salary?", "TDS deducted from salary in a month must be deposited by the 7th of the following month, except for March, where the deadline is 30 April. The quarterly return, Form 24Q, is due on 31 July, 31 October, 31 January and 31 May, and Form 16 must be issued to employees by 15 June."),
("When does ESI become applicable to a small business?", "ESI applies to establishments with 10 or more employees in areas where the scheme is notified (20 in some states), covering employees whose gross wages are up to ₹21,000 a month. Contributions are due by the 15th of the following month, with half-yearly returns by 11 May and 11 November."),
("Is professional tax the same in every state?", "No. Professional tax is a state levy, with different slabs and different remittance dates — some states remit monthly, some annually, and a few do not levy it at all. Check the rule for the state where the employee works, which is not always the state where the company is registered."),
("How long do I have to keep attendance and payroll records?", "The labour codes generally require wage and attendance registers to be preserved for three years. PF, ESI and income-tax records can be called for over longer periods, so most small businesses keep payroll history for at least seven years, ideally in a system rather than on a single laptop."),
("Which compliance date do small businesses miss most often?", "The 15th for PF and ESI, usually because the payroll itself was late and the deposit was the last step. The fix is upstream: close attendance within two days of month-end so wages can be paid by the 7th and deposits follow with a week to spare."),
],
"merik": """
    <p>Merik is the record the calendar depends on, not the filing portal. Attendance, leave and work-from-home are captured as they happen and rolled into the month; payroll is computed on the server from those days, with basic, HRA, other allowance, professional tax, LOP, incentives and arrears on every payslip; and every run is stored, so the register your consultant needs for the 15th is a report, not a reconstruction.</p>
    <p>Because employees mark their own attendance and download their own payslips, the first week of the month is spent paying people rather than counting them. Filing PF, ESI and TDS stays with you or your accountant — Merik gives them numbers that are already final. Start with the <a href="/modules">payroll module</a>, or run the <a href="/roi">ROI calculator</a> on what the monthly reconciliation currently costs you.</p>
""",
"related": ["new-labour-codes-india-small-business-payroll", "payroll-compliance-checklist-india-small-business", "how-to-run-payroll-without-an-accountant"],
},

{
"slug": "overtime-calculation-india-small-business",
"crumb": "Overtime calculation",
"title": "Overtime Calculation in India: Rules, Formula and Worked Examples for Small Teams",
"desc": "How overtime is calculated in India — the 48-hour week, double the ordinary rate, the monthly-wages ÷ 208 hourly formula, who is eligible, comp-off versus pay, and what records you need — with worked examples.",
"keywords": "overtime calculation India, overtime formula India, overtime pay rules India, double overtime rate, overtime hourly rate formula, overtime calculation Shops and Establishments Act, overtime small business, comp off vs overtime pay",
"og_title": "Overtime in India: the rule, the formula, the examples",
"og_desc": "Twice the ordinary rate, computed on monthly wages ÷ 208 — and the record-keeping that makes it defensible.",
"img_alt": "A timesheet showing hours worked beyond the standard nine-hour day",
"published": "2026-09-03", "published_h": "3 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Overtime calculation in India: <span class=\"accent\">the rule, the formula, the records</span>",
"lead": "Overtime disputes are rarely about the rate. They are about whether anyone can prove the hours. Here is the arithmetic, and the record that makes it stand up.",
"lede": "<b>In India, overtime is payable at twice the ordinary rate of wages for hours worked beyond the statutory limit — 48 hours a week, and 9 hours a day under most state Shops &amp; Establishments Acts and the Factories Act.</b> The hourly rate is usually derived as monthly wages ÷ 208 (26 working days × 8 hours), so an employee on ₹26,000 basic plus DA has an ordinary rate of ₹125 an hour and an overtime rate of ₹250. The Occupational Safety, Health and Working Conditions Code, in force since November 2025, keeps the double rate and caps overtime at 125 hours a quarter. Everything that follows is how to apply this without an argument at month-end.",
"takeaways": [
  "Overtime is <b>twice the ordinary rate</b>, on hours beyond 9 a day or 48 a week (the exact daily limit is set by your state's Shops &amp; Establishments Act).",
  "The standard hourly divisor is <b>208</b> — 26 days × 8 hours. Some states and awards use 26 × daily hours; write down which one you use.",
  "\"Wages\" for overtime generally means basic plus DA, which is now also the labour-code definition — <a href=\"/blog/new-labour-codes-india-small-business-payroll\">the 50% rule</a> changes the base for many salaries.",
  "Managerial and supervisory staff are typically <b>excluded</b>; everyone else is not, regardless of what the offer letter says.",
  "The only overtime record that survives a dispute is <b>check-in and check-out times captured on the day</b> — not a total typed in at month-end.",
],
"sections": [
("rules", "The rules, briefly", """
    <ul>
      <li><b>Daily and weekly limits.</b> The Factories Act and most state Shops &amp; Establishments Acts set 9 hours a day and 48 hours a week as the ordinary limit, with a spread-over (the window between first start and last finish, including breaks) of 10.5 to 12 hours depending on the state.</li>
      <li><b>Rate.</b> Twice the ordinary rate of wages. The OSH Code preserves this and sets a quarterly ceiling of 125 overtime hours; state rules may set lower limits.</li>
      <li><b>Consent.</b> Overtime should be with the employee's consent — a point the OSH Code makes explicit.</li>
      <li><b>Who is excluded.</b> Employees in managerial, supervisory or confidential positions are generally outside overtime provisions. Calling a data-entry role \"executive\" does not move it across that line; the test is the nature of the work.</li>
      <li><b>Weekly off.</b> One day of rest in seven. Work on the weekly off is either compensated with a substitute day off or paid at the overtime rate, depending on state rules.</li>
    </ul>
"""),
("formula", "The formula, with three worked examples", """
    <p><b>Ordinary hourly rate = monthly wages ÷ 208.</b> Monthly wages here means the components counted as wages — basic and dearness allowance in most rules. <b>Overtime pay = overtime hours × ordinary hourly rate × 2.</b></p>
    <table class="facts">
      <tr><th>Example 1</th><td>Basic + DA ₹20,800. Hourly rate ₹100. 12 overtime hours in the month → 12 × 100 × 2 = <b>₹2,400</b>.</td></tr>
      <tr><th>Example 2</th><td>Basic + DA ₹31,200. Hourly rate ₹150. Worked 10 hours on a 9-hour day, five times → 5 overtime hours → 5 × 150 × 2 = <b>₹1,500</b>.</td></tr>
      <tr><th>Example 3</th><td>Basic + DA ₹26,000. Hourly rate ₹125. Worked 52 hours in a 48-hour week across six days of 8h40m — no single day exceeded 9 hours, but the week did → 4 overtime hours → 4 × 125 × 2 = <b>₹1,000</b>. Weekly overtime is the one most spreadsheets miss.</td></tr>
    </table>
    <p>Two decisions to write into your policy: whether the divisor is 208 or 26 × your actual daily hours, and whether overtime is computed daily, weekly, or both (both is correct under most rules — an hour counts if it exceeds either limit, but is not paid twice).</p>
"""),
("compoff", "Compensatory off versus overtime pay", """
    <p>Compensatory off — a paid day off in lieu of extra hours — is permitted in specific circumstances under most state Acts, typically for work on a weekly off or holiday, and usually within a set period. It is <b>not</b> a general substitute for overtime pay on ordinary weekdays, and offering \"comp-off instead of OT\" as a blanket policy is a common small-business exposure.</p>
    <p>If you use comp-off, record it like leave: a credit with a date, an expiry, and a debit when taken. An untracked comp-off is a promise nobody can find at exit time — see <a href="/blog/employee-exit-full-and-final-settlement">full and final settlement</a> for what that costs.</p>
"""),
("records", "The record that makes overtime defensible", """
    <p>An overtime claim is an arithmetic on two timestamps. If the timestamps are captured when they happen — check-in, check-out, on the employee's own device, with the time set by the server — the calculation is mechanical and the dispute has nothing to attach to. If the hours are typed into a sheet at month-end from memory, the dispute is the record.</p>
    <p>What to keep, per day: start time, end time, break deduction, the applicable daily limit, hours beyond it, and the running weekly total. Most state rules also require an overtime register; the daily record is what fills it. <a href="/blog/biometric-vs-gps-vs-manual-attendance">How the three capture methods compare</a> on exactly this point.</p>
"""),
("mistakes", "Four mistakes that surface at inspection or exit", """
    <ol>
      <li><b>Paying overtime at 1× \"as a bonus\".</b> The rate is 2×; a lower rate is a shortfall, not a gesture.</li>
      <li><b>Computing on gross instead of wages, or on basic when the structure violates the 50% rule.</b> Use the labour-code definition of wages.</li>
      <li><b>Missing weekly overtime</b> because each day was within limits.</li>
      <li><b>No consent, no register.</b> An hour worked with nothing recorded is an hour you cannot prove was voluntary, or paid.</li>
    </ol>
"""),
],
"facts": [
("Ordinary limit", "9 hours/day, 48 hours/week (state Shops &amp; Establishments Acts; Factories Act)"),
("Rate", "Twice the ordinary rate of wages"),
("Hourly rate formula", "Monthly wages ÷ 208 (26 days × 8 hours) — confirm your state's divisor"),
("Quarterly cap", "125 overtime hours (OSH Code); state rules may be lower"),
("Excluded", "Managerial, supervisory and confidential roles, by nature of work"),
("Comp-off", "Permitted for weekly-off or holiday work under state rules; not a substitute for weekday overtime pay"),
("Record", "Daily start/end times captured on the day; overtime register"),
],
"faqs": [
("How is overtime calculated in India?", "Overtime is paid at twice the ordinary rate of wages for hours worked beyond the statutory limit, usually 9 hours a day or 48 hours a week. The ordinary hourly rate is derived by dividing monthly wages — typically basic plus dearness allowance — by 208, which is 26 working days of 8 hours. Overtime pay is the overtime hours multiplied by that hourly rate multiplied by two."),
("What is the overtime formula per hour?", "Hourly rate = monthly wages ÷ 208; overtime rate = hourly rate × 2. On ₹26,000 monthly wages the hourly rate is ₹125 and the overtime rate ₹250. Some states use 26 × the actual daily hours as the divisor, so state the divisor in your policy."),
("Is overtime mandatory for salaried employees in India?", "For employees covered by the Factories Act or a state Shops and Establishments Act, yes — overtime beyond the daily or weekly limit must be paid at double the rate regardless of whether the employee is paid a monthly salary. Employees in managerial or supervisory roles are generally excluded, based on the nature of the work rather than the job title."),
("Can I give compensatory off instead of overtime pay?", "Only in the circumstances your state's rules allow, typically for work on a weekly off or a holiday, and usually within a defined period. Comp-off is not a general substitute for overtime pay on regular working days. If you use it, record credits and debits with dates, as you would leave."),
("What is the maximum overtime allowed per quarter?", "The Occupational Safety, Health and Working Conditions Code sets a ceiling of 125 overtime hours in a quarter. Individual state rules may set a lower limit, and daily spread-over limits still apply."),
("What records do I need to prove overtime was paid correctly?", "Daily start and end times captured at the time, the break deduction, the applicable daily and weekly limits, the hours beyond them, and the overtime register most state rules require. Timestamps recorded on the day are what make the calculation defensible; totals typed at month-end are not."),
],
"merik": """
    <p>Merik records the two numbers overtime depends on: the check-in and check-out time, captured when the employee taps them, with the location alongside. Late marks and half-days apply by your configured rules, and the day's hours sit in the attendance record rather than in anyone's memory. That gives you the daily and weekly totals a defensible overtime calculation needs.</p>
    <p>Merik does not compute overtime pay automatically. When you have the month's overtime figure, it goes on the payslip as an incentive line alongside basic, HRA, other allowance, professional tax, LOP and arrears — and the payslip is generated, stored and emailed from there. See the <a href="/modules">attendance and payroll modules</a>.</p>
""",
"related": ["calculating-late-marks-half-days-fairly", "new-labour-codes-india-small-business-payroll", "loss-of-pay-calculation-explained"],
},

{
"slug": "how-to-generate-salary-slips-small-business",
"crumb": "Generating salary slips",
"title": "How to Generate Salary Slips for Your Team (Without a Salary Slip Generator Template)",
"desc": "A monthly process for producing correct, consistent salary slips for a small team — why online generators and Excel templates go wrong, what each slip must show, a worked example, and how to distribute slips without emailing a spreadsheet.",
"keywords": "salary slip generator, how to make salary slip, salary slip format excel, generate payslip small business, payslip generator India, monthly salary slip process, salary slip template problems, payslip PDF email employees",
"og_title": "Generating salary slips without a template",
"og_desc": "Why generator templates produce wrong slips, what a slip must show, and a process that issues every slip by the 7th.",
"img_alt": "A monthly payslip generated from recorded attendance and salary structure",
"published": "2026-09-03", "published_h": "3 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "How to generate salary slips for your team <span class=\"accent\">without a template</span>",
"lead": "\"Salary slip generator\" is one of the most-searched payroll phrases in India. The search is the symptom: the numbers on the slip are being typed, not computed.",
"lede": "<b>A salary slip is produced correctly when it is computed from three records — the month's attendance, the employee's salary structure and the statutory deductions — and then rendered, rather than typed into a template.</b> Online generators and Excel formats fail because they start at the rendering step: someone types basic, HRA and the deductions from memory or from another sheet, and the slip inherits every transcription error. The process below runs the other way — days first, structure second, slip last — and issues every slip by the 7th, which the <a href=\"/blog/new-labour-codes-india-small-business-payroll\">Code on Wages</a> now requires for wage payment.",
"takeaways": [
  "A payslip is an <b>output</b>. If you are typing into it, the inputs are somewhere else, and that is where the error is.",
  "Every slip needs three blocks: <b>earnings, deductions, and the attendance that produced them</b> (paid days, LOP days). Slips without the third block cannot be checked by the employee.",
  "The most common wrong slip is a <b>correct structure applied to the wrong number of paid days</b>. Fix attendance before touching the slip.",
  "Distribute slips <b>individually</b> — one document per employee, sent to that employee. Never a shared sheet, never a group.",
  "Keep every slip as issued. A slip regenerated later from changed data is a different document.",
],
"sections": [
("why-generators-fail", "Why generators and templates produce wrong slips", """
    <p>A template is a layout with blanks. A generator is a template with arithmetic for the totals. Neither knows how many days the employee worked, whether their salary was revised on the 16th, whether they had two days of loss-of-pay, or what professional tax slab applies. Someone types those in. Five things then go wrong, in roughly this order of frequency:</p>
    <ul>
      <li><b>Paid days are wrong</b> — a leave request approved on WhatsApp never reached the sheet.</li>
      <li><b>The LOP divisor is inconsistent</b> — 30 in one month, calendar days in the next. <a href="/blog/loss-of-pay-calculation-explained">The divisor question, settled</a>.</li>
      <li><b>A mid-month revision is applied to the whole month</b> instead of pro rata, or arrears are forgotten.</li>
      <li><b>A deduction is copied from last month</b> when the slab or the amount changed.</li>
      <li><b>The slip is edited after issue</b> and the employee's copy no longer matches the register.</li>
    </ul>
    <p>None of these are arithmetic errors. They are all record errors, and a better template cannot fix a record.</p>
"""),
("what-a-slip-shows", "What every salary slip has to show", """
    <p>The <a href="/blog/payslip-format-what-to-include">full payslip format guide</a> covers each line; the minimum is:</p>
    <ul>
      <li><b>Header:</b> employee name and ID, designation, month, date of issue, company name.</li>
      <li><b>Attendance block:</b> days in month, paid days, LOP days, leave taken.</li>
      <li><b>Earnings:</b> basic, HRA, other allowances, incentives, arrears — each as a separate line — and gross.</li>
      <li><b>Deductions:</b> PF (where applicable), ESI (where applicable), professional tax, TDS, LOP amount — and the total.</li>
      <li><b>Net pay</b>, in figures, with the payment date and mode.</li>
    </ul>
    <p>The attendance block is the one that templates leave out and employees need most: with it, a person can check their own slip in a minute; without it, every question becomes an HR ticket.</p>
"""),
("process", "The monthly process, step by step", """
    <ol>
      <li><b>Lock attendance</b> for the month by the 2nd. All corrections approved, all leave recorded, LOP days confirmed per employee. <a href="/blog/attendance-regularisation-corrections">How corrections should flow</a>.</li>
      <li><b>Confirm salary structures</b> — any revisions effective this month, any arrears from a revision backdated into it. <a href="/blog/salary-hike-revision-cycle">Effective dates and arrears</a>.</li>
      <li><b>Compute</b> gross from structure × paid days ÷ divisor; then deductions on the rules that apply; then net. Do this in one place for all employees, not one slip at a time.</li>
      <li><b>Review the register</b>, not the slips: sort by variance from last month, and look at every employee whose net moved more than a leave day or a revision explains.</li>
      <li><b>Generate</b> one slip per employee from the reviewed register. The slip is a rendering; the register is the record.</li>
      <li><b>Distribute individually</b> — email or self-service download, one document per person.</li>
      <li><b>Archive as issued.</b> If a correction is needed, issue a revised slip and keep both.</li>
    </ol>
"""),
("example", "A worked example", """
    <p>Employee on gross ₹40,000 (basic ₹20,000, HRA ₹8,000, other allowance ₹12,000). September has 30 days; she had 2 LOP days, so 28 paid days. Professional tax ₹200. No PF (company below threshold), no TDS (income below the exemption limit after standard deduction).</p>
    <table class="facts">
      <tr><th>Basic</th><td>20,000 × 28 ÷ 30 = ₹18,667</td></tr>
      <tr><th>HRA</th><td>8,000 × 28 ÷ 30 = ₹7,467</td></tr>
      <tr><th>Other allowance</th><td>12,000 × 28 ÷ 30 = ₹11,200</td></tr>
      <tr><th>Gross (earned)</th><td><b>₹37,333</b> — equivalently, full gross ₹40,000 less LOP ₹2,667</td></tr>
      <tr><th>Deductions</th><td>Professional tax ₹200</td></tr>
      <tr><th>Net pay</th><td><b>₹37,133</b></td></tr>
    </table>
    <p>Show LOP either as reduced earnings (as above) or as a full-gross earnings block with LOP as a deduction line — both are accepted, but use one consistently, and always show the paid-days figure so the employee can reproduce it.</p>
"""),
("distribution", "Distributing slips safely", """
    <p>A slip contains a person's salary, PAN-linked deductions and often their bank account. Send it only to that person: an individual email with the slip attached or linked, or a self-service portal where each employee downloads their own. A shared drive folder, a group email or a WhatsApp forward is a data-protection incident waiting for a wrong tap — <a href="/blog/workforce-data-security-checklist">the checklist</a> for what an HR system should do with this data.</p>
"""),
],
"howto": {
  "name": "How to generate salary slips for a small team every month",
  "desc": "Seven steps from locked attendance to individually distributed, archived payslips.",
  "steps": [
    ("Lock the month's attendance", "Close corrections and confirm paid days and LOP days per employee by the 2nd."),
    ("Confirm salary structures and arrears", "Apply any revisions effective this month pro rata and compute arrears for backdated changes."),
    ("Compute the payroll register", "Gross from structure and paid days, then deductions, then net — for all employees in one place."),
    ("Review by variance", "Check every employee whose net pay moved more than their leave or revision explains."),
    ("Generate one slip per employee", "Render each slip from the reviewed register with the attendance block included."),
    ("Distribute individually", "Email or self-service download, one document to one person; never a shared file."),
    ("Archive as issued", "Keep every slip as sent; issue a revised slip rather than editing the original."),
  ],
},
"facts": [
("Inputs", "Locked attendance, salary structure with effective dates, applicable deductions"),
("Three blocks", "Attendance (paid/LOP days) · Earnings · Deductions"),
("Order", "Days → structure → compute → review → render → distribute → archive"),
("Deadline", "Wages by the 7th of the following month (Code on Wages)"),
("Distribution", "Individually, one slip to one employee; self-service download preferred"),
("Corrections", "Issue a revised slip; never edit an issued one"),
],
"faqs": [
("How do I make a salary slip for my employees?", "Start from the month's locked attendance to get paid days and loss-of-pay days per employee, apply each employee's salary structure pro rata, compute the deductions that apply to them, review the resulting register for unexplained variances, and only then render one slip per employee showing attendance, earnings, deductions and net pay. Typing directly into a template skips the first four steps, which is where the errors are."),
("What should a salary slip include in India?", "Employee name and ID, designation, month and date of issue; days in the month, paid days and LOP days; each earning component — basic, HRA, other allowances, incentives, arrears — and gross; each deduction — PF and ESI where applicable, professional tax, TDS, LOP — and the total; and net pay with the payment date. Showing the attendance figures lets the employee verify the slip themselves."),
("Is an online salary slip generator safe to use?", "It is only as accurate as the numbers typed into it, and many free generators run in a browser tab with no record of what was issued. For a team of any size the risks are wrong paid-day counts, inconsistent LOP divisors and no archive. Use a process that computes the slip from recorded attendance and keeps every issued slip."),
("How should salary slips be sent to employees?", "Individually — one document, to one employee, by email or through a self-service portal where each person downloads only their own. Never through a shared folder, a group email or a messaging group, because a slip contains salary, tax and often bank details."),
("Can I edit a salary slip after issuing it?", "You should not. If a slip was wrong, issue a revised slip clearly marked as such and keep the original; the register and the employee's copy must always match. Silent edits create two versions of the truth and are the first thing questioned in any dispute."),
("How is loss of pay shown on a salary slip?", "Either as reduced earnings — each component multiplied by paid days over days in the month — or as full earnings with a separate LOP deduction line. Both are accepted; pick one and use it consistently, and always show the paid-days and LOP-days figures that produced it."),
],
"merik": """
    <p>In Merik the slip is the last step, not the first. Employees record attendance, leave and work-from-home through the month; corrections go through approval; and when the month is locked, payroll is computed on the server — basic, HRA, other allowance, professional tax, LOP, incentives and arrears — from the days already recorded. Nothing is typed into a slip.</p>
    <p>Payslips are generated per employee, stored as issued, and emailed individually or in bulk; each employee also downloads their own from their dashboard, so the salary of one person is never in a file that another can open. See the <a href="/modules">payroll module</a>, or <a href="/blog/attendance-to-payroll-automation">how attendance reaches payroll</a> in the first place.</p>
""",
"related": ["payslip-format-what-to-include", "ctc-vs-in-hand-salary-payslip", "attendance-to-payroll-automation"],
},

{
"slug": "payroll-software-small-business-india-how-to-choose",
"crumb": "Choosing payroll software",
"title": "Payroll Software for Small Business in India: A 10-Point Checklist Before You Choose",
"desc": "What a 5–200 person Indian business actually needs from payroll software — attendance linkage, LOP automation, India-specific components, payslip distribution, self-service, audit trail, security, export and pricing — and the red flags that predict a painful year.",
"keywords": "payroll software small business India, best payroll software India small business, payroll software checklist, how to choose payroll software, payroll software with attendance, free payroll software India, payroll software for startups India, HR payroll software comparison",
"og_title": "Payroll software for a small Indian business: the 10-point checklist",
"og_desc": "What you need at 5–200 people, what enterprise tools sell you instead, and the red flags.",
"img_alt": "A checklist for evaluating payroll software against a small business's real needs",
"published": "2026-09-04", "published_h": "4 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Payroll software for a small Indian business: <span class=\"accent\">a 10-point checklist</span>",
"lead": "Most payroll software is designed for a payroll department. You do not have one. Here is what to check when the person running payroll is also running the company.",
"lede": "<b>For a business of 5–200 employees, payroll software should do one thing above all: compute pay from attendance that is already recorded, so nobody re-types days into a salary sheet.</b> Everything else — statutory components, payslip distribution, self-service, an audit trail — follows from that. The checklist below is ordered by how often the item turns out to matter a year in, with the questions to ask a vendor and the answers that should end the conversation.",
"takeaways": [
  "The first question is not \"does it compute PF\" but <b>\"where do the paid days come from?\"</b> If the answer is an upload, you have bought a calculator.",
  "Loss-of-pay, mid-month revisions and arrears are where small-business payroll goes wrong. <b>Check those three</b> with your own numbers before anything else.",
  "Self-service — employees seeing their own attendance and downloading their own slips — <b>removes half of the monthly questions</b>. It is not a nice-to-have.",
  "Per-employee pricing on a free tier, data you cannot export, and payroll computed in the browser are the <b>three red flags</b> that predict a bad year.",
  "Statutory filing is a separate job from payroll computation. Decide whether you want software that files or a consultant who does, and do not pay twice.",
],
"sections": [
("what-you-need", "What a small business actually needs (and what it is sold)", """
    <p>Enterprise payroll suites are built around a payroll team, a workflow with approvals at four levels, and a compliance department that needs 40 reports. A small business has an office manager or founder, one approver, and needs six numbers to be right by the 7th. Buying the suite means paying for the workflow and then working around it.</p>
    <p>What the small business needs is narrower and harder: attendance and leave captured daily by employees themselves, a salary structure per person with effective dates, a computation that handles LOP and arrears correctly, a payslip per employee that they can fetch themselves, and a record that survives an audit. <a href="/blog/hrms-vs-payroll-software-vs-attendance-app">HRMS, payroll software or attendance app?</a> covers the category question; this article assumes you have decided payroll is the pain.</p>
"""),
("checklist", "The 10-point checklist", """
    <ol>
      <li><b>Attendance-linked.</b> Are paid days computed from attendance recorded in the same system, or uploaded from elsewhere? Ask to see the path from a check-in to a payslip line.</li>
      <li><b>Loss of pay automated.</b> Does LOP flow from unapproved absence automatically, with a stated divisor? Test with a mid-month joiner and a two-day absence. <a href="/blog/loss-of-pay-calculation-explained">The divisor argument</a>.</li>
      <li><b>India-ready components.</b> Basic, HRA, other allowances, professional tax, PF and ESI where applicable, TDS, incentives, arrears. And does the default structure respect the <a href="/blog/new-labour-codes-india-small-business-payroll">50% wages rule</a>?</li>
      <li><b>Revisions with effective dates.</b> A salary hike effective the 16th must pro-rate and produce arrears if backdated. Ask the vendor to show it.</li>
      <li><b>Payslips per employee, distributed individually.</b> Generated, stored as issued, emailed or downloadable by the employee — never a shared sheet.</li>
      <li><b>Employee self-service.</b> Employees mark attendance, request leave, and see their own slip without asking anyone. <a href="/blog/employee-self-service-what-it-means">Why this matters</a>.</li>
      <li><b>Audit trail.</b> Who changed an attendance day, when, and what it was before. Corrections through approval, not silent edits.</li>
      <li><b>Security and isolation.</b> Where is data stored, is tenant isolation enforced in the database, who at the vendor can read your salaries? <a href="/blog/workforce-data-security-checklist">The eight questions</a>.</li>
      <li><b>Export.</b> Can you get the payroll register, attendance and task history out as CSV any month you like? A system you cannot leave is a system you stop trusting.</li>
      <li><b>Pricing model.</b> Is the free tier genuinely usable at your size, and what does the per-employee price do at 50 and 150 people?</li>
    </ol>
"""),
("red-flags", "Five red flags", """
    <ul>
      <li><b>\"Just upload the attendance file.\"</b> That is the re-keying you were trying to remove, with a CSV in the middle.</li>
      <li><b>Salary math in the browser.</b> If the computation runs on the user's laptop, the record can differ from the slip. Computation should be server-side and stored.</li>
      <li><b>No effective dates on salary.</b> Means arrears are manual, forever.</li>
      <li><b>Free tier capped at five users or thirty days of history.</b> It is a trial, not a tier.</li>
      <li><b>Filing bundled as a compulsory paid add-on</b> when you already have a consultant who files. Pay for one or the other.</li>
    </ul>
"""),
("filing", "Computation versus filing: decide which you are buying", """
    <p>Payroll computation is producing the correct register and slips. Statutory filing is submitting PF ECRs, ESI returns, TDS challans and 24Q from that register. Some software does both; many small businesses already have a CA or consultant who does the second half well and cheaply. The mistake is paying a software vendor for filing and a consultant for the same filing. Decide first, then evaluate — and either way, make sure the register the filer needs is a one-click export. <a href="/blog/hr-compliance-calendar-india-small-business">The compliance calendar</a> lists what gets filed when.</p>
"""),
("trial", "How to run a two-week trial that actually tells you something", """
    <p>Pick five real employees, including one on a mid-month joining date and one with a salary revision. Have them mark attendance for two weeks and request one leave each. Then run a payroll for the fortnight and compare every line to what you would have computed by hand. Where the numbers differ, one of you is wrong — find out which. A vendor who declines this test has told you something. <a href="/blog/spreadsheet-to-workforce-software-migration">The 30-day migration plan</a> picks up from a successful trial.</p>
"""),
],
"facts": [
("First question", "Where do paid days come from — recorded in-system, or uploaded?"),
("Hardest cases to test", "Mid-month joiner · two-day LOP · backdated revision with arrears"),
("Must-have components", "Basic, HRA, other allowance, PT, PF/ESI where applicable, TDS, incentives, arrears"),
("Distribution", "One slip per employee, stored as issued, self-service download"),
("Red flags", "Attendance upload · browser-side math · no effective dates · trial-sized free tier · compulsory filing add-on"),
("Trial length", "Two weeks with five real employees, then a hand-checked payroll"),
],
"faqs": [
("What is the best payroll software for a small business in India?", "The best choice is the one that computes pay from attendance recorded in the same system, handles loss of pay, mid-month revisions and arrears correctly, produces individual payslips employees can download themselves, and lets you export everything. Evaluate against those criteria with your own employees' numbers rather than against a feature list; a two-week trial with five real employees will tell you more than any comparison table."),
("Do I need payroll software for 10 employees?", "At ten employees a careful spreadsheet can produce correct pay, but the time goes into reconciling attendance, leave and salary changes each month rather than into the arithmetic. If that reconciliation takes more than an hour or has produced an error in the last three months, software that links attendance to payroll will pay for itself immediately — and the Code on Wages deadline of the 7th makes the reconciliation window shorter."),
("Is free payroll software good enough for a small business?", "It can be, if the free tier is designed for real use rather than as a trial — unlimited employees, no history cutoff, payslips and export included. Check what the free tier caps and what happens to your data if you stop. A free tier limited to five users or thirty days is a demo."),
("Should payroll software also file PF, ESI and TDS?", "Only if you do not already have someone who does. Many small businesses have a consultant who files accurately and cheaply from the payroll register; paying a software vendor for the same filing duplicates the cost. Decide first whether you want software that files or software that produces a clean register for your filer, and make sure the register exports in one step."),
("What is the difference between payroll software and HRMS?", "Payroll software computes pay and produces payslips; an HRMS covers the wider employee lifecycle — records, attendance, leave, onboarding, performance — with payroll as one module. For a small business the useful distinction is whether attendance and payroll share one dataset, because that is what removes the monthly re-keying regardless of what the product is called."),
("How do I test payroll software before committing?", "Run a two-week trial with five real employees, deliberately including a mid-month joiner and someone with a salary revision. Let them mark attendance and request leave, then run a payroll and compare every line to a hand calculation. Any difference is either your error or the software's, and you need to know which before you migrate."),
],
"merik": """
    <p>Merik is built for the checklist above rather than for a payroll department. Employees self sign-up and mark their own attendance with geolocated check-in; leave and work-from-home are requests with approvals; payroll is computed on the server from those days, with basic, HRA, other allowance, professional tax, LOP, incentives and arrears, and salary revisions carry effective dates. Payslips are generated and emailed individually or in bulk, and employees download their own.</p>
    <p>Where Merik stops: it does not file PF, ESI or TDS returns — it produces the register your consultant files from. The workspace is free with unlimited employee self sign-up and no card, tenant isolation is enforced in the database, and the task log exports to CSV. Compare against your own numbers with the <a href="/roi">ROI calculator</a>, or read <a href="/pricing">what the free workspace includes</a>.</p>
""",
"related": ["choosing-hr-software-small-business-checklist", "hrms-vs-payroll-software-vs-attendance-app", "common-payroll-mistakes-small-businesses"],
},

# ----------------------------------------------------------------------- HR
{
"slug": "gratuity-calculation-india-explained",
"crumb": "Gratuity calculation",
"title": "Gratuity Calculation in India: Formula, Eligibility and Worked Examples (2026)",
"desc": "How gratuity is calculated in India — the 15/26 formula, the five-year rule and its exceptions, rounding of service years, the ₹20 lakh tax-free limit, and what the labour codes changed for fixed-term staff — with three worked examples.",
"keywords": "gratuity calculation India, gratuity formula, gratuity eligibility 5 years, gratuity calculation formula 15/26, gratuity for fixed term employees, gratuity tax exemption 20 lakh, gratuity calculator, gratuity rules labour code",
"og_title": "Gratuity in India: formula, eligibility, worked examples",
"og_desc": "15 ÷ 26 × last wages × years — plus the five-year rule, rounding, the tax limit and the new one-year rule for fixed-term staff.",
"img_alt": "A gratuity calculation worked from last drawn wages and years of service",
"published": "2026-09-04", "published_h": "4 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Gratuity calculation in India: <span class=\"accent\">formula, eligibility, examples</span>",
"lead": "Gratuity is the exit payment most small businesses forget to provision for and then discover at the worst moment. The arithmetic is simple; the record-keeping is what goes wrong.",
"lede": "<b>Gratuity in India is calculated as 15 days' wages for every completed year of service, using the formula: last drawn wages × 15 ÷ 26 × years of service.</b> \"Wages\" means basic pay plus dearness allowance; 26 represents working days in a month; and service beyond six months in the final year counts as a full year. It is payable by establishments with 10 or more employees to anyone who leaves after five years of continuous service — or, since the labour codes took effect in November 2025, after one year for fixed-term employees, pro rata. Gratuity received is tax-free up to ₹20 lakh. Facts checked 11 September 2026.",
"takeaways": [
  "<b>Formula:</b> last drawn basic + DA × 15 ÷ 26 × completed years. On ₹30,000 wages and 7 years that is ₹1,21,154.",
  "<b>Eligibility:</b> five years' continuous service for regular employees; <b>one year, pro rata, for fixed-term employees</b> under the Code on Social Security.",
  "The final year <b>rounds up</b> if it exceeds six months — 7 years 7 months counts as 8.",
  "The <a href=\"/blog/new-labour-codes-india-small-business-payroll\">50% wages rule</a> raises the gratuity base for anyone whose basic was set low. Recalculate your liability.",
  "Gratuity is due within 30 days of it becoming payable. Provision monthly — roughly 4.81% of basic — so it is never a surprise in the <a href=\"/blog/employee-exit-full-and-final-settlement\">full and final settlement</a>.",
],
"sections": [
("formula", "The formula and what each term means", """
    <p><b>Gratuity = last drawn wages × 15 ÷ 26 × years of service</b></p>
    <ul>
      <li><b>Last drawn wages</b> — basic pay plus dearness allowance in the last month of service. Not gross, not CTC. Under the labour codes, \"wages\" also includes any excluded allowances above the 50% line.</li>
      <li><b>15 ÷ 26</b> — fifteen days' pay out of a 26-working-day month. The fraction is fixed by the statute for establishments covered by the Payment of Gratuity Act (now the Code on Social Security).</li>
      <li><b>Years of service</b> — completed years, with the final partial year rounded up if it exceeds six months.</li>
    </ul>
    <p>For employers not covered by the Act (fewer than 10 employees) who nonetheless pay gratuity, a half-month's average salary per year on a 30-day basis is the usual convention, but it is contractual rather than statutory.</p>
"""),
("examples", "Three worked examples", """
    <table class="facts">
      <tr><th>Example 1</th><td>Basic + DA ₹30,000; service 7 years 2 months → 7 years. 30,000 × 15 ÷ 26 × 7 = <b>₹1,21,154</b>.</td></tr>
      <tr><th>Example 2</th><td>Basic + DA ₹30,000; service 7 years 8 months → rounds to 8 years. 30,000 × 15 ÷ 26 × 8 = <b>₹1,38,462</b>. Six months and one day is worth a full year's gratuity — employees know this; your provisioning should too.</td></tr>
      <tr><th>Example 3 (fixed-term)</th><td>Basic + DA ₹25,000; 18-month fixed-term contract completed. Pro rata: 25,000 × 15 ÷ 26 × 1.5 = <b>₹21,635</b>. Before November 2025 this employee received nothing.</td></tr>
    </table>
"""),
("eligibility", "Eligibility: the five-year rule and its edges", """
    <ul>
      <li><b>Five years of continuous service</b> is the standard qualifying period for regular employees. Continuous service is not broken by authorised leave, maternity leave, sickness, or lay-off.</li>
      <li><b>Four years and 240 days.</b> Several High Courts have held that an employee who has worked 240 days in the fifth year has completed five years for gratuity purposes. The position is not uniform nationally; a cautious employer pays.</li>
      <li><b>Death or disablement</b> — the five-year requirement is waived.</li>
      <li><b>Fixed-term employees</b> — one year of continuous service, pro rata, under the Code on Social Security.</li>
      <li><b>Forfeiture</b> is possible only for termination on grounds of wilful misconduct causing damage, or riotous conduct — and only to the extent of the damage, or wholly for moral turpitude. Resignation never forfeits gratuity.</li>
    </ul>
"""),
("tax-timing", "Tax treatment and timing", """
    <p>Gratuity received by an employee is exempt from income tax up to ₹20 lakh across their working life; amounts above that are taxable as salary. The employer must pay within 30 days of the amount becoming due — the date of leaving — and interest applies to late payment. In practice gratuity is settled with the <a href="/blog/employee-exit-full-and-final-settlement">full and final settlement</a>, which makes the exit date the deadline.</p>
"""),
("provisioning", "Provisioning: how not to be surprised", """
    <p>Gratuity accrues at 15 ÷ 26 of a month's wages per year — 4.81% of basic plus DA. A company with ten employees on an average ₹25,000 basic accrues roughly ₹12,000 a month in future gratuity. Over five years that is ₹7.2 lakh that will be paid out as people leave, whether or not it was ever booked.</p>
    <p>Two things make it manageable. First, <b>carry a monthly provision</b> in the accounts at 4.81% of basic for every employee, from their joining date. Second, <b>keep the inputs where they cannot drift</b>: joining date, every salary revision with its effective date, and the exit date. The calculation is one line; the argument is always about the inputs. <a href="/blog/salary-hike-revision-cycle">Why CTC history has to be a record</a>.</p>
"""),
],
"facts": [
("Formula", "Last basic + DA × 15 ÷ 26 × completed years"),
("Eligibility", "5 years' continuous service (regular); 1 year pro rata (fixed-term, since Nov 2025)"),
("Rounding", "Final year counts as a full year if service in it exceeds six months"),
("Applies to", "Establishments with 10 or more employees"),
("Tax", "Exempt up to ₹20 lakh lifetime"),
("Due", "Within 30 days of leaving"),
("Monthly accrual", "≈ 4.81% of basic + DA"),
],
"faqs": [
("How is gratuity calculated in India?", "Gratuity equals last drawn basic pay plus dearness allowance, multiplied by 15, divided by 26, multiplied by completed years of service. Service in the final year counts as a full year if it exceeds six months. On wages of ₹30,000 and seven years of service the gratuity is ₹1,21,154."),
("Is gratuity payable after 4 years and 240 days?", "Several High Court decisions treat 240 days worked in the fifth year as completing five years of service for gratuity, but the position is not uniform across India. Many employers pay on that basis to avoid a dispute; if you intend not to, take advice for your state before refusing."),
("Are fixed-term employees eligible for gratuity?", "Yes. Under the Code on Social Security, which came into force on 21 November 2025, a fixed-term employee who completes one year of continuous service is entitled to gratuity on a pro-rata basis, rather than needing five years."),
("Is gratuity calculated on basic salary or gross salary?", "On basic pay plus dearness allowance — the statutory definition of wages — not on gross or CTC. Under the labour codes, if excluded allowances exceed 50% of total remuneration, the excess is added back into wages, which increases the gratuity base for employees whose basic was set low."),
("Is gratuity taxable?", "Gratuity received is exempt from income tax up to a lifetime limit of ₹20 lakh. Any amount above that is taxed as salary income in the year received."),
("When must gratuity be paid after resignation?", "Within 30 days of the date it becomes payable, which is the employee's last working day. Late payment attracts simple interest. In practice it is settled with the full and final settlement, so the exit date is the deadline."),
],
"merik": """
    <p>Merik does not compute gratuity, and says so. What it does is keep the three inputs the calculation depends on from drifting: each employee's joining date, every salary revision stored with its effective date so the last drawn basic is a record rather than a memory, and the exit date when the employee leaves. Merik's default structure sets basic at 50% of gross, which is also the labour-code wages floor, so the base you calculate on is the one the law expects.</p>
    <p>At exit, the attendance and leave records feed the final month's pay and any leave encashment, and the payslip history shows every revision. Gratuity is one line of arithmetic on top. See the <a href="/modules">employee and payroll modules</a>.</p>
""",
"related": ["employee-exit-full-and-final-settlement", "new-labour-codes-india-small-business-payroll", "salary-hike-revision-cycle"],
},

{
"slug": "hrms-vs-payroll-software-vs-attendance-app",
"crumb": "HRMS vs payroll vs attendance",
"title": "HRMS vs Payroll Software vs Attendance App: Which Does a Small Business Actually Need?",
"desc": "The three categories of workforce software explained for a 5–200 person business — what each does, what happens when you buy them separately, the integration tax, and a decision guide by team size and pain.",
"keywords": "HRMS vs payroll software, attendance app vs HRMS, HR software categories, what is HRMS, do I need HRMS small business, payroll vs HR software difference, workforce management software small business, all in one HR software",
"og_title": "HRMS, payroll software or attendance app?",
"og_desc": "What each category does, the integration tax of buying three, and a decision guide by team size.",
"img_alt": "Three software categories converging on one workforce dataset",
"published": "2026-09-05", "published_h": "5 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "HRMS vs payroll software vs attendance app: <span class=\"accent\">which do you need?</span>",
"lead": "Three categories, three vendors, three logins — and a spreadsheet in the middle joining them. Here is what each one actually does and when one workspace beats three tools.",
"lede": "<b>An attendance app records who worked; payroll software computes what they are paid; an HRMS holds the employee record and the processes around it — and the three are only useful together when they share one dataset.</b> A small business usually buys them in the order the pain arrives: an attendance app when the register stops working, payroll software when the salary sheet produces an error, and an HRMS when someone asks for a leave balance and nobody knows it. By then the month-end job is moving numbers between the three. The decision is less about which category and more about whether attendance, leave and payroll live in one record.",
"takeaways": [
  "The three categories are not rivals; they are <b>three views of one dataset</b>. The question is whether the dataset is one thing or three.",
  "Buying them separately incurs an <b>integration tax</b>: an export, an upload and a reconciliation every month, done by a person.",
  "Under 10 people, an attendance app alone may be enough. <b>Past 10, payroll linkage matters; past 25, self-service does.</b>",
  "\"HRMS\" often means a large product with modules you will never open. What you need is <b>employee record + attendance + leave + payroll + self-service</b>. Name those, not the category.",
  "Whatever you pick: it must let you leave. Export is the feature that keeps a vendor honest.",
],
"sections": [
("definitions", "What each category actually does", """
    <table class="facts">
      <tr><th>Attendance app</th><td>Captures presence — check-in/out, often with location or biometrics — and produces a monthly register. Stops at \"days\".</td></tr>
      <tr><th>Payroll software</th><td>Takes paid days and a salary structure, computes gross, deductions and net, produces payslips. Often also files statutory returns. Starts at \"days\" — which it usually asks you to upload.</td></tr>
      <tr><th>HRMS</th><td>The employee record — profile, designation, department, documents, joining and exit — plus the processes around it: leave, onboarding, performance, sometimes assets. Payroll and attendance are modules, or integrations.</td></tr>
    </table>
    <p>The gap between the first two is the one that costs money: attendance ends with a register, payroll starts with an upload, and the upload is where a leave approved on chat never arrives. <a href="/blog/attendance-to-payroll-automation">The re-keying problem in detail</a>.</p>
"""),
("integration-tax", "The integration tax of buying three tools", """
    <p>Every month, someone exports the attendance register, reconciles it against the leave tracker, adjusts for corrections that were agreed verbally, and uploads the result to payroll. Then payroll produces slips, which are downloaded and uploaded to the HRMS so employees can see them. Each step is a place an error enters and a place nobody is accountable for it.</p>
    <p>Beyond the errors, count the logins: employees need one to mark attendance, another to request leave, a third to fetch a payslip. Adoption falls with each one, and the fallback is WhatsApp, which means the attendance app is now being bypassed — <a href="/blog/whatsapp-attendance-group-problems">and you know how that ends</a>.</p>
"""),
("when-point-tools-are-fine", "When a single-purpose tool is the right answer", """
    <ul>
      <li><b>Under ten people, salaries fixed, no leave policy to speak of.</b> An attendance app and a careful sheet are fine. Revisit at ten.</li>
      <li><b>Payroll outsourced entirely</b> to a consultant who also handles attendance queries. The point tool is the consultant's input; make sure the export is clean.</li>
      <li><b>A factory with biometric devices already installed</b> and a payroll vendor that reads them directly. If the integration is real and automatic, keep it.</li>
    </ul>
"""),
("when-one-workspace", "When one workspace beats three tools", """
    <ul>
      <li><b>Past ten employees</b>, because LOP and leave balances now affect pay every month and the reconciliation is where errors live.</li>
      <li><b>Past twenty-five</b>, because employees asking \"what is my leave balance\" and \"where is my slip\" becomes a daily interruption; <a href="/blog/employee-self-service-what-it-means">self-service</a> only works if there is one place to log in.</li>
      <li><b>Any size with field staff</b>, because location-verified attendance has to reach payroll without a manual step or it is not verified at all.</li>
      <li><b>Any size that also bills clients by time</b>, because the same daily log that supports attendance can drive <a href="/blog/project-profitability-from-task-hours">project profitability</a>, and that only works with one record.</li>
    </ul>
"""),
("decision", "A decision guide by size and pain", """
    <table class="facts">
      <tr><th>5–10, office-based</th><td>Attendance app or a single workspace on its free tier. Payroll by sheet or consultant. Prioritise a clean register.</td></tr>
      <tr><th>10–25</th><td>Attendance + leave + payroll in one dataset. This is where the monthly reconciliation starts costing real hours.</td></tr>
      <tr><th>25–100</th><td>Add self-service and an audit trail. Payslips downloaded by employees, corrections through approval.</td></tr>
      <tr><th>100–200</th><td>Everything above plus reporting by department and a defined exit process. Still not an enterprise suite — the workflows are the same, the volume is larger.</td></tr>
      <tr><th>Any size, field or multi-site</th><td>Location-verified attendance that feeds payroll directly is non-negotiable.</td></tr>
    </table>
    <p>Whichever row you are in, use <a href="/blog/choosing-hr-software-small-business-checklist">the buyer's checklist</a> to evaluate the specific product, and <a href="/blog/payroll-software-small-business-india-how-to-choose">the payroll checklist</a> if payroll is the acute pain.</p>
"""),
],
"facts": [
("Attendance app", "Records presence; ends at a monthly register"),
("Payroll software", "Computes pay from paid days and structure; usually starts with an upload"),
("HRMS", "Employee record plus processes; attendance and payroll as modules or integrations"),
("Integration tax", "Monthly export → reconcile → upload, by a person, with no owner for errors"),
("Break-even for one workspace", "Roughly 10 employees, or any team with field staff"),
("Non-negotiable", "Export of every record, whichever category you choose"),
],
"faqs": [
("What is the difference between HRMS and payroll software?", "Payroll software computes pay — gross, deductions, net — from paid days and a salary structure, and produces payslips. An HRMS holds the employee record and the processes around it — profile, leave, onboarding, performance — with payroll as one module or an integration. For a small business the practical distinction is whether attendance, leave and payroll share one dataset, because that is what removes the monthly re-keying."),
("Do I need an HRMS for a small business?", "Not by that name. What a 10–200 person business needs is an employee record, attendance, leave and payroll in one place with employee self-service. Some products that provide that call themselves HRMS, some call themselves workforce management; many enterprise HRMS products provide far more than that and charge for it. Name the five things you need and evaluate against them."),
("Can I use an attendance app and separate payroll software?", "Yes, and many small businesses do. The cost is a monthly manual step — exporting the register, reconciling it against leave and corrections, and uploading it to payroll — which is where most payroll errors originate. If that step takes more than an hour or has produced an error recently, the two should share one dataset."),
("At what team size does a single workforce system pay off?", "Around ten employees, because from that point loss of pay and leave balances affect pay every month and the reconciliation is real work. Teams with field staff benefit at any size, because location-verified attendance only means something if it reaches payroll without a manual step."),
("Is an all-in-one HR platform harder to set up than an attendance app?", "Not necessarily. Setup effort depends on how much data the system needs before it is useful. A workspace where employees self sign-up and mark their own attendance from day one can be running in an afternoon; the payroll and leave modules then use data that is already there. Enterprise suites are harder because they need configuration before anything works."),
("What should I check before choosing any workforce software?", "Where paid days come from, how loss of pay and salary revisions are handled, whether employees can serve themselves, whether there is an audit trail, how data is isolated and secured, and whether you can export everything. Then run a two-week trial with five real employees and check the payroll by hand."),
],
"merik": """
    <p>Merik is the one-dataset answer. Employees, attendance, leave and work-from-home, payroll and payslips, daily tasks, clients and invoicing, and assets share one company workspace with one login per person. An employee marks attendance with a geolocated check-in, requests leave, logs the day's work and downloads their own payslip in the same place; the admin runs payroll from the days already recorded. There is no export-reconcile-upload step because there is nothing to move between.</p>
    <p>It is free to start with unlimited employee self sign-up, computes payroll on the server, enforces tenant isolation in the database, and exports the task log to CSV. See <a href="/modules">the modules</a> or <a href="/how-it-works">the three-step setup</a>.</p>
""",
"related": ["payroll-software-small-business-india-how-to-choose", "choosing-hr-software-small-business-checklist", "employee-self-service-what-it-means"],
},

# --------------------------------------------------------------- ATTENDANCE
{
"slug": "excel-attendance-sheet-problems",
"crumb": "Excel attendance sheet problems",
"title": "Why Your Excel Attendance Sheet Breaks at 15 Employees (and What to Use Instead)",
"desc": "The seven ways an Excel attendance sheet fails as a team grows — single owner, no timestamps, no location, broken formulas, leave kept elsewhere, no self-service, month-end reconciliation — the headcount where each one bites, and what a replacement has to do.",
"keywords": "excel attendance sheet problems, attendance sheet excel template, employee attendance sheet excel, attendance tracker excel, problems with excel attendance, attendance sheet alternative, replace excel attendance sheet, attendance management excel vs software",
"og_title": "Why the Excel attendance sheet breaks at 15 employees",
"og_desc": "Seven failure modes, the headcount where each one bites, and what a replacement has to do.",
"img_alt": "An attendance spreadsheet with formulas breaking as the team grows",
"published": "2026-09-05", "published_h": "5 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Why your Excel attendance sheet breaks at <span class=\"accent\">15 employees</span>",
"lead": "The sheet worked at six people because you knew where everyone was. Past fifteen, the sheet is the only thing that knows — and it does not.",
"lede": "<b>An Excel attendance sheet fails as a team grows for one structural reason: it records what someone typed, not what happened.</b> At six employees the person typing also saw everyone arrive, so the sheet was a memory aid. Somewhere between twelve and twenty, the typist no longer sees everyone, the sheet becomes the only record, and it has none of the properties a record needs — a timestamp, a location, an author, a correction trail, or a connection to the leave tracker and the salary sheet it feeds. The seven failures below arrive in roughly this order.",
"takeaways": [
  "A spreadsheet stores <b>claims</b>. An attendance system stores <b>events</b> — who, when, where, captured at the moment. That distinction is the whole problem.",
  "The sheet has <b>one owner</b>; when they are on leave, attendance stops being recorded and is reconstructed later.",
  "Leave lives in a second sheet, payroll in a third, and <b>month-end is spent making the three agree</b>. That is the hour that grows into a day.",
  "The fix is not a better template. It is <b>employees recording their own attendance</b> into a record that payroll reads directly.",
  "Keep Excel for what it is good at: <b>exporting and analysing</b> a record that lives somewhere trustworthy.",
],
"sections": [
("seven", "The seven failures, in the order they arrive", """
    <ol>
      <li><b>Single owner (from ~8 people).</b> One person fills the sheet. On their leave day, nobody does; on their return, they backfill from memory and WhatsApp.</li>
      <li><b>No timestamps (from ~10).</b> \"P\" in a cell says nothing about 9:15 versus 11:40. Late marks and half-days become opinions, and <a href="/blog/calculating-late-marks-half-days-fairly">fair rules</a> cannot be applied to data that does not exist.</li>
      <li><b>No location (any field staff).</b> A technician marked present at a site is marked present by someone who was not at the site. <a href="/blog/geolocation-attendance-field-teams">What location-verified attendance changes</a>.</li>
      <li><b>Broken formulas (from ~15).</b> A row inserted for a new joiner shifts a range; a monthly copy carries last month's holidays; a SUM stops at row 14. Nobody notices until a payslip is wrong.</li>
      <li><b>Leave kept elsewhere (from ~15).</b> Leave approvals live in email or chat; the sheet shows \"A\" for an approved leave day and LOP is deducted from someone on holiday.</li>
      <li><b>No self-service (from ~25).</b> Every \"how many leaves do I have\" and \"was I marked present on the 3rd\" is a question to the sheet owner. At 25 people that is a part-time job.</li>
      <li><b>Month-end reconciliation (from ~15, worst at 40+).</b> The attendance sheet, the leave sheet and the salary sheet are reconciled by hand under a deadline that the <a href="/blog/new-labour-codes-india-small-business-payroll">Code on Wages</a> has now set at the 7th.</li>
    </ol>
"""),
("what-a-record-needs", "What an attendance record needs that a cell cannot hold", """
    <table class="facts">
      <tr><th>Timestamp</th><td>When the check-in happened, set by a server, not typed</td></tr>
      <tr><th>Author</th><td>Who recorded it — ideally the employee themselves</td></tr>
      <tr><th>Location</th><td>Where, for anyone not at a fixed desk</td></tr>
      <tr><th>Status derivation</th><td>Present, late, half-day, absent — computed from rules, not judged per cell</td></tr>
      <tr><th>Leave linkage</th><td>An approved leave day is never \"absent\"</td></tr>
      <tr><th>Correction trail</th><td>What was changed, by whom, from what, with approval</td></tr>
      <tr><th>Payroll linkage</th><td>Paid days flow to salary without a copy-paste</td></tr>
    </table>
"""),
("the-point", "The point where it breaks, precisely", """
    <p>It is not a headcount; it is the first month in which the sheet owner cannot personally vouch for every cell. That usually coincides with the second location, the first field employee, or the first time the owner takes a week off. From then on, every payroll built on the sheet is built on reconstruction, and the reconstruction is defended by the person who did it rather than by evidence.</p>
    <blockquote>If your attendance record depends on one person's memory of the month, you do not have an attendance record. You have a witness.</blockquote>
"""),
("what-to-use", "What to use instead — and what to keep Excel for", """
    <p>The replacement has to invert the model: employees record their own presence at the moment it happens, into a record with the properties above, and payroll reads that record. That is the minimum. Whether it is called an attendance app, a workforce platform or an HRMS matters less than whether <a href="/blog/hrms-vs-payroll-software-vs-attendance-app">attendance and payroll share one dataset</a>.</p>
    <p>Keep Excel for analysis. Export the month, pivot by department, chart lateness by weekday. A spreadsheet is a superb lens on a trustworthy record and a terrible place for the record to live. <a href="/blog/spreadsheet-to-workforce-software-migration">The 30-day migration plan</a> is written for exactly this move, including the parallel month that protects your next payroll.</p>
"""),
],
"facts": [
("Root cause", "A sheet stores claims typed by one person; attendance needs events captured from many"),
("First failure", "Single owner — usually at 8–10 employees"),
("Payroll failure", "Broken formulas and leave kept elsewhere — usually at 15+"),
("Breaking point", "The first month the sheet owner cannot vouch for every cell"),
("Replacement minimum", "Employee self-recorded events with timestamp, location, rules, corrections and payroll linkage"),
("Keep Excel for", "Exporting and analysing the record, not holding it"),
],
"faqs": [
("Why is Excel bad for attendance tracking?", "Because a spreadsheet records what one person types rather than what happened. It has no timestamp of arrival, no location, no author, no correction trail and no link to leave approvals or payroll. That is manageable when the person typing sees everyone arrive; it fails as soon as they do not, which is typically between twelve and twenty employees or with the first field employee."),
("At what team size should I stop using an attendance spreadsheet?", "The honest answer is the first month the person maintaining the sheet cannot personally vouch for every entry — often around 12–15 employees, earlier with a second location or field staff. If your last payroll had an attendance-related error, the size has already been passed."),
("What is the best alternative to an Excel attendance sheet?", "A system where employees record their own check-in and check-out at the moment it happens, with a server timestamp and location, where late marks and half-days are computed by stated rules, approved leave is never marked absent, corrections go through approval, and payroll reads the resulting paid days directly. Whether it is called an attendance app or a workforce platform matters less than that linkage."),
("Can I fix my attendance sheet with better formulas or a template?", "Better formulas fix the arithmetic; they cannot fix the inputs. The failures that cost money — wrong paid days, leave marked as absence, entries backfilled from memory — are record failures, and no template captures a timestamp that nobody recorded."),
("Should I keep using Excel at all for attendance?", "Yes, as an analysis tool. Export the monthly record from wherever it lives and use a spreadsheet to pivot, chart and compare. The mistake is using the spreadsheet as the record itself."),
("How do I migrate from an attendance spreadsheet without breaking payroll?", "Cut over at a month boundary and run one month in parallel — the new system and the old sheet both recording — then reconcile the two before running payroll from the new one. Migrate current balances and structures, archive the old sheets rather than importing years of history, and use the parallel month to find the rules you never wrote down."),
],
"merik": """
    <p>Merik replaces the sheet with the record. Employees self sign-up and mark their own attendance from their dashboard; each check-in carries a server timestamp and a reverse-geocoded place name; late marks and half-days apply by the rules you configure; approved leave and work-from-home update the day automatically so nobody on holiday is marked absent; and corrections go through a request with an approval trail rather than a silent edit.</p>
    <p>Payroll then reads the month's paid days directly — no export, no upload — and the task log exports to CSV when you want to analyse it in Excel, which is where Excel belongs. The workspace is free with unlimited employee sign-up; <a href="/how-it-works">setup takes three steps</a>.</p>
""",
"related": ["whatsapp-attendance-group-problems", "spreadsheet-to-workforce-software-migration", "employee-attendance-tracking-small-business"],
},

{
"slug": "whatsapp-attendance-group-problems",
"crumb": "WhatsApp attendance groups",
"title": "WhatsApp Attendance Groups: Why They Fail and What to Replace Them With",
"desc": "Why the WhatsApp attendance group every small Indian business starts with fails — message time is not arrival time, nothing is countable, nothing reaches payroll, and salary details end up in a group — and what a replacement has to do while keeping WhatsApp for what it is good at.",
"keywords": "WhatsApp attendance group, attendance on WhatsApp problems, WhatsApp attendance tracking, attendance WhatsApp group alternative, attendance app instead of WhatsApp, mark attendance WhatsApp, WhatsApp attendance small business India",
"og_title": "WhatsApp attendance groups: why they fail",
"og_desc": "Message time is not arrival time, nothing is countable, and nothing reaches payroll. What to use instead.",
"img_alt": "A stream of chat messages that cannot be turned into an attendance register",
"published": "2026-09-06", "published_h": "6 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "WhatsApp attendance groups: <span class=\"accent\">why they fail</span> and what replaces them",
"lead": "\"Good morning, reached office\" is the most common attendance record in India. It proves a phone sent a message. Everything else is inference.",
"lede": "<b>A WhatsApp attendance group fails because a message is not a record: it has the time the message was sent, not the time the person arrived; it has no location unless someone shares it; it cannot be counted without scrolling; and it never reaches payroll except through someone re-typing it.</b> Groups start because they are free and everyone already has the app, and they persist because replacing them feels like a project. The replacement is smaller than it looks — employees tapping a check-in instead of typing one — and the difference is that the tap becomes a countable, location-stamped, payroll-readable event.",
"takeaways": [
  "<b>Message time ≠ arrival time.</b> The \"reached\" message is typed from the auto, the lift, or the desk an hour later. It is a claim, not a timestamp.",
  "A group <b>cannot be counted</b>. Month-end attendance is someone scrolling 600 messages and typing marks into a sheet — <a href=\"/blog/excel-attendance-sheet-problems\">where the next failure lives</a>.",
  "Leave, half-days and corrections happen in the <b>same thread as memes and client questions</b>. Nothing is findable in a dispute.",
  "Salary questions asked in the group are <b>salary details in a group</b>. That is a data-protection incident, not a convenience.",
  "Keep WhatsApp for conversation. Move the <b>event</b> — I am here, now, at this place — into something that stores events.",
],
"sections": [
("why-it-starts", "Why every small business starts here", """
    <p>Because on day one it is rational. Six people, one office, everyone has WhatsApp, and the owner can see who is in. The group is a courtesy — \"reached\", \"leaving early\", \"WFH today\" — and it costs nothing. It becomes the attendance system the first month someone's salary is calculated from it, which usually happens without anyone deciding it should.</p>
"""),
("failures", "Six ways it fails", """
    <ol>
      <li><b>The timestamp is the message, not the arrival.</b> A \"reached\" sent at 9:31 may describe a 9:05 arrival or a 10:20 one. Late-mark rules cannot be applied honestly, so they are applied selectively, which is worse.</li>
      <li><b>No location.</b> Field staff send \"at client site\"; the group shows a message, not a place. A live-location share expires and is not stored. <a href="/blog/geolocation-attendance-field-teams">What verified location looks like</a>.</li>
      <li><b>Nothing is countable.</b> Working days present per employee per month requires scrolling the whole month, filtering mentally by name, and typing marks into a sheet. Errors are guaranteed; nobody checks because checking is the same work again.</li>
      <li><b>Leave and corrections are lost in the thread.</b> \"Taking leave Friday\" from three weeks ago sits between a forwarded video and a client's address. At month-end, \"I told the group\" versus \"I didn't see it\" is unresolvable.</li>
      <li><b>No connection to payroll.</b> Every mark is re-keyed. The <a href="/blog/attendance-to-payroll-automation">re-keying problem</a>, with WhatsApp as the source.</li>
      <li><b>Sensitive data in a group.</b> \"Why is my salary less this month\" gets asked in the same group. One reply with a number and every member knows it. Slips forwarded to the group happen. This is the failure that ends careers, not just months.</li>
    </ol>
"""),
("what-a-replacement-must-do", "What a replacement has to do (and how little that is)", """
    <p>The replacement is not \"an HR system\". It is a place where the employee's \"I am here\" becomes an event with four properties:</p>
    <ul>
      <li><b>A server timestamp</b> — the moment they tapped, not the moment they typed.</li>
      <li><b>A location</b>, reverse-geocoded to a place name, captured at the tap only.</li>
      <li><b>A derived status</b> — present, late, half-day — from rules everyone can read. <a href="/blog/attendance-policy-template-small-business">A policy template</a>.</li>
      <li><b>A path to payroll</b> without re-typing — the month's paid days are a report, not a scroll.</li>
    </ul>
    <p>Plus two things the group does badly: leave and work-from-home as <b>requests with approvals</b>, findable by date; and corrections as <b>requests with a trail</b>, so \"I told the group\" is replaced by \"I raised a correction on the 4th and it was approved\".</p>
"""),
("adoption", "Getting a team off the group", """
    <p>The group survives on habit, so the switch has to be as light as the habit. Three things make it stick: the check-in must be one tap on the phone the employee already holds; the first payroll after the switch must visibly use the new record (people adopt what pays them); and the group must be explicitly retired for attendance — announce that from the 1st, only the tap counts, and mean it. Keep the group for everything else; conversation is what it is good at.</p>
    <p>Run one month in parallel if you are nervous — the tap and the message both — and compare. The comparison usually settles the argument. <a href="/blog/spreadsheet-to-workforce-software-migration">A migration plan that protects the next payroll</a>.</p>
"""),
],
"facts": [
("What a message proves", "That a phone sent a message at that time — not arrival, not location"),
("Countability", "None; month-end is a manual scroll and re-type"),
("Leave and corrections", "Lost in the thread; unresolvable in a dispute"),
("Payroll link", "Manual re-keying"),
("Data risk", "Salary questions and slips in a group"),
("Replacement minimum", "One-tap check-in → timestamp + location + rule-derived status → payroll"),
],
"faqs": [
("Why is WhatsApp not good for attendance?", "Because a message is a claim rather than a record. It carries the time it was sent, not the time the person arrived; it has no stored location; it cannot be counted without scrolling the month; leave and corrections get lost in the thread; and every mark has to be re-typed into a sheet for payroll. It also puts salary questions and sometimes payslips into a group where everyone can read them."),
("How do small businesses track attendance without WhatsApp?", "With a one-tap check-in on the employee's own phone that records a server timestamp and a reverse-geocoded location, derives present, late or half-day from stated rules, treats leave and work-from-home as approved requests, and feeds the month's paid days into payroll without re-typing. The employee's action is as light as sending a message; the difference is what gets stored."),
("Is a WhatsApp attendance record valid in a salary dispute?", "It is weak evidence. It shows a message was sent at a time, from which arrival and presence are inferred. A check-in event with a server timestamp and location, plus a correction trail, is far stronger — and an attendance register is what labour rules actually require an employer to maintain."),
("Can I keep WhatsApp for team communication after moving attendance?", "Yes, and you should. WhatsApp is good at conversation and announcements. Move only the attendance event, leave requests and payslip distribution out of it, and explicitly retire the group for those purposes so there is one record."),
("How do I get employees to stop marking attendance on WhatsApp?", "Make the replacement one tap on the phone they already use, run the first payroll visibly from the new record so adoption is rewarded, and announce a date after which only the tap counts. A parallel month where both are recorded usually convinces the sceptics when the two are compared."),
("Is it safe to share payslips on WhatsApp?", "No. A payslip contains salary, tax and often bank details, and a forward to the wrong chat or a group exposes it permanently. Payslips should be sent individually by email or downloaded by each employee from their own account."),
],
"merik": """
    <p>Merik makes the tap the record. An employee checks in from their own dashboard; the moment is stamped by the server and the location is reverse-geocoded to a place name; late marks and half-days follow the rules you set; leave and work-from-home are requests that update the day when approved; corrections are requests with a trail. The admin sees the whole company's day in one live view instead of a thread.</p>
    <p>Payroll reads the month directly, and payslips go to each employee individually — emailed or downloaded from their own account — so nothing about pay ever needs to be asked in a group. Employees self sign-up, the workspace is free, and the group can go back to being a group. See <a href="/how-it-works">how it works</a>.</p>
""",
"related": ["excel-attendance-sheet-problems", "geolocation-attendance-field-teams", "free-attendance-app-small-business-india"],
},

{
"slug": "hybrid-work-attendance-tracking",
"crumb": "Hybrid work attendance",
"title": "Hybrid Work Attendance: How to Track Office Days, WFH and Remote Work Fairly",
"desc": "How to track attendance for a hybrid team without surveillance — the four statuses every day needs, anchor days and minimum office-day rules, WFH as an approved request, location at the punch only, and what actually feeds payroll.",
"keywords": "hybrid work attendance tracking, hybrid attendance policy, track office days hybrid, return to office attendance, WFH attendance tracking, hybrid work policy small business, remote attendance tracking, office attendance compliance",
"og_title": "Hybrid work attendance without surveillance",
"og_desc": "Four statuses, anchor-day rules, WFH as a request, location at the punch only — and what reaches payroll.",
"img_alt": "A week of attendance showing office, work-from-home and remote days side by side",
"published": "2026-09-06", "published_h": "6 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Hybrid work attendance: tracking office days, WFH and remote <span class=\"accent\">fairly</span>",
"lead": "Return-to-office rules are being written everywhere. Most of them fail at the same point: nobody can say, without an argument, how many days someone was in.",
"lede": "<b>Hybrid attendance is tracked fairly when every working day has one of four statuses — office, approved work-from-home, remote (by role), or leave — recorded by the employee at the time, with location captured only at the check-in for office days.</b> The policy then states what mix is expected (anchor days, a minimum office-day count per week or month), and the record shows whether it was met. What it does not need is continuous tracking, screenshot tools or badge-swipe forensics: those measure surveillance tolerance, not work. Pay is unaffected by which of the three working statuses a day carries; only leave changes it.",
"takeaways": [
  "Every day gets one of <b>four statuses</b>: office · WFH (approved) · remote (by role) · leave. Ambiguity is where the arguments live.",
  "<b>WFH is a request, not a status you assume.</b> Approved in advance, recorded like leave, but paid like any working day.",
  "Capture <b>location at the check-in only</b>. That distinguishes office from home without tracking anyone between punches.",
  "Write the <b>office-day rule as a number</b> — \"three days a week, Tuesday and Thursday fixed\" — and let the record report against it.",
  "The office-day count is a <b>policy metric</b>, not a payroll input. Keep the two separate, and say so in the policy.",
],
"sections": [
("four-statuses", "The four statuses every day needs", """
    <table class="facts">
      <tr><th>Office</th><td>Checked in at a company location. Location captured at the punch confirms it.</td></tr>
      <tr><th>WFH (approved)</th><td>Requested in advance, approved by the manager, recorded on the day. A working day for payroll.</td></tr>
      <tr><th>Remote (by role)</th><td>The employee's default is not the office — a field role, a fully remote hire. Check-in still happens; the location is wherever they are.</td></tr>
      <tr><th>Leave</th><td>Paid or unpaid, from the leave record. The only status that changes pay.</td></tr>
    </table>
    <p>An unrecorded day is not \"probably WFH\". It is unrecorded, and the <a href="/blog/attendance-regularisation-corrections">correction process</a> applies. That rule alone removes most hybrid disputes, because it makes the employee's own record the source.</p>
"""),
("policy", "Writing the office-day rule", """
    <p>Three patterns work; pick one and write the number:</p>
    <ul>
      <li><b>Anchor days</b> — everyone in on Tuesday and Thursday. Simplest to check, best for collaboration, hardest on people with fixed constraints on those days.</li>
      <li><b>Minimum count</b> — at least three office days a week, employee's choice. Flexible, but the count needs a record to be fair.</li>
      <li><b>Monthly quota</b> — at least twelve office days a month. Absorbs travel and appointments; needs a monthly report rather than a weekly one.</li>
    </ul>
    <p>Whichever you choose, add: how WFH is requested and how far in advance; whether a public holiday or leave day counts toward the quota (usually it reduces it pro rata); and what happens when the quota is missed — a conversation first, not a deduction. <a href="/blog/work-from-home-policy-template">The WFH policy template</a> covers the request side; <a href="/blog/attendance-policy-template-small-business">the attendance policy</a> covers the rest.</p>
"""),
("location", "Location: at the punch, and nowhere else", """
    <p>The only question location needs to answer in a hybrid team is \"was this an office day?\". A reverse-geocoded place name at check-in answers it — \"Koramangala\" versus \"Whitefield\" — without tracking movement, without a geofence that rejects someone at the pavement café, and without any capture between punches. That is also the defensible line under data-protection principles: collect the minimum, at the moment it is needed, and say so in the policy. <a href="/blog/geolocation-attendance-field-teams">How location capture works and where accuracy fails</a>.</p>
    <p>What not to do: screenshot monitoring, keystroke counting, webcam checks, or requiring continuous location for WFH days. They do not measure work, they measure tolerance, and the people with the most options leave first.</p>
"""),
("payroll", "What reaches payroll (and what must not)", """
    <p>Office, WFH and remote are all working days. Payroll sees \"present\" for all three; only leave — and unrecorded, uncorrected days — reduce paid days. The office-day count is reported separately, to the manager, as a policy metric. Mixing the two — docking pay for a missed anchor day — turns a policy conversation into a wage dispute and is almost never what the policy intended. <a href="/blog/attendance-to-payroll-automation">How attendance reaches payroll</a> without a manual step.</p>
"""),
("visibility", "Visibility for managers without surveillance", """
    <p>A manager needs two views: today — who is in the office, who is home, who is on leave — and the month — office days per person against the rule. Both come from the four statuses and the punch location; neither needs anything captured during the day. For what people actually did, the <a href="/blog/daily-task-tracking-small-teams">daily task log</a> is the honest signal, and it is the same for office and home days — which is rather the point of hybrid.</p>
"""),
],
"facts": [
("Statuses", "Office · WFH (approved) · Remote (by role) · Leave"),
("WFH", "Requested in advance, approved, recorded; a paid working day"),
("Location", "Captured at check-in only, reverse-geocoded to a place name"),
("Office-day rule", "Anchor days, weekly minimum, or monthly quota — as a number"),
("Payroll impact", "None between office/WFH/remote; only leave and unrecorded days change pay"),
("Not needed", "Continuous tracking, screenshots, geofence enforcement"),
],
"faqs": [
("How do you track attendance for hybrid employees?", "Give every working day one of four statuses — office, approved work-from-home, remote by role, or leave — recorded by the employee through a check-in at the time. Capture location only at the check-in so office days are distinguishable from home days, treat WFH as a request approved in advance, and report office-day counts against the written rule separately from payroll."),
("Should WFH days be tracked differently from office days?", "The status is different; the treatment is not. A WFH day is requested and approved in advance and recorded on the day, like leave, but it is a full working day for payroll. The employee still checks in; the location simply shows home rather than the office."),
("How do I know if someone met the three-days-in-office rule?", "From the punch location on each recorded day. A reverse-geocoded place name at check-in shows whether the day was at a company location, and a monthly count per employee compares that against the rule. No tracking between punches is needed."),
("Can I deduct pay for missing a required office day?", "You should not conflate the two. Office, WFH and remote are all working days, and the employee was paid to work, not to sit in a place. A missed anchor day is a policy matter for a conversation with the manager; making it a wage deduction turns a flexibility rule into a dispute and may breach wage rules."),
("Is location tracking legal for hybrid attendance?", "Capturing location at the moment of check-in, with the employee's device permission, for the stated purpose of distinguishing office from home days, is generally proportionate where the policy discloses it. Continuous background tracking, or tracking on WFH days, is a different matter and is hard to justify."),
("What is a fair hybrid work attendance policy?", "One that states the office-day expectation as a number, explains how WFH is requested and approved, records every day with a clear status, captures location only at the punch, reports the office-day count separately from pay, and treats a missed quota as a conversation before anything else."),
],
"merik": """
    <p>Merik records the four statuses as they happen. Employees check in from their own dashboard — the location is captured at the punch and reverse-geocoded to a place name, so an office day and a home day look different in the record without anything tracked in between. Work-from-home is a request type alongside leave: raised in advance, approved by the manager, and applied to the day automatically. Admins see who is in, who is home and who is off in one live view.</p>
    <p>Payroll treats office, WFH and remote days identically; only approved leave and unrecorded days change paid days. The daily task log gives managers the output view for every kind of day. See the <a href="/modules">attendance and leave modules</a>.</p>
""",
"related": ["work-from-home-policy-template", "attendance-policy-template-small-business", "geolocation-attendance-field-teams"],
},

{
"slug": "free-attendance-app-small-business-india",
"crumb": "Free attendance app",
"title": "Free Attendance App for a Small Business: What &quot;Free&quot; Should Include (India, 2026)",
"desc": "What a genuinely free attendance app must include for a small Indian business — unlimited employees, geolocated check-in, leave linkage, a path to payroll, export — the eight things free tiers usually cap, and the hidden costs to ask about.",
"keywords": "free attendance app small business, free attendance management software India, free employee attendance app, attendance app free unlimited employees, free GPS attendance app, best free attendance app India, attendance tracking app free, free HR attendance software",
"og_title": "A free attendance app: what &quot;free&quot; has to include",
"og_desc": "Eight things free tiers usually cap, the hidden costs, and what a working free tier looks like for 5–50 people.",
"img_alt": "A mobile check-in screen with location, on a free attendance app",
"published": "2026-09-07", "published_h": "7 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Free attendance app for a small business: what <span class=\"accent\">\"free\" should include</span>",
"lead": "Free attendance apps are easy to find and hard to keep. Here is the difference between a free tier and a trial with the price hidden.",
"lede": "<b>A free attendance app is genuinely free for a small business only if it handles your whole team without a user cap, captures a timestamp and location at check-in, connects leave to attendance, gives you a path to payroll, and lets you export everything — indefinitely.</b> Most \"free\" tiers fail at least two of those: a five-user limit, thirty days of history, no export, or a check-in that works but a register that is paid. The list below is what to check before your team builds a habit on something that will start invoicing you at employee number six.",
"takeaways": [
  "The first check is <b>the user cap</b>. Free for five users is a trial for a fifteen-person business.",
  "The second is <b>history</b>. Attendance is a statutory record; thirty days of retention on the free tier means the record is elsewhere or nowhere.",
  "A check-in without <b>timestamp and location</b> is a WhatsApp message with a nicer button.",
  "If leave lives in a different tool, or payroll needs an upload, the app is free and <b>the month-end is not</b>.",
  "Ask what happens to your data if you stop. <b>Export</b> is the feature that keeps free honest.",
],
"sections": [
("eight-caps", "Eight things free tiers usually cap", """
    <ol>
      <li><b>Users</b> — 5, 10 or 15. Check the number against your headcount in a year, not today.</li>
      <li><b>History</b> — 30 or 90 days visible, the rest paid. Attendance registers should be kept for years.</li>
      <li><b>Location</b> — check-in free, geolocation paid. For field staff, that is the feature.</li>
      <li><b>Reports</b> — the monthly register, the one thing you need for payroll, behind the upgrade.</li>
      <li><b>Leave</b> — attendance free, leave a separate module. Leave that is not linked marks people absent on approved holidays.</li>
      <li><b>Export</b> — the data is yours to look at and not to take.</li>
      <li><b>Admins</b> — one admin login on free, so the owner is the only one who can approve anything.</li>
      <li><b>Support and setup</b> — fine to charge for; just know before you need it.</li>
    </ol>
"""),
("what-free-must-include", "What a working free tier has to include", """
    <ul>
      <li><b>Unlimited employees</b>, with employees signing themselves up so onboarding costs the admin nothing. <a href="/blog/employee-onboarding-checklist-small-business">The onboarding checklist</a>.</li>
      <li><b>Check-in and check-out with a server timestamp and location</b>, reverse-geocoded to a readable place — see <a href="/blog/biometric-vs-gps-vs-manual-attendance">how the capture methods compare</a>.</li>
      <li><b>Late marks and half-days by configurable rules</b>, not judged per cell.</li>
      <li><b>Leave and WFH as requests</b> that update the attendance record when approved.</li>
      <li><b>A monthly register</b> per employee, and a path from it to payroll that does not involve re-typing.</li>
      <li><b>Employee self-service</b> — their own history, their own balances, their own payslip.</li>
      <li><b>Export</b> of the record, and a stated position on what happens if you leave.</li>
      <li><b>Security basics</b> — tenant isolation, role-based access, a stated data location. <a href="/blog/workforce-data-security-checklist">The eight questions</a>.</li>
    </ul>
"""),
("hidden-costs", "The hidden costs to ask about", """
    <table class="facts">
      <tr><th>Hardware</th><td>Biometric devices per site, if the app assumes them</td></tr>
      <tr><th>Per-user pricing later</th><td>What does employee 16 cost, and employee 60?</td></tr>
      <tr><th>The second tool</th><td>Leave or payroll in a separate paid product, plus the monthly reconciliation between them</td></tr>
      <tr><th>Migration out</th><td>No export means the cost of leaving is re-typing history</td></tr>
      <tr><th>Your own time</th><td>A free app that still needs the register re-keyed into a salary sheet is not free; see the <a href="/roi">ROI calculator</a></td></tr>
    </table>
"""),
("questions", "Five questions to ask before your team builds a habit", """
    <ol>
      <li>How many employees can use it free, and does that number change?</li>
      <li>How long is attendance history kept on the free tier?</li>
      <li>Is location captured at check-in, and stored as a place name?</li>
      <li>Do approved leave and WFH update attendance automatically?</li>
      <li>Can I export every record as CSV today, and what happens to the data if I stop?</li>
    </ol>
    <p>A vendor that answers all five plainly is selling a free tier. One that answers three is selling a trial. Either is fine, as long as you know which one you are installing on thirty phones.</p>
"""),
],
"facts": [
("Deal-breakers", "User cap below your headcount next year · history cut-off · no export"),
("Must include", "Unlimited users, timestamp + location at punch, rule-based late/half-day, leave linkage, register, self-service"),
("Hidden costs", "Devices, per-user pricing later, a second paid tool, migration out, your month-end hours"),
("Free vs trial", "Free has no cliff at a headcount or a date; a trial does"),
("Ask first", "What happens to my data if I stop?"),
],
"faqs": [
("Is there a genuinely free attendance app for small businesses in India?", "Yes, but check the shape of the free tier rather than the word. A genuinely free tier has no user cap you will hit, keeps history indefinitely, captures timestamp and location at check-in, links leave to attendance, and lets you export. Many free apps cap users at five or ten or keep only thirty days of history, which makes them trials."),
("What should a free attendance app include?", "Unlimited employees with self sign-up, check-in and check-out with a server timestamp and a reverse-geocoded location, late marks and half-days computed by configurable rules, leave and work-from-home requests that update attendance when approved, a monthly register per employee that feeds payroll without re-typing, employee self-service, CSV export and basic tenant security."),
("Do free attendance apps work for field employees?", "Only if location capture is included on the free tier. Check-in with a stored, reverse-geocoded location is what makes a field employee's attendance verifiable; some apps put that behind a paid plan. Also check that location is captured at the punch only, not tracked continuously."),
("Can a free attendance app connect to payroll?", "Some can, if attendance and payroll are modules of the same workspace and share one record. If the app only produces a register that you upload or re-type into a separate payroll tool, the app is free but the monthly reconciliation is not — and that reconciliation is where most small-business payroll errors come from."),
("What are the hidden costs of free attendance software?", "Per-user pricing that begins at a headcount you will reach, a separate paid tool for leave or payroll, biometric hardware the app assumes, the absence of export so leaving means re-typing history, and the owner's own time re-keying the register into a salary sheet every month."),
("Is Merik's attendance app free?", "Yes. Merik's company workspace is free to create with unlimited employee self sign-up and no card, and it includes geolocated check-in and check-out, configurable late and half-day rules, leave and work-from-home requests, a monthly register that feeds payroll directly, employee self-service payslip download and CSV export of the task log. Guided setup is available on request."),
],
"merik": """
    <p>Merik's workspace is free, with unlimited employee self sign-up and no card. The attendance module is the full thing, not a preview: check-in and check-out from the employee's own phone with a server timestamp and a reverse-geocoded place name, late marks and half-days by the rules you configure, leave and work-from-home as approved requests that update the day, a live company-wide view for admins, and a monthly register that payroll reads directly — because payroll is in the same workspace.</p>
    <p>Employees see their own history and download their own payslips; the task log exports to CSV; tenant isolation is enforced in the database. If the answers above are the ones you wanted, <a href="/pricing">the pricing page</a> says the same thing in more detail, and <a href="/how-it-works">setup is three steps</a>.</p>
""",
"related": ["whatsapp-attendance-group-problems", "biometric-vs-gps-vs-manual-attendance", "attendance-to-payroll-automation"],
},

# ------------------------------------------------------------------ CLIENTS
{
"slug": "scope-creep-agency-task-logs",
"crumb": "Catching scope creep",
"title": "How to Catch Scope Creep Early Using Your Team's Daily Task Logs",
"desc": "Scope creep shows up in hours weeks before it shows up in the invoice. How to see it in the daily task log — estimate versus logged by project, the weekly check, the conversation with evidence, and turning the extra into a change request instead of a write-off.",
"keywords": "scope creep agency, how to detect scope creep, scope creep tracking, agency project overrun, task log scope creep, project hours vs estimate, change request agency, unbilled hours agency, scope creep small business",
"og_title": "Catching scope creep in the task log, not the invoice",
"og_desc": "Estimate vs logged hours per project, checked weekly, turned into a change request while the client still remembers asking.",
"img_alt": "Logged hours on a project overtaking the estimate week by week",
"published": "2026-09-07", "published_h": "7 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Catching scope creep early <span class=\"accent\">in the task log</span>",
"lead": "By the time scope creep reaches the invoice, the argument is about money. Three weeks earlier, in the task log, it was a question you could still ask.",
"lede": "<b>Scope creep is detectable in a daily task log weeks before it is visible in an invoice: when the hours logged against a project run ahead of the estimate at the same stage, or when task descriptions start containing work that was never quoted.</b> A weekly, ten-minute comparison of logged hours to the estimate per project catches it while the client still remembers asking for the extra, which is the only moment a change request is easy. This guide is the check, the conversation, and the paperwork — all built on hours your team is already logging.",
"takeaways": [
  "Scope creep is <b>hours before it is money</b>. The task log sees it first; the invoice sees it last.",
  "Compare <b>logged hours to estimated hours at the same stage</b>, per project, weekly. Ten minutes.",
  "Task descriptions are the second signal: <b>\"also fixed\", \"quick change\", \"client asked\"</b> are the words scope creep uses.",
  "Raise it while the request is fresh, with the log as evidence. A change request two weeks late is a discount.",
  "Every accepted extra becomes a <b>quote line</b> — not a favour. Favours are what retainers are for, priced in.",
],
"sections": [
("what-it-looks-like", "What scope creep looks like in hours", """
    <p>A project quoted at 60 hours over four weeks should show roughly 15 hours a week, with the shape you expected — heavier in build, lighter in review. Scope creep shows as one of three patterns:</p>
    <ul>
      <li><b>Run-ahead:</b> 30 hours logged by end of week two, with the deliverable also at about half. The estimate was wrong, or the scope grew quietly. Either way you now know.</li>
      <li><b>Tail that will not end:</b> the deliverable was accepted in week four; weeks five and six show 4–6 hours each of \"small changes\". This is the most common and the least noticed.</li>
      <li><b>Wrong shape:</b> hours are on plan, but the descriptions are about a feature that is not in the quote. The quoted work is being starved to feed the unquoted work.</li>
    </ul>
    <p>None of these are visible in a timesheet total. They are visible in a <a href="/blog/timesheets-vs-daily-task-logs">daily task log with descriptions, per project</a>.</p>
"""),
("weekly-check", "The ten-minute weekly check", """
    <ol>
      <li>For each active project, pull <b>logged hours to date</b> against the estimate and the expected percentage complete. A project at 70% of hours and 40% of deliverable is the flag.</li>
      <li>Scan the week's task descriptions on any flagged project for <b>the words</b>: \"also\", \"quick\", \"client asked\", \"while I was in there\", \"additional\".</li>
      <li>For each hit, decide: <b>in scope</b> (absorb, note it), <b>estimate was wrong</b> (own it, learn — see <a href="/blog/time-estimates-vs-actuals">why estimates are always wrong</a>), or <b>new scope</b> (raise it this week).</li>
      <li>Log the decision in one line on the project so next week's check does not re-discover it.</li>
    </ol>
"""),
("conversation", "The conversation, with evidence", """
    <p>The task log turns \"we feel this is growing\" into \"on the 3rd, 4th and 9th, your team asked for X, Y and Z, which took eleven hours, and none of the three is in the quote of 12 August.\" That is not a complaint; it is a fact the client can check. The tone follows from the evidence: matter-of-fact, early, with two options — fold it into a change request at the quoted rate, or drop it. Clients almost never argue with dated entries. They argue with totals presented at the end.</p>
    <p>The timing rule: <b>raise it in the week it happened</b>. A change request for last month's extras reads as an invoice surprise; the same request this Friday reads as good management.</p>
"""),
("paperwork", "From extra hours to a quote line", """
    <p>Every accepted extra becomes a line on a change quote — description, hours, rate — that the client approves before the work continues. The change quote converts to an invoice line when delivered, exactly like the original: <a href="/blog/quote-to-invoice-workflow">one record in two states</a>. Extras that are agreed as goodwill are still logged as tasks against the project, marked non-billable, so the project's true cost is visible in the <a href="/blog/project-profitability-from-task-hours">profitability view</a> even when the revenue is not.</p>
    <p>For retainer clients, scope creep is the retainer being under-priced. The same weekly check — hours against the retainer's included hours — is what tells you before renewal. <a href="/blog/pricing-retainers-from-time-data">Sizing the retainer from time data</a>.</p>
"""),
("prevention", "Making it rarer", """
    <ul>
      <li><b>Quote in tasks, not in prose.</b> A quote with twelve named deliverables makes \"is this in scope?\" answerable in five seconds.</li>
      <li><b>Put the estimate on the project</b> where the people logging hours can see it. Teams that can see the budget protect it.</li>
      <li><b>Log the ask, not just the work.</b> \"Client asked for a second language version\" as a task, even at zero hours, is evidence the day it happens.</li>
      <li><b>Review at 50%.</b> A midpoint check on every project catches run-ahead before it is a write-off.</li>
    </ul>
"""),
],
"facts": [
("Earliest signal", "Logged hours ahead of estimate at the same stage, per project"),
("Second signal", "Task descriptions containing \"also\", \"quick\", \"client asked\", \"additional\""),
("Cadence", "Weekly, ten minutes, all active projects"),
("Three outcomes", "In scope (absorb) · estimate wrong (learn) · new scope (change request this week)"),
("Paperwork", "Change quote → approval → invoice line; goodwill work logged non-billable"),
("Retainers", "Hours vs included hours, checked weekly, before renewal"),
],
"faqs": [
("How do you detect scope creep early?", "Compare hours logged against each project to the estimate at the same stage of completion every week, and read the task descriptions on any project running ahead for words like \"also\", \"quick change\" and \"client asked\". Scope creep appears in hours weeks before it appears in an invoice, and a weekly ten-minute check catches it while the client still remembers making the request."),
("What is the best way to track scope creep on client projects?", "A daily task log where each entry has a client, a project, time spent and a description. Totals alone cannot distinguish an inaccurate estimate from added scope; the descriptions can. Put the estimate on the project so the team can see it, and review logged hours against it weekly and at the 50% point."),
("How do I tell a client about scope creep?", "Early, with dated evidence, and with two options. Cite the specific requests by date and the hours they took, note that they are outside the quote, and offer either a change request at the agreed rate or dropping the work. Raised in the same week, it reads as good project management; raised at invoice time, it reads as a surprise."),
("Should I charge for small extra requests?", "Decide per request, but log every one. Small extras that are absorbed should still be recorded as non-billable tasks so the project's true cost is visible. Extras that are not small become a change quote the client approves before work continues. Never let \"small\" accumulate unrecorded; that is how a profitable project becomes a loss."),
("How does scope creep affect retainers?", "On a retainer, scope creep looks like logged hours consistently exceeding the included hours. Checked weekly it becomes a conversation about the retainer's size before renewal; unchecked it becomes an under-priced contract renewed on the same terms."),
("What is a change request in an agency context?", "A short quote for work that was not in the original scope — description, hours, rate — which the client approves before the work proceeds and which becomes an invoice line on delivery. It keeps the original quote intact and gives both sides a dated record of what was added and when."),
],
"merik": """
    <p>Merik's daily task log is the instrument. Every entry carries a client, a project, time spent, status, blockers and proof links, and the hours roll up per project and per client, so \"logged versus estimate at this stage\" is a view rather than a spreadsheet. The words scope creep uses are right there in the descriptions, and the task log exports to CSV when you want to slice it further.</p>
    <p>When an extra becomes agreed work, it becomes a line-item quote that converts to an invoice on delivery — the same record, two states. Estimates for new work are drawn from your own history: Merik's time-estimation model is a local similarity model over the company's task log, not an LLM, and it backtests its own accuracy. See the <a href="/modules">tasks and clients modules</a>.</p>
""",
"related": ["time-estimates-vs-actuals", "pricing-retainers-from-time-data", "quote-to-invoice-workflow"],
},

# --------------------------------------------------------------- MONITORING
{
"slug": "website-monitoring-for-agencies-client-sites",
"crumb": "Monitoring for agencies",
"title": "Website Monitoring for Agencies: Watch Every Client Site Without a Dedicated Ops Person",
"desc": "How a web or digital agency monitors every client site it has shipped — per-client structure, what to check, who gets the alert, monthly SLA reports, client-facing status pages — and how to price a maintenance retainer around it instead of absorbing the calls.",
"keywords": "website monitoring for agencies, agency uptime monitoring clients, monitor client websites, web agency maintenance monitoring, client site monitoring tool, agency SLA monitoring, white label uptime monitoring, website maintenance retainer monitoring",
"og_title": "Website monitoring for agencies: every client site, no ops person",
"og_desc": "Per-client structure, what to check, who gets the alert, monthly SLA reports and status pages — and pricing the retainer around it.",
"img_alt": "A dashboard of client websites, each with its own health and owner",
"published": "2026-09-08", "published_h": "8 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Website monitoring for agencies: <span class=\"accent\">every client site</span>, no ops person",
"lead": "The client's call is the agency's monitoring system — until the call comes at 11pm about a site that went down at 4. Here is how agencies watch what they ship without hiring for it.",
"lede": "<b>An agency monitors client sites well when every site it has shipped is registered under its client, checked from the outside every few minutes for availability, response time, HTTP status and certificate expiry, assigned to a named owner who is alerted once, and summarised monthly in a report the client receives.</b> That structure — per client, with an owner, with a report — is what turns monitoring from a cost the agency absorbs into a maintenance service the client pays for. None of it needs an operations hire; it needs the sites in one place and the alerts going to the right person.",
"takeaways": [
  "The agency's real exposure is not downtime; it is <b>learning about downtime from the client</b>. Outside-in checks fix that for every site at once.",
  "Structure monitoring <b>per client</b>, the way projects and invoices already are. A site without a client is a site nobody owns.",
  "Check the five things clients notice: <b>up, fast, no errors, valid certificate, working after the last deploy</b>.",
  "Alert <b>one owner, once</b>, with quiet hours. Twenty sites × three alerts each is how the agency stops reading alerts.",
  "Monthly SLA reports and a client-facing status page are what make monitoring <b>billable</b>. Put them in the retainer.",
],
"sections": [
("exposure", "The agency's actual exposure", """
    <p>An agency ships a site, invoices, and moves on. Six months later the certificate expires, a plugin update breaks checkout, or the hosting provider has a bad hour — and the first the agency hears is the client's message, often with a screenshot, often at night. The site was down for four hours; the agency's reputation was down for four hours; and the agency has no record of when it started, which makes the conversation worse. Multiply by every site ever shipped. <a href="/blog/detect-bugs-before-users-report-them">Why the user's report is always late</a>.</p>
"""),
("structure", "Structure it per client, like everything else", """
    <p>Agencies already organise work per client — projects, hours, quotes, invoices. Monitoring should sit in the same structure: each client has its assets (the marketing site, the web app, the API, the staging environment if it matters), each asset has an owner on the agency side, and each asset carries the client's SLA tier. That gives you three things immediately: a per-client view when the client calls, a per-owner view for the person on the hook, and a per-client report at month-end. <a href="/blog/structuring-clients-and-projects">The same hierarchy that makes reporting work</a> for billable hours makes it work for uptime.</p>
"""),
("what-to-check", "What to check on every client site", """
    <table class="facts">
      <tr><th>Availability</th><td>Outside-in HTTP check every few minutes; alert on confirmed failure, not one blip</td></tr>
      <tr><th>Response time</th><td>Latency against the site's own baseline — a WordPress site that is normally 600 ms and is now 3 s is degraded even though it is up</td></tr>
      <tr><th>HTTP status</th><td>A 200 that became a 500, a redirect loop, a 404 on the home page after a migration</td></tr>
      <tr><th>Certificate expiry</th><td>Daily check; alert at 14, 7 and 3 days. <a href="/blog/ssl-certificate-expiry-monitoring">Why this now matters more</a></td></tr>
      <tr><th>Frontend errors</th><td>JavaScript errors from real visitors — the broken form that returns 200. <a href="/blog/frontend-error-monitoring">The failures uptime checks cannot see</a></td></tr>
      <tr><th>Deploys</th><td>When the last change shipped, on the same timeline as incidents. <a href="/blog/did-the-deploy-break-production">Did the deploy break it?</a></td></tr>
    </table>
    <p>That is the full checklist for a marketing site or a small web app. APIs and larger apps add more — see <a href="/blog/saas-monitoring-checklist">the SaaS monitoring checklist</a> — but the six above catch the calls agencies actually get.</p>
"""),
("alerting", "Who gets the alert, and how not to drown", """
    <p>The failure mode for agencies is volume: twenty sites, each raising an alert per signal, all to one Slack channel that everyone mutes within a week. The rules that prevent it: <b>one incident per asset</b>, not one per symptom; <b>auto-assigned to the asset's owner</b>, so it is one person's problem; <b>alerted once</b> by email or Slack, not every five minutes until acknowledged; <b>quiet hours</b> so a non-critical marketing site's 2am blip waits for morning; and <b>auto-close on recovery</b> so the channel is not full of things that fixed themselves. <a href="/blog/alert-fatigue-small-teams">Alert fatigue in small teams</a> goes deeper.</p>
"""),
("billing", "Making it billable: SLA reports and status pages", """
    <p>Clients will pay for monitoring when they can see it. Two artefacts do that. A <b>monthly SLA report</b> per client — uptime percentage against the tier they are on, incidents with detection and resolution times, response-time trend, certificate status, deploys — sent whether or not anything happened; a quiet month is the service working. And a <b>client-facing status page</b>, private to that client via a token URL, that they can check before they call. Both are built from the monitoring data you already collect. <a href="/blog/sla-reports-for-clients-agency">How to produce the report</a> · <a href="/blog/public-status-page-small-business">When a status page earns its keep</a>.</p>
    <p>Then price it: a maintenance retainer that includes monitoring, the report, the status page, and a stated response time for incidents. Agencies that do this find the retainer often outlasts the project it followed. <a href="/blog/pricing-retainers-from-time-data">Sizing the retainer</a>.</p>
"""),
],
"facts": [
("Structure", "Assets grouped per client, each with an owner and an SLA tier"),
("Six checks", "Availability · response time vs baseline · HTTP status · certificate expiry · frontend errors · deploys"),
("Alert rules", "One incident per asset, auto-assigned, alerted once, quiet hours, auto-close on recovery"),
("Monthly artefact", "Per-client SLA report: uptime vs tier, incidents, MTTD/MTTR, latency, certificate, deploys"),
("Client-facing", "Private status page per client via token URL"),
("Commercial", "Bundle into a maintenance retainer with a stated response time"),
],
"faqs": [
("How do agencies monitor client websites?", "By registering every shipped site under its client, checking each from the outside every few minutes for availability, response time, HTTP status and certificate expiry, collecting frontend errors from real visitors, assigning each site to a named owner who is alerted once on a confirmed failure, and sending each client a monthly SLA report. The per-client structure is what makes it manageable across dozens of sites."),
("What should an agency monitor on a client site?", "Availability, response time against the site's own normal, HTTP status, SSL certificate expiry, JavaScript errors from visitors, and when the last deploy happened. Those six cover the incidents clients actually call about on marketing sites and small web apps; APIs and larger applications need more."),
("How do agencies avoid alert overload with many client sites?", "One incident per asset rather than one alert per symptom; automatic assignment to the asset's owner; a single alert by email or Slack rather than repeated pages; quiet hours for non-critical sites; and automatic closure when the site recovers. Without those rules, a shared alerts channel is muted within a week."),
("Can agencies charge clients for website monitoring?", "Yes, and most should. Bundle monitoring with a monthly SLA report, a private status page and a stated incident response time into a maintenance retainer. Clients pay for what they can see, and the monthly report makes a quiet month visible as a delivered service."),
("Do agencies need a white-label monitoring tool?", "Not necessarily. What clients need to see is a report with their name on it and a status page they can check; whether the underlying tool is branded matters less than whether the per-client report and page exist. Prioritise per-client structure and reporting over branding."),
("What is an SLA tier for a client site?", "A declared availability target — typically 99%, 99.5% or 99.9% — against which the site's measured uptime is reported each month. A marketing site might be on 99%; a client's checkout on 99.9%. The tier sets the error budget the monthly report is measured against."),
],
"merik": """
    <p>Merik's Digital Operations module is organised the way agencies already are: assets belong to clients. Register each client's website, web app or API, and Merik checks it from the outside every few minutes — availability, response time, HTTP status, daily SSL expiry — learns its normal over 14 days, and raises at most one early warning per asset when it drifts. Confirmed failures open an incident auto-assigned to the asset's owner, alerted once by email or Slack with quiet-hours rules. A one-line browser snippet reports JavaScript errors from real visitors; GitHub and Vercel webhooks put deploys on the incident timeline.</p>
    <p>Monthly per-client SLA reports and private token-URL status pages are built in, measured against the SLA tier you declare per asset — so the retainer has something to show every month. It sits in the same workspace as your clients, projects, task log, quotes and invoices. See the <a href="/modules">Digital Operations module</a>.</p>
""",
"related": ["sla-reports-for-clients-agency", "public-status-page-small-business", "saas-monitoring-checklist"],
},

{
"slug": "sla-reports-for-clients-agency",
"crumb": "Monthly SLA reports",
"title": "How to Produce a Monthly SLA Report for Clients (What to Include, How to Compute It)",
"desc": "A practical guide to monthly SLA reports for agencies and small vendors — choosing a tier, the uptime and minutes arithmetic, the seven sections every report needs, how to compute each from monitoring data, and how to present a month where nothing happened.",
"keywords": "SLA report template, monthly SLA report clients, uptime report for clients, how to calculate SLA uptime, SLA report agency, 99.9 uptime minutes per month, service level report, client uptime reporting",
"og_title": "The monthly SLA report: what to include and how to compute it",
"og_desc": "Tiers and their minutes, the seven sections, the arithmetic, and how to present a quiet month as delivered service.",
"img_alt": "A monthly client report showing uptime against its SLA tier",
"published": "2026-09-08", "published_h": "8 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "The monthly SLA report: <span class=\"accent\">what to include, how to compute it</span>",
"lead": "A monitoring service the client never sees is a cost. The monthly report is how it becomes a deliverable — including in the months when nothing broke.",
"lede": "<b>A monthly SLA report states, for each client asset, the measured availability against the tier the client is on, every incident with when it was detected and resolved, the response-time trend, certificate status and deploys — in one page the client can read in two minutes.</b> Availability is computed as (total minutes − downtime minutes) ÷ total minutes; on 99.9% a 30-day month allows 43 minutes of downtime, on 99.5% about 3 hours 36 minutes, on 99% about 7 hours 12 minutes. Everything in the report comes from monitoring data already being collected; the work is choosing the tier honestly and presenting the month plainly.",
"takeaways": [
  "Declare the tier <b>per asset</b>, not per client: a marketing site on 99%, a checkout on 99.9%.",
  "The arithmetic is minutes: <b>99.9% = 43 min/month, 99.5% = 3 h 36 min, 99% = 7 h 12 min</b> on a 30-day month.",
  "Seven sections: <b>summary, availability vs tier, incidents, detection and resolution times, response time, certificates, changes</b>.",
  "Report <b>MTTD and MTTR</b> per incident. A client who sees a 3-minute detection time understands what they are paying for.",
  "Send it <b>every month</b>, including quiet ones. A quiet month is the service working, and the report is the only evidence.",
],
"sections": [
("tier", "Choosing the tier honestly", """
    <p>An SLA tier is a promise, so make one you can keep with the hosting you actually use. A site on shared hosting with no redundancy should not be on 99.9%. The tier sets the <a href="/blog/error-budgets-slo-small-teams">error budget</a> the month is measured against:</p>
    <table class="facts">
      <tr><th>99%</th><td>≈ 7 h 12 min downtime allowed per 30-day month. Marketing sites, brochure sites.</td></tr>
      <tr><th>99.5%</th><td>≈ 3 h 36 min. Small web apps, portals with business-hours use.</td></tr>
      <tr><th>99.9%</th><td>≈ 43 min. Checkout, booking, anything transactional.</td></tr>
      <tr><th>99.95%</th><td>≈ 22 min. Only with redundant hosting and an actual response process.</td></tr>
    </table>
    <p>State whether the measurement is 24×7 or business hours, and whether announced maintenance is excluded. Both are legitimate; both must be written down before the first report.</p>
"""),
("compute", "Computing availability from monitoring data", """
    <p><b>Availability = (minutes in period − confirmed downtime minutes) ÷ minutes in period.</b> Downtime starts when a failure is confirmed — usually two or three consecutive failed checks, to exclude single blips — and ends at the first successful check after. With five-minute checks the resolution is coarse; say so, and do not report to three decimal places on data measured every five minutes. If maintenance is excluded, subtract announced maintenance windows from both numerator and denominator.</p>
    <p>Two figures the report should also carry per incident: <b>MTTD</b>, from the first failed check to the incident being opened and someone alerted, and <b>MTTR</b>, from open to resolved. <a href="/blog/reduce-mttd">Detection time is the number most vendors never show</a> — and the one that most clearly demonstrates value.</p>
"""),
("sections", "The seven sections", """
    <ol>
      <li><b>Summary</b> — one line per asset: tier, measured availability, met / not met.</li>
      <li><b>Availability vs tier</b> — the percentage, the minutes of downtime, the minutes the tier allowed, and the remaining budget.</li>
      <li><b>Incidents</b> — each with start, detection, resolution, cause in one sentence, and whether it was a dependency (hosting, CDN, payment provider) or the site itself. <a href="/blog/third-party-dependency-outages">Attributing dependency outages honestly</a>.</li>
      <li><b>Detection and resolution</b> — MTTD and MTTR for the month, and the trend against previous months.</li>
      <li><b>Response time</b> — p50 and p95 against the asset's baseline; note any drift and whether it was addressed.</li>
      <li><b>Certificates</b> — expiry dates, renewals completed. <a href="/blog/ssl-certificate-expiry-monitoring">Why this section is growing</a>.</li>
      <li><b>Changes</b> — deploys in the month, and whether any coincided with an incident.</li>
    </ol>
    <p>One page. Charts optional; the table with the minutes is what the client's finance person reads.</p>
"""),
("quiet-month", "Presenting a month where nothing happened", """
    <p>The quiet month is the one agencies skip, and the one that matters most: it is the evidence the retainer is working. The report is short — availability 100%, zero incidents, 8,640 checks passed, certificate renewed on the 14th, two deploys with no regression, p95 stable. Ten lines. Send it with the same subject line as every other month. Clients who receive twelve quiet reports renew; clients who receive one report after an outage wonder what they paid for the other eleven months.</p>
"""),
("bad-month", "Presenting a month where the tier was missed", """
    <p>Lead with it. \"Availability 99.62% against a 99.9% tier — not met. One incident, 2 h 44 min, caused by the hosting provider's storage failure on the 9th; detected in 4 minutes, client informed in 11, resolved when the provider restored service. Actions: moved the site to the provider's redundant tier on the 12th.\" Then the standard sections. If there is a service credit, state it without being asked. Nothing rebuilds trust like a bad month reported before the client noticed it was bad.</p>
"""),
],
"facts": [
("Formula", "(period minutes − confirmed downtime minutes) ÷ period minutes"),
("99.9%", "≈ 43 minutes downtime per 30-day month"),
("99.5%", "≈ 3 h 36 min"),
("99%", "≈ 7 h 12 min"),
("Confirmed downtime", "From 2–3 consecutive failed checks to the first success"),
("Seven sections", "Summary · availability vs tier · incidents · MTTD/MTTR · response time · certificates · changes"),
("Cadence", "Every month, including quiet ones"),
],
"faqs": [
("What should a monthly SLA report include?", "For each asset: the SLA tier and measured availability with downtime minutes against minutes allowed; every incident with start, detection, resolution and one-line cause; mean time to detect and resolve; response-time percentiles against baseline; certificate status; and the month's deploys. One page, sent every month regardless of whether anything happened."),
("How do you calculate SLA uptime percentage?", "Divide the minutes the service was confirmed available by the total minutes in the period. Confirmed downtime runs from the check that confirmed the failure — usually the second or third consecutive failed check — to the first successful check after. On a 30-day month, 99.9% allows 43 minutes of downtime, 99.5% about 3 hours 36 minutes, and 99% about 7 hours 12 minutes."),
("How many minutes of downtime is 99.9% uptime?", "About 43 minutes in a 30-day month, 8 hours 46 minutes in a year. At 99.5% it is about 3 hours 36 minutes a month; at 99% about 7 hours 12 minutes; at 99.95% about 22 minutes."),
("What SLA tier should I offer a client?", "The one your hosting and response process can actually deliver. Marketing and brochure sites are usually 99%; small web apps 99.5%; transactional sites such as checkout or booking 99.9%, and only with redundant hosting. State whether measurement is 24×7 or business hours and whether announced maintenance is excluded."),
("Should I send an SLA report in a month with no incidents?", "Yes — it is the most important one. A quiet month is the service working, and the report is the only evidence the client receives. Ten lines showing 100% availability, checks passed, certificate status and deploys, sent on the same day as every other month, is what makes a maintenance retainer renew."),
("What is the difference between MTTD and MTTR in an SLA report?", "Mean time to detect is the average time from a failure starting to it being noticed and someone alerted; mean time to resolve is from detection to the service being restored. Reporting both shows the client how fast you learn about problems, which is the part of the service they cannot see any other way."),
],
"merik": """
    <p>Merik produces the monthly SLA report per client from the monitoring it already does. Each asset carries a declared SLA tier, and its health score is an error budget against that tier — so \"met or not met\" and \"minutes remaining\" are computed, not assembled. Incidents carry their detection and resolution times; deploys from GitHub and Vercel webhooks sit on the same timeline; vendor status feeds mark which incidents were dependency-caused; certificate expiry is checked daily.</p>
    <p>The report is generated monthly per client, and the private status page gives the client the same picture between reports. Because assets belong to clients in the same workspace as projects, quotes and invoices, the retainer that includes monitoring is billed from the same record. See the <a href="/modules">Digital Operations module</a>.</p>
""",
"related": ["error-budgets-slo-small-teams", "public-status-page-small-business", "website-monitoring-for-agencies-client-sites"],
},

# -------------------------------------------------------------- RELIABILITY
{
"slug": "ssl-certificate-expiry-monitoring",
"crumb": "SSL certificate expiry monitoring",
"title": "SSL Certificate Expiry Monitoring: Why 200-Day (Soon 47-Day) Certificates Make It Mandatory",
"desc": "Public TLS certificates are capped at 200 days since March 2026, dropping to 100 in 2027 and 47 in 2029. What an expired certificate looks like to users, why automated renewal fails silently, what to monitor, when to alert, and how to keep an inventory across every site you own or manage.",
"keywords": "SSL certificate expiry monitoring, SSL expiry alert, certificate expiration monitoring, 47 day certificates, 200 day certificate validity 2026, TLS certificate lifetime reduction, monitor SSL expiration, Let's Encrypt renewal failed, certificate expired website down",
"og_title": "SSL expiry monitoring in the age of 47-day certificates",
"og_desc": "200-day certificates now, 47 by 2029. Renewal automation fails silently; monitoring is what catches it.",
"img_alt": "A certificate validity window shrinking from a year to 47 days",
"published": "2026-09-09", "published_h": "9 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "SSL certificate expiry monitoring: why <span class=\"accent\">shorter certificates</span> make it mandatory",
"lead": "For twenty years a certificate was a once-a-year chore. Since March 2026 it is a five-times-a-year chore, and by 2029 it will be every six weeks. Automation does the renewing; monitoring catches the times it does not.",
"lede": "<b>Public TLS certificates issued since 15 March 2026 are limited to 200 days' validity; the limit falls to 100 days in March 2027 and 47 days in March 2029, under the CA/Browser Forum ballot adopted in April 2025.</b> That makes automated renewal mandatory in practice — and automated renewal fails silently more often than people expect: a DNS change breaks validation, a rate limit is hit, an ACME client is left on a decommissioned server, a wildcard's DNS token stops working. The user then sees a full-page browser warning, and the site is effectively down while every uptime check reports success on the redirect. Expiry monitoring — a daily check of days remaining on every certificate you own or manage, alerting at 14, 7 and 3 days — is the control that closes the gap.",
"takeaways": [
  "Validity limits: <b>200 days now (since 15 March 2026), 100 days from March 2027, 47 days from March 2029.</b> Annual renewal calendars are already obsolete.",
  "An expired certificate is <b>an outage with a scarier error page</b>. Users see a warning, not your site, and most leave.",
  "Automated renewal fails silently: <b>DNS changes, rate limits, dead ACME clients, moved servers.</b> You find out at expiry.",
  "Monitor <b>days remaining</b> on every hostname daily; alert at 14, 7 and 3 days, to a named owner.",
  "Keep an <b>inventory</b>: every domain, subdomain and client site, with who renews it and how. Shorter lifetimes turn a forgotten subdomain into a monthly incident.",
],
"sections": [
("timeline", "The shortening timeline", """
    <table class="facts">
      <tr><th>Before March 2026</th><td>398 days maximum (since 2020)</td></tr>
      <tr><th>From 15 March 2026</th><td><b>200 days</b> maximum validity; domain validation reuse cut to 200 days</td></tr>
      <tr><th>From 15 March 2027</th><td><b>100 days</b> maximum; validation reuse 100 days</td></tr>
      <tr><th>From 15 March 2029</th><td><b>47 days</b> maximum; validation reuse 10 days</td></tr>
    </table>
    <p>The stated reasons are sound — revocation does not work well at internet scale, and a short-lived certificate limits how long a compromised key is useful — but the operational effect for a small team or an agency with forty client sites is that certificate renewal has moved from \"annual task\" to \"continuous process\", and continuous processes need monitoring. Facts checked 11 September 2026.</p>
"""),
("what-expiry-looks-like", "What an expired certificate looks like to a user", """
    <p>A full-page browser interstitial — \"Your connection is not private\", a red warning, a button most people will not click. For an e-commerce site it is a 100% conversion drop. For a SaaS login it is a support queue. For an API it is every client's TLS handshake failing with an error that looks, from their side, like your service refusing connections. Meanwhile a basic uptime check that follows the HTTP redirect and does not validate the chain may keep reporting \"up\" — one more case of <a href="/blog/application-up-but-users-see-errors">the application being up while users see errors</a>.</p>
"""),
("why-renewal-fails", "Why automated renewal fails silently", """
    <ul>
      <li><b>DNS changed.</b> The domain moved providers, the CNAME for validation was not recreated, HTTP-01 validation now hits a different server.</li>
      <li><b>The ACME client lives on a server that is gone.</b> The site moved to a CDN or a new host; the cron job that renewed it is still running on the old box, or nowhere.</li>
      <li><b>Rate limits.</b> Too many renewals for one registered domain in a week — common when a script loops on a failure.</li>
      <li><b>Wildcard DNS-01 token broken.</b> The API key the client uses to write the validation record was rotated.</li>
      <li><b>The renewal worked; the deploy did not.</b> A new certificate was issued but the load balancer, CDN or container still serves the old one.</li>
      <li><b>Nobody owns it.</b> The person who set it up left. Shorter lifetimes shrink the window in which that goes unnoticed from a year to weeks.</li>
    </ul>
    <p>In every case the renewal log says something went wrong, and nobody reads renewal logs. <a href="/blog/logs-vs-monitoring">Logs are records, not lookouts</a>.</p>
"""),
("what-to-monitor", "What to monitor, and when to alert", """
    <ol>
      <li><b>Days remaining</b>, checked daily from the outside on every hostname — the served certificate, not the one on disk. Alert at 14, 7 and 3 days.</li>
      <li><b>Chain validity</b> — an intermediate that expired or was not sent is as fatal as the leaf.</li>
      <li><b>Hostname match</b> — a certificate that renewed for the apex but not the www, or vice versa.</li>
      <li><b>Renewal success</b>, inferred: if days remaining should have jumped and did not, the renewal failed. With 47-day certificates, \"renewal did not happen at day 17\" is the alert that matters.</li>
      <li><b>Every hostname you own or manage</b> — including client sites, staging, and the API subdomain nobody visits in a browser.</li>
    </ol>
    <p>Alerts go to a named owner, once, with the hostname and the expiry date. Fourteen days is enough to fix DNS; three days is the last call. <a href="/blog/production-issues-monitoring-should-detect">One of the ten issues monitoring should detect without a human</a>.</p>
"""),
("inventory", "The inventory problem", """
    <p>The hard part is not checking a certificate; it is knowing which certificates exist. Agencies and small teams accumulate hostnames — client sites, redirect domains, staging, APIs, the marketing site's old subdomain — and each one has a certificate on a schedule. Keep the list where the monitoring is: every asset registered, each with an owner and the renewal method. When a site is registered for uptime monitoring, its certificate is monitored with it, and the inventory maintains itself. <a href="/blog/website-monitoring-for-agencies-client-sites">Per-client monitoring for agencies</a> covers the structure.</p>
"""),
],
"facts": [
("Maximum validity", "200 days (since 15 Mar 2026) → 100 days (Mar 2027) → 47 days (Mar 2029)"),
("User impact of expiry", "Full-page browser warning; site effectively down"),
("Why renewal fails", "DNS change, dead ACME client, rate limits, rotated API keys, issued-but-not-deployed, no owner"),
("Check", "Daily, outside-in, on the served certificate, every hostname"),
("Alert thresholds", "14, 7 and 3 days remaining; one alert to a named owner"),
("Also check", "Chain validity, hostname match, that renewal actually happened"),
],
"faqs": [
("How long are SSL certificates valid in 2026?", "Public TLS certificates issued from 15 March 2026 are limited to 200 days. Under the CA/Browser Forum schedule adopted in April 2025, the maximum drops to 100 days from March 2027 and to 47 days from March 2029. Certificates issued before March 2026 keep their original validity of up to 398 days."),
("Why do certificate lifetimes keep getting shorter?", "Because revocation does not work reliably at internet scale, so a compromised or mis-issued certificate stays trusted until it expires. Shorter lifetimes limit that window and force renewal to be automated rather than manual. The operational consequence is that renewal becomes continuous and needs monitoring."),
("What happens when an SSL certificate expires?", "Browsers show a full-page warning that the connection is not private and most visitors leave; API clients fail their TLS handshake and see connection errors. The site is effectively down. Uptime checks that do not validate the certificate chain may continue to report the site as up."),
("Why did my automatic SSL renewal fail?", "The common causes are a DNS change that broke validation, an ACME client still running on a server the site no longer uses, a hit rate limit from a looping script, a rotated API key for DNS-01 validation, or a certificate that was issued but never deployed to the CDN or load balancer. The renewal log records the failure; nobody reads renewal logs, which is why external expiry monitoring exists."),
("How far in advance should I be alerted about certificate expiry?", "At 14 days, 7 days and 3 days remaining, to a named owner. Fourteen days is enough to fix a DNS or configuration problem; three days is the final call. With 47-day certificates, also alert when a renewal that should have happened at around day 17 did not."),
("How do I monitor SSL expiry for many sites?", "Register every hostname you own or manage — including client sites, staging and API subdomains — in one place with an owner, and check the served certificate daily from the outside. The inventory is the hard part; tying the certificate check to the same registration used for uptime monitoring keeps the list maintained."),
],
"merik": """
    <p>Every website, web app or API registered in Merik's Digital Operations module gets a daily SSL certificate expiry check alongside its availability and response-time checks, from the outside, on the certificate actually being served. Days remaining are visible per asset; an approaching expiry raises a warning to the asset's owner, once, by email or Slack. Because assets are registered per client, the inventory problem solves itself — the client site you registered for uptime is the client site whose certificate is being watched.</p>
    <p>Certificate status is a standing section of the monthly per-client SLA report, so a renewal that went smoothly is visible to the client as a delivered service rather than an absence of complaints. See the <a href="/modules">Digital Operations module</a>.</p>
""",
"related": ["website-monitoring-for-agencies-client-sites", "production-issues-monitoring-should-detect", "application-up-but-users-see-errors"],
},

{
"slug": "public-status-page-small-business",
"crumb": "Status pages",
"title": "Do You Need a Public Status Page? A Guide for Small SaaS Products and Agencies",
"desc": "When a status page earns its place for a small SaaS or an agency's clients, what it should show, why a private per-client page often beats a public one, the honesty rules that make it worth trusting, and the incident update template that keeps support tickets down.",
"keywords": "public status page small business, do I need a status page, status page for SaaS, client status page agency, private status page, status page best practices, incident communication template, status page vs support tickets",
"og_title": "Do you need a public status page?",
"og_desc": "When it earns its place, what to show, private per-client pages, and the honesty rules that make it worth trusting.",
"img_alt": "A status page showing per-component health and an open incident",
"published": "2026-09-09", "published_h": "9 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Do you need a public status page? <span class=\"accent\">A guide for small teams</span>",
"lead": "A status page is the cheapest support engineer you will ever hire — provided it tells the truth, and provided someone can find it before they open a ticket.",
"lede": "<b>A small SaaS product or an agency managing client sites needs a status page from the moment a second person would otherwise ask \"is it just me?\" — because that question, multiplied, is the support load of every incident.</b> The page shows, per component, whether it is operating normally, degraded or down, plus any open incident with timestamped updates, and it is generated from the same monitoring that detects the problem rather than updated by hand. For agencies, a private per-client page reached by a token URL is often better than a public one: the client sees their own assets, and nobody else sees the client list. The rules that make a status page worth trusting are short: automatic, honest, and updated before the tickets arrive.",
"takeaways": [
  "The status page's job is to <b>answer \"is it just me?\" before the ticket is written</b>. Every incident, that is the majority of the support load.",
  "It must be <b>driven by monitoring</b>, not edited by hand. A page that says \"all systems operational\" during an outage is worse than no page.",
  "Agencies: a <b>private per-client page via token URL</b> shows a client their own assets without publishing your client list.",
  "Post the first update <b>within minutes of detection</b>, even if it only says \"we are investigating\". Silence is what people screenshot.",
  "Show <b>history</b>. Ninety days of honest uptime is a sales asset; a page with no history looks like it was made this morning.",
],
"sections": [
("when", "When it earns its place", """
    <ul>
      <li><b>Any SaaS with paying users</b>, from the first ten. The first outage with no status page produces ten identical tickets and one angry tweet.</li>
      <li><b>Any agency with a maintenance retainer.</b> The client should be able to check the site before calling you; the page is part of what they are paying for. <a href="/blog/website-monitoring-for-agencies-client-sites">Monitoring for agencies</a>.</li>
      <li><b>Any API with external consumers.</b> Integrators need a place to look that is not your inbox.</li>
      <li><b>Any product that depends on third parties</b> users can see — payments, email, maps. When the provider fails, the status page is where you explain it. <a href="/blog/third-party-dependency-outages">Is it us or them?</a></li>
    </ul>
    <p>When it does not: an internal tool with twenty users who sit near you. Tell them in the channel.</p>
"""),
("what-to-show", "What it should show", """
    <table class="facts">
      <tr><th>Components</th><td>The three to eight things a user would name: web app, API, login, payments, email delivery, the client's site</td></tr>
      <tr><th>State per component</th><td>Operational · Degraded · Partial outage · Major outage — derived from monitoring, not typed</td></tr>
      <tr><th>Open incidents</th><td>Title, affected components, timestamped updates newest first, current status (investigating, identified, monitoring, resolved)</td></tr>
      <tr><th>Scheduled maintenance</th><td>Announced in advance, with a window; excluded from the SLA if your terms say so</td></tr>
      <tr><th>History</th><td>Past incidents and uptime for the last 30–90 days, per component</td></tr>
    </table>
    <p>What it should not show: internal component names nobody outside recognises, every micro-service, or a green tick that is not connected to anything.</p>
"""),
("public-vs-private", "Public page, private page, or both", """
    <p>A <b>public</b> page suits a SaaS product: one URL, linked from the footer and from every error message, indexed so \"is [product] down\" finds it. A <b>private</b> page — reached by a token in the URL, not by login — suits agencies and B2B vendors: each client sees only their own assets, the URL goes in the onboarding email and the monthly report, and the agency's client list stays confidential. Many teams need both: public for the product, private per client for managed sites. The data behind them is the same monitoring.</p>
"""),
("honesty", "The honesty rules", """
    <ol>
      <li><b>Automatic state.</b> Component state comes from the monitoring checks. If the checks fail, the page changes, whether or not anyone has looked yet. A hand-edited page lags by exactly the time it takes someone to notice, which is the time you were trying to eliminate. <a href="/blog/reduce-mttd">Reducing time to detect</a>.</li>
      <li><b>First update fast.</b> \"Investigating elevated errors on the API since 14:02\" within minutes beats a polished paragraph an hour later.</li>
      <li><b>Say what users see</b>, not what you think is broken. \"Login may fail intermittently\" is useful; \"database connection pool exhaustion\" is a diary entry.</li>
      <li><b>Attribute dependencies honestly</b> — \"caused by an outage at our payment provider\" — but do not hide behind them. It is still your incident to your users.</li>
      <li><b>Never rewrite history.</b> An incident that happened stays in the history. Deleting it is discovered eventually and costs more than the incident did.</li>
    </ol>
"""),
("template", "An incident update template", """
    <p><b>Investigating</b> — \"Since 14:02 IST some users are seeing errors when saving. We are investigating. Next update within 30 minutes.\"<br>
    <b>Identified</b> — \"The cause is a failed deploy at 13:58; we are rolling back. Saving may fail until the rollback completes.\"<br>
    <b>Monitoring</b> — \"Rollback completed at 14:21. Error rates are back to normal; we are monitoring.\"<br>
    <b>Resolved</b> — \"Resolved at 14:45. Duration 43 minutes. Affected: saving in the web app. A summary will follow in the monthly report.\"</p>
    <p>Four states, each with a time, each promising the next update. That is the whole discipline. The monthly <a href="/blog/sla-reports-for-clients-agency">SLA report</a> is where the fuller account goes.</p>
"""),
],
"facts": [
("Purpose", "Answer \"is it just me?\" before the ticket is opened"),
("State source", "Monitoring checks — automatic, never hand-edited"),
("Components", "3–8 things users would name"),
("Incident states", "Investigating → Identified → Monitoring → Resolved, each timestamped"),
("Private pages", "Token URL per client; no login; client list stays confidential"),
("History", "30–90 days per component; never deleted"),
],
"faqs": [
("Does a small SaaS need a status page?", "Yes, from the first paying users. The first outage without one produces a ticket from every affected user asking the same question. A status page driven by your monitoring answers that question automatically and cuts incident support load to a fraction, and its history becomes evidence of reliability for prospects."),
("Should an agency have a status page for client websites?", "Yes, but usually a private one per client rather than a public one. A per-client page reached by a token URL shows the client their own sites' state and incident history without publishing the agency's client list, and it belongs in the onboarding email and the monthly SLA report as part of the maintenance retainer."),
("What should a status page show?", "The handful of components a user would name, each with a state derived from monitoring; any open incident with timestamped updates and a current status; scheduled maintenance; and 30–90 days of history. It should not list internal services nobody recognises or show a green state that is not connected to real checks."),
("Should a status page be updated manually or automatically?", "Component state should be automatic, driven by the same checks that detect the failure, so the page changes before anyone has looked. Incident narrative — what users see, what is being done, when the next update is due — is written by a person, quickly, in four states: investigating, identified, monitoring, resolved."),
("What is the difference between a public and a private status page?", "A public page has one URL anyone can open and is right for a product with many users. A private page is reached by a secret token in the URL, without a login, and shows one client only their own assets — right for agencies and B2B vendors who do not want to publish who their clients are. The monitoring behind both is the same."),
("How quickly should I post a status update during an incident?", "Within minutes of detection, even if it only says you are investigating and when the next update will come. The first update's purpose is to stop the tickets, not to explain the cause. Follow with identified, monitoring and resolved states, each timestamped."),
],
"merik": """
    <p>Merik's Digital Operations module includes status pages that are generated from the monitoring, not typed. Each client's assets can be exposed on a private page reached by a token URL — no login, no client list — showing per-asset state, open incidents with their timeline, and history. Because component state comes from the same outside-in checks that open the incident, the page changes when the failure is confirmed, before anyone has been alerted, and returns to normal when the checks recover.</p>
    <p>Incidents carry deploy markers from GitHub and Vercel webhooks and dependency context from vendor status feeds, so the narrative on the page can say honestly whether it was a deploy or a provider. The same data produces the monthly per-client SLA report. See the <a href="/modules">Digital Operations module</a>.</p>
""",
"related": ["sla-reports-for-clients-agency", "website-monitoring-for-agencies-client-sites", "third-party-dependency-outages"],
},

# ---------------------------------------------------------------- INCIDENTS
{
"slug": "third-party-dependency-outages",
"crumb": "Third-party outages",
"title": "Is It Us or Them? Handling Third-Party Outages (AWS, Cloudflare, Stripe) in a Small Team",
"desc": "Late 2025 showed how much of the web fails together when one provider does. How a small team answers &quot;is it us or them?&quot; in the first ten minutes, what to do and not do during a dependency outage, how to communicate it, and how to reduce the blast radius before the next one.",
"keywords": "third party outage what to do, is it us or them outage, AWS outage impact small business, Cloudflare outage November 2025, dependency outage monitoring, vendor status page monitoring, Stripe outage handling, upstream provider outage incident response",
"og_title": "Is it us or them? Third-party outages in a small team",
"og_desc": "The first ten minutes, what not to do, how to communicate it, and how to shrink the blast radius before the next one.",
"img_alt": "An incident timeline with a vendor status feed showing the upstream cause",
"published": "2026-09-10", "published_h": "10 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Is it us or them? Handling <span class=\"accent\">third-party outages</span> in a small team",
"lead": "In late 2025, a single cloud region and then a single CDN's configuration change each took a large slice of the internet's applications down for hours. Most of the affected teams spent the first half hour debugging their own code.",
"lede": "<b>When an application fails because a provider it depends on has failed, the most valuable thing a small team can do in the first ten minutes is establish that fact — because it changes every subsequent action: do not deploy, do not restart, do communicate, and do wait.</b> The way to establish it is to have the provider's status on the same timeline as your own incident, automatically, so the incident opens with \"Cloudflare reports a widespread outage since 11:20\" attached. The AWS us-east-1 failure in October 2025 and the Cloudflare outage in November 2025 each showed the pattern: thousands of applications down, most of their teams initially convinced it was something they had shipped.",
"takeaways": [
  "The first question is not \"what broke?\" but <b>\"is it us or them?\"</b> — and it should be answered by data, not by checking Twitter.",
  "Put <b>vendor status feeds on your incident timeline</b> so an incident that coincides with a provider outage says so when it opens.",
  "During a dependency outage: <b>do not deploy, do not restart, do communicate</b>. Most self-inflicted damage happens while trying to fix what was not yours.",
  "It is still <b>your incident to your users</b>. Attribute it honestly; do not hide behind it.",
  "Afterwards, map the dependencies. <b>Every provider you rely on is a component you do not monitor</b> unless you make it one.",
],
"sections": [
("first-ten", "The first ten minutes", """
    <ol>
      <li><b>Check the correlation.</b> Did the incident start within minutes of a provider reporting trouble? If your monitoring shows the vendor's status alongside your incident, this is one glance. If not, it is the provider's status page, then the second provider's, then a news search — while the clock runs.</li>
      <li><b>Check what else is down.</b> If your marketing site on one host is fine and your app on another is not, that narrows it. If both are down and they share a CDN, the CDN is the suspect.</li>
      <li><b>Check your own changes.</b> Was there a deploy in the last hour? If yes and no provider is reporting trouble, it is probably you. <a href="/blog/did-the-deploy-break-production">Did the deploy break it?</a></li>
      <li><b>Decide, and say so.</b> \"Dependency outage, provider X, no action on our side\" or \"ours, investigating\". Write it down with the time; you will want it for the report.</li>
    </ol>
"""),
("what-not-to-do", "What not to do during a dependency outage", """
    <ul>
      <li><b>Do not deploy.</b> A deploy during a provider outage cannot be validated, and if the provider recovers mid-deploy you now have two problems and no idea which caused which.</li>
      <li><b>Do not restart things at random.</b> Restarting a service that is failing because its upstream is unreachable buys nothing and clears the evidence.</li>
      <li><b>Do not \"quickly switch\" providers under pressure.</b> Failover that was not rehearsed is a second incident with a new cause.</li>
      <li><b>Do not go silent.</b> Users do not know it is Cloudflare. They know your product is not working.</li>
    </ul>
"""),
("communicate", "Communicating it honestly", """
    <p>The status page update is: what users see, that the cause is an outage at a named provider, that there is no action they need to take, and when the next update is due. Do not name-and-blame; do not pretend it is nothing to do with you. \"Our payment processing depends on Stripe, which is reporting degraded service since 09:40. Payments may fail. We will update when Stripe confirms recovery.\" — that is the whole message. <a href="/blog/public-status-page-small-business">The incident update template</a>.</p>
    <p>For agency clients, the same message per client, and the monthly <a href="/blog/sla-reports-for-clients-agency">SLA report</a> marks the incident as dependency-caused — which matters for whether it counts against the tier, if your terms exclude upstream outages.</p>
"""),
("noise", "Suppressing the noise without hiding the signal", """
    <p>A CDN outage takes down twenty client sites at once. Twenty incidents, twenty alerts, one cause. Monitoring that understands dependencies opens the incidents — they are real; the sites are down — but marks them as explained by the provider and alerts once for the group, rather than paging the owner twenty times about something they cannot fix. The distinction is between <b>suppressing the alert</b> (right) and <b>suppressing the incident</b> (wrong: it still happened, it still goes in the report). <a href="/blog/alert-fatigue-small-teams">Alert fatigue</a> is mostly built from exactly this case.</p>
"""),
("blast-radius", "Reducing the blast radius before the next one", """
    <ul>
      <li><b>Write the dependency map.</b> DNS, CDN, hosting, database, auth, email, payments, SMS, AI APIs. For each: what fails if it fails, and what the user sees.</li>
      <li><b>Monitor the providers as components.</b> Their status feeds belong in your monitoring, not in a browser bookmark.</li>
      <li><b>Degrade, don't die.</b> If the payment provider is down, let users browse and queue the checkout. If the AI API is down, fall back to the non-AI path. Each of these is a small piece of work that turns an outage into a degradation.</li>
      <li><b>Rehearse one failover</b> a year for the dependency that would hurt most. Unrehearsed failover is not failover.</li>
      <li><b>Know the concentration.</b> If your DNS, CDN and hosting are all one vendor, you have one dependency, not three. That may be fine; decide it consciously.</li>
    </ul>
    <p>The late-2025 outages did not mostly hurt teams because they depended on a provider — everyone does. They hurt because the teams did not know, for the first half hour, that they did. <a href="/blog/proactive-application-reliability">The full reliability loop</a>.</p>
"""),
],
"facts": [
("First question", "Is it us or them — answered by vendor status on the incident timeline"),
("During", "No deploys, no random restarts, no unrehearsed failover; communicate within minutes"),
("Attribution", "Honest — named provider, no blame, still your incident to your users"),
("Noise rule", "Suppress the repeated alert, never the incident"),
("Afterwards", "Dependency map; providers monitored as components; degrade-not-die paths; one rehearsed failover"),
("Late-2025 lesson", "Most teams lost the first half hour not knowing it was upstream"),
],
"faqs": [
("How do I know if an outage is my application or a third-party provider?", "Check whether the incident started at the same time as trouble reported by a provider you depend on, whether other properties of yours that share that provider are also affected, and whether you deployed in the last hour. Monitoring that shows vendor status feeds on the same timeline as your incidents answers the first question at a glance; without it, the answer comes from status pages and news while the clock runs."),
("What should I do during an AWS or Cloudflare outage?", "Confirm it is the provider, post a status update saying what users see and that the cause is upstream, and then wait. Do not deploy, do not restart services at random, and do not attempt an unrehearsed switch of providers. Most self-inflicted damage during dependency outages comes from trying to fix something that was never yours."),
("Should I tell users the outage is caused by a third party?", "Yes, plainly and without blame: name the provider, say what users will see, say no action is needed from them, and say when you will update next. It is still your incident to your users, so do not hide behind the provider — but honesty about the cause is what keeps their trust."),
("Do third-party outages count against my SLA?", "That depends on your terms. Many agreements exclude upstream provider outages, some do not. Whichever it is, the monthly report should mark the incident as dependency-caused with the provider named, so the client can see the distinction — and so the decision about what counts was made in the contract rather than in the argument."),
("How can a small team reduce the impact of provider outages?", "Write down every provider you depend on and what fails when it does; monitor their status as components of your own system; build degrade-not-die paths for the ones that matter most, such as queuing checkouts when payments are down; rehearse one failover a year; and know where several of your dependencies are actually one vendor."),
("What were the big outages in late 2025?", "In October 2025 a failure in AWS's us-east-1 region took a large number of services offline for hours, and in November 2025 a Cloudflare configuration change caused widespread errors across sites using its network. In both cases many affected teams spent the early part of the incident investigating their own systems before the upstream cause was clear."),
],
"merik": """
    <p>Merik's Digital Operations module puts the provider on the timeline. Vendor status feeds for Stripe, Supabase, GitHub, Vercel, Cloudflare, Twilio and OpenAI are watched alongside your own assets; when an incident opens on one of your sites while a provider is reporting trouble, the incident carries that context from the start, and the alert says so. Incidents explained by a dependency are still recorded — they happened, and they appear in the monthly SLA report marked as dependency-caused — but the repeated alerting is suppressed so the owner is not paged twenty times about one CDN.</p>
    <p>Deploys from GitHub and Vercel webhooks sit on the same timeline, so \"did we ship something?\" and \"is a provider down?\" are answered by the same view in the first minute. See the <a href="/modules">Digital Operations module</a>.</p>
""",
"related": ["did-the-deploy-break-production", "alert-fatigue-small-teams", "application-up-but-users-see-errors"],
},

{
"slug": "alert-fatigue-small-teams",
"crumb": "Alert fatigue",
"title": "Alert Fatigue in Small Teams: Why You Ignore Your Own Monitoring (and How to Fix It)",
"desc": "Why small teams end up muting the alerts they set up — one alert per signal, static thresholds, no deduplication, flapping, no quiet hours — and the six rules that bring the alert count down to what a person will actually read: one per problem, with evidence, to an owner, once.",
"keywords": "alert fatigue, alert fatigue small teams, too many monitoring alerts, reduce alert noise, monitoring alerts ignored, alert deduplication, quiet hours alerts, actionable alerts, alerting best practices small team",
"og_title": "Alert fatigue: why you ignore your own monitoring",
"og_desc": "Five causes, six rules, and the two numbers that tell you whether your alerts are worth reading.",
"img_alt": "A flood of alerts collapsing into one incident with evidence and an owner",
"published": "2026-09-10", "published_h": "10 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Alert fatigue in small teams: why you <span class=\"accent\">ignore your own monitoring</span>",
"lead": "The monitoring was set up carefully. Three months later the channel is muted and the outage is discovered by a customer. Nothing broke in between except the ratio of alerts to problems.",
"lede": "<b>Alert fatigue is what happens when the number of alerts exceeds the number of problems by enough that reading them stops being worth it — and in a small team that point arrives fast, because the same three people receive every alert.</b> The causes are structural: one alert per signal instead of per problem, static thresholds that fire on normal variation, no deduplication so one outage produces twenty messages, flapping checks that open and close every few minutes, and no notion of quiet hours. The fix is equally structural: one alert per problem, carrying its evidence, sent to a named owner, once, with recovery closing it automatically. Then measure two numbers — alerts per week, and the fraction that led to action — and keep the second above half.",
"takeaways": [
  "Fatigue is a <b>ratio</b>: alerts ÷ real problems. Above about three to one, people stop reading. Above ten, they mute.",
  "The biggest single cause is <b>one alert per signal</b>. An outage that raises latency, errors and a failed check is one problem, not three alerts.",
  "<b>Static thresholds</b> fire on Monday-morning traffic and sleep through a 3× latency rise at 2am. Baselines fix both.",
  "<b>Alert once, to one owner, with evidence.</b> Re-paging every five minutes is how the channel gets muted.",
  "Measure it: <b>alerts per week</b> and <b>action rate</b>. If fewer than half of alerts led to someone doing something, the alerting is broken, not the team.",
],
"sections": [
("symptoms", "How to tell you have it", """
    <ul>
      <li>The alerts channel is muted for at least one person who is supposed to read it.</li>
      <li>Someone says \"oh, that one always fires\" about any alert.</li>
      <li>An incident in the last quarter was discovered by a user while an alert about it sat unread. <a href="/blog/detect-bugs-before-users-report-them">The cost of that</a>.</li>
      <li>Nobody can say what happens after an alert is received — there is no owner, so there is no action.</li>
      <li>Alerts and their recoveries outnumber actual incidents by more than three to one.</li>
    </ul>
"""),
("causes", "Five causes", """
    <ol>
      <li><b>One alert per signal.</b> Latency high: alert. Error rate high: alert. Check failed: alert. All three are one problem — the service is degraded — but arrive as three messages, then three recoveries.</li>
      <li><b>Static thresholds.</b> \"Alert if latency &gt; 800 ms\" fires every Monday at 9:30 and never at 2am when latency triples from 150 ms to 450 ms. The threshold measures the wrong thing: distance from a number, rather than distance from normal. <a href="/blog/proactive-application-monitoring">Baselines, explained</a>.</li>
      <li><b>No deduplication.</b> Twenty sites behind one CDN go down; twenty incidents, twenty alerts, one cause. <a href="/blog/third-party-dependency-outages">Handling dependency outages</a>.</li>
      <li><b>Flapping.</b> A check that fails, recovers, fails, recovers every few minutes generates a stream of open/close messages and trains people that \"down\" does not mean down.</li>
      <li><b>No quiet hours, no severity.</b> A marketing site's 3am blip pages the same person the same way as the checkout failing at noon. After a month of 3am pages that did not matter, the noon page is ignored.</li>
    </ol>
"""),
("rules", "Six rules that fix it", """
    <table class="facts">
      <tr><th>1. One alert per problem</th><td>Correlate signals from the same asset into one incident with an evidence list. Latency + errors + failed check = one message that lists all three.</td></tr>
      <tr><th>2. Judge against normal</th><td>Baselines per asset — this endpoint's own p95, its own error rate — so the alert means \"abnormal for this\", not \"above a number someone typed\".</td></tr>
      <tr><th>3. Confirm before alerting</th><td>Two or three consecutive failures before a check counts as down. Kills flapping and single blips.</td></tr>
      <tr><th>4. One owner, once</th><td>Auto-assign to the asset's owner and alert once by email or Slack. Escalation, if needed, is a separate rule, not a repeat.</td></tr>
      <tr><th>5. Quiet hours and severity</th><td>Non-critical assets wait for morning. Critical ones do not. The person receiving the alert should be able to tell which from the first line.</td></tr>
      <tr><th>6. Auto-close on recovery</th><td>An incident that resolves itself closes itself, with the duration recorded. No manual tidy-up, no stale alerts.</td></tr>
    </table>
"""),
("evidence", "Why evidence matters more than volume", """
    <p>An alert that says \"latency high\" makes the reader do the investigation. An alert that says \"p95 latency 2.4 s vs 14-day baseline 410 ms; error rate 3.1% vs 0.2%; a deploy landed 9 minutes before; no provider incidents reported\" has done the first fifteen minutes of the investigation already — and, crucially, tells the reader whether to get out of bed. Fewer alerts with evidence beat more alerts without it, every time. Add a <b>confidence score</b> separate from the severity: \"high risk, low confidence\" is honest and useful; a single number that blends the two is neither. <a href="/blog/ai-application-monitoring">Where learned baselines and correlation help</a>.</p>
"""),
("measure", "Measuring it: two numbers", """
    <p><b>Alerts per week</b>, per person. <b>Action rate</b> — the fraction of alerts that resulted in someone doing something (a fix, a rollback, a ticket, a decision to accept). Review both monthly. Action rate under 50% means half the alerts should not exist; find the noisiest source and apply the six rules to it. A small team with well-tuned alerting typically sees a handful of alerts a week, nearly all actionable — which is a team that reads its alerts. <a href="/blog/reduce-mttd">And a team that reads its alerts detects in minutes</a>.</p>
"""),
],
"facts": [
("Definition", "Alerts outnumber real problems until reading them is not worth it"),
("Threshold", "≈ 3:1 alerts to problems people stop reading; ≈ 10:1 they mute"),
("Top cause", "One alert per signal instead of per problem"),
("Six rules", "One per problem · baselines · confirm first · one owner once · quiet hours + severity · auto-close"),
("Evidence", "Every alert carries the signals that produced it and a separate confidence score"),
("Metrics", "Alerts/week per person; action rate ≥ 50%"),
],
"faqs": [
("What is alert fatigue?", "Alert fatigue is the state in which monitoring alerts arrive so much more often than real problems that the people receiving them stop reading, and eventually mute them. It is caused by the structure of the alerting — one alert per signal, static thresholds, no deduplication, flapping checks, no quiet hours — rather than by the team's diligence."),
("How do I reduce alert noise in a small team?", "Correlate all signals from one asset into a single incident with an evidence list; judge each signal against that asset's own baseline rather than a fixed threshold; require two or three consecutive failures before alerting; send one alert to one named owner rather than re-paging; apply quiet hours and severity so non-critical assets wait for morning; and close incidents automatically when the checks recover."),
("How many alerts per week is too many?", "There is no fixed number, but the ratio matters: when alerts outnumber real problems by more than about three to one, people stop reading them. Track alerts per week per person and the fraction that led to action; if fewer than half were actionable, the alerting needs to be fixed at the source."),
("Why do static thresholds cause alert fatigue?", "Because they measure distance from a number rather than distance from normal. A threshold set at 800 ms fires every busy morning when 800 ms is normal load, and stays silent at 2am when latency triples from 150 ms to 450 ms. Baselines per asset — its own latency percentiles and error rate over a trailing window — alert on what is abnormal for that asset."),
("Should alerts repeat until acknowledged?", "Not by default. Repeated paging is the fastest route to a muted channel. Alert once to a named owner with the evidence; if escalation is genuinely required for a critical asset, make it a separate, explicit rule with a longer interval rather than a repeat of the same message."),
("What should a good alert contain?", "The asset and what is abnormal about it, the signals that produced the alert with their current and baseline values, correlated context such as a recent deploy or a provider incident, a severity, a separate confidence score, and the owner. An alert with that content has done the first fifteen minutes of investigation before anyone opens it."),
],
"merik": """
    <p>Merik's Digital Operations module is built around the six rules. Each asset's latency and error-rate baselines are measured over 14 days, so warnings mean \"abnormal for this asset\". Correlated symptoms produce at most one early warning per asset, carrying a risk score, a separate confidence score and the evidence list that produced them — including a deploy that landed just before, from GitHub or Vercel webhooks, and any provider incident from vendor status feeds. Failures are confirmed before an incident opens.</p>
    <p>Incidents are auto-assigned to the asset's owner and alerted once by email or Slack, with quiet-hours rules; warnings that recover close themselves, and warnings that came true are linked to the incident they predicted so you can see the action rate for yourself. See the <a href="/modules">Digital Operations module</a>.</p>
""",
"related": ["reduce-mttd", "third-party-dependency-outages", "proactive-application-monitoring"],
},

{
"slug": "did-the-deploy-break-production",
"crumb": "Did the deploy break it?",
"title": "Did the Deploy Break Production? Correlating Deployments with Incidents",
"desc": "Most incidents follow a change, and most teams cannot say what changed when. How to put deploys on the incident timeline automatically, how to read the correlation honestly, when to roll back versus investigate, and the habits — small deploys, a post-deploy watch window — that make the question easy.",
"keywords": "did the deploy break production, deploy caused incident, deployment monitoring, correlate deploys with errors, post deploy monitoring, rollback decision, Vercel deploy broke site, GitHub deploy webhook monitoring, change failure rate small team",
"og_title": "Did the deploy break it? Correlating deployments with incidents",
"og_desc": "Deploys on the incident timeline, reading the correlation honestly, the rollback decision, and the post-deploy watch window.",
"img_alt": "An incident timeline with a deploy marker minutes before the error spike",
"published": "2026-09-11", "published_h": "11 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Did the deploy break production? <span class=\"accent\">Correlating deployments</span> with incidents",
"lead": "The first question in any incident is \"what changed?\" — and in most small teams the answer is a Slack search for \"deployed\". Put the deploy on the timeline and the question answers itself.",
"lede": "<b>The majority of production incidents follow a change, and the fastest way to answer \"was it the deploy?\" is to have every deployment recorded on the same timeline as the monitoring — automatically, from the deploy tool's webhook — so an incident opening nine minutes after a deploy shows the deploy beside it.</b> Correlation is not proof: a deploy that coincides with a provider outage is innocent, and a deploy whose effect takes an hour to surface will look innocent when it is not. But a deploy marker beside an error spike turns a thirty-minute investigation into a two-minute rollback decision, and the habits that go with it — small deploys, a ten-minute watch window after each one — make most of those decisions unnecessary.",
"takeaways": [
  "Most incidents <b>follow a change</b>. If deploys are not on your monitoring timeline, the first ten minutes of every incident is spent finding out what shipped.",
  "Record deploys <b>automatically from webhooks</b> — GitHub, Vercel, your CI — never by asking people to post in a channel.",
  "Read correlation <b>honestly</b>: a deploy nine minutes before an error spike is a strong lead, not a verdict. Check for provider incidents and traffic changes too.",
  "<b>Rollback first, investigate second</b> when the correlation is tight and rollback is cheap. Investigate first when rollback is risky or the effect is delayed.",
  "The habit that makes this rare: <b>small deploys and a ten-minute watch</b> after each one, by the person who shipped it.",
],
"sections": [
("why-it-matters", "Why \"what changed?\" is the first question", """
    <p>Systems that were working and are now not working usually had something done to them: a deploy, a config change, a dependency update, a certificate rotation, a scaling event, a provider change. Of these, deploys are the most frequent and the most reversible. An incident that starts within minutes of a deploy has a prime suspect and a cheap remedy. An incident with no deploy nearby needs a different investigation — a provider, a traffic pattern, a slow leak. Knowing which situation you are in, in the first minute, is worth more than any dashboard. <a href="/blog/reduce-mttd">Most incident time is spent not knowing</a>.</p>
"""),
("on-the-timeline", "Getting deploys onto the timeline", """
    <p>The wrong way is a convention — \"post in #deploys when you ship\" — which is followed for a month. The right way is a webhook from wherever deploys happen: GitHub (deployment or push events), Vercel (deployment succeeded), your CI pipeline's final step. The webhook records what was deployed, to which asset, when, by whom, and the commit or version. That record sits on the same timeline as checks, warnings and incidents, so an incident view shows \"deploy v2.14.1 at 13:58 · errors rising from 14:02 · incident opened 14:04\". No one had to remember anything.</p>
    <p>For agencies, the same applies per client site: the WordPress plugin update or the theme deploy on a client's site is a change, and it belongs on that client's timeline. <a href="/blog/website-monitoring-for-agencies-client-sites">Per-client monitoring</a>.</p>
"""),
("reading-honestly", "Reading the correlation honestly", """
    <table class="facts">
      <tr><th>Tight correlation, nothing else changed</th><td>Deploy at 13:58, errors from 14:02, no provider incident, normal traffic. Probably the deploy. Roll back.</td></tr>
      <tr><th>Tight correlation, provider also down</th><td>Deploy at 13:58, Cloudflare reporting an outage from 13:55. Probably not the deploy. Do not roll back; wait. <a href="/blog/third-party-dependency-outages">Is it us or them?</a></td></tr>
      <tr><th>Loose correlation</th><td>Deploy at 11:00, errors from 14:00. Possibly the deploy — a slow leak, a cache expiry, a cron that runs at 14:00 — but investigate before rolling back three hours of other work.</td></tr>
      <tr><th>No deploy nearby</th><td>Look elsewhere: traffic, dependency, certificate, data. <a href="/blog/production-issues-monitoring-should-detect">The ten issues monitoring should detect</a>.</td></tr>
    </table>
    <p>The principle: a deploy marker is <b>context, not an accusation</b>. Monitoring that says \"the deploy caused it\" is overclaiming; monitoring that says \"a deploy landed nine minutes before this started\" is doing its job.</p>
"""),
("rollback", "Rollback or investigate?", """
    <ul>
      <li><b>Roll back first</b> when the correlation is tight, rollback is one command, and the deploy did not include a data migration. Investigate afterwards on the restored system.</li>
      <li><b>Investigate first</b> when rollback is risky (a migration ran, a dependency changed), when the effect is delayed, or when a provider is also reporting trouble.</li>
      <li><b>Either way, write the decision down</b> with the time. \"14:06 — rolled back v2.14.1 on tight correlation\" is the first line of the postmortem and the monthly report.</li>
    </ul>
"""),
("habits", "The habits that make the question easy", """
    <ol>
      <li><b>Small deploys.</b> A deploy with three changes has three suspects; a deploy with forty has forty. Ship more often, ship less each time.</li>
      <li><b>The ten-minute watch.</b> The person who deployed watches the asset's error rate and latency against baseline for ten minutes. Most deploy-caused incidents show in the first five.</li>
      <li><b>Deploy in daylight.</b> Not at 6pm Friday; not during a provider incident; not during the client's peak hour.</li>
      <li><b>Track the change failure rate.</b> Deploys that led to an incident ÷ deploys. Above 15% and the deploys are too big or the pre-deploy checks too thin. <a href="/blog/prevent-small-bugs-becoming-incidents">Cutting the chain early</a>.</li>
    </ol>
"""),
],
"facts": [
("First question", "What changed? — answered by deploys on the monitoring timeline"),
("Source", "Webhooks from GitHub, Vercel or CI; never a manual post"),
("Correlation rule", "Context, not accusation — check providers and traffic before concluding"),
("Roll back first when", "Tight correlation, cheap rollback, no migration"),
("Investigate first when", "Delayed effect, risky rollback, provider also reporting trouble"),
("Habits", "Small deploys · 10-minute watch · daylight · change failure rate under 15%"),
],
"faqs": [
("How do I know if a deployment caused a production incident?", "Put every deployment on the same timeline as your monitoring, automatically from the deploy tool's webhook, and look at what preceded the incident. A deploy a few minutes before an error spike, with no provider incident and normal traffic, is a strong lead and usually justifies a rollback. A deploy hours earlier, or one that coincides with a provider outage, needs investigation before you conclude."),
("How do I track deployments alongside monitoring?", "Use a webhook from wherever deploys happen — GitHub deployment or push events, Vercel deployment events, or your CI pipeline's final step — to record what was deployed, to which asset, when and by whom, on the monitoring timeline. Asking people to post in a channel works for about a month; the webhook works permanently."),
("Should I roll back immediately when errors rise after a deploy?", "Roll back first when the correlation is tight, rollback is a single command and the deploy did not run a data migration; investigate afterwards on the restored system. Investigate first when a migration ran, when the effect is delayed, or when a provider is also reporting trouble — rolling back in those cases can make things worse."),
("What is change failure rate?", "The fraction of deployments that led to a degradation or incident requiring remediation. Small teams that track it usually aim for under 15%; above that, deploys are typically too large or pre-deploy checks too thin. It is computed from the same records — deploys and incidents on one timeline."),
("What should I watch after a deployment?", "The deployed asset's error rate and latency against its own baseline, and frontend errors from real users, for about ten minutes, by the person who shipped. Most deploy-caused problems appear within the first five minutes; a warning during that window is the cheapest incident you will ever have."),
("Can monitoring tell me that a deploy caused an incident?", "It can tell you a deploy landed shortly before the incident, which is context rather than proof. Good monitoring presents the deploy beside the incident with the timing and lets a person conclude; monitoring that declares the deploy the cause is overclaiming, because provider outages and traffic changes coincide with deploys too."),
],
"merik": """
    <p>Merik's Digital Operations module takes deploys from GitHub and Vercel webhooks and places them on the incident timeline of the asset they touched. When an early warning or incident opens, a deploy that landed just before is shown as correlated context — with the time gap — never as a verdict; if a provider is also reporting trouble, that appears alongside from the vendor status feeds, so the \"us or them\" and \"was it the deploy\" questions are answered by the same view.</p>
    <p>Because each asset's latency and error-rate baselines are measured over 14 days, the ten-minute post-deploy watch is a glance at one screen: current against normal. Deploys and incidents on one timeline also give the monthly per-client SLA report its \"changes\" section for free. See the <a href="/modules">Digital Operations module</a>.</p>
""",
"related": ["third-party-dependency-outages", "prevent-small-bugs-becoming-incidents", "reduce-mttd"],
},

# ------------------------------------------------------------ OBSERVABILITY
{
"slug": "error-budgets-slo-small-teams",
"crumb": "Error budgets &amp; SLOs",
"title": "Error Budgets and SLOs for Small Teams: A Practical Introduction",
"desc": "SLOs and error budgets without the Google-scale baggage — what an SLO is versus an SLA, the minutes arithmetic, how a health score can simply be budget remaining, what to do when the budget burns, and how a three-person team uses it to decide between shipping and stabilising.",
"keywords": "error budget explained, SLO for small teams, SLO vs SLA, error budget calculation, service level objective small business, error budget policy, health score error budget, reliability targets startup, SRE for small teams",
"og_title": "Error budgets and SLOs for small teams",
"og_desc": "SLO vs SLA, the minutes arithmetic, a health score as budget remaining, and the ship-or-stabilise decision.",
"img_alt": "An error budget draining over a month against a declared availability target",
"published": "2026-09-11", "published_h": "11 September 2026",
"modified": "2026-09-11", "modified_h": "11 September 2026",
"h1": "Error budgets and SLOs for small teams: <span class=\"accent\">a practical introduction</span>",
"lead": "SLOs came from teams with thousands of services and a reliability department. The idea is simpler than its reputation, and a three-person team can use it to settle its most common argument: ship, or stabilise?",
"lede": "<b>A service level objective is a target you set for your own service — say, 99.9% of checks succeed over a rolling 30 days — and the error budget is the failure that target allows: at 99.9%, about 43 minutes of downtime a month.</b> An SLA is the version of that promise you make to a customer, with consequences; the SLO is the stricter internal target you run against so the SLA is never at risk. The budget turns reliability from a feeling into a number with a decision attached: while budget remains, ship; when it is spent, stabilise. For a small team, the whole practice can be one declared target per asset and a health score that shows budget remaining.",
"takeaways": [
  "<b>SLO</b> is the target you hold yourself to; <b>SLA</b> is the promise you make to customers. Set the SLO tighter than the SLA.",
  "<b>Error budget = 100% − SLO</b>, as minutes. 99.9% → 43 min/month; 99.5% → 3 h 36 min; 99% → 7 h 12 min.",
  "The budget's purpose is a <b>decision rule</b>: budget left, ship features; budget gone, stop and fix. It ends the argument.",
  "A <b>health score can simply be budget remaining</b>. That is more honest than a blended \"85/100\" nobody can explain.",
  "One SLO per user-visible asset is enough. <b>Do not build a taxonomy</b>; build one number per thing customers use.",
],
"sections": [
("slo-vs-sla", "SLO versus SLA, in one table", """
    <table class="facts">
      <tr><th>SLA</th><td>External promise to a customer, in a contract, with credits or penalties. Example: 99.5% monthly availability. <a href="/blog/sla-reports-for-clients-agency">Reporting against it</a>.</td></tr>
      <tr><th>SLO</th><td>Internal target you actually run to, stricter than the SLA so the SLA is safe. Example: 99.8%.</td></tr>
      <tr><th>SLI</th><td>The measurement — the fraction of checks that succeeded, the fraction of requests under 500 ms. What the SLO is a target for.</td></tr>
      <tr><th>Error budget</th><td>What the SLO allows to fail: 100% − SLO, expressed as minutes or failed requests over the window.</td></tr>
    </table>
"""),
("arithmetic", "The arithmetic", """
    <p>Over a 30-day window (43,200 minutes):</p>
    <table class="facts">
      <tr><th>99%</th><td>432 minutes of failure allowed — 7 h 12 min</td></tr>
      <tr><th>99.5%</th><td>216 minutes — 3 h 36 min</td></tr>
      <tr><th>99.9%</th><td>43 minutes</td></tr>
      <tr><th>99.95%</th><td>21.6 minutes</td></tr>
      <tr><th>99.99%</th><td>4.3 minutes — not a target for a small team on ordinary hosting</td></tr>
    </table>
    <p>Budget burns as failures are confirmed. A 25-minute incident on a 99.9% asset spends 58% of the month's budget. Two such incidents and the budget is gone with two weeks left — which is precisely the information the team needs. Latency SLOs work the same way with requests instead of minutes: \"99% of checks under 800 ms\" gives a budget of 1% slow checks. <a href="/blog/application-health-monitoring">How the layers roll up</a>.</p>
"""),
("decision-rule", "The decision rule: ship or stabilise", """
    <p>This is the part that earns its keep. Write a one-paragraph error budget policy:</p>
    <blockquote>While an asset has error budget remaining in the current window, feature work proceeds normally. When the budget is exhausted, feature deploys to that asset stop until the window recovers or the cause is fixed; engineering time goes to reliability. Budget spent on a dependency outage counts unless the SLA excludes it.</blockquote>
    <p>The value is not the rule itself but that it was agreed in advance. \"Should we ship this or fix the flakiness first?\" is no longer a negotiation between the founder and the engineer; it is a look at a number. <a href="/blog/did-the-deploy-break-production">Deploy correlation</a> tells you which deploys spent budget; <a href="/blog/prevent-small-bugs-becoming-incidents">catching small bugs early</a> is how you stop spending it.</p>
"""),
("health-score", "A health score that means something", """
    <p>Many dashboards show a health score — 87/100 — that blends uptime, latency, errors and \"trend\" with weights nobody remembers. The question \"what does 87 mean?\" has no answer. Budget remaining does: \"this asset has used 31% of its monthly error budget\" is a statement about the promise you made and how much room is left. It rises as the window rolls forward and drops when checks fail; it is comparable across assets on different tiers; and it tells a client exactly where the month stands. <a href="/blog/observability-vs-monitoring">Monitoring says something is wrong; the budget says how much it cost</a>.</p>
"""),
("pitfalls", "Pitfalls for small teams", """
    <ul>
      <li><b>Too many SLOs.</b> One per user-visible asset. Not one per endpoint, not one per microservice.</li>
      <li><b>Targets copied from big companies.</b> 99.99% on a single-region deploy with no on-call is a promise to fail. Pick what the architecture can deliver; tighten later.</li>
      <li><b>Measuring from the inside.</b> A server that reports itself healthy is not a user's experience. Measure from outside, as a user would arrive. <a href="/blog/application-up-but-users-see-errors">The gap</a>.</li>
      <li><b>Ignoring the budget when it is spent.</b> A policy that is overridden the first time it bites was never a policy.</li>
      <li><b>No window.</b> Rolling 30 days. Calendar months work for SLA reporting; rolling windows work for decisions.</li>
    </ul>
"""),
],
"facts": [
("SLO", "Internal target you run to; stricter than the SLA"),
("SLA", "External promise with consequences"),
("Error budget", "100% − SLO, as minutes or failed requests over the window"),
("99.9% / 30 days", "43 minutes of failure allowed"),
("Decision rule", "Budget remaining → ship; budget spent → stabilise"),
("Health score", "Budget remaining, per asset, against its declared tier"),
("How many", "One SLO per user-visible asset"),
],
"faqs": [
("What is an error budget?", "An error budget is the amount of failure a service level objective permits over a window. If the SLO is 99.9% availability over 30 days, the error budget is 0.1% of that window — about 43 minutes of downtime. Confirmed failures spend the budget; while budget remains the team ships normally, and when it is exhausted feature work pauses in favour of reliability."),
("What is the difference between an SLO and an SLA?", "An SLA is the external promise made to a customer, usually in a contract with credits or penalties. An SLO is the internal target the team actually runs to, set stricter than the SLA so the SLA is never at risk. The SLI is the underlying measurement — for example the fraction of checks that succeeded — that both are targets for."),
("How do I calculate an error budget?", "Subtract the SLO from 100% and multiply by the window. For 99.9% over a 30-day month of 43,200 minutes: 0.1% × 43,200 = 43.2 minutes. For 99.5%: 216 minutes, or 3 hours 36 minutes. For 99%: 432 minutes, or 7 hours 12 minutes. Latency SLOs use requests or checks instead of minutes."),
("Do small teams need SLOs?", "A small team benefits more than a large one, because it has no reliability department to arbitrate the ship-or-stabilise argument. One declared target per user-visible asset, an error budget derived from it, and a one-paragraph policy about what happens when the budget is spent replaces that argument with a number."),
("What should a health score be based on?", "Error budget remaining against a declared target is the most honest basis: it is a statement about a promise and how much room is left, comparable across assets on different tiers, and explainable to a client. Blended scores that weight uptime, latency and errors by hidden coefficients answer the question \"what does 87 mean?\" with silence."),
("What availability target should a small SaaS set?", "One the architecture can actually deliver. A single-region deployment on ordinary hosting with no on-call rotation can honestly target 99.5%; 99.9% needs redundancy and a response process; 99.99% is not a small-team target. Set the SLO slightly tighter than whatever SLA you offer customers, and tighten it as the system earns it."),
],
"merik": """
    <p>Merik's health score is exactly this: each asset carries a declared SLA tier, and its health is the error budget remaining against that tier over the window — measured from the outside by the same checks a user's request would take, not from the server's opinion of itself. Confirmed failures spend budget; recovered warnings do not. The score is comparable across a client's assets on different tiers and is the number the monthly SLA report is built on.</p>
    <p>Deploys from GitHub and Vercel webhooks and provider incidents from vendor status feeds sit on the same timeline, so you can see which deploy or which dependency spent the budget — and apply an error budget policy with evidence rather than argument. See the <a href="/modules">Digital Operations module</a>.</p>
""",
"related": ["sla-reports-for-clients-agency", "application-health-monitoring", "proactive-application-reliability"],
},

]
