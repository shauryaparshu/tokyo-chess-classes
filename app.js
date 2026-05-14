const STORAGE_KEY = "chess-coaching-dashboard-data-v4";
const BACKUP_STORAGE_KEY = "chess-coaching-dashboard-backups-v1";
const LEGACY_STORAGE_KEYS = [
  "chess-coaching-dashboard-data-v3",
  "chess-coaching-dashboard-data-v2",
  "chess-coaching-dashboard-data-v1",
];
const MAX_BACKUP_SNAPSHOTS = 20;
const CLASS_FEE = 1000;
const PROGRAM_START_DATE = "2026-03-25";
const PROGRAM_START_LABEL = "Since March 25, 2026";
const REMOTE_SYNC_DEBOUNCE_MS = 300;

const demoBatches = [
  {
    id: crypto.randomUUID(),
    name: "Seishincho",
    startDate: "2026-05-01",
    location: "Seishincho",
    schedule: "Saturday 10:00",
  },
  {
    id: crypto.randomUUID(),
    name: "Funabori",
    startDate: "2026-05-01",
    location: "Funabori",
    schedule: "Sunday 11:00",
  },
];

const demoStudents = [
  {
    id: crypto.randomUUID(),
    name: "Hiro",
    age: 9,
    joiningDate: "2026-05-01",
    parentName: "Mr. Sato",
    phone: "090-1111-2222",
    batchId: demoBatches[0].id,
    attendance: ["P", "P", "P", "A", "P"],
  },
  {
    id: crypto.randomUUID(),
    name: "Aoi",
    age: 8,
    joiningDate: "2026-05-03",
    parentName: "Mrs. Ito",
    phone: "090-3333-4444",
    batchId: demoBatches[1].id,
    attendance: ["P", "P", "A", "P", "P"],
  },
  {
    id: crypto.randomUUID(),
    name: "Ken",
    age: 10,
    joiningDate: "2026-05-05",
    parentName: "Mr. Tanaka",
    phone: "090-5555-6666",
    batchId: demoBatches[0].id,
    attendance: ["A", "A", "P", "P", "A"],
  },
  {
    id: crypto.randomUUID(),
    name: "Mei",
    age: 7,
    joiningDate: "2026-05-06",
    parentName: "Mrs. Kato",
    phone: "090-7777-8888",
    batchId: demoBatches[1].id,
    attendance: ["P", "P", "P", "P", "P"],
  },
];

const defaultData = {
  batches: demoBatches,
  students: demoStudents,
  payments: [],
  classSchedules: [],
  attendanceRecords: [],
};

const emptyData = {
  batches: [],
  students: [],
  payments: [],
  classSchedules: [],
  attendanceRecords: [],
};

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const exportBackupBtn = document.getElementById("export-backup-btn");
const importBackupBtn = document.getElementById("import-backup-btn");
const importBackupInput = document.getElementById("import-backup-input");
const backupStatus = document.getElementById("backup-status");
const logoutBtn = document.getElementById("logout-btn");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
const sortButtons = document.querySelectorAll(".sort-button");

const statsGrid = document.getElementById("stats-grid");
const studentTableBody = document.getElementById("student-table-body");
const batchTableBody = document.getElementById("batch-table-body");
const attendanceBoard = document.getElementById("attendance-board");
const analyticsList = document.getElementById("analytics-list");
const scheduleMonth = document.getElementById("schedule-month");
const scheduleTableBody = document.getElementById("schedule-table-body");
const scheduleStatus = document.getElementById("schedule-status");
const attendanceMonth = document.getElementById("attendance-month");
const attendanceBatchSelect = document.getElementById("attendance-batch");
const attendanceStatus = document.getElementById("attendance-status");
const paymentMonth = document.getElementById("payment-month");
const paymentTableBody = document.getElementById("payment-table-body");
const paymentStatus = document.getElementById("payment-status");
const completeMonthBtn = document.getElementById("complete-month-btn");
const financeStatsGrid = document.getElementById("finance-stats-grid");
const monthlyFinanceTableBody = document.getElementById("monthly-finance-table-body");
const studentFinanceTableBody = document.getElementById("student-finance-table-body");
const monthlyStudentFinanceTableBody = document.getElementById("monthly-student-finance-table-body");
const financeMonth = document.getElementById("finance-month");

const studentForm = document.getElementById("student-form");
const studentFormTitle = document.getElementById("student-form-title");
const studentFormStatus = document.getElementById("student-form-status");
const addStudentBtn = document.getElementById("add-student-btn");
const clearStudentFormBtn = document.getElementById("clear-student-form-btn");
const deleteStudentBtn = document.getElementById("delete-student-btn");
const studentBatchSelect = document.getElementById("student-batch");
const studentStatusSelect = document.getElementById("student-status");
const inactiveFromInput = document.getElementById("inactive-from");
const inactiveFromWrap = document.getElementById("inactive-from-wrap");

const batchForm = document.getElementById("batch-form");
const batchFormTitle = document.getElementById("batch-form-title");
const batchFormStatus = document.getElementById("batch-form-status");
const addBatchBtn = document.getElementById("add-batch-btn");
const clearBatchFormBtn = document.getElementById("clear-batch-form-btn");
const deleteBatchBtn = document.getElementById("delete-batch-btn");

let studentSort = {
  key: "batchName",
  direction: "asc",
};

let remoteSyncTimer = null;
let lastRemoteSerialized = "";
let remoteHydrationPromise = null;

function formatJPY(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-CA").format(new Date(`${value}T00:00:00`));
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(month, count) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + count, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getFallbackStartDate(batch, month) {
  if (batch?.startDate?.startsWith(month)) {
    return batch.startDate;
  }
  return `${month}-01`;
}

function createDefaultClassDates(batch, month) {
  const startDate = getFallbackStartDate(batch, month);
  return [0, 7, 14, 21, 28].map((offset) => addDays(startDate, offset));
}

function getMonthDateOptions(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    return `${month}-${String(index + 1).padStart(2, "0")}`;
  });
}

function getMonthBounds(month) {
  const monthDates = getMonthDateOptions(month);
  return {
    min: monthDates[0],
    max: monthDates[monthDates.length - 1],
  };
}

function getTodayIso() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inferClassStatusFromDate(dateValue) {
  if (!dateValue) {
    return "none";
  }

  return dateValue <= getTodayIso() ? "completed" : "scheduled";
}

function normalizeClassStatus(status, dateValue) {
  if (!dateValue) {
    return "none";
  }

  if (status === "scheduled" || status === "completed" || status === "cancelled") {
    return status;
  }

  return inferClassStatusFromDate(dateValue);
}

function getMonthFromDate(value) {
  return value ? value.slice(0, 7) : "";
}

function isStudentInactive(student) {
  return student.status === "inactive" && Boolean(student.inactiveFrom);
}

function isStudentActiveOnDate(student, classDate) {
  return !isStudentInactive(student) || classDate < student.inactiveFrom;
}

function isStudentEligibleForDate(student, classDate) {
  return Boolean(
    classDate &&
    student.joiningDate &&
    student.joiningDate <= classDate &&
    isStudentActiveOnDate(student, classDate)
  );
}

