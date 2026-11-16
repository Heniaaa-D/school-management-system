Auth.requireLogin();
const user = Auth.getUser();

// ---------------------------------------------------------------------------
// Navigation — items shown depend on the logged-in role
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { key: 'dashboard',  label: 'Dashboard',  roles: ['admin', 'teacher', 'student'] },
  { key: 'students',   label: 'Students',   roles: ['admin', 'teacher'] },
  { key: 'teachers',   label: 'Teachers',   roles: ['admin'] },
  { key: 'courses',    label: 'Courses',    roles: ['admin', 'teacher', 'student'] },
  { key: 'grades',     label: 'Grades',     roles: ['admin', 'teacher', 'student'] },
  { key: 'attendance', label: 'Attendance', roles: ['admin', 'teacher', 'student'] },
  { key: 'schedule',   label: 'Schedule',   roles: ['admin', 'teacher', 'student'] },
  { key: 'settings',   label: 'Settings',   roles: ['admin', 'teacher', 'student'] },
];

const PAGE_META = {
  dashboard:  ['Dashboard', 'Overview of your school'],
  students:   ['Students', 'Manage student records'],
  teachers:   ['Teachers', 'Manage teacher records'],
  courses:    ['Courses', 'Manage courses & subjects'],
  grades:     ['Grades', 'Track and record student grades'],
  attendance: ['Attendance', 'Track daily student attendance'],
  schedule:   ['Schedule', 'View and manage the weekly timetable'],
  settings:   ['Settings', 'Profile and system information'],
};

const canManage = ['admin', 'teacher'].includes(user.role); // courses/grades/attendance/schedule
const isAdmin = user.role === 'admin';

function initNav() {
  const navList = document.getElementById('nav-list');
  navList.innerHTML = NAV_ITEMS.filter(i => i.roles.includes(user.role)).map(item => `
    <button data-key="${item.key}" class="nav-item w-full text-left px-5 py-3 flex items-center gap-2 transition">
      ${item.label}
    </button>`).join('');

  navList.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.key));
  });

  document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

  document.getElementById('user-name').textContent = user.full_name;
  document.getElementById('user-role').textContent = user.role;
  document.getElementById('user-initial').textContent = user.full_name.charAt(0).toUpperCase();
  document.getElementById('settings-user').textContent = `${user.full_name} (${user.role})`;

  if (!canManage) document.getElementById('grades-add-btn').classList.add('hidden');
  if (!canManage) document.getElementById('attendance-add-btn').classList.add('hidden');
  if (!canManage) document.getElementById('schedule-add-btn').classList.add('hidden');
  if (!isAdmin) {
    document.getElementById('students-add-btn')?.classList.add('hidden');
    document.getElementById('teachers-add-btn')?.classList.add('hidden');
  }
  if (!canManage) document.getElementById('courses-add-btn')?.classList.add('hidden');
}

function showSection(key) {
  document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`section-${key}`).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.key === key));
  const [title, subtitle] = PAGE_META[key];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;

  const loaders = { dashboard: loadDashboard, students: loadStudents, teachers: loadTeachers,
    courses: loadCourses, grades: loadGrades, attendance: loadAttendance, schedule: loadSchedule };
  loaders[key] && loaders[key]();
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
function statusBadge(status) {
  const map = {
    active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-500',
    graduated: 'bg-blue-100 text-blue-700',
    Present: 'bg-green-100 text-green-700', Absent: 'bg-red-100 text-red-700',
    Late: 'bg-yellow-100 text-yellow-700', Excused: 'bg-gray-100 text-gray-600',
  };
  return `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-500'}">${status}</span>`;
}
function letterBadge(letter) {
  const map = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700',
    C: 'bg-yellow-100 text-yellow-700', D: 'bg-orange-100 text-orange-700', F: 'bg-red-100 text-red-700' };
  return `<span class="px-2 py-0.5 rounded-full text-xs font-bold ${map[letter] || 'bg-gray-100 text-gray-500'}">${letter}</span>`;
}
function subjectBadge(subject) {
  return `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">${subject || '—'}</span>`;
}
function actionBtns(onEdit, onDel, showEdit = true, showDel = true) {
  return `
    ${showEdit ? `<button class="edit-btn text-red-700 hover:underline mr-2">Edit</button>` : ''}
    ${showDel ? `<button class="del-btn text-gray-400 hover:text-red-600 hover:underline">Del</button>` : ''}`;
}

