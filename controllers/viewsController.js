const Asset = require('../models/assetModel');
const enAsset = require('../models/enAssetModel');
const ruAsset = require('../models/ruAssetModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res, next) => {
  let sortOptions = { project: 1, price: 1 };
  let hotAssets;

  if (res.locals.lang === 'he') {
    hotAssets = await Asset.find({ hotAsset: true }).sort(sortOptions);
  } else if (res.locals.lang === 'en') {
    hotAssets = await enAsset.find({ hotAsset: true }).sort(sortOptions);
  } else if (res.locals.lang === 'ru') {
    hotAssets = await ruAsset.find({ hotAsset: true }).sort(sortOptions);
  }
  if (!hotAssets) return next(new AppError('Could not find the requested hot assets!', 404));

  res.status(200).render(`${res.locals.lang}/overview`, {
    title: 'Overview Page',
    hotAssets,
  });
});

exports.getSearch = catchAsync(async (req, res, next) => {
  let sortOptions = { project: 1, price: 1 };
  let hotAssets;

  if (res.locals.lang === 'he') {
    hotAssets = await Asset.find({ hotAsset: true }).sort(sortOptions);
  } else if (res.locals.lang === 'en') {
    hotAssets = await enAsset.find({ hotAsset: true }).sort(sortOptions);
  } else if (res.locals.lang === 'ru') {
    hotAssets = await ruAsset.find({ hotAsset: true }).sort(sortOptions);
  }
  if (!hotAssets) return next(new AppError('Could not find the requested hot assets!', 404));

  res.status(200).render(`${res.locals.lang}/search`, {
    title: 'Search Page',
    hotAssets,
  });
});
exports.getQAndA = (req, res) => {
  res.status(200).render(`${res.locals.lang}/qAndA`, {
    title: 'שאלות ותשובות',
  });
};
exports.getInvest = (req, res) => {
  res.status(200).render(`${res.locals.lang}/invest`, {
    title: 'מדריך השקעה בבולגריה',
  });
};
exports.getAbout = (req, res) => {
  res.status(200).render(`${res.locals.lang}/about`, {
    title: 'מי אנחנו',
  });
};
exports.getContactUs = (req, res) => {
  res.status(200).render(`${res.locals.lang}/contactUs`, {
    title: 'צרו קשר',
  });
};
exports.getContactUsConfirm = (req, res) => {
  res.status(200).render(`${res.locals.lang}/contactUsConfirm`, {
    title: 'אישור שליחת פרטים ליצירת קשר',
  });
};
exports.getPricing = (req, res) => {
  res.status(200).render(`${res.locals.lang}/pricing`, {
    title: 'מחירון חבילות ליווי',
  });
};
exports.getPrivacy = (req, res) => {
  res.status(200).render(`${res.locals.lang}/privacy`, {
    title: 'תנאי פרטיות',
  });
};
exports.getAccessibility = (req, res) => {
  res.status(200).render(`${res.locals.lang}/accessibility`, {
    title: 'תנאי נגישות',
  });
};
exports.getTermsOfService = (req, res) => {
  res.status(200).render(`${res.locals.lang}/termsOfService`, {
    title: 'תנאי שימוש',
  });
};
exports.getSiteMap = (req, res) => {
  res.status(200).render(`${res.locals.lang}/siteMap`, {
    title: 'מפת האתר',
  });
};
