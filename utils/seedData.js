const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Notice = require('../models/Notice');

const PASSWORD = process.env.SEED_PASSWORD || 'Password123';
const DEMO = [['Principal Meena', 'admin@school.test', 'admin']];

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
      { title: 'Admissions open', body: 'Admissions are open for the coming academic year. Please contact the school office or send an enquiry from the Contact page.', audience: 'public' },
    ]);
  }
}
module.exports = { seedDemo, PASSWORD, DEMO };

// One-time clean-up for databases created when the portal had many roles.
// The old Super Admin becomes an Admin. Every other old account (teacher, student, parent...) is switched OFF, not deleted,
// so nobody can sign in with it and the Admin can delete them from "Admin accounts".
async function migrateToAdminOnly() {
  await User.collection.updateMany({ role: 'super_admin' }, { $set: { role: 'admin' } });
  const r = await User.collection.updateMany({ role: { $ne: 'admin' } }, { $set: { role: 'admin', isActive: false } });
  // Remove the old sample notices that mentioned teachers, students and parents (only if they are still unchanged).
  const Notice = require('../models/Notice');
  await Notice.deleteMany({ $or: [
    { title: 'Welcome to the Carmel portal', body: 'Teachers, students, parents and staff can now sign in to the school portal. Please keep your password private.' },
    { title: 'Staff meeting on Friday', body: 'All teachers are requested to attend the staff meeting after school on Friday.' },
  ] });
  if (r.modifiedCount) console.log(`Portal is now admin-only: ${r.modifiedCount} old non-admin account(s) were disabled.`);
}
module.exports.migrateToAdminOnly = migrateToAdminOnly;
