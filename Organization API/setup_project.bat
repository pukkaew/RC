@echo off
echo Creating Organization Structure Management System Project...

:: Root folders
mkdir src
mkdir src\config
mkdir src\controllers
mkdir src\models
mkdir src\routes
mkdir src\middleware
mkdir src\services
mkdir src\utils
mkdir src\validators
mkdir views
mkdir views\layouts
mkdir views\companies
mkdir views\branches
mkdir views\divisions
mkdir views\departments
mkdir views\api-keys
mkdir views\dashboard
mkdir public
mkdir public\css
mkdir public\js
mkdir public\images
mkdir database
mkdir database\scripts
mkdir database\migrations
mkdir database\seeds
mkdir tests
mkdir tests\unit
mkdir tests\integration
mkdir docs
mkdir logs

:: Create empty files
:: Root files
type nul > .env
type nul > .env.example
type nul > .gitignore
type nul > package.json
type nul > README.md
type nul > server.js

:: Config files
type nul > src\config\database.js
type nul > src\config\app.js
type nul > src\config\api.js

:: Controller files
type nul > src\controllers\companyController.js
type nul > src\controllers\branchController.js
type nul > src\controllers\divisionController.js
type nul > src\controllers\departmentController.js
type nul > src\controllers\apiKeyController.js
type nul > src\controllers\dashboardController.js
type nul > src\controllers\apiController.js

:: Model files
type nul > src\models\Company.js
type nul > src\models\Branch.js
type nul > src\models\Division.js
type nul > src\models\Department.js
type nul > src\models\ApiKey.js
type nul > src\models\ApiLog.js

:: Route files
type nul > src\routes\web.js
type nul > src\routes\api.js
type nul > src\routes\companyRoutes.js
type nul > src\routes\branchRoutes.js
type nul > src\routes\divisionRoutes.js
type nul > src\routes\departmentRoutes.js
type nul > src\routes\apiKeyRoutes.js

:: Middleware files
type nul > src\middleware\auth.js
type nul > src\middleware\apiAuth.js
type nul > src\middleware\validation.js
type nul > src\middleware\errorHandler.js
type nul > src\middleware\logger.js

:: Service files
type nul > src\services\companyService.js
type nul > src\services\branchService.js
type nul > src\services\divisionService.js
type nul > src\services\departmentService.js
type nul > src\services\apiKeyService.js
type nul > src\services\organizationService.js

:: Utility files
type nul > src\utils\response.js
type nul > src\utils\pagination.js
type nul > src\utils\validator.js
type nul > src\utils\logger.js

:: Validator files
type nul > src\validators\companyValidator.js
type nul > src\validators\branchValidator.js
type nul > src\validators\divisionValidator.js
type nul > src\validators\departmentValidator.js

:: View files - Layouts
type nul > views\layouts\main.ejs
type nul > views\layouts\header.ejs
type nul > views\layouts\footer.ejs
type nul > views\layouts\sidebar.ejs

:: View files - Dashboard
type nul > views\dashboard\index.ejs

:: View files - Companies
type nul > views\companies\index.ejs
type nul > views\companies\create.ejs
type nul > views\companies\edit.ejs

:: View files - Branches
type nul > views\branches\index.ejs
type nul > views\branches\create.ejs
type nul > views\branches\edit.ejs

:: View files - Divisions
type nul > views\divisions\index.ejs
type nul > views\divisions\create.ejs
type nul > views\divisions\edit.ejs

:: View files - Departments
type nul > views\departments\index.ejs
type nul > views\departments\create.ejs
type nul > views\departments\edit.ejs

:: View files - API Keys
type nul > views\api-keys\index.ejs
type nul > views\api-keys\create.ejs

:: Public files
type nul > public\css\style.css
type nul > public\js\main.js

:: Database files
type nul > database\scripts\create-database.sql
type nul > database\scripts\create-tables.sql
type nul > database\scripts\create-indexes.sql
type nul > database\scripts\create-constraints.sql
type nul > database\seeds\sample-data.sql

:: Test files
type nul > tests\unit\company.test.js
type nul > tests\unit\branch.test.js
type nul > tests\unit\division.test.js
type nul > tests\unit\department.test.js
type nul > tests\integration\api.test.js

:: Documentation files
type nul > docs\API.md
type nul > docs\DATABASE.md
type nul > docs\DEPLOYMENT.md

echo.
echo Project structure created successfully!
echo.
echo Next steps:
echo 1. Run 'npm init -y' to initialize package.json
echo 2. Install dependencies: npm install express ejs mssql dotenv cors helmet morgan express-validator bcryptjs jsonwebtoken
echo 3. Install dev dependencies: npm install -D nodemon jest supertest
echo 4. Configure your .env file with database credentials
echo 5. Run database scripts to create tables
echo.
pause