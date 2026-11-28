/** Product instructions only. No member, financial or account records belong here. */
export type PulseGuide = {
  id: string; title: string; audience: string; where: string; summary: string;
  steps: string[]; confirmation: string; recovery: string;
  seconds?: number; narration?: string;
};
export const guideEdition = "02 · 27 November 2026";
export const startSteps = [
  "Sign in to HBG PulseOS with your own email and password. Use Create an account if you are new.",
  "Choose Sign in. Your member home or assigned staff workspace opens. A new account does not automatically receive department access.",
  "Open Pulse OS Help whenever you need a reminder. Read any guide; work only in the sections your role permits.",
  "Before saving, check the person, service, class or file. Wait for the success message. Sign out when using a shared device.",
];
export const pulseGuides: PulseGuide[] = [
  {
    id: "worker-conduct",
    title: "Preparing to serve on Sunday",
    audience: "Workers and assigned platform team",
    where: "Pulse OS Help",
    summary: "Confirm your duty, prepare for worship and follow the service cues.",
    steps: [
      "Confirm your assignment, arrival time and supervisor before Sunday.",
      "Wear clean, modest and practical clothing suited to your duty. Ask the lead about any uniform or platform dress guidance.",
      "If assigned a platform duty, prepare your contribution, check pronunciations and agree your time and closing cue.",
      "Ask permission before sharing a testimony and take sensitive matters to the responsible lead in private.",
      "After service, hand over any open tasks and agree follow-up with your supervisor.",
    ],
    confirmation: "Your lead confirms your duty and any rehearsal or follow-up.",
    recovery: "If you expect to arrive late or cannot serve, contact the coordinator so the backup can prepare.",
  },
{
  "id": "worker-checkin",
  "title": "Worker service check-in",
  "audience": "Pastor records arrivals; workers confirm details with their leader",
  "where": "Training → Worker service check-in",
  "summary": "Record an enrolled worker’s arrival for a scheduled service in Lagos time.",
  "steps": [
    "Refresh Pulse OS, open Training and expand Worker service check-in.",
    "Choose the service and enrolled worker. If the worker list is empty, use Training administration to enrol the worker first.",
    "Enter the actual arrival time in Lagos time and an optional explanation or correction note.",
    "Choose Save worker check-in and wait for Check-in saved. Saving the same worker and service updates that entry."
  ],
  "confirmation": "Look for Check-in saved. Arrival times are recorded in Lagos time.",
  "recovery": "If saving cannot be confirmed, retain the entries and retry the same worker and service. Ask the Pastor about a missing service or worker."
},
{
  "id": "formation",
  "title": "Mentors and supervised service",
  "audience": "Pastor, assigned mentors, supervisors and enrolled learners",
  "where": "Training → Mentoring and supervised service",
  "summary": "Connect learning with a named mentor, practical assignment and pastoral review.",
  "steps": [
    "The Pastor chooses the learner, formation stage, mentor and service supervisor.",
    "Enter a practical assignment and review date, then choose Assign supervised service.",
    "The assigned mentor or supervisor opens the placement and records observed service and feedback. Write feedback suitable for the learner to read.",
    "The Pastor records a review outcome and agreed next step. Review the learner’s calling, character and practice when considering responsibility."
  ],
  "confirmation": "The saved placement, observations and reviews appear in the mentoring section.",
  "recovery": "If no learners appear, enrol them through Training administration. If records are unavailable, refresh and ask the Pastor to check the assignment."
},
{
  "id": "graduation",
  "title": "Foundation graduation and department intake",
  "audience": "Foundation teachers, Pastor, graduates and department leads",
  "where": "Training → Foundation School; Foundation School register",
  "summary": "Complete learning and review, then arrange graduation and supervised department service.",
  "steps": [
    "Follow the four Sunday lessons and record actual participation in the Foundation School register. Arrange recovery teaching for missed sessions.",
    "Complete the knowledge check and the authorised attendance and practical review.",
    "Agree the graduate list and ceremony date with the Pastor. The proposed ceremony includes Scripture, certificates, pastoral prayer and introductions to department leads.",
    "Discuss gifts, availability and a preferred department. The Pastor and receiving lead agree a supervised assignment, induction and review date.",
    "Use Mentoring and supervised service to record the placement. The proposed first review follows four services. Complete role-specific approvals before duties begin."
  ],
  "confirmation": "Check lesson and review records and the receiving department’s agreed placement. The ceremony and four-service review are proposals for pastoral confirmation.",
  "recovery": "Arrange catch-up for unfinished learning. Ask the receiving lead to confirm responsibilities before starting an assignment."
},
{
  "id": "children-training",
  "title": "Children’s Church teacher training",
  "audience": "Children’s Church teachers and supervising leaders",
  "where": "Training → Children’s Church; Departments → Children’s Church",
  "summary": "Prepare one shared Bible lesson with activities suited to different ages.",
  "steps": [
    "Open Children’s Church in Training. The revised course is a draft for pastoral review.",
    "Complete the shared teacher induction and rehearse a short lesson with the lead teacher. Follow the ministry’s approved child-protection and caregiver handover arrangements.",
    "Prepare one story, one truth, one short verse and one response. Use pictures and movement for ages 2–5, retelling for ages 6–8, and reading and discussion for ages 9–12.",
    "Use the eight-Sunday starter sequence in the lesson. Share one optional home conversation with caregivers.",
    "After the session, review what helped children learn and agree one improvement. Record supervised teacher feedback through the assigned placement."
  ],
  "confirmation": "The supervising leader confirms readiness and the next teaching assignment. Check the module’s approval status before using the revised teaching.",
  "recovery": "Ask the lead teacher for support with age adaptations or staffing. Children under two need their caregiver or an approved separately staffed arrangement."
},
  {
    id: "profile", title: "My member profile", audience: "Signed-in members and visitors", where: "My member profile",
    summary: "Submit contact details, serving interests and optional communication preferences for staff review.",
    steps: ["Open My member profile from your ministry home.", "Check your name and account email, then add optional phone and address details.", "Choose your connection with the ministry and optional serving interest; these are not appointments or permissions.", "Choose optional email preferences and save. Staff review the submission before creating or linking the directory record."],
    confirmation: "Look for Profile saved. Repeated saves update the same intake record. Staff review does not grant department access.",
    recovery: "If saving fails, retry the same profile. Ask the Pastor to reconcile an existing directory record; do not create another account.",
  },
  {
    id: "departments", title: "Ministry departments", audience: "Pastor", where: "Departments",
    summary: "Explore department responsibilities and service opportunities, including the Sanitary Department.",
    steps: ["Open Departments in the Pastor workspace.", "Read each department’s responsibilities and who can serve.", "Open ministry training to manage teaching through its existing access rules."],
    confirmation: "Department descriptions appear in the directory. Viewing a department does not appoint a leader or grant staff access.",
    recovery: "If the directory cannot load, refresh or check the public Departments page. Ask the Pastor about service assignments.",
  },
  {
    id: "memberhome", title: "Your ministry home", audience: "Signed-in members and workers without a staff workspace", where: "Sign in → Home",
    summary: "Start with guidance, available training, your own partnerships or opportunities to serve.",
    steps: ["Choose Learn PulseOS for guides and short videos.", "Choose My training for lessons available through your enrolment and access.", "Choose My partnerships to manage only your own commitments.", "Choose Find a place to serve to explore the public department directory."],
    confirmation: "Staff tools remain restricted until an authorised assignment. Opening the home page does not grant department permissions.",
    recovery: "If staff access cannot be checked, refresh. Ask the Pastor about assignments or training enrolment; do not use another person’s account.",
  },
  {
    id: "treasury", title: "Treasury", audience: "Pastor and Treasury Leader", where: "Treasury → Record a collection",
    summary: "Record a collection, obtain independent confirmation and track a bank deposit.",
    steps: [
      "Choose the correct service before entering the collection.",
      "Choose Giving category, Payment method and Currency, then enter Amount. Select a giver when that category requires one.",
      "For cash, enter two distinct cash counters. For other payment methods, complete Verified by.",
      "Choose Record collection. The other authorized reviewer uses Awaiting independent confirmation → Confirm collection after checking it.",
      "For a bank deposit, open Cash sent to the bank. Choose the service, currency, cash deposited and bank reference, then Record bank deposit. The other reviewer verifies it against the bank record.",
      "Read Recent monthly totals carefully: pending amounts and confirmed amounts are separate.",
    ],
    confirmation: "A saved collection can still be pending. Look for the saved entry and its independent confirmation; do not treat pending money as reconciled.",
    recovery: "If the save is unverified, keep the page open and retry the same collection. Check the saved list before creating another entry. Ask the authorized reviewer about corrections.",
    seconds: 75,
    narration: "Open Treasury and choose the correct service. Select the category, payment method and currency, then enter the amount. Choose a giver when required. Cash needs two distinct counters. Select Record collection and wait for confirmation. The other authorized reviewer checks the entry and confirms it. Pending and confirmed totals are different. Record a bank deposit separately and have the other reviewer verify it against the bank record. If a save is unverified, retry the same details instead of creating another collection.",
  },
  {
    id: "media", title: "Media", audience: "Media team; Pastor reviews", where: "Media → Private Media Vault",
    summary: "Save media, prepare a caption and submit it for review.",
    steps: [
      "Open Private Media Vault and choose an image, audio recording or video.",
      "Select Upload file and wait until the file is saved. Files over 50 MB use the shared Google Drive folder and the Large videos link form instead.",
      "Open Caption and review for the saved file. Enter Caption draft and choose Save draft.",
      "Enter Title, Intended use and Context for the Pastor, then choose Submit for Pastor review.",
      "The Pastor reviews the saved caption and intended use. Approval and public publication are separate actions.",
    ],
    confirmation: "The file appears in the vault or Large videos list. Caption and review details show the saved state. Uploading alone does not mean it is approved or published.",
    recovery: "If an upload pauses, select the same file to retry. Check the file list first. Ask your leader if the file or shared folder cannot be accessed.",
    seconds: 60,
    narration: "Open Private Media Vault. Choose your file and select Upload file. Wait until it appears in the saved list. For a video over fifty megabytes, use the shared Google Drive folder and add its link under Large videos. Open Caption and review. Save the caption draft, add a title and intended use, and submit for Pastor review. A saved upload is private; approval does not automatically publish it. If an upload pauses, retry the same file and check the list before starting again.",
  },
  {
    id: "school", title: "Foundation School", audience: "Assigned teachers; Pastor manages classes", where: "Foundation School → Class → Sunday",
    summary: "Open the assigned class and record each student’s attendance.",
    steps: [
      "Choose the assigned Class. Check its title and start date.",
      "Choose the correct Sunday using the Week selector shown in the register.",
      "For each student, choose Present or Absent. Each choice saves that student’s mark.",
      "Check the saved message and visible mark before moving to the next student or week.",
      "Class creation, teacher assignment, enrolment and graduation are managed in the Pastor’s School administration section.",
    ],
    confirmation: "Look for Saved attendance for the student and the correct Present or Absent mark. Unmarked is different from Absent.",
    recovery: "No classes or missing students usually needs an assignment or enrolment check. Ask the Pastor to check the register; do not create a replacement student record.",
    seconds: 40,
    narration: "Open Foundation School. Choose your assigned class and check the start date. Select the correct Sunday or week. For each student, select Present or Absent. The mark saves when you press the button, so check the saved message before continuing. Unmarked is not the same as absent. If your class or a student is missing, ask the Pastor to check the class assignment or enrolment.",
  },
  {
    id: "evangelism", title: "Evangelism", audience: "Outreach workers and Pastor", where: "Evangelism → Record an outreach visit",
    summary: "Record the visit and arrange any agreed follow-up.",
    steps: [
      "Enter Date, Where you went and People you spoke with, including unnamed visitors.",
      "Choose Add a person only for people whose details you need to record. Confirm their agreement before storing contact details for follow-up.",
      "If another conversation is agreed, choose the follow-up date and worker.",
      "Choose Save visit and wait for Visit saved.",
      "Open the follow-up board or Follow-up list to record what happened and the next step.",
    ],
    confirmation: "The visit appears under Recent visits, and the assigned follow-up appears to the authorized worker and Pastor.",
    recovery: "If no worker is available, ask the Pastor to register the intended worker. Check existing visits before retrying an unverified save.",
    seconds: 55,
    narration: "Open Evangelism and record the date, location and number of people reached. Use Add a person when details need to be recorded. Confirm their agreement before keeping contact details for follow-up. Choose a worker and next contact date when another conversation is agreed. Select Save visit and wait for Visit saved. Continue from the follow-up list or board. If no worker is listed, ask the Pastor to check the worker assignment.",
  },
  {
    id: "followup", title: "Visitor & ministry follow-up", audience: "Assigned outreach workers and Pastor", where: "Follow-up → Add a follow-up",
    summary: "Keep the next conversation, responsible worker and outcome clear.",
    steps: [
      "For a new request, enter Full name, choose the Reason and Next contact date, and confirm contact permission.",
      "The Pastor can choose a worker or leave the request Unassigned. Workers create requests assigned to themselves.",
      "Choose Add follow-up. Find it under Overdue, Due today or Upcoming; use Find a person, Source or Assignment to narrow the list.",
      "Open Record a contact or handoff. Choose What happened?, write a short factual note and set the next date when needed.",
      "For a handoff, choose another registered worker. For completion or no further contact, choose the matching outcome. Select Save follow-up.",
      "Use View follow-up history to read the saved outcome. Closed requests remain closed.",
    ],
    confirmation: "Check the updated lane, next date or closed label, then read the saved history. After handoff, the previous worker loses access.",
    recovery: "If saving is unverified, retry the same details or refresh to inspect the record. Do not create a second request just because a response was slow.",
    seconds: 65,
    narration: "Open Follow-up. Add the name, reason and next contact date, then confirm permission. The Pastor may assign a worker or leave the request unassigned. Save it and find it in the board. Open Record a contact or handoff, choose the outcome and add a brief factual note. Set the next date for an open request. For a handoff, select the next registered worker. Save and check the history. Completed requests and requests for no further contact stay closed.",
  },
  {
    id: "intake", title: "People intake", audience: "Attendance and people-intake team; Pastor", where: "Member or first-time visitor form",
    summary: "Record a person accurately without confusing intake with follow-up.",
    steps: [
      "Open Member or first-time visitor in the assigned attendance/intake workspace, or People in the Pastor workspace.",
      "Enter Full name. Add available phone, address, social contact and first-visit date only when appropriate to record.",
      "Tick Interested in Foundation School if the person requested it.",
      "Choose Save person and wait for Person recorded.",
      "A saved person is not automatically a school enrolment or a follow-up request. Ask the appropriate leader to arrange those next steps.",
    ],
    confirmation: "Person recorded confirms this form saved. The Pastor can check the Member directory and search by name.",
    recovery: "For an uncertain save, check whether the person already exists before adding another record. Report corrections to the responsible leader.",
    seconds: 45,
    narration: "Open Member or first-time visitor. Enter the person’s full name and the available contact details that are appropriate to record. Add the first-visit date if known. Tick Interested in Foundation School only if requested. Choose Save person and wait for Person recorded. This records the person; it does not automatically enrol them in a class or create a follow-up. Ask the appropriate leader to arrange those next steps.",
  },
  {
    id: "attendance", title: "Service attendance", audience: "Attendance team; authorized service leads", where: "Attendance → Service attendance",
    summary: "Save one headcount for the correct service.",
    steps: [
      "Select the correct service and check its date and start time.",
      "Enter the counts for men, women and children. These make the total attendance.",
      "Enter first-timers as a count already included within that total; do not add them again.",
      "Save and check the Saved message with the service date, time and number of attendees.",
    ],
    confirmation: "The saved report matches the chosen service. A different report already saved for that service needs an authorized correction.",
    recovery: "If the service is missing, ask someone with scheduling access to check the calendar. If saving is unverified, keep the counts and retry the same report.",
    seconds: 35,
    narration: "Open Service attendance and select the right service. Check the date and start time. Enter men, women and children. First-timers are already included in those numbers, so do not add them again. Save once, then check the date, time and attendee total in the confirmation. If a different report already exists, ask the service lead to review it.",
  },
  {
    id: "training", title: "Training library", audience: "Enrolled learners, assigned reviewers and editors", where: "Training → Choose your training",
    summary: "Read assigned teaching, practise and check learning progress.",
    steps: ["Open Training and choose the module or department.", "Read the published lessons and use Previous lesson or Next lesson to navigate.", "Use Mark this lesson read where available. Complete the practice, checklist and quiz provided in the module.", "Review your progress and any assigned reviewer’s feedback. Editors and the Pastor have separate review and publishing controls."],
    confirmation: "Check the saved learning progress. Reading a lesson is not a replacement for attendance or an approved completion decision.",
    recovery: "No published curriculum or an enrolment message needs a leader’s review. Pulse OS Help remains available for app instructions without course enrolment.",
    seconds: 45,
    narration: "Open Training and choose your assigned module. Read the published lesson, then use Mark this lesson read where it is available. Move between lessons and complete the practice, checklist and quiz. Check your saved progress and reviewer feedback. If your enrolment or published teaching is missing, ask your leader. For help using the app itself, return to Pulse OS Help.",
  },
  {
    id: "overview", title: "Overview", audience: "Pastor", where: "Overview → Needs attention",
    summary: "See visible work needing attention and open the responsible workspace.",
    steps: ["Read the Needs attention queue.", "Open the relevant card to inspect the actual collection, deposit, media item, outreach follow-up or school request.", "Use Refresh counts after completing work. Staff access shows recorded sign-ins, not who is currently online."],
    confirmation: "Verify the underlying record, not just the dashboard count.", recovery: "If a count or list cannot load, refresh and check the relevant department. A blank or unavailable count is not proof that no work exists.",
  },
  {
    id: "live", title: "Live Church", audience: "Pastor / authorized administrators", where: "Live Church → Live Church meetings",
    summary: "Manage meeting availability and the official joining invitation.",
    steps: ["Choose the correct meeting program.", "Check its official invitation and Meeting status.", "Save the meeting and verify the intended joining experience. Active means joining is open; it does not detect whether Zoom is running."],
    confirmation: "Meeting saved confirms the change. Only Sunday service is connected to the public Live Church page.", recovery: "If saving fails, check access and the complete official invitation. Keep restricted meetings restricted and never include meeting credentials in help materials.",
  },
  {
    id: "events", title: "Events", audience: "Pastor / authorized event editors", where: "Events",
    summary: "Review service and program listings.",
    steps: ["Review the existing calendar before adding another event.", "Open the event controls available to your account. Check the title, date, time, location and recurrence where provided.", "Save the intended change, then check the calendar or public program listing as appropriate."],
    confirmation: "The intended listing appears with the correct date and time.", recovery: "If a recurring or duplicate event looks wrong, report the specific listing to the administrator before creating a replacement.",
  },
  {
    id: "inquiries", title: "Intake Inbox", audience: "Pastor / authorized inbox reviewers", where: "Intake Inbox",
    summary: "Review submitted forms and update their review status.",
    steps: ["Choose the relevant category, such as First-Timer Card or General Inquiry.", "Read the submission within your authorized access.", "Choose pending, reviewed or contacted only when it accurately reflects the action taken.", "Refresh to check that the status persisted. The current inbox can update the display before the server confirms the save."],
    confirmation: "Check the saved status after refresh. A status change alone does not send a reply, create a member or assign a follow-up.", recovery: "If the status reverts or the submission is missing, check the connection and report it. Do not assume the person received a reply.",
  },
  {
    id: "dailyword", title: "Daily Word", audience: "Pastor / authorized content editors", where: "Daily Word",
    summary: "Prepare dated devotional content for review and publication.",
    steps: ["Review existing entries and their publish dates.", "Use the editing controls your role permits to prepare the title, scripture, devotional and media references.", "Check the date and content before saving or publishing. Public publication needs the appropriate approval.", "Verify the dated entry on the public page after it is intended to appear."],
    confirmation: "A saved draft is separate from a public entry. Verify the publication state and intended date.", recovery: "If the entry is absent, check its saved state, publication date and access. Ask the editor before creating a duplicate.",
  },
  {
    id: "prayerwall", title: "Prayer Wall", audience: "Pastor / authorized reviewers", where: "Prayer Wall",
    summary: "Review prayer submissions within the access and controls provided.",
    steps: ["Open the review list and check the submission’s current status.", "Use only the review actions available to your account and approved for your role.", "Confirm the saved status before treating a submission as reviewed or public."],
    confirmation: "Check the status after saving and reloading. Availability depends on the configured feature and your permissions.", recovery: "If the section is unavailable, ask the administrator. Do not move private submission text into a general tutorial or demonstration.",
  },
];

