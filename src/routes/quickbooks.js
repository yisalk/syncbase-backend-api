const express = require('express');
const router = express.Router();
const quickbooksController = require('../controllers/quickbooksController');
const apiKeyAuth = require('../middlewares/apiKeyAuth');

router.get('/connect', apiKeyAuth, quickbooksController.connect);
router.get('/callback', quickbooksController.callback);
router.post('/refresh-token', apiKeyAuth, quickbooksController.refreshToken);

module.exports = router; 