// utils/datetime.js
// Date and time utility functions

const moment = require('moment-timezone');
require('moment/locale/th');

const { DATETIME, DEFAULTS } = require('../config/constants');

// Set default timezone
moment.tz.setDefault(DEFAULTS.TIMEZONE);

// Format date based on locale
const formatDate = (date, locale = 'th-TH', format = null) => {
    if (!date) return '';
    
    const m = moment(date);
    
    // Use custom format if provided
    if (format) {
        return m.format(format);
    }
    
    // Use locale-specific format
    if (locale === 'th-TH') {
        m.locale('th');
        return m.format(DATETIME.DATE_FORMAT) + ' ' + m.year() + 543; // Convert to Buddhist year
    } else {
        m.locale('en');
        return m.format(DATETIME.DATE_FORMAT_EN);
    }
};

// Format time based on locale
const formatTime = (date, locale = 'th-TH') => {
    if (!date) return '';
    
    const m = moment(date);
    
    if (locale === 'th-TH') {
        return m.format(DATETIME.TIME_FORMAT) + ' น.';
    } else {
        return m.format(DATETIME.TIME_FORMAT_EN);
    }
};

// Format datetime based on locale
const formatDateTime = (date, locale = 'th-TH') => {
    if (!date) return '';
    
    const m = moment(date);
    
    if (locale === 'th-TH') {
        m.locale('th');
        const buddhistYear = m.year() + 543;
        return m.format('DD/MM/') + buddhistYear + ' ' + m.format('HH:mm') + ' น.';
    } else {
        m.locale('en');
        return m.format(DATETIME.DATETIME_FORMAT_EN);
    }
};

// Get relative time (e.g., "2 hours ago")
const getRelativeTime = (date, locale = 'th-TH') => {
    if (!date) return '';
    
    const m = moment(date);
    m.locale(locale === 'th-TH' ? 'th' : 'en');
    
    return m.fromNow();
};

// Convert date to ISO format for database
const toISODate = (date) => {
    if (!date) return null;
    return moment(date).toISOString();
};

// Parse date string with multiple format support
const parseDate = (dateString, formats = null) => {
    if (!dateString) return null;
    
    // Default formats to try
    const defaultFormats = [
        'YYYY-MM-DD',
        'DD/MM/YYYY',
        'MM/DD/YYYY',
        'YYYY-MM-DD HH:mm:ss',
        'DD/MM/YYYY HH:mm:ss',
        moment.ISO_8601
    ];
    
    const formatsToTry = formats || defaultFormats;
    
    // Try to parse with each format
    for (const format of formatsToTry) {
        const parsed = moment(dateString, format, true);
        if (parsed.isValid()) {
            return parsed.toDate();
        }
    }
    
    // Try moment's automatic parsing as last resort
    const auto = moment(dateString);
    return auto.isValid() ? auto.toDate() : null;
};

// Get start of day
const getStartOfDay = (date = null, timezone = DEFAULTS.TIMEZONE) => {
    const m = date ? moment(date) : moment();
    return m.tz(timezone).startOf('day').toDate();
};

// Get end of day
const getEndOfDay = (date = null, timezone = DEFAULTS.TIMEZONE) => {
    const m = date ? moment(date) : moment();
    return m.tz(timezone).endOf('day').toDate();
};

// Get date range for reports
const getDateRange = (rangeType) => {
    const now = moment();
    let start, end;
    
    switch (rangeType) {
        case 'today':
            start = now.clone().startOf('day');
            end = now.clone().endOf('day');
            break;
        case 'yesterday':
            start = now.clone().subtract(1, 'day').startOf('day');
            end = now.clone().subtract(1, 'day').endOf('day');
            break;
        case 'week':
            start = now.clone().startOf('week');
            end = now.clone().endOf('week');
            break;
        case 'lastWeek':
            start = now.clone().subtract(1, 'week').startOf('week');
            end = now.clone().subtract(1, 'week').endOf('week');
            break;
        case 'month':
            start = now.clone().startOf('month');
            end = now.clone().endOf('month');
            break;
        case 'lastMonth':
            start = now.clone().subtract(1, 'month').startOf('month');
            end = now.clone().subtract(1, 'month').endOf('month');
            break;
        case 'quarter':
            start = now.clone().startOf('quarter');
            end = now.clone().endOf('quarter');
            break;
        case 'year':
            start = now.clone().startOf('year');
            end = now.clone().endOf('year');
            break;
        case 'last7days':
            start = now.clone().subtract(6, 'days').startOf('day');
            end = now.clone().endOf('day');
            break;
        case 'last30days':
            start = now.clone().subtract(29, 'days').startOf('day');
            end = now.clone().endOf('day');
            break;
        case 'last90days':
            start = now.clone().subtract(89, 'days').startOf('day');
            end = now.clone().endOf('day');
            break;
        default:
            start = now.clone().startOf('day');
            end = now.clone().endOf('day');
    }
    
    return {
        start: start.toDate(),
        end: end.toDate()
    };
};

