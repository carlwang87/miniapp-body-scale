function pad(value) {
  return String(value).padStart(2, '0');
}

function toDate(input) {
  if (!input) {
    return new Date();
  }
  return input instanceof Date ? input : new Date(input);
}

function formatDate(input) {
  const date = toDate(input);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(input) {
  const date = toDate(input);
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatShort(input) {
  const date = toDate(input);
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getAge(birthday, at = new Date()) {
  if (!birthday) {
    return null;
  }
  const birth = toDate(birthday);
  let age = at.getFullYear() - birth.getFullYear();
  const monthDiff = at.getMonth() - birth.getMonth();
  const dayDiff = at.getDate() - birth.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function getRangeStart(rangeKey) {
  const now = new Date();
  const start = new Date(now);

  if (rangeKey === '7d') {
    start.setDate(now.getDate() - 7);
  } else if (rangeKey === '30d') {
    start.setDate(now.getDate() - 30);
  } else if (rangeKey === '90d') {
    start.setDate(now.getDate() - 90);
  } else if (rangeKey === '1y') {
    start.setFullYear(now.getFullYear() - 1);
  } else {
    return null;
  }

  start.setHours(0, 0, 0, 0);
  return start;
}

function isInRange(input, rangeKey) {
  const start = getRangeStart(rangeKey);
  if (!start) {
    return true;
  }
  return toDate(input).getTime() >= start.getTime();
}

function sortByTimeDesc(records) {
  return [...records].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
}

function sortByTimeAsc(records) {
  return [...records].sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
}

module.exports = {
  formatDate,
  formatDateTime,
  formatShort,
  getAge,
  getRangeStart,
  isInRange,
  sortByTimeAsc,
  sortByTimeDesc
};