// ---------------------------------------------------------------------------
// Generic modal helper
// ---------------------------------------------------------------------------
const modal = {
  el: null, form: null,
  open(title, fieldsHtml, onSubmit) {
    document.getElementById('modal-title').textContent = title;
    const form = document.getElementById('modal-form');
    form.innerHTML = fieldsHtml + `
      <div class="pt-2 flex justify-end gap-2">
        <button type="button" id="modal-cancel" class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
        <button type="submit" class="px-4 py-2 text-sm rounded-lg bg-red-700 hover:bg-red-800 text-white font-medium">Save</button>
      </div>
      <p id="modal-error" class="hidden text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"></p>`;
    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-cancel').onclick = () => this.close();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('modal-error');
      errBox.classList.add('hidden');
      try {
        await onSubmit(new FormData(form));
        this.close();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      }
    };
  },
  close() { document.getElementById('modal-backdrop').classList.add('hidden'); }
};
document.getElementById('modal-close').addEventListener('click', () => modal.close());
document.getElementById('modal-backdrop').addEventListener('click', (e) => {
  if (e.target.id === 'modal-backdrop') modal.close();
});

function field(label, name, type = 'text', value = '', extra = '') {
  return `<div>
    <label class="block text-sm font-medium text-gray-700 mb-1">${label}</label>
    <input name="${name}" type="${type}" value="${value ?? ''}" ${extra}
      class="w-full border border-gray-300 focus:border-red-600 rounded-lg px-3 py-2 text-sm outline-none">
  </div>`;
}
function selectField(label, name, options, selected = '') {
  return `<div>
    <label class="block text-sm font-medium text-gray-700 mb-1">${label}</label>
    <select name="${name}" class="w-full border border-gray-300 focus:border-red-600 rounded-lg px-3 py-2 text-sm outline-none">
      ${options.map(o => `<option value="${o.value}" ${String(o.value) === String(selected) ? 'selected' : ''}>${o.label}</option>`).join('')}
    </select>
  </div>`;
}

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
async function loadDashboard() {
  const stats = await Api.get('/api/dashboard/stats');
  const cards = document.getElementById('stat-cards');

  if (stats.role === 'student') {
    cards.innerHTML = [
      ['Grades Recorded', stats.grades_count],
      ['Days Present', stats.present_days],
      ['Days Absent', stats.absent_days],
    ].map(([label, value]) => `
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <p class="text-3xl font-bold text-red-700">${value}</p>
        <p class="text-gray-500 text-xs mt-1">${label}</p>
      </div>`).join('');

    document.getElementById('recent-students').closest('.bg-white').querySelector('h2').textContent = 'My Recent Grades';
    document.getElementById('recent-students').innerHTML = stats.recent_grades.map(g => `
      <tr class="border-t border-gray-50">
        <td class="px-5 py-3">${g.course_name}</td>
        <td class="px-5 py-3 text-right">${g.score} ${letterBadge(g.letter_grade)}</td>
      </tr>`).join('') || `<tr><td class="px-5 py-6 text-center text-gray-400">No grades yet</td></tr>`;
    document.getElementById('recent-grades').closest('.bg-white').classList.add('hidden');
    return;
  }

  document.getElementById('recent-grades').closest('.bg-white').classList.remove('hidden');
  cards.innerHTML = [
    ['Total Students', stats.total_students], ['Total Teachers', stats.total_teachers],
    ['Courses', stats.total_courses], ['Grades Recorded', stats.total_grades],
  ].map(([label, value]) => `
    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <p class="text-3xl font-bold text-red-700">${value}</p>
      <p class="text-gray-500 text-xs mt-1">${label}</p>
    </div>`).join('');

  document.getElementById('recent-students').innerHTML = stats.recent_students.map(s => `
    <tr class="border-t border-gray-50">
      <td class="px-5 py-3 font-medium">${s.first_name} ${s.last_name}</td>
      <td class="px-5 py-3 text-right text-gray-400 text-xs">${s.grade_level || ''}</td>
    </tr>`).join('') || `<tr><td class="px-5 py-6 text-center text-gray-400">No students yet</td></tr>`;

  document.getElementById('recent-grades').innerHTML = stats.recent_grades.map(g => `
    <tr class="border-t border-gray-50">
      <td class="px-5 py-3">${g.student_name} — ${g.course_name}</td>
      <td class="px-5 py-3 text-right">${letterBadge(g.letter_grade)}</td>
    </tr>`).join('') || `<tr><td class="px-5 py-6 text-center text-gray-400">No grades yet</td></tr>`;
}

