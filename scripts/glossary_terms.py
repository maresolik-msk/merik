"""Glossary content: Indian payroll and workforce terms.

These entries exist to be the best short answer to "what is X" — for a person
skimming and for an answer engine looking for something quotable. So `short`
must stand alone if lifted out of context, and must not begin with a hedge.

Statutory specifics (PF rates, gratuity constants, tax slabs, leave minimums)
are deliberately NOT stated as settled fact anywhere here. They vary by state,
by establishment and over time, and a glossary that gets them wrong is worse
than one that says "confirm the current position". Concepts are permanent;
rates are not.

Fields: term · slug · short (<=40 words, quotable) · body (HTML <p>) ·
example (HTML, arithmetic must be internally correct) · related (slugs) ·
post (an existing blog slug, or "") · cat
"""

TERMS = [
# ------------------------------------------------------------------ earnings
{
"term": "CTC (Cost to Company)", "slug": "ctc", "cat": "Pay",
"short": "CTC is the total annual cost an employer bears for an employee — every earning component plus the employer's own contributions and benefits. It is not the amount that reaches the employee's bank account.",
"body": """<p>CTC bundles three different things that people often conflate: what you are paid directly (basic, allowances), what your employer pays on your behalf (its share of statutory contributions, insurance premiums), and anything paid occasionally (bonus, variable pay). Only the first category flows through your monthly payslip, and even that is reduced by your own deductions.</p>
<p>This is why a candidate offered a higher CTC can end up with lower take-home than at their previous job — the increase may sit entirely in employer contributions or a variable component that pays out annually. When comparing offers, compare monthly net pay and the fixed portion, not the headline number.</p>""",
"example": """<p><b>Illustrative only.</b> A ₹9,00,000 CTC might break down as ₹7,20,000 of fixed annual earnings (basic + allowances), ₹1,00,000 of employer statutory contributions, and ₹80,000 of annual variable pay. The monthly gross from that is ₹60,000 — not ₹75,000 — and net pay is lower again after the employee's own deductions.</p>""",
"related": ["gross-salary", "net-salary", "basic-salary"], "post": "ctc-vs-in-hand-salary-payslip",
},
{
"term": "Gross salary", "slug": "gross-salary", "cat": "Pay",
"short": "Gross salary is the total of all earnings components for a pay period — basic, allowances, overtime, incentives and arrears — before any deduction is applied.",
"body": """<p>Gross is the subtotal on a payslip where the earnings block ends. It is the figure most internal calculations key off, and the one an employee should be able to reach by adding up the earnings lines themselves. Several statutory contributions, though, are computed on basic rather than on gross.</p>
<p>Gross differs from CTC because it excludes employer-side costs, and differs from net because deductions have not yet been taken. If a payslip does not let you add the earnings lines and arrive at the printed gross, the payslip format is incomplete.</p>""",
"example": """<p><b>Illustrative only.</b> Basic ₹30,000 + HRA ₹15,000 + conveyance ₹2,000 + special allowance ₹13,000 = <b>gross ₹60,000</b> for the month.</p>""",
"related": ["ctc", "net-salary", "basic-salary"], "post": "payslip-format-what-to-include",
},
{
"term": "Net salary (in-hand)", "slug": "net-salary", "cat": "Pay",
"short": "Net salary, or in-hand pay, is what actually reaches the employee's bank account: gross salary minus every deduction, including provident fund, professional tax, income tax and any loan recovery.",
"body": """<p>Net is the only figure on a payslip an employee can verify against their bank statement, which is why it is the number that generates questions when it changes. Most unexplained variation traces to one of three things: fewer payable days in the month, loss-of-pay days, or a change in a deduction.</p>
<p>Printing payable days alongside net pay answers most of those questions before anyone asks them.</p>""",
"example": """<p><b>Illustrative only.</b> Gross ₹60,000 − provident fund ₹1,800 − professional tax ₹200 − income tax ₹2,500 = <b>net ₹55,500</b>.</p>""",
"related": ["gross-salary", "ctc", "loss-of-pay"], "post": "ctc-vs-in-hand-salary-payslip",
},
{
"term": "Basic salary", "slug": "basic-salary", "cat": "Pay",
"short": "Basic salary is the fixed core of a salary structure, before allowances. It is the reference figure most statutory contributions and benefit calculations are computed from.",
"body": """<p>Because so much keys off basic — provident fund, gratuity, often leave encashment — its proportion of the total is a structural decision, not a cosmetic one. Raising basic raises both employer cost and the employee's own contribution, which lowers immediate take-home while increasing retirement savings.</p>
<p>The exact percentages and any statutory floor depend on the rules applicable to your establishment and can change; confirm the current position rather than copying a number from an old template.</p>""",
"example": """<p><b>Illustrative only.</b> If basic is 50% of a ₹60,000 monthly gross, basic is ₹30,000, and the components that key off basic are all calculated from that ₹30,000 rather than from the full gross.</p>""",
"related": ["ctc", "gross-salary", "provident-fund"], "post": "salary-hike-revision-cycle",
},
{
"term": "HRA (House Rent Allowance)", "slug": "hra", "cat": "Pay",
"short": "HRA is an allowance paid towards rented accommodation. It is a normal earnings line on the payslip, and may attract partial tax exemption for employees who actually pay rent, subject to the conditions in force.",
"body": """<p>HRA is usually set as a percentage of basic salary, which is why changing basic changes HRA automatically in most structures.</p>
<p>The exemption an employee can claim depends on rent actually paid, the city of residence, and the rules in force for that year — it is not automatic and it is not the full HRA amount. Employees should confirm their own position with a qualified adviser rather than assuming.</p>""",
"example": """<p><b>Illustrative only.</b> With basic ₹30,000 and HRA set at 50% of basic, the monthly HRA line is ₹15,000. What portion of that is exempt from tax is a separate calculation based on rent actually paid.</p>""",
"related": ["basic-salary", "gross-salary"], "post": "",
},
{
"term": "Loss of Pay (LOP)", "slug": "loss-of-pay", "cat": "Pay",
"short": "Loss of pay is the salary reduction for days an employee neither worked nor had approved paid leave for. It is calculated as per-day pay multiplied by the number of unpaid days.",
"body": """<p>The formula is simple; the argument is always about the divisor used to get per-day pay. The three conventions are calendar days in the month, a fixed 30 days, or the month's actual working days — and they can differ by around 20% for the same absence.</p>
<p>None is uniquely correct. What matters is choosing one, writing it into policy, and applying it to every employee in every month. Most LOP disputes are not about arithmetic at all — they are about whether a day should have been unpaid in the first place.</p>""",
"example": """<p><b>Illustrative only.</b> ₹60,000 monthly gross, 2 unpaid days, in a 31-day month with 26 working days: dividing by 31 calendar days gives ₹1,935.48/day and ₹3,870.97 of LOP; dividing by a fixed 30 gives ₹2,000/day and ₹4,000; dividing by 26 working days gives ₹2,307.69/day and ₹4,615.38 — a spread of about 19% on the same absence.</p>""",
"related": ["net-salary", "half-day", "attendance-regularisation"], "post": "loss-of-pay-calculation-explained",
},
{
"term": "Arrears", "slug": "arrears", "cat": "Pay",
"short": "Arrears are amounts owed for an earlier period and paid in a later one — most commonly the difference created when a salary revision takes effect before the month it is first processed.",
"body": """<p>Arrears must appear as a separate, clearly labelled payslip line stating the period they cover. Folded into the month's earnings, they make it look as though the new monthly salary is far higher than it is, and the following month reads as a pay cut.</p>
<p>Arrears are computed on the difference between the new and old monthly figures for each affected month, adjusted for any loss-of-pay days in those months.</p>""",
"example": """<p><b>Illustrative only.</b> A revision effective 1 April, first paid in July: new gross ₹66,000 − old gross ₹60,000 = ₹6,000 × 3 months (Apr–Jun) = <b>₹18,000 of arrears</b>, shown as its own line labelled with the period.</p>""",
"related": ["loss-of-pay", "gross-salary"], "post": "salary-hike-revision-cycle",
},
{
"term": "Provident Fund (PF)", "slug": "provident-fund", "cat": "Pay",
"short": "Provident fund is a statutory retirement savings scheme in which both employee and employer contribute a percentage of wages to an account held in the employee's name.",
"body": """<p>The employee's share is deducted from the payslip; the employer's share is an additional cost that usually sits inside CTC without ever appearing as take-home. Showing both separately on the payslip helps employees understand the gap between CTC and net pay.</p>
<p>Applicability thresholds, the contribution percentages, and the wage ceiling they apply to are set by regulation and change over time. Confirm the current position for your establishment rather than relying on a figure from a template or an article.</p>""",
"example": """<p><b>Illustrative only.</b> If the employee contributes ₹1,800 and the employer contributes ₹1,800, the payslip shows ₹1,800 as a deduction, while the employer's ₹1,800 is part of CTC but never part of net pay.</p>""",
"related": ["ctc", "net-salary", "basic-salary"], "post": "payroll-compliance-checklist-india-small-business",
},
{
"term": "Professional tax", "slug": "professional-tax", "cat": "Pay",
"short": "Professional tax is a tax on employment levied by some Indian state governments and deducted by the employer from salary. Whether it applies, and how much, depends entirely on the state.",
"body": """<p>Because it is a state levy, an employer with staff in several states may deduct different amounts, or none, depending on where each person is employed. It is a small figure that causes disproportionate confusion when it appears or disappears without explanation.</p>
<p>Rates, slabs and filing obligations are set by each state and change; confirm the current requirement for every state you employ in.</p>""",
"example": """<p><b>Illustrative only.</b> Two employees on identical salaries but based in different states may show different professional tax deductions on their payslips — or one may show none at all.</p>""",
"related": ["net-salary", "provident-fund"], "post": "payroll-compliance-checklist-india-small-business",
},
{
"term": "Payslip", "slug": "payslip", "cat": "Pay",
"short": "A payslip is the statement issued each pay period showing how an employee's pay was calculated: identification and attendance basis, every earnings component, every deduction, and the resulting net pay.",
"body": """<p>The test of a payslip is arithmetic closure — gross minus total deductions equals net, and each of those equals the sum of its own printed lines. If any figure has to be taken on faith, it will generate a query.</p>
<p>The most commonly omitted and most useful fields are the attendance ones: payable days, days paid, and loss-of-pay days. Without them, no change in salary can be explained by the employee themselves.</p>""",
"example": """<p><b>Illustrative only.</b> A complete payslip lets an employee add the earnings lines to ₹60,000, subtract the deduction lines totalling ₹4,500, and arrive at the ₹55,500 that appears in their bank account.</p>""",
"related": ["gross-salary", "net-salary", "loss-of-pay"], "post": "payslip-format-what-to-include",
},
# --------------------------------------------------------------------- time
{
"term": "Attendance regularisation", "slug": "attendance-regularisation", "cat": "Time",
"short": "Attendance regularisation is correcting a missing or wrong attendance record through a request that a manager approves, rather than by directly editing the register.",
"body": """<p>The distinction matters at payroll time. An approved correction has a requester, an approver, a reason and a timestamp, so a disputed day can be reconstructed months later. A direct edit overwrites the original value and leaves nothing to point at.</p>
<p>Missed punches are normal operational noise, not misconduct. The healthy design is a fast, boring, traceable route back to correct — with a deadline, and a rule for what happens to corrections raised after the payroll cut-off.</p>""",
"example": """<p><b>Illustrative only.</b> An employee who forgot to check out on the 12th raises a correction stating the actual exit time and the reason; the manager approves it; the original entry is retained alongside the correction, and the monthly summary recalculates.</p>""",
"related": ["half-day", "late-mark", "loss-of-pay"], "post": "attendance-regularisation-corrections",
},
{
"term": "Half-day", "slug": "half-day", "cat": "Time",
"short": "A half-day is an attendance status for a day on which an employee worked less than a defined threshold — commonly under four hours of an eight-hour day — and is usually counted as half a paid day.",
"body": """<p>The threshold must be a duration, not a judgement, or the status will be applied inconsistently and disputed. Four hours out of eight is the common split.</p>
<p>Many policies also convert repeated late marks into a half-day. That is reasonable provided the conversion rule is written down, bounded, and applied to everyone including managers.</p>""",
"example": """<p><b>Illustrative only.</b> An employee who checks in at 09:30 and leaves at 12:45 has worked under four hours and is recorded as a half-day, counting as 0.5 of a paid day in the month's payable-days total.</p>""",
"related": ["late-mark", "loss-of-pay", "attendance-regularisation"], "post": "calculating-late-marks-half-days-fairly",
},
{
"term": "Late mark", "slug": "late-mark", "cat": "Time",
"short": "A late mark is recorded when an employee checks in after the shift start time plus the grace period. It is typically a paid day, tracked so that a pattern becomes visible.",
"body": """<p>A grace window of ten to twenty minutes reflects genuine commute variance. A late mark with no defined consequence gets ignored; a per-minute deduction is experienced as punitive. The common middle ground converts a set number of late marks in a month into one half-day.</p>
<p>Whatever the rule, state whether late marks reset each month — an unstated carry-forward is where arguments start.</p>""",
"example": """<p><b>Illustrative only.</b> Shift starts 09:30 with a 15-minute grace period. A 09:44 check-in is on time; 09:46 is a late mark. Under a three-strikes rule, the third late mark in the month becomes one half-day.</p>""",
"related": ["half-day", "attendance-regularisation"], "post": "calculating-late-marks-half-days-fairly",
},
{
"term": "Earned leave (privilege leave)", "slug": "earned-leave", "cat": "Time",
"short": "Earned leave, also called privilege leave, is paid leave that accrues with service. It is normally the only leave type that carries forward between years and the only one that is encashed.",
"body": """<p>Because it accrues and persists, earned leave is where the financial liability sits. Three settings control it: the accrual rate, a carry-forward cap, and an overall accumulation ceiling. Omit the cap and the ceiling and balances compound year on year into a bill nobody budgeted for.</p>
<p>Entitlements, accumulation limits and treatment at exit are governed by the legislation applicable to your establishment and vary by state. Confirm the position that applies to you.</p>""",
"example": """<p><b>Illustrative only.</b> An employee accruing 1.5 days a month earns 18 days a year. Taking 10 leaves 8 to carry forward — repeated for five years without a cap, that is a 40-day balance for one person.</p>""",
"related": ["casual-leave", "sick-leave", "leave-encashment"], "post": "leave-encashment-carry-forward",
},
{
"term": "Casual leave", "slug": "casual-leave", "cat": "Time",
"short": "Casual leave is short-notice paid leave for personal reasons — a few days at a time, usually taken without advance planning. It typically lapses at year-end rather than carrying forward.",
"body": """<p>Casual leave exists to absorb the unplanned: a family commitment, an appointment, a day that simply has to be taken. Most policies limit how many consecutive days can be taken as casual leave, which is what distinguishes it from planned earned leave.</p>
<p>Keeping it separate from sick leave matters, because merging them tends to push genuinely unwell people into working while ill.</p>""",
"example": """<p><b>Illustrative only.</b> An employee taking one day for a family function uses casual leave; a week-long planned holiday would normally come out of earned leave instead.</p>""",
"related": ["sick-leave", "earned-leave"], "post": "sick-leave-vs-casual-leave",
},
{
"term": "Sick leave", "slug": "sick-leave", "cat": "Time",
"short": "Sick leave is paid leave for illness or medical reasons. It is normally granted at short notice, often requires documentation beyond a set number of consecutive days, and usually lapses annually.",
"body": """<p>Sick leave should not require advance approval — that is the point of it. What a policy can reasonably require is same-day notification to the reporting manager, and a medical certificate beyond a stated number of consecutive days.</p>
<p>Letting sick leave accumulate tends to encourage hoarding rather than health, which is why most policies let it lapse and keep earned leave as the accruing type.</p>""",
"example": """<p><b>Illustrative only.</b> A policy might grant sick leave with same-day notification required, and a medical certificate for absences of three or more consecutive days.</p>""",
"related": ["casual-leave", "earned-leave"], "post": "sick-leave-vs-casual-leave",
},
{
"term": "Leave encashment", "slug": "leave-encashment", "cat": "Time",
"short": "Leave encashment is paying an employee money for unused leave instead of time off. It normally applies to accumulated earned leave, and is commonly calculated on basic salary rather than gross.",
"body": """<p>Two policy decisions determine the cost: which base is used (basic, or basic plus dearness allowance, or gross), and which divisor converts it to a per-day figure. Using gross rather than basic roughly doubles the bill in a typical structure, so the base must be stated explicitly.</p>
<p>Encashment during employment is generally taxable as salary income; encashment at retirement or resignation is subject to specific exemption provisions that differ between government and non-government employees. Confirm your own position with a qualified tax adviser.</p>""",
"example": """<p><b>Illustrative only.</b> Basic ₹30,000, divisor 30, 12 days encashed: (30,000 ÷ 30) × 12 = <b>₹12,000</b>. Using gross of ₹60,000 as the base instead would give ₹24,000 for the same 12 days.</p>""",
"related": ["earned-leave", "full-and-final-settlement"], "post": "leave-encashment-carry-forward",
},
{
"term": "Comp off (compensatory off)", "slug": "comp-off", "cat": "Time",
"short": "A compensatory off is a day of leave granted in exchange for working on a holiday or weekly off. Whether it may substitute for overtime pay depends on the legislation applicable to the establishment.",
"body": """<p>Comp off works only when it has an expiry and a record. Without an expiry, unused comp offs accumulate indefinitely and become an untracked liability; without a record, employees and managers disagree about how many are owed.</p>
<p>Whether comp off is a permissible substitute for overtime pay depends on the legislation applicable to your establishment. Confirm before adopting it as standard practice.</p>""",
"example": """<p><b>Illustrative only.</b> An employee who works a Sunday to meet a deadline is granted one comp off, to be taken within 30 days, recorded against that specific worked date.</p>""",
"related": ["earned-leave", "half-day"], "post": "",
},
{
"term": "Notice period", "slug": "notice-period", "cat": "Time",
"short": "The notice period is the time between an employee resigning (or being given notice) and their last working day, as set out in the employment contract.",
"body": """<p>Notice serves handover, not punishment. The practical questions a policy must answer are whether leave can be taken during notice, whether notice can be bought out and at what rate, and what happens to accrued leave at the end of it.</p>
<p>Enforceability of buyout and recovery clauses depends on the contract and applicable law. Take professional advice rather than assuming a clause is enforceable because it is written down.</p>""",
"example": """<p><b>Illustrative only.</b> An employee on a 30-day notice period resigning on 1 August has a last working day of 30 August, with asset return and full and final settlement keyed to that date.</p>""",
"related": ["full-and-final-settlement", "leave-encashment"], "post": "",
},
{
"term": "Full and final settlement", "slug": "full-and-final-settlement", "cat": "Time",
"short": "Full and final settlement is the closing calculation when an employee leaves: final salary for days worked, plus anything owed such as unused leave, minus anything recoverable, paid as one settlement.",
"body": """<p>It is the moment several loose ends land at once — unavailed earned leave, notice-period adjustments, outstanding advances, and company assets still held. Tying asset return to the settlement is what makes asset return actually happen, because both parties need something from each other.</p>
<p>What must be paid out at separation, and by when, is governed by the legislation applicable to your establishment. Confirm the requirement rather than relying on custom.</p>""",
"example": """<p><b>Illustrative only.</b> A settlement might combine 18 days of final-month salary, encashment of 9 unused earned leave days, minus an outstanding advance — netted into a single payment with each line itemised.</p>""",
"related": ["notice-period", "leave-encashment", "arrears"], "post": "employee-exit-full-and-final-settlement",
},
]
