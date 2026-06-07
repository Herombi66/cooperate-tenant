var express = require('express');
var router = express.Router();

/* GET health check. */
router.get('/health', function(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'IMAN MCS Backend',
    version: '1.0.0'
  });
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
