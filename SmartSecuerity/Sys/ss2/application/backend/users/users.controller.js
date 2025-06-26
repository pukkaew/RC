const express = require('express');
const router = express.Router();
const userService = require('../service/systemuser.service');

// routes
router.post('/authenticate', authenticate);
router.get('/', getAll);

module.exports = router;

function authenticate(req, res, next) {

    console.log("TESTG");

    userService.authenticate(req.body)
        .then(user => {
            req.userData = user;
            console.log(user);
            res.json(user);
        })
        .catch(function(){
            next();
        });
}

function getAll(req, res, next) {
    userService.getAll()
        .then(users => res.json(users))
        .catch(next);
}