export function videoSourcePack(): string {
  const intro = [
    "HBG PULSE OS — APP TUTORIAL SOURCE PACK", `Guide edition ${guideEdition}`,
    "Purpose: teach current app navigation, one task per short clip. This is product help, not ministry curriculum.",
    "Production brief: calm minimal design; white and deep purple, clear captions, slow pointer movements. Use fictional demonstration records only. Do not show credentials, real names, contact details, private requests or financial records.",
    "Create a separate 35–75 second clip for each scripted role below. Keep actual button labels. Do not invent menus or imply broader permissions. Use the sign-in overview as the common introduction. End every clip by checking the save confirmation.",
    "Reading a guide does not grant access. Real work stays inside each person’s assigned role.",
    "Do not present scripts as finished videos. No videos have been exported in this pack.",
    "START HERE", ...startSteps.map((step, index) => `${index + 1}. ${step}`),
  ];
  return [...intro, ...pulseGuides.flatMap(guide => [
    "", `## ${guide.title}`, `Audience: ${guide.audience}`, `Start: ${guide.where}`, guide.summary,
    ...guide.steps.map((step, index) => `${index + 1}. ${step}`),
    `Check: ${guide.confirmation}`, `If something goes wrong: ${guide.recovery}`,
    ...(guide.narration ? [`Target length: ${guide.seconds} seconds`, "Narration:", guide.narration,
      "Storyboard: 0–5s title and task; 5–15s open workspace; middle show the listed steps; final 10s show the saved result and one recovery tip."] : []),
  ])].join("\n\n");
}
