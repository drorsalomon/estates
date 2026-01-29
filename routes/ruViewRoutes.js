const express = require('express');
const viewsController = require('../controllers/viewsController');

const router = express.Router();

// Middleware to set `res.locals.lang` for this router
router.use((req, res, next) => {
  res.locals.lang = 'ru';
  next();
});

router.get('/', viewsController.getOverview);
router.get('/search', viewsController.getSearch);
router.get('/qanda', viewsController.getQAndA);
router.get('/invest', viewsController.getInvest);
router.get('/about', viewsController.getAbout);
router.get('/contact-us', viewsController.getContactUs);
router.get('/contact-us-confirm', viewsController.getContactUsConfirm);
router.get('/pricing', viewsController.getPricing);
router.get('/privacy', viewsController.getPrivacy);
router.get('/accessibility', viewsController.getAccessibility);
router.get('/terms-of-service', viewsController.getTermsOfService);
router.get('/site-map', viewsController.getSiteMap);

module.exports = router;