// ---------------------------------------------------------------------------
// STUDENTS
// ---------------------------------------------------------------------------
async function loadStudents() {
  const students = await Api.get('/api/students');
  renderStudents(students);
  document.getElementById('students-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderStudents(students.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) || (s.student_code || '').toLowerCase().includes(q)));
  };
  document.getElementById('students-add-btn').onclick = () => openStudentForm();
}

function renderStudents(students) {
  document.getElementById('students-stats').innerHTML = [
    ['Total Students', students.length],
    ['Active', students.filter(s => s.status === 'active').length],
    ['Grade Levels', new Set(students.map(s => s.grade_level)).size],
    ['Inactive', students.filter(s => s.status !== 'active').length],
  ].map(([label, value]) => `
    <div class="bg-white rounded-xl border border-gray-200 p-4">
      <p class="text-2xl font-bold text-gray-800">${value}</p>
      <p class="text-gray-400 text-xs mt-1">${label}</p>
    </div>`).join('');

  document.getElementById('students-table').innerHTML = students.map(s => `
    <tr class="border-t border-gray-50 hover:bg-gray-50" data-id="${s.id}">
      <td class="px-4 py-3 text-gray-400">${s.student_code}</td>
      <td class="px-4 py-3 font-medium">${s.first_name} ${s.last_name}</td>
      <td class="px-4 py-3 text-gray-500">${s.email || '—'}</td>
      <td class="px-4 py-3">${s.grade_level || '—'}</td>
      <td class="px-4 py-3">${s.section || '—'}</td>
      <td class="px-4 py-3 text-gray-500">${s.parent_name || '—'}</td>
      <td class="px-4 py-3">${statusBadge(s.status)}</td>
      <td class="px-4 py-3">${actionBtns(null, null, isAdmin, isAdmin)}</td>
    </tr>`).join('') || `<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">No students found</td></tr>`;

  if (isAdmin) {
    document.querySelectorAll('#students-table tr').forEach(row => {
      const id = row.dataset.id;
      const s = students.find(x => String(x.id) === id);
      row.querySelector('.edit-btn')?.addEventListener('click', () => openStudentForm(s));
      row.querySelector('.del-btn')?.addEventListener('click', () => deleteRecord('students', id, loadStudents));
    });
  }
}

function openStudentForm(s = null) {
  const html = [
    field('Student Code', 'student_code', 'text', s?.student_code),
    field('First Name', 'first_name', 'text', s?.first_name),
    field('Last Name', 'last_name', 'text', s?.last_name),
    field('Email', 'email', 'email', s?.email),
    field('Grade Level', 'grade_level', 'text', s?.grade_level, 'placeholder="e.g. Grade 9"'),
    field('Section', 'section', 'text', s?.section),
    field('Parent Name', 'parent_name', 'text', s?.parent_name),
    field('Parent Phone', 'parent_phone', 'text', s?.parent_phone),
    selectField('Status', 'status', [
      { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'graduated', label: 'Graduated' },
    ], s?.status || 'active'),
  ].join('');

  modal.open(s ? 'Edit Student' : 'Add Student', html, async (fd) => {
    const body = Object.fromEntries(fd.entries());
    if (!body.student_code || !body.first_name || !body.last_name) {
      throw new Error('Student code, first name, and last name are required.');
    }
    if (s) await Api.put(`/api/students/${s.id}`, body);
    else await Api.post('/api/students', body);
    loadStudents();
  });
}

// ---------------------------------------------------------------------------
// TEACHERS
// ---------------------------------------------------------------------------
async function loadTeachers() {
  const teachers = await Api.get('/api/teachers');
  renderTeachers(teachers);
  document.getElementById('teachers-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderTeachers(teachers.filter(t =>
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) || (t.subject || '').toLowerCase().includes(q)));
  };
  document.getElementById('teachers-add-btn').onclick = () => openTeacherForm();
}

