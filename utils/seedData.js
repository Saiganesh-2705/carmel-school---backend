const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Notice = require('../models/Notice');

const PASSWORD = process.env.SEED_PASSWORD || 'Password123';
const DEMO = [
  ['Super Admin', 'superadmin@school.test', 'super_admin'], ['Principal Meena', 'admin@school.test', 'admin'],
  ['Teacher Arun', 'teacher@school.test', 'teacher'], ['Student Priya', 'student@school.test', 'student'],
  ['Parent Kumar', 'parent@school.test', 'parent'], ['Accountant Ravi', 'accountant@school.test', 'accountant'],
  ['Librarian Latha', 'librarian@school.test', 'librarian'],
];

// resetPasswords=true makes sure the demo accounts can always log in with the demo password.
async function seedDemo({ resetPasswords = false } = {}) {
  for (const [name, email, role] of DEMO) {
    const existing = await User.findOne({ email }).select('+password');
    if (!existing) await User.create({ name, email, role, password: PASSWORD });
    else if (resetPasswords) { existing.password = PASSWORD; existing.isActive = true; existing.role = role; await existing.save(); }
  }
  await AcademicYear.updateOne({ name: '2026-2027' }, { $setOnInsert: { startDate: new Date('2026-06-01'), endDate: new Date('2027-04-30'), isCurrent: true } }, { upsert: true });
  if ((await Notice.countDocuments()) === 0) {
    await Notice.create([
      { title: 'Welcome to the Carmel portal', body: 'Teachers, students, parents and staff can now sign in to the school portal. Please keep your password private.', audience: 'both', pinned: true },
      { title: 'Admissions open', body: 'Admissions are open for the coming academic year. Please contact the school office or send an enquiry from the Contact page.', audience: 'public' },
      { title: 'Staff meeting on Friday', body: 'All teachers are requested to attend the staff meeting after school on Friday.', audience: 'portal' },
    ]);
  }
}
module.exports = { seedDemo, PASSWORD, DEMO };