function studentHasMonthHistory(student, data, month) {
  const payment = getPaymentRecord(data, student.id, month);
  if (
    payment.previousBalance !== 0 ||
    payment.paymentReceived !== 0 ||
    payment.paid ||
    payment.paymentDate
  ) {
    return true;
  }

  return data.attendanceRecords.some(
    (record) => record.studentId === student.id && record.month === month
  );
}

function isStudentVisibleInMonth(student, data, month) {
  const schedule = getClassSchedule(data, student.batchId, month);
  if (schedule.dates.some((classDate) => isStudentEligibleForDate(student, classDate))) {
    return true;
  }

  return studentHasMonthHistory(student, data, month);
}

function normalizeStudent(student, batches) {
  const status = student.status === "inactive" ? "inactive" : "active";
  return {
    id: student.id || crypto.randomUUID(),
    name: student.name || "",
    age: Number(student.age || 0),
    joiningDate: student.joiningDate || "",
    parentName: student.parentName || "",
    phone: student.phone || "",
    batchId: student.batchId || batches[0]?.id || "",
    status,
    inactiveFrom: status === "inactive" ? (student.inactiveFrom || "") : "",
    attendance: Array.isArray(student.attendance)
      ? [...student.attendance, "A", "A", "A", "A", "A"].slice(0, 5)
      : ["A", "A", "A", "A", "A"],
  };
}

function normalizeBatch(batch) {
  return {
    id: batch.id || crypto.randomUUID(),
    name: batch.name || "",
    startDate: batch.startDate || "",
    location: batch.location || "",
    schedule: batch.schedule || "",
  };
}

function normalizePayment(payment) {
  return {
    studentId: payment.studentId || "",
    month: payment.month || "2026-05",
    previousBalance: Number(payment.previousBalance || 0),
    paymentReceived: Number(payment.paymentReceived || 0),
    paid: Boolean(payment.paid),
    paymentDate: payment.paymentDate || "",
  };
}

function normalizeClassSchedule(schedule) {
  const dates = Array.isArray(schedule.dates)
    ? [...schedule.dates, "", "", "", "", ""].slice(0, 5)
    : ["", "", "", "", ""];
  const rawStatuses = Array.isArray(schedule.statuses)
    ? [...schedule.statuses, "none", "none", "none", "none", "none"].slice(0, 5)
    : dates.map((dateValue) => inferClassStatusFromDate(dateValue));

  return {
    batchId: schedule.batchId || "",
    month: schedule.month || "2026-05",
    dates,
    statuses: dates.map((dateValue, index) => normalizeClassStatus(rawStatuses[index], dateValue)),
  };
}

function normalizeAttendanceRecord(record) {
  return {
    studentId: record.studentId || "",
    batchId: record.batchId || "",
    month: record.month || "2026-05",
    classDate: record.classDate || "",
    status: record.status === "P" ? "P" : "A",
  };
}

function buildLegacyAttendanceData(students, batches, month) {
  const classSchedules = batches.map((batch) =>
    normalizeClassSchedule({
      batchId: batch.id,
      month,
      dates: createDefaultClassDates(batch, month),
    })
  );
  const attendanceRecords = [];

  for (const student of students) {
    const schedule = classSchedules.find((entry) => entry.batchId === student.batchId);
    if (!schedule) {
      continue;
    }

    student.attendance.forEach((status, index) => {
      if (!schedule.dates[index]) {
        return;
      }
      attendanceRecords.push(
        normalizeAttendanceRecord({
          studentId: student.id,
          batchId: student.batchId,
          month,
          classDate: schedule.dates[index],
          status,
        })
      );
    });
  }

  return { classSchedules, attendanceRecords };
}

function createLegacyBatches(students) {
  const batchNames = [
    ...new Set(students.map((student) => student.classType || student.batch || "").filter(Boolean)),
  ];

  return batchNames.map((name) =>
    normalizeBatch({
      id: crypto.randomUUID(),
      name,
      startDate: "",
      location: name,
      schedule: "",
    })
  );
}

function normalizeLegacyData(parsed) {
  if (Array.isArray(parsed)) {
    const batches = createLegacyBatches(parsed);
    const students = parsed.map((student) => {
      const batchName = student.classType || student.batch || "";
      const batch = batches.find((entry) => entry.name === batchName);
      return normalizeStudent(
        {
          id: student.id,
          name: student.name,
          age: student.age,
          joiningDate: student.joiningDate,
          parentName: student.parentName,
          phone: student.phone,
          batchId: batch?.id,
          attendance: student.attendance,
        },
        batches
      );
    });

    const attendanceData = buildLegacyAttendanceData(students, batches, "2026-05");
    return { batches, students, payments: [], ...attendanceData };
  }

  const batches = (parsed.batches || []).map(normalizeBatch);
  const students = (parsed.students || []).map((student) => {
    if (student.batchId) {
      return normalizeStudent(student, batches);
    }

    const batchName = student.classType || student.batch || "";
    let batch = batches.find((entry) => entry.name === batchName);
    if (!batch && batchName) {
      batch = normalizeBatch({
        id: crypto.randomUUID(),
        name: batchName,
        startDate: "",
        location: batchName,
        schedule: "",
      });
      batches.push(batch);
    }

    return normalizeStudent({ ...student, batchId: batch?.id }, batches);
  });
  const payments = (parsed.payments || []).map(normalizePayment);
  const classSchedules = (parsed.classSchedules || []).map(normalizeClassSchedule);
  const attendanceRecords = (parsed.attendanceRecords || []).map(normalizeAttendanceRecord);

  if (classSchedules.length === 0 && attendanceRecords.length === 0) {
    const attendanceData = buildLegacyAttendanceData(students, batches, "2026-05");
    return { batches, students, payments, ...attendanceData };
  }

  return { batches, students, payments, classSchedules, attendanceRecords };
}

function isDemoSnapshot(data) {
  const demoNames = ["Aoi", "Hiro", "Ken", "Mei"];
  const names = data.students.map((student) => student.name).sort();
  return (
    names.length === demoNames.length &&
    names.every((name, index) => name === demoNames[index])
  );
}

function isFilePreview() {
  return window.location.protocol === "file:";
}

function getInitialLocalData() {
  return isFilePreview() ? defaultData : emptyData;
}

