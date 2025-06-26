'use strict';

const dotenv = require('dotenv');

dotenv.config();

const {SQL_USER, SQL_PASSWORD, SQL_DATABASE, SQL_SERVER} = process.env;

const sqlEncrypt = process.env.SQL_ENCRYPT === "true";

module.exports = {
    sql: {
        server: SQL_SERVER,
        database: SQL_DATABASE,
        user: SQL_USER,
        password: SQL_PASSWORD,
        options: {
            encrypt: sqlEncrypt,
            enableArithAbort: true,
            requestTimeout: 300000
        },
    },
};
  