function renderTeachers(teachers) {
  document.getElementById('teachers-stats').innerHTML = [
    ['Total Teachers', teachers.length],
    ['Active', teachers.filter(t => t.status === 'active').length],
    ['Subjects', new Set(teachers.map(t => t.subject)).size],
    ['Inactive', teachers.filter(t => t.status !== 'active').length],
  ].map(([label, value]) => `
    <div class="bg-white rounded-xl border border-gray-200 p-4">
      <p class="text-2xl font-bold text-gray-800">${value}</p>
      <p class="text-gray-400 text-xs mt-1">${label}</p>
    </div>`).join('');

  document.getElementById('teachers-table').innerHTML = teachers.map(t => `
    <tr class="border-t border-gray-50 hover:bg-gray-50" data-id="${t.id}">
      <td class="px-4 py-3 text-gray-400">${t.teacher_code}</td>
      <td class="px-4 py-3 font-medium">${t.first_name} ${t.last_name}</td>
      <td class="px-4 py-3 text-gray-500">${t.email || '—'}</td>
      <td class="px-4 py-3 text-gray-500">${t.phone || '—'}</td>
      <td class="px-4 py-3">${subjectBadge(t.subject)}</td>
      <td class="px-4 py-3">${statusBadge(t.status)}</td>
      <td class="px-4 py-3">${actionBtns(null, null, isAdmin, isAdmin)}</td>
    </tr>`).join('') || `<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No teachers found</td></tr>`;

  if (isAdmin) {
    document.querySelectorAll('#teachers-table tr').forEach(row => {
      const id = row.dataset.id;
      const t = teachers.find(x => String(x.id) === id);
      row.querySelector('.edit-btn')?.addEventListener('click', () => openTeacherForm(t));
      row.querySelector('.del-btn')?.addEventListener('click', () => deleteRecord('teachers', id, loadTeachers));
    });
  }
}