function loadLegacyData() {
  for (const key of LEGACY_STORAGE_KEYS) {
    const saved = localStorage.getItem(key);
    if (!saved) {
      continue;
    }

    try {
      const legacyData = normalizeLegacyData(JSON.parse(saved));
      if (legacyData.students.length > 0 && !isDemoSnapshot(legacyData)) {
        return legacyData;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const legacyData = loadLegacyData();
    const initialData = legacyData || getInitialLocalData();
    saveData(initialData, { skipRemoteSync: true, backupReason: "local-init" });
    return initialData;
  }

  try {
    const currentData = normalizeLegacyData(JSON.parse(saved));
    const legacyData = loadLegacyData();
    if (legacyData && isDemoSnapshot(currentData)) {
      saveData(legacyData, { skipRemoteSync: true, backupReason: "legacy-restore" });
      return legacyData;
    }
    return currentData;
  } catch {
    const legacyData = loadLegacyData();
    const initialData = legacyData || getInitialLocalData();
    saveData(initialData, { skipRemoteSync: true, backupReason: "local-recovery" });
    return initialData;
  }
}

function buildStoredData(data) {
  const batches = (data.batches || []).map(normalizeBatch);
  const students = (data.students || []).map((student) => normalizeStudent(student, batches));
  const payments = (data.payments || []).map(normalizePayment);
  const classSchedules = (data.classSchedules || []).map(normalizeClassSchedule);
  const attendanceRecords = (data.attendanceRecords || []).map(normalizeAttendanceRecord);
  return { batches, students, payments, classSchedules, attendanceRecords };
}

function saveBackupSnapshot(data, reason = "autosave") {
  const payload = buildStoredData(data);
  const serialized = JSON.stringify(payload);
  const existingSnapshots = JSON.parse(localStorage.getItem(BACKUP_STORAGE_KEY) || "[]");
  const lastSnapshot = existingSnapshots[existingSnapshots.length - 1];

  if (lastSnapshot?.payload === serialized) {
    return;
  }

  const nextSnapshots = [
    ...existingSnapshots,
    {
      createdAt: new Date().toISOString(),
      reason,
      payload: serialized,
    },
  ].slice(-MAX_BACKUP_SNAPSHOTS);

  localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(nextSnapshots));
}

function ensureCurrentBackupSnapshot() {
  saveBackupSnapshot(loadData(), "protect-current-data");
}

async function fetchRemoteData() {
  const response = await fetch("/api/dashboard-data", {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Cloud load failed" }));
    throw new Error(payload.error || "Cloud load failed");
  }

  return response.json();
}

async function pushRemoteData(storedData) {
  const response = await fetch("/api/dashboard-data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: storedData }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Cloud save failed" }));
    throw new Error(payload.error || "Cloud save failed");
  }
}

function queueRemoteSave(storedData) {
  if (isFilePreview()) {
    return;
  }

  const serialized = JSON.stringify(storedData);
  if (serialized === lastRemoteSerialized) {
    return;
  }

  clearTimeout(remoteSyncTimer);
  remoteSyncTimer = window.setTimeout(async () => {
    try {
      await pushRemoteData(storedData);
      lastRemoteSerialized = serialized;
      backupStatus.textContent = "Saved to cloud.";
    } catch (error) {
      backupStatus.textContent = `Saved on this device, but cloud sync failed: ${error.message}`;
    }
  }, REMOTE_SYNC_DEBOUNCE_MS);
}

async function hydrateRemoteData() {
  if (isFilePreview()) {
    return;
  }

  if (!remoteHydrationPromise) {
    remoteHydrationPromise = (async () => {
      const remotePayload = await fetchRemoteData();
      if (remotePayload.data) {
        saveData(remotePayload.data, { skipRemoteSync: true, backupReason: "cloud-load" });
        lastRemoteSerialized = JSON.stringify(buildStoredData(remotePayload.data));
        backupStatus.textContent = remotePayload.updatedAt
          ? `Cloud data loaded. Last saved ${new Date(remotePayload.updatedAt).toLocaleString()}.`
          : "Cloud data loaded.";
        return;
      }

      const localData = loadData();
      if (localData.students.length > 0 || localData.batches.length > 0) {
        queueRemoteSave(localData);
        backupStatus.textContent = "No cloud data found yet. Current local data is ready to upload.";
      } else {
        backupStatus.textContent = "Cloud database is empty. Import your backup file to begin.";
      }
    })().finally(() => {
      remoteHydrationPromise = null;
    });
  }

  return remoteHydrationPromise;
}

function saveData(data, options = {}) {
  const storedData = buildStoredData(data);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(storedData)
  );
  saveBackupSnapshot(storedData, options.backupReason || "autosave");

  if (!options.skipRemoteSync) {
    queueRemoteSave(storedData);
  }

  return storedData;
}

function makeBackupFileName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `tokyo-chess-classes-backup-${timestamp}.json`;
}

