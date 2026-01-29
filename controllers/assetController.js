const Asset = require('../models/assetModel');
const enAsset = require('../models/enAssetModel');
const ruAsset = require('../models/ruAssetModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Utils = require('../utils/utils');
const puppeteer = require('puppeteer');
const pug = require('pug');
const fetch = require('node-fetch');
const sharp = require('sharp');
const { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

let assetsArray = [];

exports.getSearchResults = catchAsync(async (req, res, next) => {
  // try {
  //   mongooseQuery = {
  //     ...Utils.buildMongooseQuery(req.body.filter),
  //     origin: { $in: ['vita', 'Bulgarian Resales'] },
  //   };
  //   let sortOptions;
  //   if (req.params.sort === 'price') {
  //     sortOptions = { price: parseInt(req.params.type) === 1 ? 1 : -1 };
  //   } else {
  //     sortOptions = { date: parseInt(req.params.type) === 1 ? 1 : -1 };
  //   }
  //   const totalAssetsArray = res.locals.lang === 'he' ? await Asset.find(mongooseQuery) : await enAsset.find(mongooseQuery);
  //   const totalAssets = totalAssetsArray.length;
  //   let assets;
  //   if (res.locals.lang === 'he') {
  //     assets = await Asset.find(mongooseQuery)
  //       .sort(sortOptions)
  //       .skip((req.params.pageNumber - 1) * req.params.resPerPage)
  //       .limit(parseInt(req.params.resPerPage));
  //   } else if (res.locals.lang === 'en') {
  //     assets = await enAsset
  //       .find(mongooseQuery)
  //       .sort(sortOptions)
  //       .skip((req.params.pageNumber - 1) * req.params.resPerPage)
  //       .limit(parseInt(req.params.resPerPage));
  //   } else if (res.locals.lang === 'ru') {
  //     assets = await ruAsset
  //       .find(mongooseQuery)
  //       .sort(sortOptions)
  //       .skip((req.params.pageNumber - 1) * req.params.resPerPage)
  //       .limit(parseInt(req.params.resPerPage));
  //   } else {
  //     // Fallback in case the language is not recognized
  //     assets = [];
  //   }
  //   assetsArray = assets;
  //   // Get total number of pages for pagination
  //   const totalPages = Utils.populatePagesArray(totalAssetsArray, req.params.resPerPage);
  //   if (!assets) return next(new AppError('Could not find the requested assets!', 404));
  //   res.status(200).json({
  //     status: 'success',
  //     data: {
  //       totalAssets,
  //       totalPages,
  //       pageNumber: req.params.pageNumber,
  //     },
  //   });
  // } catch (error) {
  //   // Handle errors
  //   console.log(error);
  //   //res.status(500).send('Internal Server Error');
  // }
});

exports.renderSearchResults = catchAsync(async (req, res, next) => {
  const assets = assetsArray;
  const totalAssets = req.query.totalAssets;
  const totalPages = JSON.parse(req.query.totalPages);
  const pageNumber = req.query.pageNumber;

  res.render(`${res.locals.lang}/searchResults`, {
    title: 'Search Results',
    assets,
    totalAssets,
    totalPages,
    pageNumber,
  });
});

exports.getAsset = catchAsync(async (req, res, next) => {
  let asset;

  if (res.locals.lang === 'he') {
    asset = await Asset.findOne({ slug: req.params.slug });
  } else if (res.locals.lang === 'en') {
    asset = await enAsset.findOne({ slug: req.params.slug });
  } else if (res.locals.lang === 'ru') {
    asset = await ruAsset.findOne({ slug: req.params.slug });
  }

  if (!asset) return next(new AppError('Could not find the requested asset!', 404));

  let sortOptions = { project: 1, price: 1 };
  const filterCriteria = { project: asset.project };

  let relatedAssets;

  if (res.locals.lang === 'he') {
    relatedAssets = await Asset.find(filterCriteria).sort(sortOptions).limit(12);
  } else if (res.locals.lang === 'en') {
    relatedAssets = await enAsset.find(filterCriteria).sort(sortOptions).limit(12);
  } else if (res.locals.lang === 'ru') {
    relatedAssets = await ruAsset.find(filterCriteria).sort(sortOptions).limit(12);
  }
  console.log(asset.price);
  if (!relatedAssets) return next(new AppError('Could not find the requested hot assets!', 404));

  res.status(200).render(`${res.locals.lang}/asset`, {
    title: 'Asset Page',
    asset,
    relatedAssets,
  });
});

exports.getFavoriteAssets = catchAsync(async (req, res, next) => {
  let sortOptions = { project: 1, price: 1 };
  const assets =
    res.locals.lang === 'he'
      ? await Asset.find({ id: { $in: req.body.favoriteAssets } }).sort(sortOptions)
      : await enAsset.find({ id: { $in: req.body.favoriteAssets } }).sort(sortOptions);
  assetsArray = assets;
  if (!assets) return next(new AppError('Could not find the requested asset!', 404));
  res.status(200).json({ status: 'success' });
});

exports.renderFavoriteAssets = catchAsync(async (req, res, next) => {
  res.render(`${res.locals.lang}/favoriteAssets`, {
    title: 'Favorite assets Page',
    assetsArray,
  });
});

// Set up S3 configurations
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_BUCKET_REGION;
const myBucket = process.env.AWS_BUCKET_NAME;

const s3 = new S3Client({
  region: region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

const convertWebPToJPG = async (webpUrl) => {
  try {
    // Step 1: Fetch the image from the provided URL
    const response = await fetch(webpUrl);
    if (!response.ok) throw new Error(`Failed to fetch image from ${webpUrl}`);

    // Step 2: Read the image data into a buffer
    const imageBuffer = await response.buffer();

    // Step 3: Convert the image buffer to JPEG
    const jpgBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toBuffer();

    return jpgBuffer; // Return the JPG buffer
  } catch (error) {
    console.error(`Error converting WebP image ${webpUrl}: ${error.message}`);
    return null; // If conversion fails, return null
  }
};

const uploadToS3 = async (buffer, fileName, folder) => {
  // Determine the ContentType based on the file extension
  const contentType = fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

  const params = {
    Bucket: myBucket,
    Key: `${folder}/${fileName}`,
    Body: buffer,
    ContentType: contentType, // Set ContentType dynamically
  };

  const command = new PutObjectCommand(params);
  return s3.send(command);
};

// Function to delete images from a folder in S3
const deleteImagesFromS3 = async (folder) => {
  try {
    // List of keys to be deleted
    const deleteParams = {
      Bucket: myBucket,
      Delete: {
        Objects: [],
      },
    };

    // Get the list of objects in the specified folder
    const listParams = {
      Bucket: myBucket,
      Prefix: folder, // e.g., 'pdf/images/'
    };

    // Retrieve the list of images in the folder
    const { Contents } = await s3.send(new ListObjectsV2Command(listParams));

    // If there are any images in the folder, add their keys to the deleteParams
    if (Contents && Contents.length > 0) {
      deleteParams.Delete.Objects = Contents.map((item) => ({ Key: item.Key }));
    }

    // If there are images to delete, send the delete request
    if (deleteParams.Delete.Objects.length > 0) {
      await s3.send(new DeleteObjectsCommand(deleteParams));
    } else {
      console.log(`No images found in S3 folder: ${folder}`);
    }
  } catch (error) {
    console.error('Error deleting images from S3:', error.message);
  }
};

exports.generateAssetPDF = catchAsync(async (req, res) => {
  try {
    const asset = req.body;

    // Handle the main image (if available)
    if (asset.mainImage && asset.mainImage.endsWith('.webp')) {
      const convertedMainImageBuffer = await convertWebPToJPG(asset.mainImage);
      if (convertedMainImageBuffer) {
        const mainImageFileName = `mainImage.jpg`;
        await uploadToS3(convertedMainImageBuffer, mainImageFileName, 'pdf/images');
        asset.mainImage = `https://${myBucket}.s3.${region}.amazonaws.com/pdf/images/${mainImageFileName}`;
      }
    }

    // Loop over images and convert .webp to .jpg if necessary
    for (let i = 0; i < asset.images.length; i++) {
      const imageUrl = asset.images[i];

      // Only process if it's a .webp file
      if (imageUrl.endsWith('.webp')) {
        const convertedImageBuffer = await convertWebPToJPG(imageUrl);

        // If conversion is successful, upload to S3
        if (convertedImageBuffer) {
          const imageFileName = `image_${i + 1}.jpg`;
          await uploadToS3(convertedImageBuffer, imageFileName, 'pdf/images');
          asset.images[i] = `https://${myBucket}.s3.${region}.amazonaws.com/pdf/images/${imageFileName}`;
        }
      }
    }

    // Generate the Mapbox URL for the map image based on asset location
    let mapUrl = '';
    if (asset.location)
      mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-building+2078a9(${asset.location.long},${asset.location.lat})/${asset.location.long},${asset.location.lat},12/600x300?access_token=pk.eyJ1IjoiZHJvcnNhbDMiLCJhIjoiY2x2bDFjdTY0MGdibzJrbXc3ajJubmxiZyJ9.7pdKIb23xT3EUfmDm16jnA`;

    // Generate HTML content using a Pug template
    const html = pug.renderFile(path.join(__dirname, '../views/he/pdf/assetPDF.pug'), { asset, mapUrl, title: 'Asset PDF' });

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Use env var if set, else default Chromium
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    //const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set the HTML content in the Puppeteer page
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate a PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px',
      },
    });

    await browser.close();

    // Define a unique file name and path for the generated PDF
    const fileName = `${asset.name}.pdf`;

    const pdfFolder = 'pdf';
    const imageFolder = `${pdfFolder}/images`;

    // Save the PDF to S3
    await uploadToS3(pdfBuffer, fileName, pdfFolder);

    // Delete images in the S3 folder
    await deleteImagesFromS3(imageFolder);

    // Return the URL to access the generated PDF
    const pdfUrl = `https://${myBucket}.s3.${region}.amazonaws.com/pdf/${fileName}`;
    res.status(200).json({ status: 'success', pdfUrl, filename: fileName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
});
