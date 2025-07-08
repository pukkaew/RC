const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const path = require('path');

const init = async () => {
    await i18next
        .use(Backend)
        .use(middleware.LanguageDetector)
        .init({
            backend: {
                loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
                addPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
            },
            fallbackLng: process.env.DEFAULT_LANGUAGE || 'th-TH',
            supportedLngs: process.env.SUPPORTED_LANGUAGES?.split(',') || ['th-TH', 'en-US'],
            preload: process.env.SUPPORTED_LANGUAGES?.split(',') || ['th-TH', 'en-US'],
            ns: ['common', 'auth', 'dashboard', 'lots', 'images', 'users', 'reports', 'errors', 'help'],
            defaultNS: 'common',
            detection: {
                order: ['session', 'querystring', 'cookie', 'header'],
                lookupQuerystring: 'lang',
                lookupCookie: 'i18next',
                lookupSession: 'language',
                caches: ['session', 'cookie']
            },
            interpolation: {
                escapeValue: false
            },
            debug: process.env.NODE_ENV === 'development'
        });
};

module.exports = {
    init,
    i18next,
    middleware
};