function exportBackup() {
  const data = loadData();
  const payload = JSON.stringify(buildStoredData(data), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = makeBackupFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  backupStatus.textContent = "Backup exported. Keep the JSON file in a safe folder.";
}

function importBackupFromText(text) {
  const parsed = JSON.parse(text);
  const importedData = normalizeLegacyData(parsed);
  saveData(importedData);
  renderDashboard();
  backupStatus.textContent = "Backup imported successfully.";
}

function findBatch(data, batchId) {
  return data.batches.find((batch) => batch.id === batchId);
}

function getBatchColorIndex(data, batchId) {
  const index = data.batches.findIndex((batch) => batch.id === batchId);
  return index >= 0 ? (index % 6) + 1 : 0;
}

function getClassSchedule(data, batchId, month) {
  const existingSchedule = data.classSchedules.find(
    (schedule) => schedule.batchId === batchId && schedule.month === month
  );
  if (existingSchedule) {
    return existingSchedule;
  }

  const batch = findBatch(data, batchId);
  return normalizeClassSchedule({
    batchId,
    month,
    dates: createDefaultClassDates(batch, month),
  });
}

function getAttendanceStatus(data, studentId, batchId, month, classDate) {
  const record = data.attendanceRecords.find(
    (entry) =>
      entry.studentId === studentId &&
      entry.batchId === batchId &&
      entry.month === month &&
      entry.classDate === classDate
  );
  return record?.status || "A";
}

function getClassStatusForSlot(schedule, index) {
  return normalizeClassStatus(schedule.statuses?.[index], schedule.dates[index]);
}

function getClassStatusForDate(data, batchId, month, classDate) {
  const schedule = getClassSchedule(data, batchId, month);
  const slotIndex = schedule.dates.findIndex((dateValue) => dateValue === classDate);

  if (slotIndex === -1) {
    return "none";
  }

  return getClassStatusForSlot(schedule, slotIndex);
}

function isAttendanceOpenForDate(classStatus, classDate) {
  return classStatus !== "cancelled" && Boolean(classDate) && classDate <= getTodayIso();
}

function getSessionsAttended(student, data, month) {
  const schedule = getClassSchedule(data, student.batchId, month);
  return schedule.dates.filter((classDate) => {
    return (
      getClassStatusForDate(data, student.batchId, month, classDate) === "completed" &&
      isStudentEligibleForDate(student, classDate) &&
      getAttendanceStatus(data, student.id, student.batchId, month, classDate) === "P"
    );
  }).length;
}

function getPaymentRecord(data, studentId, month) {
  return (
    data.payments.find((payment) => payment.studentId === studentId && payment.month === month) ||
    normalizePayment({ studentId, month })
  );
}

function getPaymentBalance(student, payment, data, month) {
  const classesAttended = getSessionsAttended(student, data, month);
  const amountCharged = classesAttended * CLASS_FEE;
  const totalAvailable = payment.previousBalance + payment.paymentReceived;
  return {
    amountCharged,
    classesAttended,
    remainingBalance: totalAvailable - amountCharged,
  };
}

function getCompletedClassCount(data, month = null) {
  const todayIso = getTodayIso();
  let total = 0;

  for (const schedule of data.classSchedules) {
    if (month && schedule.month !== month) {
      continue;
    }

    schedule.dates.forEach((classDate, index) => {
      const status = getClassStatusForSlot(schedule, index);
      if (
        classDate &&
        classDate >= PROGRAM_START_DATE &&
        classDate <= todayIso &&
        status === "completed"
      ) {
        total += 1;
      }
    });
  }

  return total;
}

function getTotalClassesTaken(data) {
  const month = attendanceMonth?.value || paymentMonth?.value || "2026-05";
  return getCompletedClassCount(data, month);
}

function getLifetimeClassesTaken(data) {
  return getCompletedClassCount(data, null);
}

function getAttendanceRevenueForMonth(data, month) {
  return data.students.reduce((sum, student) => {
    return sum + getSessionsAttended(student, data, month) * CLASS_FEE;
  }, 0);
}

function getAttendanceRevenueTotal(data) {
  return getReportMonths(data).reduce((sum, month) => {
    return sum + getAttendanceRevenueForMonth(data, month);
  }, 0);
}

function getReportMonths(data) {
  const months = new Set([
    ...data.payments.map((payment) => payment.month).filter(Boolean),
    ...data.classSchedules.map((schedule) => schedule.month).filter(Boolean),
    ...data.attendanceRecords.map((record) => record.month).filter(Boolean),
  ]);
  return [...months].sort();
}

function formatScheduleInputLabel(dateValue) {
  if (!dateValue) {
    return "No class";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function formatClassStatusLabel(status) {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  if (status === "scheduled") {
    return "Scheduled";
  }

  return "No class";
}

function renderBatchDropdown(data) {
  if (data.batches.length === 0) {
    studentBatchSelect.innerHTML = `<option value="">Create a batch first</option>`;
    studentBatchSelect.disabled = true;
    return;
  }

  studentBatchSelect.disabled = false;
  studentBatchSelect.innerHTML = data.batches
    .map((batch) => `<option value="${batch.id}">${batch.name}</option>`)
    .join("");
}

function renderAttendanceBatchDropdown(data) {
  const currentValue = attendanceBatchSelect.value;

  if (data.batches.length === 0) {
    attendanceBatchSelect.innerHTML = `<option value="">Create a batch first</option>`;
    attendanceBatchSelect.disabled = true;
    return;
  }

  attendanceBatchSelect.disabled = false;
  attendanceBatchSelect.innerHTML = data.batches
    .map((batch) => `<option value="${batch.id}">${batch.name}</option>`)
    .join("");
  attendanceBatchSelect.value =
    data.batches.some((batch) => batch.id === currentValue) ? currentValue : data.batches[0].id;
}

function getStudentSortValue(student, data, key) {
  const batch = findBatch(data, student.batchId);
  const values = {
    name: student.name,
    age: student.age,
    joiningDate: student.joiningDate,
    parentName: student.parentName,
    phone: student.phone,
    batchName: batch?.name || "",
    status: student.status,
    inactiveFrom: student.inactiveFrom,
  };

  return values[key] ?? "";
}

function getSortedStudents(data) {
  return [...data.students].sort((left, right) => {
    const leftValue = getStudentSortValue(left, data, studentSort.key);
    const rightValue = getStudentSortValue(right, data, studentSort.key);
    const direction = studentSort.direction === "asc" ? 1 : -1;

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * direction;
    }

    return (
      String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * direction
    );
  });
}

function updateSortButtons() {
  for (const button of sortButtons) {
    const isActive = button.dataset.sort === studentSort.key;
    button.classList.toggle("active", isActive);
    button.dataset.direction = isActive ? studentSort.direction : "";
  }
}

function renderStudents(data) {
  if (data.students.length === 0) {
    studentTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-cell">No students yet. Add your first student from the form.</td>
      </tr>
    `;
    return;
  }

  studentTableBody.innerHTML = getSortedStudents(data)
    .map((student) => {
      const batch = findBatch(data, student.batchId);
      const batchColorIndex = getBatchColorIndex(data, student.batchId);
      return `
        <tr>
          <td><strong>${student.name}</strong></td>
          <td>${student.age}</td>
          <td>${formatDate(student.joiningDate)}</td>
          <td>${student.parentName}</td>
          <td>${student.phone}</td>
          <td><span class="batch-pill batch-color-${batchColorIndex}">${batch?.name || "No batch"}</span></td>
          <td><span class="status-pill status-${student.status}">${student.status === "inactive" ? "Inactive" : "Active"}</span></td>
          <td>${formatDate(student.inactiveFrom)}</td>
          <td>
            <div class="table-actions">
              <button class="small-button edit-student-button" type="button" data-id="${student.id}">Edit</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  for (const button of studentTableBody.querySelectorAll(".edit-student-button")) {
    button.addEventListener("click", () => populateStudentForm(button.dataset.id));
  }

  updateSortButtons();
}

function renderBatches(data) {
  if (data.batches.length === 0) {
    batchTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">No batches yet. Create a batch before adding students.</td>
      </tr>
    `;
    return;
  }

  batchTableBody.innerHTML = data.batches
    .map((batch) => {
      const studentCount = data.students.filter((student) => {
        return student.batchId === batch.id && isStudentActiveOnDate(student, getTodayIso());
      }).length;
      return `
        <tr>
          <td><strong>${batch.name}</strong></td>
          <td>${formatDate(batch.startDate)}</td>
          <td>${batch.location || "-"}</td>
          <td>${batch.schedule || "-"}</td>
          <td>${studentCount}</td>
          <td>
            <div class="table-actions">
              <button class="small-button edit-batch-button" type="button" data-id="${batch.id}">Edit</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  for (const button of batchTableBody.querySelectorAll(".edit-batch-button")) {
    button.addEventListener("click", () => populateBatchForm(button.dataset.id));
  }

}

function renderClassSchedules(data) {
  const month = scheduleMonth.value || "2026-05";
  const monthDates = getMonthDateOptions(month);
  const monthBounds = getMonthBounds(month);

  if (data.batches.length === 0) {
    scheduleTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">Create batches before setting class dates.</td>
      </tr>
    `;
    return;
  }

  scheduleTableBody.innerHTML = data.batches
    .map((batch) => {
      const schedule = getClassSchedule(data, batch.id, month);
      const batchColorIndex = getBatchColorIndex(data, batch.id);
      const dateInputs = schedule.dates
        .map(
          (dateValue, index) => {
            const safeDateValue = monthDates.includes(dateValue) ? dateValue : "";
            const status = normalizeClassStatus(schedule.statuses[index], safeDateValue);
            const statusOptions = safeDateValue
              ? `
                  <option value="scheduled" ${status === "scheduled" ? "selected" : ""}>Scheduled</option>
                  <option value="completed" ${status === "completed" ? "selected" : ""}>Completed</option>
                  <option value="cancelled" ${status === "cancelled" ? "selected" : ""}>Cancelled</option>
                `
              : `<option value="none" selected>No class</option>`;
            return `
            <td>
              <div class="schedule-class-cell">
                <input class="schedule-date-input" type="date" data-batch-id="${batch.id}" data-index="${index}" min="${monthBounds.min}" max="${monthBounds.max}" value="${safeDateValue}" />
                <select class="class-status-select" data-batch-id="${batch.id}" data-index="${index}" ${safeDateValue ? "" : "disabled"}>
                  ${statusOptions}
                </select>
              </div>
              <span class="schedule-date-label">${formatScheduleInputLabel(safeDateValue)}</span>
              <span class="schedule-state-label schedule-state-${status}">${formatClassStatusLabel(status)}</span>
            </td>
          `;
          }
        )
        .join("");

      return `
        <tr>
          <td><span class="batch-pill batch-color-${batchColorIndex}">${batch.name}</span></td>
          ${dateInputs}
        </tr>
      `;
    })
    .join("");

  for (const input of scheduleTableBody.querySelectorAll(".schedule-date-input")) {
    input.addEventListener("change", () => updateClassSchedule(input));
  }

  for (const select of scheduleTableBody.querySelectorAll(".class-status-select")) {
    select.addEventListener("change", () => updateClassStatus(select));
  }
}

function renderStats(data) {
  const totalClassesTaken = getLifetimeClassesTaken(data);
  const totalAmountReceived = getAttendanceRevenueTotal(data);
  const activeStudents = data.students.filter((student) => isStudentActiveOnDate(student, getTodayIso())).length;

  const stats = [
    { label: "Students", value: activeStudents, note: "Active students" },
    { label: "Overall Classes Taken", value: totalClassesTaken, note: PROGRAM_START_LABEL },
    { label: "Total Amount Received", value: formatJPY(totalAmountReceived), note: "Attendance based" },
  ];

  statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <article class="stat-card">
          <p>${stat.label}</p>
          <h3>${stat.value}</h3>
          <span>${stat.note}</span>
        </article>
      `
    )
    .join("");
}

function renderPayments(data) {
  const month = paymentMonth.value || "2026-05";
  const visibleStudents = getSortedStudents(data).filter((student) => isStudentVisibleInMonth(student, data, month));

  if (visibleStudents.length === 0) {
    paymentTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-cell">No active payment entries for ${month}.</td>
      </tr>
    `;
    return;
  }

  paymentTableBody.innerHTML = visibleStudents
    .map((student) => {
      const batch = findBatch(data, student.batchId);
      const batchColorIndex = getBatchColorIndex(data, student.batchId);
      const payment = getPaymentRecord(data, student.id, month);
      const balance = getPaymentBalance(student, payment, data, month);
      const balanceClass = balance.remainingBalance < 0 ? "negative-balance" : "positive-balance";

      return `
        <tr data-student-id="${student.id}">
          <td><strong>${student.name}</strong></td>
          <td><span class="batch-pill batch-color-${batchColorIndex}">${batch?.name || "No batch"}</span></td>
          <td><input class="payment-input" data-field="previousBalance" type="number" value="${payment.previousBalance}" /></td>
          <td><input class="payment-input" data-field="paymentReceived" type="number" value="${payment.paymentReceived}" /></td>
          <td class="checkbox-cell"><input data-field="paid" type="checkbox" ${payment.paid ? "checked" : ""} /></td>
          <td><input class="payment-input" data-field="paymentDate" type="date" value="${payment.paymentDate}" /></td>
          <td>${balance.classesAttended}</td>
          <td>${formatJPY(balance.amountCharged)}</td>
          <td><span class="balance-pill ${balanceClass}">${formatJPY(balance.remainingBalance)}</span></td>
        </tr>
      `;
    })
    .join("");

  for (const input of paymentTableBody.querySelectorAll("input")) {
    input.addEventListener("change", () => updatePayment(input));
  }
}

function renderFinance(data) {
  const selectedMonth = financeMonth.value || paymentMonth.value || "2026-05";
  const totalReceived = getAttendanceRevenueTotal(data);
  const lifetimeClasses = getLifetimeClassesTaken(data);
  const payingStudents = new Set(
    data.students
      .filter((student) => {
        return getReportMonths(data).some((month) => getSessionsAttended(student, data, month) > 0);
      })
      .map((student) => student.id)
  ).size;

  const financeStats = [
    { label: "Total Received", value: formatJPY(totalReceived), note: "Attendance based" },
    { label: "Classes Taken", value: lifetimeClasses, note: PROGRAM_START_LABEL },
    { label: "Charged Students", value: payingStudents, note: "Students with attendance" },
  ];

  financeStatsGrid.innerHTML = financeStats
    .map(
      (stat) => `
        <article class="stat-card">
          <p>${stat.label}</p>
          <h3>${stat.value}</h3>
          <span>${stat.note}</span>
        </article>
      `
    )
    .join("");

  const months = getReportMonths(data);
  monthlyFinanceTableBody.innerHTML =
    months.length === 0
      ? `<tr><td colspan="3" class="empty-cell">No payments entered yet.</td></tr>`
      : months
          .map((month) => {
            const monthTotal = getAttendanceRevenueForMonth(data, month);
            const paidStudents = data.students.filter((student) => {
              return getSessionsAttended(student, data, month) > 0;
            }).length;

            return `
              <tr>
                <td data-label="Month"><strong>${month}</strong></td>
                <td data-label="Total Received">${formatJPY(monthTotal)}</td>
                <td data-label="Charged Students">${paidStudents}</td>
              </tr>
            `;
          })
          .join("");

  studentFinanceTableBody.innerHTML =
    data.students.length === 0
      ? `<tr><td colspan="4" class="empty-cell">No students yet.</td></tr>`
      : getSortedStudents(data)
          .map((student) => {
            const batch = findBatch(data, student.batchId);
            const batchColorIndex = getBatchColorIndex(data, student.batchId);
            const totalPaid = getReportMonths(data).reduce((sum, month) => {
              return sum + getSessionsAttended(student, data, month) * CLASS_FEE;
            }, 0);
            const paidMonths = getReportMonths(data).filter((month) => {
              return getSessionsAttended(student, data, month) > 0;
            }).length;

            return `
              <tr>
                <td data-label="Student"><strong>${student.name}</strong></td>
                <td data-label="Batch"><span class="batch-pill batch-color-${batchColorIndex}">${batch?.name || "No batch"}</span></td>
                <td data-label="Total Received">${formatJPY(totalPaid)}</td>
                <td data-label="Months">${paidMonths}</td>
              </tr>
            `;
          })
          .join("");

  monthlyStudentFinanceTableBody.innerHTML =
    data.students.length === 0
      ? `<tr><td colspan="6" class="empty-cell">No students yet.</td></tr>`
      : getSortedStudents(data)
          .filter((student) => isStudentVisibleInMonth(student, data, selectedMonth))
          .map((student) => {
            const batch = findBatch(data, student.batchId);
            const batchColorIndex = getBatchColorIndex(data, student.batchId);
            const payment = getPaymentRecord(data, student.id, selectedMonth);
            const balance = getPaymentBalance(student, payment, data, selectedMonth);
            const balanceClass = balance.remainingBalance < 0 ? "negative-balance" : "positive-balance";
            const attendanceRevenue = balance.amountCharged;

            return `
              <tr>
                <td data-label="Student"><strong>${student.name}</strong></td>
                <td data-label="Batch"><span class="batch-pill batch-color-${batchColorIndex}">${batch?.name || "No batch"}</span></td>
                <td data-label="Attendance Revenue">${formatJPY(attendanceRevenue)}</td>
                <td data-label="Paid">${payment.paid ? "Yes" : "No"}</td>
                <td data-label="Payment Date">${formatDate(payment.paymentDate)}</td>
                <td data-label="Remaining Balance"><span class="balance-pill ${balanceClass}">${formatJPY(balance.remainingBalance)}</span></td>
              </tr>
            `;
          })
          .join("");
}

function renderAttendance(data) {
  const month = attendanceMonth.value || "2026-05";
  const selectedBatchId = attendanceBatchSelect.value || data.batches[0]?.id || "";
  const selectedBatch = findBatch(data, selectedBatchId);
  const selectedSchedule = selectedBatchId ? getClassSchedule(data, selectedBatchId, month) : null;

  if (data.students.length === 0) {
    attendanceBoard.innerHTML = `<div class="empty-box">Add students to track attendance.</div>`;
    return;
  }

  if (!selectedBatchId || !selectedSchedule) {
    attendanceBoard.innerHTML = `<div class="empty-box">Create a batch before marking attendance.</div>`;
    return;
  }

  const eligibleStudents = data.students.filter((student) => {
    return (
      student.batchId === selectedBatchId &&
      selectedSchedule.dates.some((classDate) => isStudentEligibleForDate(student, classDate))
    );
  });

  if (eligibleStudents.length === 0) {
    attendanceBoard.innerHTML = `<div class="empty-box">No students in ${selectedBatch?.name || "this batch"} are eligible for ${month} based on their joining dates.</div>`;
    return;
  }

  attendanceBoard.innerHTML = eligibleStudents
    .map((student) => {
      const batchColorIndex = getBatchColorIndex(data, student.batchId);
      const buttons = selectedSchedule.dates
        .map((classDate, index) => {
          const classStatus = getClassStatusForSlot(selectedSchedule, index);
          if (!classDate) {
            return `<span class="empty-date">No date</span>`;
          }
          if (classStatus === "cancelled") {
            return `<span class="empty-date cancelled">${formatDate(classDate)} Cancelled</span>`;
          }
          if (!isAttendanceOpenForDate(classStatus, classDate)) {
            return `<span class="empty-date scheduled">${formatDate(classDate)} Scheduled</span>`;
          }
          if (!isStudentEligibleForDate(student, classDate)) {
            return `<span class="empty-date">${formatDate(classDate)} Not joined</span>`;
          }
          const status = getAttendanceStatus(data, student.id, student.batchId, month, classDate);
          const className = status === "P" ? "present" : "absent";
          return `
            <button class="week-button ${className}" type="button" data-student-id="${student.id}" data-batch-id="${student.batchId}" data-date="${classDate}">
              ${formatDate(classDate)} ${status}
            </button>
          `;
        })
        .join("");

      return `
        <div class="attendance-row">
          <div class="attendance-name">
            <span>${student.name}</span>
            <span><span class="batch-pill batch-color-${batchColorIndex}">${selectedBatch?.name || "No batch"}</span> ${getSessionsAttended(student, data, month)}/${selectedSchedule.dates.filter((classDate, index) => {
              return (
                getClassStatusForSlot(selectedSchedule, index) === "completed" &&
                isStudentEligibleForDate(student, classDate)
              );
            }).length}</span>
          </div>
          <div class="week-buttons">${buttons}</div>
        </div>
      `;
    })
    .join("");

  for (const button of attendanceBoard.querySelectorAll(".week-button")) {
    button.addEventListener("click", () => toggleAttendance(button));
  }
}

function renderAnalytics(data) {
  if (data.students.length === 0) {
    analyticsList.innerHTML = `<div class="empty-box">Add students to see analytics.</div>`;
    return;
  }

  const month = attendanceMonth.value || "2026-05";
  const bestAttendance = [...data.students].sort(
    (a, b) => getSessionsAttended(b, data, month) - getSessionsAttended(a, data, month)
  )[0];
  const largestBatch = [...data.batches].sort((a, b) => {
    const aCount = data.students.filter((student) => student.batchId === a.id).length;
    const bCount = data.students.filter((student) => student.batchId === b.id).length;
    return bCount - aCount;
  })[0];

  const items = [
    `Best attendance: ${bestAttendance.name} with ${getSessionsAttended(bestAttendance, data, month)} classes.`,
    `Total classes taken: ${getTotalClassesTaken(data)}.`,
    largestBatch
      ? `Largest batch: ${largestBatch.name} with ${data.students.filter((student) => student.batchId === largestBatch.id).length} students.`
      : "No batch data yet.",
  ];

  analyticsList.innerHTML = items
    .map(
      (item, index) => `
        <div class="analytic-item">
          <strong>Insight ${index + 1}</strong>
          <span>${item}</span>
        </div>
      `
    )
    .join("");
}

function renderDashboard() {
  const data = loadData();
  renderBatchDropdown(data);
  renderAttendanceBatchDropdown(data);
  renderStudents(data);
  renderBatches(data);
  renderClassSchedules(data);
  renderStats(data);
  renderAttendance(data);
  renderAnalytics(data);
  renderPayments(data);
  renderFinance(data);
  ensureCurrentBackupSnapshot();
}

function updateStudentStatusFields() {
  const isInactive = studentStatusSelect.value === "inactive";
  inactiveFromWrap.classList.toggle("hidden", !isInactive);
  inactiveFromInput.required = isInactive;
  if (!isInactive) {
    inactiveFromInput.value = "";
  }
}

function showTab(tabId) {
  for (const panel of tabPanels) {
    panel.classList.toggle("hidden", panel.id !== tabId);
  }

  for (const button of tabButtons) {
    button.classList.toggle("active", button.dataset.tab === tabId);
  }
}

function syncMonthControls(value) {
  scheduleMonth.value = value;
  attendanceMonth.value = value;
  paymentMonth.value = value;
  financeMonth.value = value;
  renderDashboard();
}

function clearStudentForm() {
  studentForm.reset();
  document.getElementById("student-id").value = "";
  studentFormTitle.textContent = "Add student";
  deleteStudentBtn.classList.add("hidden");
  studentFormStatus.textContent = "";
  studentStatusSelect.value = "active";
  updateStudentStatusFields();
  const data = loadData();
  if (data.batches[0]) {
    studentBatchSelect.value = data.batches[0].id;
  }
}

function clearBatchForm() {
  batchForm.reset();
  document.getElementById("batch-id").value = "";
  batchFormTitle.textContent = "Add batch";
  deleteBatchBtn.classList.add("hidden");
  batchFormStatus.textContent = "";
}

function populateStudentForm(studentId) {
  const data = loadData();
  const student = data.students.find((entry) => entry.id === studentId);
  if (!student) {
    return;
  }

  showTab("students-tab");
  document.getElementById("student-id").value = student.id;
  document.getElementById("student-name").value = student.name;
  document.getElementById("student-age").value = student.age;
  document.getElementById("joining-date").value = student.joiningDate;
  document.getElementById("parent-name").value = student.parentName;
  document.getElementById("student-phone").value = student.phone;
  studentBatchSelect.value = student.batchId;
  studentStatusSelect.value = student.status || "active";
  inactiveFromInput.value = student.inactiveFrom || "";
  updateStudentStatusFields();
  studentFormTitle.textContent = `Edit ${student.name}`;
  deleteStudentBtn.classList.toggle("hidden", student.status === "inactive");
  studentFormStatus.textContent =
    student.status === "inactive"
      ? `Editing ${student.name}. This student is inactive from ${formatDate(student.inactiveFrom)}.`
      : `Editing ${student.name}`;
}

function populateBatchForm(batchId) {
  const data = loadData();
  const batch = data.batches.find((entry) => entry.id === batchId);
  if (!batch) {
    return;
  }

  showTab("batches-tab");
  document.getElementById("batch-id").value = batch.id;
  document.getElementById("batch-name").value = batch.name;
  document.getElementById("batch-start-date").value = batch.startDate;
  document.getElementById("batch-location").value = batch.location;
  document.getElementById("batch-schedule").value = batch.schedule;
  batchFormTitle.textContent = `Edit ${batch.name}`;
  deleteBatchBtn.classList.remove("hidden");
  batchFormStatus.textContent = `Editing ${batch.name}`;
}

function deactivateStudent(studentId) {
  const data = loadData();
  const student = data.students.find((entry) => entry.id === studentId);
  if (
    !student ||
    student.status === "inactive" ||
    !window.confirm(`Mark ${student.name} as inactive from today and keep all past history?`)
  ) {
    return;
  }

  const inactiveFrom = getTodayIso();
  saveData({
    ...data,
    students: data.students.map((entry) =>
      entry.id === studentId
        ? normalizeStudent({
            ...entry,
            status: "inactive",
            inactiveFrom,
          }, data.batches)
        : entry
    ),
  });
  renderDashboard();
  populateStudentForm(studentId);
  studentFormStatus.textContent = `${student.name} is inactive from ${formatDate(inactiveFrom)}. Past records are preserved.`;
}

function deleteBatch(batchId) {
  const data = loadData();
  const batch = data.batches.find((entry) => entry.id === batchId);
  const studentCount = data.students.filter((student) => student.batchId === batchId).length;

  if (!batch) {
    return;
  }

  if (studentCount > 0) {
    batchFormStatus.textContent = `Move ${studentCount} student(s) to another batch before deleting ${batch.name}.`;
    return;
  }

  if (!window.confirm(`Delete ${batch.name}?`)) {
    return;
  }

  saveData({
    ...data,
    batches: data.batches.filter((entry) => entry.id !== batchId),
  });
  clearBatchForm();
  renderDashboard();
}

function updateClassSchedule(input) {
  const data = loadData();
  const month = scheduleMonth.value || "2026-05";
  const batchId = input.dataset.batchId;
  const index = Number(input.dataset.index);
  const currentSchedule = getClassSchedule(data, batchId, month);
  const dates = [...currentSchedule.dates];
  const statuses = [...currentSchedule.statuses];
  dates[index] = input.value;

  if (!input.value) {
    statuses[index] = "none";
  } else if (statuses[index] === "cancelled") {
    statuses[index] = "cancelled";
  } else {
    statuses[index] = inferClassStatusFromDate(input.value);
  }

  const classSchedules = data.classSchedules.filter(
    (schedule) => !(schedule.batchId === batchId && schedule.month === month)
  );

  saveData({
    ...data,
    classSchedules: [...classSchedules, normalizeClassSchedule({ batchId, month, dates, statuses })],
  });
  renderDashboard();
  scheduleStatus.textContent = "Class date updated";
}

function updateClassStatus(select) {
  const data = loadData();
  const month = scheduleMonth.value || "2026-05";
  const batchId = select.dataset.batchId;
  const index = Number(select.dataset.index);
  const currentSchedule = getClassSchedule(data, batchId, month);
  const dates = [...currentSchedule.dates];
  const statuses = [...currentSchedule.statuses];

  if (!dates[index]) {
    scheduleStatus.textContent = "Pick a class date first.";
    return;
  }

  statuses[index] = select.value;

  const classSchedules = data.classSchedules.filter(
    (schedule) => !(schedule.batchId === batchId && schedule.month === month)
  );

  saveData({
    ...data,
    classSchedules: [...classSchedules, normalizeClassSchedule({ batchId, month, dates, statuses })],
  });
  renderDashboard();
  scheduleStatus.textContent = `Class marked ${formatClassStatusLabel(select.value).toLowerCase()}.`;
}

function toggleAttendance(button) {
  const data = loadData();
  const month = attendanceMonth.value || "2026-05";
  const studentId = button.dataset.studentId;
  const batchId = button.dataset.batchId;
  const classDate = button.dataset.date;
  const student = data.students.find((entry) => entry.id === studentId);
  const currentClassStatus = getClassStatusForDate(data, batchId, month, classDate);

  if (
    !student ||
    !isStudentEligibleForDate(student, classDate) ||
    !isAttendanceOpenForDate(currentClassStatus, classDate)
  ) {
    attendanceStatus.textContent = "Attendance cannot be marked before the student's joining date.";
    return;
  }

  const currentStatus = getAttendanceStatus(data, studentId, batchId, month, classDate);
  const nextStatus = currentStatus === "P" ? "A" : "P";
  const attendanceRecords = data.attendanceRecords.filter(
    (record) =>
      !(
        record.studentId === studentId &&
        record.batchId === batchId &&
        record.month === month &&
        record.classDate === classDate
      )
  );

  saveData({
    ...data,
    attendanceRecords: [
      ...attendanceRecords,
      normalizeAttendanceRecord({ studentId, batchId, month, classDate, status: nextStatus }),
    ],
  });

  if (currentClassStatus === "scheduled" && classDate <= getTodayIso()) {
    const currentSchedule = getClassSchedule(loadData(), batchId, month);
    const slotIndex = currentSchedule.dates.findIndex((dateValue) => dateValue === classDate);
    if (slotIndex >= 0) {
      const updatedStatuses = [...currentSchedule.statuses];
      updatedStatuses[slotIndex] = "completed";
      const refreshedData = loadData();
      const classSchedules = refreshedData.classSchedules.filter(
        (schedule) => !(schedule.batchId === batchId && schedule.month === month)
      );

      saveData({
        ...refreshedData,
        classSchedules: [
          ...classSchedules,
          normalizeClassSchedule({
            batchId,
            month,
            dates: currentSchedule.dates,
            statuses: updatedStatuses,
          }),
        ],
      });
    }
  }

  renderDashboard();
  attendanceStatus.textContent = "Attendance updated";
}

function updatePayment(input) {
  const row = input.closest("tr");
  const studentId = row?.dataset.studentId;
  const month = paymentMonth.value || "2026-05";
  const data = loadData();
  const existingPayment = getPaymentRecord(data, studentId, month);
  const field = input.dataset.field;
  const rawValue = field === "paid" ? input.checked : input.value;

  const nextPayment = {
    ...existingPayment,
    studentId,
    month,
    [field]:
      field === "previousBalance" || field === "paymentReceived"
        ? Number(rawValue || 0)
        : rawValue,
  };

  const payments = data.payments.filter(
    (payment) => !(payment.studentId === studentId && payment.month === month)
  );

  saveData({ ...data, payments: [...payments, nextPayment] });
  renderDashboard();
  paymentStatus.textContent = "Payment updated";
}

function completeMonth() {
  const data = loadData();
  const month = paymentMonth.value || "2026-05";
  const nextMonth = addMonths(month, 1);
  const confirmed = window.confirm(`Forward ${month} remaining balances to ${nextMonth}?`);
  if (!confirmed) {
    return;
  }

  const nextPayments = data.payments.filter((payment) => payment.month !== nextMonth);

  for (const student of data.students) {
    const currentPayment = getPaymentRecord(data, student.id, month);
    const balance = getPaymentBalance(student, currentPayment, data, month);
    const shouldCreateNextMonthPayment =
      isStudentVisibleInMonth(student, data, nextMonth) || balance.remainingBalance !== 0;

    if (!shouldCreateNextMonthPayment) {
      continue;
    }

    nextPayments.push(
      normalizePayment({
        studentId: student.id,
        month: nextMonth,
        previousBalance: balance.remainingBalance,
        paymentReceived: 0,
        paid: false,
        paymentDate: "",
      })
    );
  }

  saveData({ ...data, payments: nextPayments });
  paymentMonth.value = nextMonth;
  attendanceMonth.value = nextMonth;
  scheduleMonth.value = nextMonth;
  financeMonth.value = nextMonth;
  renderDashboard();
  paymentStatus.textContent = `${month} completed. Balances forwarded to ${nextMonth}.`;
}

async function checkAuth() {
  if (isFilePreview()) {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    renderDashboard();
    return;
  }

  const response = await fetch("/api/auth-status");
  const data = await response.json();

  if (data.authenticated) {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    await hydrateRemoteData();
    renderDashboard();
  } else {
    dashboardView.classList.add("hidden");
    loginView.classList.remove("hidden");
  }
}

for (const button of tabButtons) {
  button.addEventListener("click", () => showTab(button.dataset.tab));
}

for (const button of sortButtons) {
  button.addEventListener("click", () => {
    const key = button.dataset.sort;
    studentSort = {
      key,
      direction: studentSort.key === key && studentSort.direction === "asc" ? "desc" : "asc",
    };
    renderDashboard();
  });
}

exportBackupBtn.addEventListener("click", exportBackup);
importBackupBtn.addEventListener("click", () => importBackupInput.click());
importBackupInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    importBackupFromText(text);
  } catch {
    backupStatus.textContent = "Backup import failed. Use a JSON file exported from this dashboard.";
  } finally {
    importBackupInput.value = "";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  const password = document.getElementById("password").value;
  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Login failed" }));
    loginError.textContent = data.error || "Login failed";
    return;
  }

  document.getElementById("password").value = "";
  await checkAuth();
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  await checkAuth();
});

addStudentBtn.addEventListener("click", () => {
  clearStudentForm();
  showTab("students-tab");
});

addBatchBtn.addEventListener("click", () => {
  clearBatchForm();
  showTab("batches-tab");
});

clearStudentFormBtn.addEventListener("click", clearStudentForm);
clearBatchFormBtn.addEventListener("click", clearBatchForm);
studentStatusSelect.addEventListener("change", updateStudentStatusFields);
scheduleMonth.addEventListener("change", () => syncMonthControls(scheduleMonth.value));
attendanceMonth.addEventListener("change", () => syncMonthControls(attendanceMonth.value));
attendanceBatchSelect.addEventListener("change", renderDashboard);
paymentMonth.addEventListener("change", () => syncMonthControls(paymentMonth.value));
financeMonth.addEventListener("change", () => syncMonthControls(financeMonth.value));
completeMonthBtn.addEventListener("click", completeMonth);

deleteStudentBtn.addEventListener("click", () => {
  const studentId = document.getElementById("student-id").value;
  if (studentId) {
    deactivateStudent(studentId);
  }
});

deleteBatchBtn.addEventListener("click", () => {
  const batchId = document.getElementById("batch-id").value;
  if (batchId) {
    deleteBatch(batchId);
  }
});

studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = loadData();
  const id = document.getElementById("student-id").value;
  const existingStudent = data.students.find((student) => student.id === id);
  const status = studentStatusSelect.value;
  const inactiveFrom = inactiveFromInput.value;
  const joiningDate = document.getElementById("joining-date").value;

  if (status === "inactive" && !inactiveFrom) {
    studentFormStatus.textContent = "Choose the inactive date for this student.";
    return;
  }

  if (inactiveFrom && joiningDate && inactiveFrom < joiningDate) {
    studentFormStatus.textContent = "Inactive date cannot be earlier than joining date.";
    return;
  }

  const record = {
    id: id || crypto.randomUUID(),
    name: document.getElementById("student-name").value.trim(),
    age: Number(document.getElementById("student-age").value),
    joiningDate,
    parentName: document.getElementById("parent-name").value.trim(),
    phone: document.getElementById("student-phone").value.trim(),
    batchId: studentBatchSelect.value,
    status,
    inactiveFrom: status === "inactive" ? inactiveFrom : "",
    attendance: existingStudent?.attendance || ["A", "A", "A", "A", "A"],
  };

  const students = id
    ? data.students.map((student) => (student.id === id ? record : student))
    : [record, ...data.students];

  saveData({ ...data, students });
  renderDashboard();
  populateStudentForm(record.id);
  studentFormStatus.textContent =
    record.status === "inactive"
      ? `${record.name} saved as inactive from ${formatDate(record.inactiveFrom)}. Past records stay in history.`
      : id
        ? "Student updated"
        : "Student added";
});

batchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = loadData();
  const id = document.getElementById("batch-id").value;

  const record = {
    id: id || crypto.randomUUID(),
    name: document.getElementById("batch-name").value.trim(),
    startDate: document.getElementById("batch-start-date").value,
    location: document.getElementById("batch-location").value.trim(),
    schedule: document.getElementById("batch-schedule").value.trim(),
  };

  const batches = id
    ? data.batches.map((batch) => (batch.id === id ? record : batch))
    : [record, ...data.batches];

  saveData({ ...data, batches });
  renderDashboard();
  populateBatchForm(record.id);
  batchFormStatus.textContent = id ? "Batch updated" : "Batch added";
});

checkAuth().catch(() => {
  loginError.textContent = "Sign-in or cloud sync is not available yet. Check your Vercel environment variables.";
});
