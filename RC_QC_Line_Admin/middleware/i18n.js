const i18next = require('i18next');
const middleware = require('i18next-http-middleware');

/**
 * i18n middleware to handle language detection and translation
 */
const i18nMiddleware = (req, res, next) => {
    // Apply i18next middleware
    middleware.handle(i18next)(req, res, () => {
        // Override language if specified in session or query
        if (req.session?.language) {
            req.i18n.changeLanguage(req.session.language);
        } else if (req.query.lang) {
            const lang = req.query.lang;
            if (i18next.languages.includes(lang)) {
                req.i18n.changeLanguage(lang);
                req.session.language = lang;
            }
        }
        
        // Set current language in res.locals
        res.locals.currentLanguage = req.i18n.language;
        res.locals.t = req.t;
        res.locals.i18n = req.i18n;
        
        // Add language helper functions
        res.locals.getLanguageName = (code) => {
            const names = {
                'th-TH': 'ไทย',
                'en-US': 'English',
                'zh-CN': '中文',
                'ja-JP': '日本語'
            };
            return names[code] || code;
        };
        
        res.locals.getLanguageFlag = (code) => {
            const flags = {
                'th-TH': '🇹🇭',
                'en-US': '🇺🇸',
                'zh-CN': '🇨🇳',
                'ja-JP': '🇯🇵'
            };
            return flags[code] || '🌐';
        };
        
        // Format date based on locale
        res.locals.formatDate = (date, format) => {
            const moment = require('moment-timezone');
            moment.locale(req.i18n.language === 'th-TH' ? 'th' : 'en');
            
            const m = moment(date).tz(process.env.TIMEZONE || 'Asia/Bangkok');
            
            if (format) {
                return m.format(format);
            }
            
            // Default formats based on language
            if (req.i18n.language === 'th-TH') {
                return m.format('DD/MM/YYYY');
            } else {
                return m.format('MM/DD/YYYY');
            }
        };
        
        res.locals.formatDateTime = (date) => {
            const moment = require('moment-timezone');
            moment.locale(req.i18n.language === 'th-TH' ? 'th' : 'en');
            
            const m = moment(date).tz(process.env.TIMEZONE || 'Asia/Bangkok');
            
            if (req.i18n.language === 'th-TH') {
                return m.format('DD/MM/YYYY HH:mm น.');
            } else {
                return m.format('MM/DD/YYYY hh:mm A');
            }
        };
        
        res.locals.formatNumber = (number, decimals = 0) => {
            if (typeof number !== 'number') {
                number = parseFloat(number) || 0;
            }
            
            return new Intl.NumberFormat(req.i18n.language, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(number);
        };
        
        res.locals.formatCurrency = (amount, currency = 'THB') => {
            if (typeof amount !== 'number') {
                amount = parseFloat(amount) || 0;
            }
            
            return new Intl.NumberFormat(req.i18n.language, {
                style: 'currency',
                currency: currency
            }).format(amount);
        };
        
        res.locals.formatFileSize = (bytes) => {
            if (!bytes) return req.t('common:file.empty');
            
            const sizes = req.t('common:file.sizes', { returnObjects: true });
            const k = 1024;
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
        };
        
        res.locals.timeAgo = (date) => {
            const moment = require('moment-timezone');
            moment.locale(req.i18n.language === 'th-TH' ? 'th' : 'en');
            
            return moment(date).tz(process.env.TIMEZONE || 'Asia/Bangkok').fromNow();
        };
        
        next();
    });
};

module.exports = i18nMiddleware;