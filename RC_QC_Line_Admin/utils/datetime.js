const moment = require('moment-timezone');

// Set default timezone
const TIMEZONE = process.env.TIMEZONE || 'Asia/Bangkok';
moment.tz.setDefault(TIMEZONE);

/**
 * Format date based on locale
 */
function formatDate(date, locale = 'th-TH') {
    if (!date) return '-';
    
    const m = moment(date).tz(TIMEZONE);
    
    if (locale === 'th-TH') {
        // Thai format with Buddhist year
        const buddhistYear = m.year() + 543;
        return m.format('DD/MM/') + buddhistYear;
    } else {
        return m.format('MM/DD/YYYY');
    }
}

/**
 * Format datetime based on locale
 */
function formatDateTime(date, locale = 'th-TH') {
    if (!date) return '-';
    
    const m = moment(date).tz(TIMEZONE);
    
    if (locale === 'th-TH') {
        const buddhistYear = m.year() + 543;
        return m.format('DD/MM/') + buddhistYear + m.format(' HH:mm น.');
    } else {
        return m.format('MM/DD/YYYY hh:mm A');
    }
}

/**
 * Get relative time
 */
function timeAgo(date, locale = 'th-TH') {
    moment.locale(locale === 'th-TH' ? 'th' : 'en');
    return moment(date).tz(TIMEZONE).fromNow();
}

/**
 * Parse date string
 */
function parseDate(dateString, format = 'YYYY-MM-DD') {
    return moment(dateString, format).tz(TIMEZONE);
}

/**
 * Get start of day
 */
function startOfDay(date = new Date()) {
    return moment(date).tz(TIMEZONE).startOf('day').toDate();
}

/**
 * Get end of day
 */
function endOfDay(date = new Date()) {
    return moment(date).tz(TIMEZONE).endOf('day').toDate();
}

/**
 * Get date range
 */
function getDateRange(range) {
    const now = moment().tz(TIMEZONE);
    
    switch (range) {
        case 'today':
            return {
                start: now.clone().startOf('day').toDate(),
                end: now.clone().endOf('day').toDate()
            };
        case 'yesterday':
            return {
                start: now.clone().subtract(1, 'day').startOf('day').toDate(),
                end: now.clone().subtract(1, 'day').endOf('day').toDate()
            };
        case 'thisWeek':
            return {
                start: now.clone().startOf('week').toDate(),
                end: now.clone().endOf('week').toDate()
            };
        case 'lastWeek':
            return {
                start: now.clone().subtract(1, 'week').startOf('week').toDate(),
                end: now.clone().subtract(1, 'week').endOf('week').toDate()
            };
        case 'thisMonth':
            return {
                start: now.clone().startOf('month').toDate(),
                end: now.clone().endOf('month').toDate()
            };
        case 'lastMonth':
            return {
                start: now.clone().subtract(1, 'month').startOf('month').toDate(),
                end: now.clone().subtract(1, 'month').endOf('month').toDate()
            };
        case 'last7Days':
            return {
                start: now.clone().subtract(7, 'days').startOf('day').toDate(),
                end: now.clone().endOf('day').toDate()
            };
        case 'last30Days':
            return {
                start: now.clone().subtract(30, 'days').startOf('day').toDate(),
                end: now.clone().endOf('day').toDate()
            };
        default:
            return null;
    }
}

/**
 * Format duration
 */
function formatDuration(seconds, locale = 'th-TH') {
    const duration = moment.duration(seconds, 'seconds');
    const parts = [];
    
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    
    if (locale === 'th-TH') {
        if (days > 0) parts.push(`${days} วัน`);
        if (hours > 0) parts.push(`${hours} ชั่วโมง`);
        if (minutes > 0) parts.push(`${minutes} นาที`);
    } else {
        if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }
    
    return parts.join(' ') || '0 minutes';
}

/**
 * Check if date is today
 */
function isToday(date) {
    return moment(date).tz(TIMEZONE).isSame(moment().tz(TIMEZONE), 'day');
}

/**
 * Check if date is in past
 */
function isPast(date) {
    return moment(date).tz(TIMEZONE).isBefore(moment().tz(TIMEZONE));
}

/**
 * Add business days
 */
function addBusinessDays(date, days) {
    const m = moment(date).tz(TIMEZONE);
    let daysAdded = 0;
    
    while (daysAdded < days) {
        m.add(1, 'day');
        if (m.day() !== 0 && m.day() !== 6) { // Skip weekends
            daysAdded++;
        }
    }
    
    return m.toDate();
}

module.exports = {
    formatDate,
    formatDateTime,
    timeAgo,
    parseDate,
    startOfDay,
    endOfDay,
    getDateRange,
    formatDuration,
    isToday,
    isPast,
    addBusinessDays,
    TIMEZONE
};