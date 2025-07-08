@echo off
echo Creating RC_QC_Line_Admin project structure...

:: Create main directories
mkdir RC_QC_Line_Admin
cd RC_QC_Line_Admin

:: Root directories
mkdir config
mkdir controllers
mkdir middleware
mkdir models
mkdir routes
mkdir services
mkdir utils
mkdir views
mkdir public
mkdir logs
mkdir locales

:: Config subdirectories
mkdir config\certs

:: Views subdirectories
mkdir views\auth
mkdir views\dashboard
mkdir views\lots
mkdir views\images
mkdir views\users
mkdir views\reports
mkdir views\audit
mkdir views\layouts
mkdir views\partials
mkdir views\errors

:: Public subdirectories
mkdir public\css
mkdir public\js
mkdir public\images
mkdir public\uploads
mkdir public\fonts
mkdir public\vendor

:: Locales subdirectories
mkdir locales\th-TH
mkdir locales\en-US

:: Create empty files
:: Root files
type nul > .env.example
type nul > .gitignore
type nul > package.json
type nul > README.md
type nul > server.js

:: Config files
type nul > config\database.js
type nul > config\session.js
type nul > config\multer.js
type nul > config\constants.js
type nul > config\i18n.js

:: Controller files
type nul > controllers\AuthController.js
type nul > controllers\DashboardController.js
type nul > controllers\LotController.js
type nul > controllers\ImageController.js
type nul > controllers\UserController.js
type nul > controllers\ReportController.js
type nul > controllers\AuditController.js

:: Middleware files
type nul > middleware\auth.js
type nul > middleware\role.js
type nul > middleware\audit.js
type nul > middleware\validation.js
type nul > middleware\errorHandler.js
type nul > middleware\i18n.js

:: Model files
type nul > models\AdminUser.js
type nul > models\AdminSession.js
type nul > models\AuditLog.js
type nul > models\Lot.js
type nul > models\Image.js
type nul > models\User.js

:: Service files
type nul > services\AuthService.js
type nul > services\DatabaseService.js
type nul > services\FileService.js
type nul > services\ReportService.js
type nul > services\AuditService.js
type nul > services\EmailService.js

:: Routes files
type nul > routes\auth.js
type nul > routes\dashboard.js
type nul > routes\lots.js
type nul > routes\images.js
type nul > routes\users.js
type nul > routes\reports.js
type nul > routes\audit.js
type nul > routes\api.js

:: Utils files
type nul > utils\helpers.js
type nul > utils\validators.js
type nul > utils\logger.js
type nul > utils\bcrypt.js
type nul > utils\datetime.js

:: View files - Layouts
type nul > views\layouts\main.ejs
type nul > views\layouts\auth.ejs

:: View files - Partials
type nul > views\partials\header.ejs
type nul > views\partials\sidebar.ejs
type nul > views\partials\footer.ejs
type nul > views\partials\scripts.ejs
type nul > views\partials\alerts.ejs

:: View files - Auth
type nul > views\auth\login.ejs
type nul > views\auth\forgot-password.ejs

:: View files - Dashboard
type nul > views\dashboard\index.ejs

:: View files - Lots
type nul > views\lots\index.ejs
type nul > views\lots\view.ejs
type nul > views\lots\edit.ejs

:: View files - Images
type nul > views\images\index.ejs
type nul > views\images\grid.ejs
type nul > views\images\list.ejs

:: View files - Users
type nul > views\users\index.ejs
type nul > views\users\create.ejs
type nul > views\users\edit.ejs

:: View files - Reports
type nul > views\reports\index.ejs
type nul > views\reports\daily.ejs
type nul > views\reports\export.ejs

:: View files - Audit
type nul > views\audit\index.ejs

:: View files - Errors
type nul > views\errors\404.ejs
type nul > views\errors\403.ejs
type nul > views\errors\500.ejs

:: Public files
type nul > public\css\app.css
type nul > public\js\app.js
type nul > public\js\dashboard.js
type nul > public\js\lots.js
type nul > public\js\images.js
type nul > public\js\reports.js

:: Locale files - Thai
type nul > locales\th-TH\common.json
type nul > locales\th-TH\auth.json
type nul > locales\th-TH\dashboard.json
type nul > locales\th-TH\lots.json
type nul > locales\th-TH\images.json
type nul > locales\th-TH\reports.json
type nul > locales\th-TH\users.json
type nul > locales\th-TH\errors.json
type nul > locales\th-TH\help.json

:: Locale files - English
type nul > locales\en-US\common.json
type nul > locales\en-US\auth.json
type nul > locales\en-US\dashboard.json
type nul > locales\en-US\lots.json
type nul > locales\en-US\images.json
type nul > locales\en-US\reports.json
type nul > locales\en-US\users.json
type nul > locales\en-US\errors.json
type nul > locales\en-US\help.json

echo.
echo Project structure created successfully!
echo.
echo Project Structure:
echo RC_QC_Line_Admin/
echo ├── config/
echo │   ├── certs/
echo │   ├── database.js
echo │   ├── session.js
echo │   ├── multer.js
echo │   ├── constants.js
echo │   └── i18n.js
echo ├── controllers/
echo │   ├── AuthController.js
echo │   ├── DashboardController.js
echo │   ├── LotController.js
echo │   ├── ImageController.js
echo │   ├── UserController.js
echo │   ├── ReportController.js
echo │   └── AuditController.js
echo ├── middleware/
echo │   ├── auth.js
echo │   ├── role.js
echo │   ├── audit.js
echo │   ├── validation.js
echo │   ├── errorHandler.js
echo │   └── i18n.js
echo ├── models/
echo │   ├── AdminUser.js
echo │   ├── AdminSession.js
echo │   ├── AuditLog.js
echo │   ├── Lot.js
echo │   ├── Image.js
echo │   └── User.js
echo ├── routes/
echo │   ├── auth.js
echo │   ├── dashboard.js
echo │   ├── lots.js
echo │   ├── images.js
echo │   ├── users.js
echo │   ├── reports.js
echo │   ├── audit.js
echo │   └── api.js
echo ├── services/
echo │   ├── AuthService.js
echo │   ├── DatabaseService.js
echo │   ├── FileService.js
echo │   ├── ReportService.js
echo │   ├── AuditService.js
echo │   └── EmailService.js
echo ├── utils/
echo │   ├── helpers.js
echo │   ├── validators.js
echo │   ├── logger.js
echo │   ├── bcrypt.js
echo │   └── datetime.js
echo ├── views/
echo │   ├── layouts/
echo │   ├── partials/
echo │   ├── auth/
echo │   ├── dashboard/
echo │   ├── lots/
echo │   ├── images/
echo │   ├── users/
echo │   ├── reports/
echo │   ├── audit/
echo │   └── errors/
echo ├── public/
echo │   ├── css/
echo │   ├── js/
echo │   ├── images/
echo │   ├── uploads/
echo │   ├── fonts/
echo │   └── vendor/
echo ├── locales/
echo │   ├── th-TH/
echo │   └── en-US/
echo ├── logs/
echo ├── .env.example
echo ├── .gitignore
echo ├── package.json
echo ├── README.md
echo └── server.js
echo.
pause