// Calculate age or duration
const getDuration = (start, end = null) => {
    const startMoment = moment(start);
    const endMoment = end ? moment(end) : moment();
    
    const duration = moment.duration(endMoment.diff(startMoment));
    
    return {
        years: duration.years(),
        months: duration.months(),
        days: duration.days(),
        hours: duration.hours(),
        minutes: duration.minutes(),
        seconds: duration.seconds(),
        humanize: duration.humanize(),
        asMinutes: duration.asMinutes(),
        asHours: duration.asHours(),
        asDays: duration.asDays()
    };
};

// Check if date is in the past
const isPast = (date) => {
    return moment(date).isBefore(moment());
};

// Check if date is in the future
const isFuture = (date) => {
    return moment(date).isAfter(moment());
};

// Check if date is today
const isToday = (date) => {
    return moment(date).isSame(moment(), 'day');
};

// Check if date is within range
const isDateInRange = (date, startDate, endDate) => {
    const m = moment(date);
    return m.isSameOrAfter(moment(startDate)) && m.isSameOrBefore(moment(endDate));
};

// Add time to date
const addTime = (date, amount, unit) => {
    return moment(date).add(amount, unit).toDate();
};

// Subtract time from date
const subtractTime = (date, amount, unit) => {
    return moment(date).subtract(amount, unit).toDate();
};

// Get array of dates between two dates
const getDatesBetween = (startDate, endDate, includeEnd = true) => {
    const dates = [];
    const current = moment(startDate);
    const end = moment(endDate);
    
    while (current.isBefore(end) || (includeEnd && current.isSame(end, 'day'))) {
        dates.push(current.toDate());
        current.add(1, 'day');
    }
    
    return dates;
};

// Format duration for display
const formatDuration = (minutes, locale = 'th-TH') => {
    const duration = moment.duration(minutes, 'minutes');
    const hours = Math.floor(duration.asHours());
    const mins = duration.minutes();
    
    if (locale === 'th-TH') {
        if (hours > 0) {
            return `${hours} ชั่วโมง${mins > 0 ? ` ${mins} นาที` : ''}`;
        }
        return `${mins} นาที`;
    } else {
        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} minute${mins > 1 ? 's' : ''}` : ''}`;
        }
        return `${mins} minute${mins > 1 ? 's' : ''}`;
    }
};

// Get week number of year
const getWeekNumber = (date) => {
    return moment(date).week();
};

// Convert Buddhist year to Gregorian
const buddhistToGregorian = (buddhistYear) => {
    return buddhistYear - 543;
};

// Convert Gregorian year to Buddhist
const gregorianToBuddhist = (gregorianYear) => {
    return gregorianYear + 543;
};

// Parse Thai date string
const parseThaiDate = (thaiDateString) => {
    // Extract date parts from Thai format (DD/MM/YYYY where YYYY is Buddhist year)
    const match = thaiDateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return null;
    
    const [_, day, month, buddhistYear] = match;
    const gregorianYear = buddhistToGregorian(parseInt(buddhistYear));
    
    return moment(`${gregorianYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toDate();
};

// SQL Server datetime format
const toSQLServerDateTime = (date) => {
    if (!date) return null;
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
};

module.exports = {
    formatDate,
    formatTime,
    formatDateTime,
    getRelativeTime,
    toISODate,
    parseDate,
    getStartOfDay,
    getEndOfDay,
    getDateRange,
    getDuration,
    isPast,
    isFuture,
    isToday,
    isDateInRange,
    addTime,
    subtractTime,
    getDatesBetween,
    formatDuration,
    getWeekNumber,
    buddhistToGregorian,
    gregorianToBuddhist,
    parseThaiDate,
    toSQLServerDateTime,
    
    // Re-export moment for direct use when needed
    moment
};