function openTeacherForm(t = null) {
  const html = [
    field('Teacher Code', 'teacher_code', 'text', t?.teacher_code),
    field('First Name', 'first_name', 'text', t?.first_name),
    field('Last Name', 'last_name', 'text', t?.last_name),
    field('Email', 'email', 'email', t?.email),
    field('Phone', 'phone', 'text', t?.phone),
    field('Subject', 'subject', 'text', t?.subject),
    selectField('Status', 'status', [
      { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
    ], t?.status || 'active'),
  ].join('');

  modal.open(t ? 'Edit Teacher' : 'Add Teacher', html, async (fd) => {
    const body = Object.fromEntries(fd.entries());
    if (!body.teacher_code || !body.first_name || !body.last_name) {
      throw new Error('Teacher code, first name, and last name are required.');
    }
    if (t) await Api.put(`/api/teachers/${t.id}`, body);
    else await Api.post('/api/teachers', body);
    loadTeachers();
  });
}

// ---------------------------------------------------------------------------
// COURSES
// ---------------------------------------------------------------------------
let cachedTeachers = [];
async function loadCourses() {
  const [courses, teachers] = await Promise.all([
    Api.get('/api/courses'),
    canManage ? Api.get('/api/teachers') : Promise.resolve([]),
  ]);
  cachedTeachers = teachers;
  renderCourses(courses);
  document.getElementById('courses-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderCourses(courses.filter(c => c.course_name.toLowerCase().includes(q) || c.course_code.toLowerCase().includes(q)));
  };
  document.getElementById('courses-add-btn').onclick = () => openCourseForm();
}

function renderCourses(courses) {
  document.getElementById('courses-stats').innerHTML = [
    ['Total Courses', courses.length],
    ['Active', courses.filter(c => c.status === 'active').length],
    ['Grade Levels', new Set(courses.map(c => c.grade_level)).size],
    ['Inactive', courses.filter(c => c.status !== 'active').length],
  ].map(([label, value]) => `
    <div class="bg-white rounded-xl border border-gray-200 p-4">
      <p class="text-2xl font-bold text-gray-800">${value}</p>
      <p class="text-gray-400 text-xs mt-1">${label}</p>
    </div>`).join('');

  document.getElementById('courses-table').innerHTML = courses.map(c => `
    <tr class="border-t border-gray-50 hover:bg-gray-50" data-id="${c.id}">
      <td class="px-4 py-3 text-gray-400">${c.course_code}</td>
      <td class="px-4 py-3 font-medium">${c.course_name}</td>
      <td class="px-4 py-3 text-gray-500">${c.teacher_name || '—'}</td>
      <td class="px-4 py-3">${c.grade_level || '—'}</td>
      <td class="px-4 py-3">${c.credits}</td>
      <td class="px-4 py-3">${statusBadge(c.status)}</td>
      <td class="px-4 py-3">${actionBtns(null, null, canManage, isAdmin)}</td>
    </tr>`).join('') || `<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No courses found</td></tr>`;

  if (canManage) {
    document.querySelectorAll('#courses-table tr').forEach(row => {
      const id = row.dataset.id;
      const c = courses.find(x => String(x.id) === id);
      row.querySelector('.edit-btn')?.addEventListener('click', () => openCourseForm(c));
      row.querySelector('.del-btn')?.addEventListener('click', () => deleteRecord('courses', id, loadCourses));
    });
  }
}

function openCourseForm(c = null) {
  const teacherOptions = [{ value: '', label: '— None —' }, ...cachedTeachers.map(t => ({ value: t.id, label: `${t.first_name} ${t.last_name}` }))];
  const html = [
    field('Course Code', 'course_code', 'text', c?.course_code),
    field('Course Name', 'course_name', 'text', c?.course_name),
    selectField('Teacher', 'teacher_id', teacherOptions, c?.teacher_id || ''),
    field('Grade Level', 'grade_level', 'text', c?.grade_level),
    field('Credits', 'credits', 'number', c?.credits ?? 3, 'min="1" max="10"'),
    field('Description', 'description', 'text', c?.description),
    selectField('Status', 'status', [
      { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
    ], c?.status || 'active'),
  ].join('');

  modal.open(c ? 'Edit Course' : 'Add Course', html, async (fd) => {
    const body = Object.fromEntries(fd.entries());
    body.teacher_id = body.teacher_id || null;
    if (!body.course_code || !body.course_name) throw new Error('Course code and name are required.');
    if (c) await Api.put(`/api/courses/${c.id}`, body);
    else await Api.post('/api/courses', body);
    loadCourses();
  });
}

// ---------------------------------------------------------------------------
// GRADES
// ---------------------------------------------------------------------------
let cachedStudents = [], cachedCourses = [], allGrades = [];
async function loadGrades() {
  const [grades, students, courses] = await Promise.all([
    Api.get('/api/grades'),
    canManage ? Api.get('/api/students') : Promise.resolve([]),
    Api.get('/api/courses'),
  ]);
  allGrades = grades; cachedStudents = students; cachedCourses = courses;

  const studentFilter = document.getElementById('grades-filter-student');
  const courseFilter = document.getElementById('grades-filter-course');
  if (canManage) {
    studentFilter.innerHTML = `<option value="">All Students</option>` +
      students.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('');
    studentFilter.classList.remove('hidden');
  } else {
    studentFilter.classList.add('hidden');
  }
  courseFilter.innerHTML = `<option value="">All Courses</option>` +
    courses.map(c => `<option value="${c.id}">${c.course_name}</option>`).join('');

  const applyFilters = () => {
    const sid = studentFilter.value, cid = courseFilter.value;
    renderGrades(allGrades.filter(g =>
      (!sid || String(g.student_id) === sid) && (!cid || String(g.course_id) === cid)));
  };
  studentFilter.onchange = applyFilters;
  courseFilter.onchange = applyFilters;
  renderGrades(grades);

  document.getElementById('grades-add-btn').onclick = () => openGradeForm();
}

function renderGrades(grades) {
  const avg = grades.length ? (grades.reduce((a, g) => a + g.score, 0) / grades.length).toFixed(1) : '0.0';
  document.getElementById('grades-stats').innerHTML = [
    ['Entries', grades.length], ['Avg Score', avg + '%'],
    ['Passing', grades.filter(g => g.score >= 60).length], ['Failing', grades.filter(g => g.score < 60).length],
  ].map(([label, value]) => `
    <div class="bg-white rounded-xl border border-gray-200 p-4">
      <p class="text-2xl font-bold text-gray-800">${value}</p>
      <p class="text-gray-400 text-xs mt-1">${label}</p>
    </div>`).join('');

  document.getElementById('grades-table').innerHTML = grades.map(g => `
    <tr class="border-t border-gray-50 hover:bg-gray-50" data-id="${g.id}">
      <td class="px-4 py-3 font-medium">${g.student_name}</td>
      <td class="px-4 py-3 text-gray-500">${g.course_name}</td>
      <td class="px-4 py-3 text-gray-500">${g.semester}</td>
      <td class="px-4 py-3">${g.score}</td>
      <td class="px-4 py-3">${letterBadge(g.letter_grade)}</td>
      <td class="px-4 py-3">${actionBtns(null, null, canManage, canManage)}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No grades found</td></tr>`;

  if (canManage) {
    document.querySelectorAll('#grades-table tr').forEach(row => {
      const id = row.dataset.id;
      const g = grades.find(x => String(x.id) === id);
      row.querySelector('.edit-btn')?.addEventListener('click', () => openGradeForm(g));
      row.querySelector('.del-btn')?.addEventListener('click', () => deleteRecord('grades', id, loadGrades));
    });
  }
}

function openGradeForm(g = null) {
  const html = [
    selectField('Student', 'student_id', cachedStudents.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` })), g?.student_id),
    selectField('Course', 'course_id', cachedCourses.map(c => ({ value: c.id, label: c.course_name })), g?.course_id),
    field('Semester', 'semester', 'text', g?.semester || '2025-S2', 'placeholder="e.g. 2025-S2"'),
    field('Score (0–100)', 'score', 'number', g?.score, 'min="0" max="100" step="0.1"'),
  ].join('');

  modal.open(g ? 'Edit Grade' : 'Add Grade', html, async (fd) => {
    const body = Object.fromEntries(fd.entries());
    if (!body.student_id || !body.course_id || !body.semester || body.score === '') {
      throw new Error('Student, course, semester, and score are all required.');
    }
    if (g) await Api.put(`/api/grades/${g.id}`, body);
    else await Api.post('/api/grades', body);
    loadGrades();
  });
}

// ---------------------------------------------------------------------------
// ATTENDANCE
// ---------------------------------------------------------------------------
let allAttendance = [];
async function loadAttendance() {
  const [records, students, courses] = await Promise.all([
    Api.get('/api/attendance'),
    canManage ? Api.get('/api/students') : Promise.resolve([]),
    Api.get('/api/courses'),
  ]);
  allAttendance = records; cachedStudents = students; cachedCourses = courses;

  const courseFilter = document.getElementById('attendance-filter-course');
  courseFilter.innerHTML = `<option value="">All Courses</option>` +
    courses.map(c => `<option value="${c.id}">${c.course_name}</option>`).join('');
  const dateFilter = document.getElementById('attendance-filter-date');

  const applyFilters = () => {
    const cid = courseFilter.value, date = dateFilter.value;
    renderAttendance(allAttendance.filter(a =>
      (!cid || String(a.course_id) === cid) && (!date || a.date === date)));
  };
  courseFilter.onchange = applyFilters;
  dateFilter.onchange = applyFilters;
  renderAttendance(records);

  document.getElementById('attendance-add-btn').onclick = () => openAttendanceForm();
}

function renderAttendance(records) {
  document.getElementById('attendance-table').innerHTML = records.map(a => `
    <tr class="border-t border-gray-50 hover:bg-gray-50" data-id="${a.id}">
      <td class="px-4 py-3 font-medium">${a.student_name}</td>
      <td class="px-4 py-3 text-gray-500">${a.course_name || '—'}</td>
      <td class="px-4 py-3 text-gray-500">${a.date}</td>
      <td class="px-4 py-3">${statusBadge(a.status)}</td>
      <td class="px-4 py-3">${actionBtns(null, null, canManage, canManage)}</td>
    </tr>`).join('') || `<tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No attendance records found</td></tr>`;

  if (canManage) {
    document.querySelectorAll('#attendance-table tr').forEach(row => {
      const id = row.dataset.id;
      const a = records.find(x => String(x.id) === id);
      row.querySelector('.edit-btn')?.addEventListener('click', () => openAttendanceForm(a));
      row.querySelector('.del-btn')?.addEventListener('click', () => deleteRecord('attendance', id, loadAttendance));
    });
  }
}

function openAttendanceForm(a = null) {
  const html = [
    selectField('Student', 'student_id', cachedStudents.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` })), a?.student_id),
    selectField('Course', 'course_id', cachedCourses.map(c => ({ value: c.id, label: c.course_name })), a?.course_id),
    field('Date', 'date', 'date', a?.date || new Date().toISOString().slice(0, 10)),
    selectField('Status', 'status', [
      { value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' },
      { value: 'Late', label: 'Late' }, { value: 'Excused', label: 'Excused' },
    ], a?.status || 'Present'),
  ].join('');

  modal.open(a ? 'Edit Attendance' : 'Add Attendance', html, async (fd) => {
    const body = Object.fromEntries(fd.entries());
    if (!body.student_id || !body.date || !body.status) throw new Error('Student, date, and status are required.');
    if (a) await Api.put(`/api/attendance/${a.id}`, body);
    else await Api.post('/api/attendance', body);
    loadAttendance();
  });
}

// ---------------------------------------------------------------------------
// SCHEDULE
// ---------------------------------------------------------------------------
async function loadSchedule() {
  const [schedule, courses] = await Promise.all([Api.get('/api/schedules'), Api.get('/api/courses')]);
  cachedCourses = courses;
  renderSchedule(schedule);
  document.getElementById('schedule-add-btn').onclick = () => openScheduleForm();
}

function renderSchedule(schedule) {
  document.getElementById('schedule-table').innerHTML = schedule.map(s => `
    <tr class="border-t border-gray-50 hover:bg-gray-50" data-id="${s.id}">
      <td class="px-4 py-3 font-medium">${s.day_of_week}</td>
      <td class="px-4 py-3 text-gray-500">${s.start_time}–${s.end_time}</td>
      <td class="px-4 py-3">${s.course_name}</td>
      <td class="px-4 py-3 text-gray-500">${s.teacher_name || '—'}</td>
      <td class="px-4 py-3 text-gray-500">${s.room || '—'}</td>
      <td class="px-4 py-3">${actionBtns(null, null, canManage, canManage)}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No schedule entries yet</td></tr>`;

  if (canManage) {
    document.querySelectorAll('#schedule-table tr').forEach(row => {
      const id = row.dataset.id;
      const s = schedule.find(x => String(x.id) === id);
      row.querySelector('.edit-btn')?.addEventListener('click', () => openScheduleForm(s));
      row.querySelector('.del-btn')?.addEventListener('click', () => deleteRecord('schedules', id, loadSchedule));
    });
  }
}

function openScheduleForm(s = null) {
  const html = [
    selectField('Course', 'course_id', cachedCourses.map(c => ({ value: c.id, label: c.course_name })), s?.course_id),
    selectField('Day', 'day_of_week', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => ({ value: d, label: d })), s?.day_of_week),
    field('Start Time', 'start_time', 'time', s?.start_time || '08:00'),
    field('End Time', 'end_time', 'time', s?.end_time || '09:00'),
    field('Room', 'room', 'text', s?.room),
  ].join('');

  modal.open(s ? 'Edit Schedule Entry' : 'Add Schedule Entry', html, async (fd) => {
    const body = Object.fromEntries(fd.entries());
    if (!body.course_id || !body.day_of_week || !body.start_time || !body.end_time) {
      throw new Error('Course, day, start time, and end time are required.');
    }
    if (s) await Api.put(`/api/schedules/${s.id}`, body);
    else await Api.post('/api/schedules', body);
    loadSchedule();
  });
}

// ---------------------------------------------------------------------------
// Shared delete helper
// ---------------------------------------------------------------------------
async function deleteRecord(resource, id, reload) {
  if (!confirm('Delete this record? This cannot be undone.')) return;
  try {
    await Api.del(`/api/${resource}/${id}`);
    reload();
  } catch (err) {
    alert(err.message);
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
initNav();
showSection('dashboard');
